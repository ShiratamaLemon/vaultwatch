'use client';

import Link from 'next/link';
import { ExternalLink, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProjectIndexEntry, ProjectCategory } from '@/types';
import { PROJECT_CATEGORY_LABELS } from '@/types';

interface ProjectCardProps {
  project: ProjectIndexEntry;
}

const categoryColors: Record<ProjectCategory, string> = {
  defi: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  nft: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  gaming: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  infrastructure: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  dao: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  social: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  other: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export const ProjectCard = ({ project }: ProjectCardProps) => {
  const categoryColor = categoryColors[project.category] || categoryColors.other;
  // Use bucketId for URL if available, otherwise fall back to project.id
  const projectUrl = project.bucketId ? `/projects/${project.bucketId}` : `/projects/${project.id}`;

  return (
    <Link href={projectUrl}>
      <Card className="h-full border-border/40 bg-card/50 backdrop-blur transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <span className="text-xl font-bold text-emerald-400">
                  {project.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold leading-tight">{project.name}</h3>
                <Badge variant="outline" className={`mt-1 text-xs ${categoryColor}`}>
                  {PROJECT_CATEGORY_LABELS[project.category]}
                </Badge>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{project.commitmentCount} commitments</span>
            </div>
            <div className="flex items-center space-x-1 text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <span>Verified</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Updated {new Date(project.lastUpdated).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
