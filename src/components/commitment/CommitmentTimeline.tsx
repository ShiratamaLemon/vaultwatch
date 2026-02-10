'use client';

import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Edit,
  Circle,
  ExternalLink,
  Settings,
  Copy,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StatusUpdateModal } from './StatusUpdateModal';
import { VerificationBadge } from '@/components/ui/verification-badge';
import type { Commitment, CommitmentStatus } from '@/types';
import { COMMITMENT_TYPE_LABELS, COMMITMENT_STATUS_LABELS } from '@/types';
import { getTransactionLink, shortenHash, copyToClipboard } from '@/lib/datahaven/explorer';
import type { VerificationStatus } from '@/lib/datahaven/types';

interface CommitmentTimelineProps {
  commitments: Commitment[];
  isOwner?: boolean;
  onStatusUpdate?: (commitmentId: string, newStatus: CommitmentStatus, reason: string) => Promise<void>;
  verificationStatuses?: Map<string, VerificationStatus>;
  verificationDetails?: Map<string, {
    onChainFingerprint?: string;
    calculatedFingerprint?: string;
    reason?: string;
  }>;
  onVerificationClick?: (commitmentId: string) => void;
}

const statusIcons: Record<CommitmentStatus, React.ElementType> = {
  pending: Clock,
  completed: CheckCircle,
  delayed: AlertTriangle,
  cancelled: XCircle,
  modified: Edit,
};

const statusColors: Record<CommitmentStatus, string> = {
  pending: 'text-yellow-400 bg-yellow-500/20',
  completed: 'text-emerald-400 bg-emerald-500/20',
  delayed: 'text-orange-400 bg-orange-500/20',
  cancelled: 'text-red-400 bg-red-500/20',
  modified: 'text-blue-400 bg-blue-500/20',
};

export const CommitmentTimeline = ({
  commitments,
  isOwner = false,
  onStatusUpdate,
  verificationStatuses,
  verificationDetails,
  onVerificationClick,
}: CommitmentTimelineProps) => {
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [copiedFileKey, setCopiedFileKey] = useState<string | null>(null);

  if (commitments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Circle className="mb-4 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No timeline events yet.</p>
      </div>
    );
  }

  // Sort commitments by creation date (newest first)
  const sortedCommitments = [...commitments].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  const handleCopyFileKey = async (fileKey: string) => {
    const success = await copyToClipboard(fileKey);
    if (success) {
      setCopiedFileKey(fileKey);
      setTimeout(() => setCopiedFileKey(null), 2000);
    }
  };

  const handleStatusUpdateClick = (commitment: Commitment) => {
    setSelectedCommitment(commitment);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (
    commitmentId: string,
    newStatus: CommitmentStatus,
    reason: string
  ) => {
    if (onStatusUpdate) {
      await onStatusUpdate(commitmentId, newStatus, reason);
    }
  };

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 h-full w-0.5 bg-border" />

        <div className="space-y-6">
          {sortedCommitments.map((commitment) => {
            const StatusIcon = statusIcons[commitment.status];
            const statusColor = statusColors[commitment.status];

            return (
              <div key={commitment.id} className="relative pl-12">
                {/* Timeline dot */}
                <div
                  className={`absolute left-2 flex h-5 w-5 items-center justify-center rounded-full ${statusColor}`}
                >
                  <StatusIcon className="h-3 w-3" />
                </div>

                {/* Content */}
                <div className="rounded-lg border border-border/40 bg-card/50 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(commitment.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {COMMITMENT_TYPE_LABELS[commitment.type]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusColor.replace('bg-', 'border-').replace('/20', '/30')}`}
                    >
                      {COMMITMENT_STATUS_LABELS[commitment.status]}
                    </Badge>

                    {/* Status Update Button (Owner Only) */}
                    {isOwner && onStatusUpdate && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => handleStatusUpdateClick(commitment)}
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Update Status</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  <h4 className="mb-1 font-semibold">{commitment.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {commitment.description}
                  </p>

                  {/* Status Reason (if exists) */}
                  {commitment.statusReason && (
                    <div className="mt-2 rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                      <span className="font-medium">Status Note:</span> {commitment.statusReason}
                    </div>
                  )}

                  {commitment.targetDate && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Target: {new Date(commitment.targetDate).toLocaleDateString()}
                    </div>
                  )}

                  {commitment.evidenceUrl && (
                    <a
                      href={commitment.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-emerald-400 hover:underline"
                    >
                      View Evidence →
                    </a>
                  )}

                  {/* Verification & On-chain Links */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <VerificationBadge
                        status={verificationStatuses?.get(commitment.id) || 'unverified'}
                        size="sm"
                        showLabel={false}
                        onClick={onVerificationClick ? () => onVerificationClick(commitment.id) : undefined}
                      />
                      <span className="text-muted-foreground">Data Integrity</span>
                    </div>

                    {/* On-chain Link - show txHash link if available */}
                    {(commitment.txHash || commitment.fileKey) && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-muted-foreground/70">|</span>
                        
                        {/* File Key copy */}
                        {commitment.fileKey && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleCopyFileKey(commitment.fileKey!)}
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                              >
                                {copiedFileKey === commitment.fileKey ? (
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
                              <p>{copiedFileKey === commitment.fileKey ? 'Copied!' : 'Copy File Key'}</p>
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
                                className="flex items-center gap-0.5 hover:text-emerald-400 transition-colors"
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
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Update Modal */}
        {selectedCommitment && (
          <StatusUpdateModal
            open={showStatusModal}
            onOpenChange={setShowStatusModal}
            commitment={selectedCommitment}
            onUpdate={handleStatusUpdate}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
