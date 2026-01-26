'use client';

import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Edit,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Commitment, CommitmentStatus, CommitmentType } from '@/types';
import { COMMITMENT_TYPE_LABELS, COMMITMENT_STATUS_LABELS } from '@/types';
import { getTransactionLink, shortenHash, copyToClipboard } from '@/lib/datahaven/explorer';

interface CommitmentCardProps {
  commitment: Commitment;
  showVerification?: boolean;
}

const statusIcons: Record<CommitmentStatus, React.ElementType> = {
  pending: Clock,
  completed: CheckCircle,
  delayed: AlertTriangle,
  cancelled: XCircle,
  modified: Edit,
};

const statusColors: Record<CommitmentStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  delayed: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  modified: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const typeColors: Record<CommitmentType, string> = {
  roadmap: 'bg-blue-500/10 text-blue-400',
  tokenomics: 'bg-green-500/10 text-green-400',
  partnership: 'bg-purple-500/10 text-purple-400',
  team: 'bg-orange-500/10 text-orange-400',
  funding: 'bg-yellow-500/10 text-yellow-400',
  product: 'bg-cyan-500/10 text-cyan-400',
  governance: 'bg-pink-500/10 text-pink-400',
  other: 'bg-gray-500/10 text-gray-400',
};

export const CommitmentCard = ({
  commitment,
  showVerification = true,
}: CommitmentCardProps) => {
  const [copiedFileKey, setCopiedFileKey] = useState(false);

  const StatusIcon = statusIcons[commitment.status];
  const statusColor = statusColors[commitment.status];
  const typeColor = typeColors[commitment.type];

  const handleCopyFileKey = async () => {
    if (!commitment.fileKey) return;
    const success = await copyToClipboard(commitment.fileKey);
    if (success) {
      setCopiedFileKey(true);
      setTimeout(() => setCopiedFileKey(false), 2000);
    }
  };

  return (
    <TooltipProvider>
      <Card className="border-border/40 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={typeColor}>
                  {COMMITMENT_TYPE_LABELS[commitment.type]}
                </Badge>
                <Badge variant="outline" className={statusColor}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {COMMITMENT_STATUS_LABELS[commitment.status]}
                </Badge>
              </div>

              <h4 className="font-semibold">{commitment.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {commitment.description}
              </p>

              {/* Status Reason */}
              {commitment.statusReason && (
                <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                  <span className="font-medium">Status Note:</span> {commitment.statusReason}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Created: {new Date(commitment.createdAt).toLocaleDateString()}
                </span>
                {commitment.targetDate && (
                  <span>
                    Target: {new Date(commitment.targetDate).toLocaleDateString()}
                  </span>
                )}
                {commitment.evidenceUrl && (
                  <a
                    href={commitment.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    View Evidence
                  </a>
                )}
              </div>
            </div>

            {showVerification && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs">Verified</span>
                </div>

                {/* On-chain Link - show txHash link if available */}
                {(commitment.txHash || commitment.fileKey) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {/* File Key copy */}
                    {commitment.fileKey && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleCopyFileKey}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            {copiedFileKey ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span className="font-mono">
                              {shortenHash(commitment.fileKey, 4)}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{copiedFileKey ? 'Copied!' : 'Copy File Key'}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* DHScan link - only if txHash exists */}
                    {commitment.txHash && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={getTransactionLink(commitment.txHash, 'dhscan')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-emerald-400 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View TX on DHScan</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
