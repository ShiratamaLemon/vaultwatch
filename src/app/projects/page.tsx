'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Loader2, Wallet } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { ProjectList, ProjectSearch } from '@/components/project';
import { useDataHaven } from '@/hooks/useDataHaven';
import { Card, CardContent } from '@/components/ui/card';
import type { ProjectCategory, ProjectIndexEntry } from '@/types';

export default function ProjectsPage() {
  const { isConnected } = useAccount();
  const { 
    isInitialized, 
    isLoading: isDataHavenLoading,
    listVaultWatchProjects 
  } = useDataHaven();

  const [projects, setProjects] = useState<ProjectIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'all'>('all');

  // Load projects from MSP when initialized
  useEffect(() => {
    const loadProjects = async () => {
      if (!isInitialized || hasLoaded || isLoading) return;

      setIsLoading(true);
      try {
        const results = await listVaultWatchProjects();
        
        // Convert to ProjectIndexEntry format
        const indexEntries: ProjectIndexEntry[] = results
          .filter(({ project }) => project !== null)
          .map(({ bucket, project }) => ({
            id: project!.id,
            name: project!.name,
            category: project!.category,
            status: project!.status,
            ownerAddress: project!.ownerAddress,
            bucketId: bucket.bucketId,
            commitmentCount: bucket.fileCount > 1 ? bucket.fileCount - 1 : 0, // Subtract metadata.json
            lastUpdated: project!.updatedAt,
          }));

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
  }, [isInitialized, hasLoaded, isLoading, listVaultWatchProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        searchQuery === '' ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || project.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [projects, searchQuery, selectedCategory]);

  // Show wallet connection prompt if not connected
  if (!isConnected) {
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
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Connect Your Wallet</p>
              <p className="text-muted-foreground text-center max-w-md">
                Connect your wallet to view projects stored on DataHaven. 
                Your data is retrieved directly from decentralized storage.
              </p>
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

        <div className="mb-8">
          <ProjectSearch
            onSearch={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            selectedCategory={selectedCategory}
          />
        </div>

        <ProjectList projects={filteredProjects} isLoading={isLoading} />
      </Container>
    </div>
  );
}
