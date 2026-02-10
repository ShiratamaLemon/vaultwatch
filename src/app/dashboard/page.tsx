'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Plus, FileText, AlertCircle, FolderOpen, Loader2, RefreshCw } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDataHaven } from '@/hooks/useDataHaven';
import { PROJECT_CATEGORY_LABELS } from '@/types';
import type { Project } from '@/types';
import type { Bucket } from '@/lib/datahaven/client';

interface ProjectWithBucket {
  bucket: Bucket;
  project: Project;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const {
    isInitialized,
    isLoading: isDataHavenLoading,
    listVaultWatchProjects,
  } = useDataHaven();

  const [myProjects, setMyProjects] = useState<ProjectWithBucket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load projects from MSP
  const loadProjects = async () => {
    if (!isInitialized) return;

    setIsLoading(true);
    try {
      const results = await listVaultWatchProjects();

      // Filter projects owned by current user and with valid project data
      const userProjects = results
        .filter(({ project }) => project !== null)
        .filter(({ project }) =>
          project!.ownerAddress.toLowerCase() === address?.toLowerCase()
        )
        .map(({ bucket, project }) => ({
          bucket,
          project: project!,
        }));

      setMyProjects(userProjects);
      setHasLoaded(true);
      console.log(`✅ Loaded ${userProjects.length} of your projects from DataHaven`);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load when initialized
  useEffect(() => {
    if (isInitialized && !hasLoaded && !isLoading) {
      loadProjects();
    }
  }, [isInitialized, hasLoaded, isLoading]);

  // Reset when address changes
  useEffect(() => {
    setHasLoaded(false);
    setMyProjects([]);
  }, [address]);

  if (!isConnected) {
    return (
      <div className="py-12">
        <Container size="small">
          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">Wallet Connection Required</h2>
              <p className="mb-6 text-center text-muted-foreground">
                Please connect your wallet to access your dashboard.
              </p>
              <ConnectButton />
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  // Show loading state
  if (isDataHavenLoading || (isLoading && !hasLoaded)) {
    return (
      <div className="py-12">
        <Container>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your projects and commitments.
            </p>
          </div>

          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
              <p className="text-muted-foreground">
                Loading your projects from DataHaven...
              </p>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  const totalCommitments = myProjects.reduce(
    (sum, { bucket }) => sum + Math.max(0, bucket.fileCount - 1), // Subtract metadata.json
    0
  );

  return (
    <div className="py-12">
      <Container>
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your projects and commitments.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadProjects}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/register">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card className="border-border/40">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{myProjects.length}</div>
              <p className="text-sm text-muted-foreground">Total Projects</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalCommitments}</div>
              <p className="text-sm text-muted-foreground">Total Commitments</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-400">
                <span className="text-sm">🔗</span> DataHaven
              </div>
              <p className="text-sm text-muted-foreground">Decentralized Storage</p>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <h2 className="mb-4 text-xl font-bold">
          Your Projects
          {myProjects.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (loaded from DataHaven)
            </span>
          )}
        </h2>

        {myProjects.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Projects Yet</h3>
              <p className="mb-6 text-center text-muted-foreground">
                You haven&apos;t registered any projects. Start building your
                transparent track record today.
              </p>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/register">
                  <Plus className="mr-2 h-4 w-4" />
                  Register Your First Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myProjects.map(({ bucket, project }) => (
              <Card key={bucket.bucketId} className="border-border/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                        <span className="font-bold text-emerald-400">
                          {project.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          <Link
                            href={`/projects/${bucket.bucketId}`}
                            className="hover:text-emerald-400"
                          >
                            {project.name}
                          </Link>
                        </CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {PROJECT_CATEGORY_LABELS[project.category]}
                        </Badge>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/${bucket.bucketId}/add`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Commitment
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{Math.max(0, bucket.fileCount - 1)} commitments</span>
                    </div>
                    <div>
                      Updated {new Date(project.updatedAt).toLocaleDateString('ja-JP')}
                    </div>
                    <div className="font-mono text-xs">
                      Bucket: {bucket.bucketId.slice(0, 8)}...
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
