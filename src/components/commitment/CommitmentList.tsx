'use client';

import { CommitmentCard } from './CommitmentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import type { Commitment } from '@/types';

interface CommitmentListProps {
  commitments: Commitment[];
  isLoading?: boolean;
}

export const CommitmentList = ({
  commitments,
  isLoading = false,
}: CommitmentListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (commitments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mb-1 font-semibold">No Commitments Yet</h3>
        <p className="text-sm text-muted-foreground">
          This project hasn&apos;t recorded any commitments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {commitments.map((commitment) => (
        <CommitmentCard key={commitment.id} commitment={commitment} />
      ))}
    </div>
  );
};
