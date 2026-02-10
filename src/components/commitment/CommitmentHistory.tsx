'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDataHaven } from '@/hooks/useDataHaven';
import { shortenHash } from '@/lib/datahaven/explorer';
import type { Commitment, CommitmentStatus } from '@/types';
import { COMMITMENT_STATUS_LABELS } from '@/types';

interface CommitmentHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: Commitment;
  bucketId: string;
}

interface HistoryVersion {
  data: Commitment;
  fileKey: string;
  uploadedAt: Date;
}

const statusBadgeColor: Record<CommitmentStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  delayed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  modified: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export const CommitmentHistory = ({
  open,
  onOpenChange,
  commitment,
  bucketId,
}: CommitmentHistoryProps) => {
  const { loadCommitmentHistory } = useDataHaven();
  const [versions, setVersions] = useState<HistoryVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const history = await loadCommitmentHistory(bucketId, commitment.id);
        setVersions(history);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [open, bucketId, commitment.id, loadCommitmentHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change History</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {commitment.title}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">Loading history...</p>
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No version history found.
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 h-full w-0.5 bg-border" />

            <div className="space-y-4">
              {versions.map((version, index) => {
                const prevVersion = index > 0 ? versions[index - 1] : null;
                const statusChanged = prevVersion && prevVersion.data.status !== version.data.status;
                const descChanged = prevVersion && prevVersion.data.description !== version.data.description;

                return (
                  <div key={version.fileKey} className="relative pl-8">
                    {/* Timeline dot */}
                    <div className={`absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 ${
                      index === versions.length - 1
                        ? 'border-emerald-400 bg-emerald-400'
                        : 'border-muted-foreground bg-background'
                    }`} />

                    <div className="rounded-md border border-border/40 bg-card/50 p-3 text-sm">
                      {/* Timestamp */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {version.uploadedAt.toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {shortenHash(version.fileKey, 4)}
                        </span>
                      </div>

                      {/* Status change */}
                      {index === 0 ? (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">Created as</span>
                          <Badge variant="outline" className={`text-xs ${statusBadgeColor[version.data.status]}`}>
                            {COMMITMENT_STATUS_LABELS[version.data.status]}
                          </Badge>
                        </div>
                      ) : statusChanged ? (
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs ${statusBadgeColor[prevVersion!.data.status]}`}>
                            {COMMITMENT_STATUS_LABELS[prevVersion!.data.status]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Badge variant="outline" className={`text-xs ${statusBadgeColor[version.data.status]}`}>
                            {COMMITMENT_STATUS_LABELS[version.data.status]}
                          </Badge>
                        </div>
                      ) : null}

                      {/* Status reason */}
                      {version.data.statusReason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Reason:</span> {version.data.statusReason}
                        </p>
                      )}

                      {/* Description diff */}
                      {descChanged && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Description changed:</div>
                          <div className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-400 line-through">
                            {prevVersion!.data.description.slice(0, 200)}
                            {prevVersion!.data.description.length > 200 ? '...' : ''}
                          </div>
                          <div className="rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                            {version.data.description.slice(0, 200)}
                            {version.data.description.length > 200 ? '...' : ''}
                          </div>
                        </div>
                      )}

                      {/* Updated by */}
                      {version.data.statusUpdatedBy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          By: <span className="font-mono">{shortenHash(version.data.statusUpdatedBy, 4)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
