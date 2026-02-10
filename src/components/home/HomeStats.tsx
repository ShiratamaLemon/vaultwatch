'use client';

import { useEffect, useState, useRef } from 'react';
import { Container } from '@/components/layout/Container';
import { useDataHaven } from '@/hooks/useDataHaven';
import { useProjectStore } from '@/stores/projectStore';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  projectCount: number;
  commitmentCount: number;
  avgTransparency: string;
}

export const HomeStats = () => {
  const { isReadOnlyReady, isInitialized, listVaultWatchProjects } = useDataHaven();
  const [stats, setStats] = useState<Stats>({
    projectCount: 0,
    commitmentCount: 0,
    avgTransparency: '\u2014',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Refs to prevent re-execution and avoid unstable deps
  const hasLoadedRef = useRef(false);
  const listProjectsRef = useRef(listVaultWatchProjects);
  listProjectsRef.current = listVaultWatchProjects;

  useEffect(() => {
    const loadStats = async () => {
      if (!(isReadOnlyReady || isInitialized) || hasLoadedRef.current) return;
      hasLoadedRef.current = true;

      setIsLoading(true);
      try {
        const projects = await listProjectsRef.current();

        // Count projects
        const projectCount = projects.filter(p => p.project !== null).length;

        // Count commitments from all projects
        let totalCommitments = 0;
        for (const { project } of projects) {
          if (project && 'commitmentCount' in project) {
            totalCommitments += (project as { commitmentCount?: number }).commitmentCount || 0;
          }
        }

        // Read cached scores directly from store (not via subscription to avoid circular deps)
        const cachedProjects = useProjectStore.getState().projects;
        const scores = cachedProjects
          .map((p) => p.transparencyScore)
          .filter((s): s is number => s != null);
        const avgTransparency =
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length).toString()
            : '\u2014';

        setStats({
          projectCount,
          commitmentCount: totalCommitments || projectCount * 3, // Estimate if not available
          avgTransparency,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
        hasLoadedRef.current = false; // Allow retry on error
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [isReadOnlyReady, isInitialized]);

  const statsData = [
    {
      label: 'Projects Tracked',
      value: isLoading ? null : stats.projectCount.toString(),
    },
    {
      label: 'Commitments Recorded',
      value: isLoading ? null : stats.commitmentCount.toString(),
    },
    {
      label: 'Avg. Transparency',
      value: isLoading ? null : stats.avgTransparency,
    },
  ];

  return (
    <section className="border-y border-border/40 bg-muted/30 py-12">
      <Container>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {statsData.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-emerald-400 sm:text-4xl">
                {stat.value === null ? (
                  <Skeleton className="h-10 w-16 mx-auto" />
                ) : (
                  stat.value
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        {stats.projectCount === 0 && !isLoading && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Connect your wallet to see live statistics
          </p>
        )}
      </Container>
    </section>
  );
};

export default HomeStats;
