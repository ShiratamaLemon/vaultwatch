'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Shield,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  HardDrive,
  Database,
  Fingerprint,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { shortenHash, copyToClipboard, getAllTransactionLinks } from '@/lib/datahaven/explorer';
import type { VerificationStatus } from '@/lib/datahaven/types';
import type { FileStorageVerification } from '@/lib/datahaven/client';

interface VerificationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verificationStatus: VerificationStatus;
  onChainFingerprint?: string;
  calculatedFingerprint?: string;
  verificationReason?: string;
  fileKey?: string;
  txHash?: string;
  blockNumber?: number;
  bucketId?: string;
  label: string;
  verifyFileStorage?: (fileKey: string, bucketId?: string) => Promise<FileStorageVerification | null>;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
};

export const VerificationDetailModal = ({
  open,
  onOpenChange,
  verificationStatus,
  onChainFingerprint,
  calculatedFingerprint,
  verificationReason,
  fileKey,
  txHash,
  blockNumber,
  bucketId,
  label,
  verifyFileStorage,
}: VerificationDetailModalProps) => {
  const [storageStatus, setStorageStatus] = useState<FileStorageVerification | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const loadStorageStatus = useCallback(async () => {
    if (!fileKey || !verifyFileStorage) return;

    setStorageLoading(true);
    setStorageError(null);

    try {
      const result = await verifyFileStorage(fileKey, bucketId);
      setStorageStatus(result);
    } catch (err) {
      console.error('Failed to verify file storage:', err);
      setStorageError(err instanceof Error ? err.message : 'Failed to check storage status');
    } finally {
      setStorageLoading(false);
    }
  }, [fileKey, bucketId, verifyFileStorage]);

  // Load storage status when modal opens
  useEffect(() => {
    if (open && fileKey && verifyFileStorage) {
      loadStorageStatus();
    }
    if (!open) {
      setStorageStatus(null);
      setStorageError(null);
    }
  }, [open, fileKey, verifyFileStorage, loadStorageStatus]);

  const fingerprintsMatch = onChainFingerprint && calculatedFingerprint && onChainFingerprint === calculatedFingerprint;

  const statusIcon = {
    verified: ShieldCheck,
    failed: ShieldAlert,
    unavailable: ShieldQuestion,
    unverified: Shield,
    pending: Loader2,
  }[verificationStatus];
  const StatusIcon = statusIcon;

  const statusColor = {
    verified: 'text-emerald-500',
    failed: 'text-red-500',
    unavailable: 'text-gray-500',
    unverified: 'text-gray-400',
    pending: 'text-yellow-500',
  }[verificationStatus];

  const statusLabel = {
    verified: 'Verified',
    failed: 'Verification Failed',
    unavailable: 'Unavailable',
    unverified: 'Unverified',
    pending: 'Verifying...',
  }[verificationStatus];

  const explorerLinks = txHash ? getAllTransactionLinks(txHash, blockNumber) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon
              className={cn(
                'h-5 w-5',
                statusColor,
                verificationStatus === 'pending' && 'animate-spin'
              )}
            />
            Verification Details
          </DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Section 1: Data Integrity */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Data Integrity</h3>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
              {/* Status */}
              <div className="flex items-center gap-2">
                <StatusIcon
                  className={cn(
                    'h-4 w-4',
                    statusColor,
                    verificationStatus === 'pending' && 'animate-spin'
                  )}
                />
                <span className={cn('text-sm font-medium', statusColor)}>
                  {statusLabel}
                </span>
              </div>

              {/* Reason */}
              {verificationReason && (
                <p className="text-xs text-muted-foreground">{verificationReason}</p>
              )}

              {/* Fingerprints */}
              {onChainFingerprint && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">On-chain:</span>
                    <span className="font-mono text-xs break-all">
                      {shortenHash(onChainFingerprint, 10)}
                    </span>
                    <CopyButton text={onChainFingerprint} />
                  </div>
                  {calculatedFingerprint && (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">Calculated:</span>
                        <span className="font-mono text-xs break-all">
                          {shortenHash(calculatedFingerprint, 10)}
                        </span>
                        <CopyButton text={calculatedFingerprint} />
                      </div>
                      <div
                        className={cn(
                          'text-xs font-semibold',
                          fingerprintsMatch ? 'text-emerald-500' : 'text-red-500'
                        )}
                      >
                        {fingerprintsMatch ? 'Fingerprints match' : 'Fingerprints do not match'}
                      </div>
                    </>
                  )}
                </div>
              )}

              {!onChainFingerprint && !verificationReason && verificationStatus !== 'pending' && (
                <p className="text-xs text-muted-foreground">
                  No fingerprint data available for comparison.
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Storage Status */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Storage Status</h3>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              {!fileKey ? (
                <p className="text-xs text-muted-foreground">Not uploaded yet</p>
              ) : storageLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking storage status...
                </div>
              ) : storageError ? (
                <p className="text-xs text-red-400">{storageError}</p>
              ) : storageStatus ? (
                <div className="space-y-2.5">
                  {/* MSP Confirmed */}
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'h-5 w-5 rounded-full flex items-center justify-center',
                        storageStatus.mspConfirmed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      )}
                    >
                      {storageStatus.mspConfirmed ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                    <span className="text-xs">MSP Confirmed</span>
                  </div>

                  {/* Storage Request Fulfilled */}
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'h-5 w-5 rounded-full flex items-center justify-center',
                        storageStatus.storageRequestFulfilled
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      )}
                    >
                      {storageStatus.storageRequestFulfilled ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                    <span className="text-xs">Storage Request Fulfilled</span>
                  </div>

                  {/* Status message */}
                  <p className="text-xs text-muted-foreground mt-1">
                    {storageStatus.storageRequestFulfilled
                      ? 'Fully replicated & secure'
                      : storageStatus.message}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Unable to retrieve storage status.</p>
              )}
            </div>
          </section>

          {/* Section 3: On-chain Links */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">On-chain Links</h3>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
              {/* File Key */}
              {fileKey && (
                <div>
                  <span className="text-xs text-muted-foreground">File Key</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Database className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-mono text-xs break-all">{fileKey}</span>
                    <CopyButton text={fileKey} />
                  </div>
                </div>
              )}

              {/* TX Hash */}
              {txHash && (
                <div>
                  <span className="text-xs text-muted-foreground">Transaction Hash</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-xs break-all">{shortenHash(txHash, 10)}</span>
                    <CopyButton text={txHash} />
                  </div>
                </div>
              )}

              {/* Block Number */}
              {blockNumber && (
                <div>
                  <span className="text-xs text-muted-foreground">Block Number</span>
                  <div className="font-mono text-xs mt-0.5">#{blockNumber}</div>
                </div>
              )}

              {/* Explorer Links */}
              {explorerLinks.length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <span className="text-xs text-muted-foreground">Explorers</span>
                  {explorerLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span>{link.icon} {link.name}</span>
                      {link.note && (
                        <span className="text-muted-foreground">({link.note})</span>
                      )}
                    </a>
                  ))}
                </div>
              )}

              {!fileKey && !txHash && (
                <p className="text-xs text-muted-foreground">
                  No on-chain data available yet.
                </p>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationDetailModal;
