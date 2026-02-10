'use client';

import { ProjectCard } from './ProjectCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FileX } from 'lucide-react';
import type { ProjectIndexEntry } from '@/types';

interface ProjectListProps {
  projects: ProjectIndexEntry[];
  isLoading?: boolean;
}

export const ProjectList = ({ projects, isLoading = false }: ProjectListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-[180px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">No Projects Found</h3>
        <p className="text-muted-foreground">
          Be the first to register a project and build transparent credibility.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};
