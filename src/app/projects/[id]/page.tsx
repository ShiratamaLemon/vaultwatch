'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  ArrowLeft,
  Globe,
  Twitter,
  MessageCircle,
  Github,
  CheckCircle,
  Shield,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { CommitmentTimeline } from '@/components/commitment/CommitmentTimeline';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { VerificationDetailModal } from '@/components/ui/verification-detail-modal';
import { TransparencyScoreBadge } from '@/components/project/TransparencyScoreBadge';
import { useDataHaven } from '@/hooks/useDataHaven';
import { useProjectStore } from '@/stores/projectStore';
import { calculateTransparencyScore } from '@/lib/transparency-score';
import { PROJECT_CATEGORY_LABELS, PROJECT_STATUS_LABELS } from '@/types';
import { getAccountLink } from '@/lib/datahaven/explorer';
import { toast } from 'sonner';
import type { Project, Commitment, CommitmentStatus } from '@/types';
import type { VerificationStatus, VerificationResult } from '@/lib/datahaven/types';

/** Map VerificationResult to a UI-friendly VerificationStatus */
const mapVerificationStatus = (v: VerificationResult): VerificationStatus => {
  if (!v.verified) {
    return v.reason?.includes('INTEGRITY FAILURE') ? 'failed' : 'unavailable';
  }
  // verified: true but no on-chain fingerprint means existence confirmed only
  if (!v.onChainFingerprint) return 'unavailable';
  return 'verified';
};

export default function ProjectDetailPage() {
  const params = useParams();
  const bucketId = params.id as string; // URL param is now bucketId
  const { isConnected, address } = useAccount();
  const {
    isInitialized,
    isReadOnlyReady,
    isLoading: isDataHavenLoading,
    loadProject,
    loadCommitments,
    loadProjectWithVerification,
    loadCommitmentsWithVerification,
    updateCommitmentStatus,
    verifyFileStorage,
  } = useDataHaven();

  const [project, setProject] = useState<Project | null>(null);
  const [projectVerification, setProjectVerification] = useState<VerificationStatus>('pending');
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [commitmentVerifications, setCommitmentVerifications] = useState<
    Map<string, VerificationStatus>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Verification detail states
  const [projectVerificationDetail, setProjectVerificationDetail] = useState<{
    onChainFingerprint?: string;
    calculatedFingerprint?: string;
    reason?: string;
  } | null>(null);
  const [commitmentVerificationDetails, setCommitmentVerificationDetails] = useState<
    Map<string, { onChainFingerprint?: string; calculatedFingerprint?: string; reason?: string }>
  >(new Map());
  const [verificationModalTarget, setVerificationModalTarget] = useState<{
    type: 'project' | 'commitment';
    id: string;
  } | null>(null);

  // Load project and commitments from MSP with verification
  useEffect(() => {
    const loadData = async () => {
      if ((!isReadOnlyReady && !isInitialized) || !bucketId) return;

      setIsLoading(true);
      setError(null);
      setProjectVerification('pending');

      try {
        // Step 1: Load project metadata immediately (without verification for fast display)
        const projectData = await loadProject(bucketId);
        if (!projectData) {
          setError('Project not found');
          setIsLoading(false);
          return;
        }

        // Add bucketId to project data and display immediately
        setProject({ ...projectData, bucketId });

        // Step 2: Load commitments immediately (without verification for fast display)
        const commitmentsData = await loadCommitments(bucketId);
        setCommitments(commitmentsData);

        console.log(`✅ Loaded project "${projectData.name}" with ${commitmentsData.length} commitments`);

        // Step 3: Verify project metadata in background
        const projectVerificationResult = await loadProjectWithVerification(bucketId);
        if (projectVerificationResult.data) {
          setProject({ ...projectVerificationResult.data, bucketId });
        }
        setProjectVerification(
          mapVerificationStatus(projectVerificationResult.verification)
        );
        setProjectVerificationDetail({
          onChainFingerprint: projectVerificationResult.verification.onChainFingerprint,
          calculatedFingerprint: projectVerificationResult.verification.calculatedFingerprint,
          reason: projectVerificationResult.verification.reason,
        });

        // Step 4: Verify commitments in background
        const commitmentsVerificationResult = await loadCommitmentsWithVerification(bucketId);
        
        // Update commitments with verified data
        const verifiedCommitments = commitmentsVerificationResult.map((r) => r.data);
        setCommitments(verifiedCommitments);

        // Store verification results
        const verifications = new Map<string, VerificationStatus>();
        const verificationDetailMap = new Map<string, { onChainFingerprint?: string; calculatedFingerprint?: string; reason?: string }>();
        commitmentsVerificationResult.forEach(({ data, verification }) => {
          verifications.set(data.id, mapVerificationStatus(verification));
          verificationDetailMap.set(data.id, {
            onChainFingerprint: verification.onChainFingerprint,
            calculatedFingerprint: verification.calculatedFingerprint,
            reason: verification.reason,
          });
        });
        setCommitmentVerifications(verifications);
        setCommitmentVerificationDetails(verificationDetailMap);

        // Log verification warnings if any
        commitmentsVerificationResult.forEach(({ data, verification }) => {
          if (!verification.verified) {
            console.warn(
              `⚠️ Verification failed for commitment ${data.id}: ${verification.reason}`
            );
          }
        });
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project data');
        setProjectVerification('unavailable');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [
    isReadOnlyReady,
    isInitialized,
    bucketId,
    loadProject,
    loadCommitments,
    loadProjectWithVerification,
    loadCommitmentsWithVerification,
  ]);

  // Handle commitment status update
  const handleStatusUpdate = useCallback(
    async (commitmentId: string, newStatus: CommitmentStatus, reason: string) => {
      const commitment = commitments.find((c) => c.id === commitmentId);
      if (!commitment) {
        toast.error('Commitment not found');
        return;
      }

      setIsUpdatingStatus(true);
      toast.info('Updating commitment status...');

      try {
        const result = await updateCommitmentStatus(
          bucketId,
          commitment,
          newStatus,
          reason
        );

        if (result.success) {
          // Update local state with new status and txHash
          setCommitments((prev) =>
            prev.map((c) =>
              c.id === commitmentId
                ? {
                    ...c,
                    status: newStatus,
                    statusReason: reason || undefined,
                    statusUpdatedAt: Date.now(),
                    statusUpdatedBy: address,
                    previousStatus: c.status,
                    previousFileKey: c.fileKey,
                    fileKey: result.fileKey || c.fileKey,
                    txHash: result.txHash || c.txHash,
                    blockNumber: result.blockNumber || c.blockNumber,
                    updatedAt: Date.now(),
                  }
                : c
            )
          );
          toast.success('Status updated successfully!');
        } else {
          toast.error('Failed to update status');
        }
      } catch (err) {
        console.error('Failed to update status:', err);
        toast.error('Failed to update status. Please try again.');
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [bucketId, commitments, updateCommitmentStatus, address]
  );

  // Calculate transparency score from commitments
  const transparencyScore = useMemo(
    () => calculateTransparencyScore(commitments),
    [commitments]
  );

  // Cache score to project store for use on listing page
  useEffect(() => {
    if (transparencyScore && project) {
      useProjectStore.getState().updateProject(project.id, {
        transparencyScore: transparencyScore.score,
      });
    }
  }, [transparencyScore, project]);

  // Show loading state
  if (isDataHavenLoading || isLoading) {
    return (
      <div className="py-12">
        <Container>
          <Skeleton className="mb-8 h-8 w-32" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // Show error state
  if (error || !project) {
    return (
      <div className="py-12">
        <Container>
          <Link
            href="/projects"
            className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>

          <Card className="border-border/40 border-red-500/20">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-lg font-medium mb-2">Project Not Found</p>
              <p className="text-muted-foreground text-center max-w-md">
                {error || 'The project could not be loaded from DataHaven.'}
              </p>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  const isOwner = address?.toLowerCase() === project.ownerAddress?.toLowerCase();

  return (
    <div className="py-12">
      <Container>
        {/* Back Button */}
        <Link
          href="/projects"
          className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Header */}
            <div>
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-500/10">
                  <span className="text-2xl font-bold text-emerald-400">
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold sm:text-3xl">{project.name}</h1>
                    <VerificationBadge
                      status={projectVerification}
                      size="sm"
                      showLabel={false}
                      onClick={() => setVerificationModalTarget({ type: 'project', id: 'project' })}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {PROJECT_CATEGORY_LABELS[project.category]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                    {isOwner && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        Your Project
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-muted-foreground">{project.description}</p>

              {/* Links */}
              <div className="mt-4 flex flex-wrap gap-2">
                {project.website && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="mr-2 h-4 w-4" />
                      Website
                    </a>
                  </Button>
                )}
                {project.twitter && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.twitter} target="_blank" rel="noopener noreferrer">
                      <Twitter className="mr-2 h-4 w-4" />
                      Twitter
                    </a>
                  </Button>
                )}
                {project.discord && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.discord} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Discord
                    </a>
                  </Button>
                )}
                {project.github && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.github} target="_blank" rel="noopener noreferrer">
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>

              {/* Add Commitment Button (for owner) */}
              {isOwner && (
                <div className="mt-6">
                  <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                    <Link href={`/dashboard/${bucketId}/add`}>
                      Add New Commitment
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Commitments Timeline */}
            <div>
              <h2 className="mb-6 text-xl font-bold">
                Commitment Timeline
                {commitments.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({commitments.length} commitments)
                  </span>
                )}
              </h2>
              {commitments.length > 0 ? (
                <CommitmentTimeline
                  commitments={commitments}
                  isOwner={isOwner}
                  onStatusUpdate={handleStatusUpdate}
                  verificationStatuses={commitmentVerifications}
                  verificationDetails={commitmentVerificationDetails}
                  onVerificationClick={(commitmentId) =>
                    setVerificationModalTarget({ type: 'commitment', id: commitmentId })
                  }
                />
              ) : (
                <Card className="border-border/40">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">
                      No commitments recorded yet.
                    </p>
                    {isOwner && (
                      <Button asChild className="mt-4" variant="outline">
                        <Link href={`/dashboard/${bucketId}/add`}>
                          Add First Commitment
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Transparency Score */}
            <TransparencyScoreBadge score={transparencyScore} variant="detailed" />

            {/* Verification Card */}
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Shield className="mr-2 h-5 w-5 text-emerald-400" />
                  Verification Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Stored on DataHaven</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  All data is retrieved from decentralized storage and can be cryptographically verified.
                </p>
              </CardContent>
            </Card>

            {/* Project Info Card */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Owner</div>
                  <a
                    href={getAccountLink(project.ownerAddress, 'dhscan')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-emerald-400 hover:underline"
                  >
                    {project.ownerAddress.slice(0, 6)}...
                    {project.ownerAddress.slice(-4)}
                  </a>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Registered</div>
                  <div className="text-sm">
                    {new Date(project.createdAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last Updated</div>
                  <div className="text-sm">
                    {new Date(project.updatedAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Commitments</div>
                  <div className="text-sm">{commitments.length}</div>
                </div>
              </CardContent>
            </Card>

            {/* DataHaven Info Card */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">DataHaven Record</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Bucket ID</div>
                  <div className="font-mono text-xs break-all">
                    {bucketId.slice(0, 20)}...{bucketId.slice(-8)}
                  </div>
                </div>
                {project.merkleRoot && (
                  <div>
                    <div className="text-xs text-muted-foreground">Merkle Root</div>
                    <div className="font-mono text-xs break-all">
                      {project.merkleRoot.slice(0, 20)}...
                    </div>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a
                    href="https://datahaven.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Learn about DataHaven
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Verification Detail Modal */}
        {verificationModalTarget && (() => {
          const isProject = verificationModalTarget.type === 'project';
          const commitment = !isProject
            ? commitments.find((c) => c.id === verificationModalTarget.id)
            : null;
          const detail = isProject
            ? projectVerificationDetail
            : commitmentVerificationDetails.get(verificationModalTarget.id);
          const status = isProject
            ? projectVerification
            : (commitmentVerifications.get(verificationModalTarget.id) || 'unverified');

          return (
            <VerificationDetailModal
              open={!!verificationModalTarget}
              onOpenChange={(open) => {
                if (!open) setVerificationModalTarget(null);
              }}
              verificationStatus={status}
              onChainFingerprint={detail?.onChainFingerprint}
              calculatedFingerprint={detail?.calculatedFingerprint}
              verificationReason={detail?.reason}
              fileKey={isProject ? project.fileKey : commitment?.fileKey}
              txHash={isProject ? undefined : commitment?.txHash}
              blockNumber={isProject ? undefined : commitment?.blockNumber}
              bucketId={bucketId}
              label={isProject ? 'Project Metadata' : (commitment?.title || 'Commitment')}
              verifyFileStorage={verifyFileStorage}
            />
          );
        })()}
      </Container>
    </div>
  );
}
