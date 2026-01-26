'use client';

/**
 * Transaction Success Modal
 *
 * Displays a success modal after a transaction is recorded on DataHaven.
 * Shows transaction details and explorer links for verification.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  getAllTransactionLinks,
  shortenHash,
  copyToClipboard,
  type ExplorerLink,
} from '@/lib/datahaven/explorer';
import { toast } from 'sonner';

export type TransactionType = 'project' | 'commitment' | 'bucket';

interface TransactionDetail {
  label: string;
  value: string;
  copyable?: boolean;
}

interface TransactionSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TransactionType;
  txHash?: string;
  fileKey?: string;
  bucketId?: string;
  projectName?: string;
  /** Block number for Substrate explorer links */
  blockNumber?: number;
  onContinue?: () => void;
}

const TYPE_CONFIG: Record<
  TransactionType,
  { title: string; description: string; icon: string }
> = {
  project: {
    title: 'Project Registered Successfully!',
    description:
      'Your project has been permanently recorded on DataHaven with cryptographic proof.',
    icon: '🏛️',
  },
  commitment: {
    title: 'Commitment Recorded Successfully!',
    description:
      'Your commitment has been permanently stored on DataHaven and can be verified by anyone.',
    icon: '📜',
  },
  bucket: {
    title: 'Storage Bucket Created!',
    description:
      'Your DataHaven storage bucket has been created and is ready to store files.',
    icon: '📦',
  },
};

export const TransactionSuccessModal = ({
  open,
  onOpenChange,
  type,
  txHash,
  fileKey,
  bucketId,
  projectName,
  blockNumber,
  onContinue,
}: TransactionSuccessModalProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const config = TYPE_CONFIG[type];
  const explorerLinks: ExplorerLink[] = txHash ? getAllTransactionLinks(txHash, blockNumber) : [];

  const details: TransactionDetail[] = [
    ...(txHash
      ? [{ label: 'Transaction Hash', value: txHash, copyable: true }]
      : []),
    ...(fileKey
      ? [{ label: 'File Key', value: fileKey, copyable: true }]
      : []),
    ...(bucketId
      ? [{ label: 'Bucket ID', value: bucketId, copyable: true }]
      : []),
    ...(projectName
      ? [{ label: 'Project', value: projectName, copyable: false }]
      : []),
  ];

  const handleCopy = async (label: string, value: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopiedField(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  const handleCopyAll = async () => {
    const allDetails = details
      .map((d) => `${d.label}: ${d.value}`)
      .join('\n');
    const success = await copyToClipboard(allDetails);
    if (success) {
      toast.success('All details copied to clipboard');
    } else {
      toast.error('Failed to copy');
    }
  };

  const handleContinue = () => {
    onOpenChange(false);
    onContinue?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <span className="text-4xl">{config.icon}</span>
          </div>
          <DialogTitle className="text-xl text-center text-zinc-100">
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Details */}
          <div className="space-y-3">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-0.5">{detail.label}</p>
                  <p className="text-sm text-zinc-300 font-mono truncate">
                    {detail.copyable ? shortenHash(detail.value, 8) : detail.value}
                  </p>
                </div>
                {detail.copyable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 px-2 text-zinc-400 hover:text-zinc-100"
                    onClick={() => handleCopy(detail.label, detail.value)}
                  >
                    {copiedField === detail.label ? (
                      <CheckIcon className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Explorer Links */}
          {explorerLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-zinc-400 font-medium">
                View on Explorer:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {explorerLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400 transition-colors"
                  >
                    <span>{link.icon}</span>
                    <span>{link.name}</span>
                    {link.note && (
                      <span className="text-xs text-zinc-500">({link.note})</span>
                    )}
                    <ExternalLinkIcon className="h-3.5 w-3.5 ml-auto text-zinc-500" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={handleCopyAll}
          >
            <CopyIcon className="h-4 w-4 mr-2" />
            Copy Details
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Icon components
const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

export default TransactionSuccessModal;
