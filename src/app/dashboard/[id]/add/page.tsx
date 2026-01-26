'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CommitmentForm } from '@/components/commitment/CommitmentForm';
import { useDataHaven } from '@/hooks/useDataHaven';
import type { Project } from '@/types';

export default function AddCommitmentPage() {
  const params = useParams();
  const bucketId = params.id as string; // URL param is now bucketId
  const { address, isConnected } = useAccount();
  const {
    isInitialized,
    isLoading: isDataHavenLoading,
    loadProject,
  } = useDataHaven();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project from MSP
  useEffect(() => {
    const loadData = async () => {
      if (!isInitialized || !bucketId) return;

      setIsLoading(true);
      setError(null);

      try {
        const projectData = await loadProject(bucketId);
        if (!projectData) {
          setError('Project not found');
        } else {
          setProject({ ...projectData, bucketId });
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isInitialized, bucketId, loadProject]);

  // Check if user owns this project
  const isOwner =
    project && address && project.ownerAddress.toLowerCase() === address.toLowerCase();

  if (!isConnected) {
    return (
      <div className="py-12">
        <Container size="small">
          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">Wallet Connection Required</h2>
              <p className="text-center text-muted-foreground">
                Please connect your wallet to add commitments.
              </p>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  if (isDataHavenLoading || isLoading) {
    return (
      <div className="py-12">
        <Container size="small">
          <Skeleton className="mb-8 h-8 w-48" />
          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
              <p className="text-muted-foreground">Loading project...</p>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  if (error || !project) {
    notFound();
  }

  if (!isOwner) {
    return (
      <div className="py-12">
        <Container size="small">
          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
              <h2 className="mb-2 text-lg font-semibold">Access Denied</h2>
              <p className="text-center text-muted-foreground">
                You are not the owner of this project.
              </p>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-12">
      <Container size="small">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <Plus className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Add Commitment</h1>
          <p className="mt-2 text-muted-foreground">
            Record a new commitment for{' '}
            <span className="font-medium text-foreground">{project.name}</span>
          </p>
        </div>

        {/* Info Banner */}
        <Card className="mb-8 border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-start gap-4 py-4">
            <AlertCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-emerald-400">
                This commitment will be permanently recorded
              </p>
              <p className="text-muted-foreground">
                Once submitted, this commitment will be stored on DataHaven with a
                cryptographic timestamp. It cannot be deleted or modified.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <CommitmentForm projectId={project.id} bucketId={bucketId} />
      </Container>
    </div>
  );
}
