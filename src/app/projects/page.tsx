'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Loader2, Info } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { ProjectList, ProjectSearch } from '@/components/project';
import { useDataHaven } from '@/hooks/useDataHaven';
import { Card, CardContent } from '@/components/ui/card';
import { useProjectStore } from '@/stores/projectStore';
import type { ProjectCategory, ProjectIndexEntry } from '@/types';

export default function ProjectsPage() {
  const { isConnected } = useAccount();
  const {
    isInitialized,
    isReadOnlyReady,
    isLoading: isDataHavenLoading,
    listVaultWatchProjects
  } = useDataHaven();

  const [projects, setProjects] = useState<ProjectIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'all'>('all');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const { watchedBucketIds } = useProjectStore();

  // Load projects when read-only or full initialization is ready
  useEffect(() => {
    const loadProjects = async () => {
      if (!(isReadOnlyReady || isInitialized) || hasLoaded || isLoading) return;

      setIsLoading(true);
      try {
        const results = await listVaultWatchProjects();

        // Convert to ProjectIndexEntry format
        // Preserve cached lastUpdated if newer (detail page updates it on commitment activity)
        const cachedProjects = useProjectStore.getState().projects;
        const indexEntries: ProjectIndexEntry[] = results
          .filter(({ project }) => project !== null)
          .map(({ bucket, project }) => {
            const cached = cachedProjects.find((p) => p.id === project!.id);
            return {
              id: project!.id,
              name: project!.name,
              category: project!.category,
              status: project!.status,
              ownerAddress: project!.ownerAddress,
              bucketId: bucket.bucketId,
              commitmentCount: bucket.fileCount > 1 ? bucket.fileCount - 1 : 0,
              lastUpdated: Math.max(project!.updatedAt, cached?.lastUpdated || 0),
              transparencyScore: cached?.transparencyScore,
            };
          });

        setProjects(indexEntries);
        setHasLoaded(true);
        console.log(`✅ Loaded ${indexEntries.length} projects from DataHaven`);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [isReadOnlyReady, isInitialized, hasLoaded, isLoading, listVaultWatchProjects]);

  // Re-load when wallet connects (to get fresh data from authenticated MSP)
  useEffect(() => {
    if (isInitialized && hasLoaded) {
      setHasLoaded(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        searchQuery === '' ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || project.category === selectedCategory;
      const matchesWatchlist =
        !showWatchlistOnly ||
        (project.bucketId && watchedBucketIds.includes(project.bucketId));
      return matchesSearch && matchesCategory && matchesWatchlist;
    });
  }, [projects, searchQuery, selectedCategory, showWatchlistOnly, watchedBucketIds]);

  // Show loading state
  if (isDataHavenLoading || (isLoading && !hasLoaded)) {
    return (
      <div className="py-12">
        <Container>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Projects
            </h1>
            <p className="mt-2 text-muted-foreground">
              Explore crypto projects with verified transparency records.
            </p>
          </div>

          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
              <p className="text-muted-foreground">
                Loading projects from DataHaven...
              </p>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-12">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Projects
          </h1>
          <p className="mt-2 text-muted-foreground">
            Explore crypto projects with verified transparency records.
            {projects.length > 0 && (
              <span className="ml-2 text-emerald-400">
                ({projects.length} projects loaded from DataHaven)
              </span>
            )}
          </p>
        </div>

        {!isConnected && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            <span>Connect your wallet to discover and register new projects.</span>
          </div>
        )}

        <div className="mb-8">
          <ProjectSearch
            onSearch={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            selectedCategory={selectedCategory}
            showWatchlistOnly={showWatchlistOnly}
            onWatchlistToggle={setShowWatchlistOnly}
          />
        </div>

        <ProjectList projects={filteredProjects} isLoading={isLoading} />
      </Container>
    </div>
  );
}
