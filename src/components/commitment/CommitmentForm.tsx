'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Calendar, AlertCircle, Upload, X, FileText, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionSuccessModal } from '@/components/ui/transaction-success-modal';
import { toast } from 'sonner';
import { useProjectStore } from '@/stores/projectStore';
import { useDataHaven } from '@/hooks/useDataHaven';
import {
  COMMITMENT_TYPE_LABELS,
  type CommitmentType,
  type CommitmentFormData,
} from '@/types';

interface CommitmentFormProps {
  projectId: string;
  bucketId: string;
}

interface TransactionResult {
  txHash?: string;
  fileKey?: string;
  bucketId: string;
  /** Block number for Substrate explorer links */
  blockNumber?: number;
  commitmentTitle: string;
}

export const CommitmentForm = ({ projectId, bucketId }: CommitmentFormProps) => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { updateProject, projects } = useProjectStore();
  const {
    isInitialized,
    isLoading: isDataHavenLoading,
    uploadFile,
    uploadBinaryFile,
    initialize,
    verifyBucketOwnership,
    waitForMSPConfirm,
    waitForBackendFileReady,
  } = useDataHaven();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEvidenceWarning, setShowEvidenceWarning] = useState(false);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [formData, setFormData] = useState<CommitmentFormData>({
    type: 'roadmap',
    title: '',
    description: '',
    targetDate: undefined,
    evidenceUrl: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: CommitmentType) => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value).getTime() : undefined;
    setFormData((prev) => ({ ...prev, targetDate: date }));
  };

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" exceeds 10MB limit`);
        return;
      }
    }

    setEvidenceFiles((prev) => [...prev, ...files]);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const removeEvidenceFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): string | null => {
    if (!formData.title || formData.title.length < 5) {
      return 'Title must be at least 5 characters';
    }
    if (!formData.description || formData.description.length < 20) {
      return 'Description must be at least 20 characters';
    }
    if (formData.evidenceUrl) {
      try {
        new URL(formData.evidenceUrl);
      } catch {
        return 'Please enter a valid evidence URL';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!isInitialized) {
      toast.error('DataHaven is not ready. Please wait for initialization...');
      try {
        await initialize();
      } catch {
        toast.error('Failed to initialize DataHaven. Please refresh and try again.');
        return;
      }
    }

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Show warning modal if evidence files are attached
    if (evidenceFiles.length > 0) {
      setShowEvidenceWarning(true);
      return;
    }

    await proceedSubmit();
  };

  const proceedSubmit = async () => {
    if (!address) return;

    setIsSubmitting(true);

    try {
      // On-chain ownership verification before write operation
      toast.info('Verifying ownership...');
      const ownershipCheck = await verifyBucketOwnership(bucketId);
      if (!ownershipCheck.isOwner) {
        toast.error(`Access denied: ${ownershipCheck.reason || 'You are not the owner of this project'}`);
        setIsSubmitting(false);
        return;
      }
      console.log('✅ On-chain ownership verified');

      const commitmentId = uuidv4();
      const now = Date.now();

      // Upload evidence files first (if any)
      const uploadedEvidence: Array<{ fileKey: string; fileName: string; fileSize: number; fileType: string }> = [];
      if (evidenceFiles.length > 0) {
        setIsUploadingEvidence(true);
        toast.info(`Uploading ${evidenceFiles.length} evidence file(s)...`);

        // Strip EXIF metadata from images before upload
        const { stripImageMetadata } = await import('@/lib/image-utils');

        for (const file of evidenceFiles) {
          const cleanFile = await stripImageMetadata(file);
          const filePath = `evidence/${commitmentId}/${cleanFile.name}`;
          const result = await uploadBinaryFile(bucketId, filePath, cleanFile);
          if (result) {
            uploadedEvidence.push(result);
          } else {
            toast.error(`Failed to upload evidence file: ${file.name}`);
          }
        }
        setIsUploadingEvidence(false);
      }

      toast.info('Uploading commitment to DataHaven...');

      // First upload: Create commitment without txHash
      const commitmentData = {
        id: commitmentId,
        projectId,
        ...formData,
        status: 'pending' as const,
        createdBy: address,
        createdAt: now,
        updatedAt: now,
        ...(uploadedEvidence.length > 0 ? { evidenceFiles: uploadedEvidence } : {}),
      };

      const firstUploadResult = await uploadFile(
        bucketId,
        `commitments/${commitmentId}.json`,
        commitmentData,
        'commitment'
      );

      if (!firstUploadResult) {
        throw new Error('Failed to upload commitment');
      }

      console.log('📋 First upload TX Hash:', firstUploadResult.txHash);
      console.log('🔑 First upload File Key:', firstUploadResult.fileKey);

      // Second upload: Include txHash and fileKey in the commitment data
      // This ensures the txHash is permanently stored in the commitment
      const commitmentWithTxHash = {
        ...commitmentData,
        txHash: firstUploadResult.txHash,
        fileKey: firstUploadResult.fileKey,
        blockNumber: firstUploadResult.blockNumber,
      };

      const finalUploadResult = await uploadFile(
        bucketId,
        `commitments/${commitmentId}.json`,
        commitmentWithTxHash,
        'commitment'
      );

      if (!finalUploadResult) {
        throw new Error('Failed to save commitment with txHash');
      }

      console.log('✅ Commitment created with txHash');
      console.log('📋 Final TX Hash:', finalUploadResult.txHash);
      console.log('🔑 Final File Key:', finalUploadResult.fileKey);

      // Wait for MSP to confirm storage on-chain (ensures file persistence)
      toast.info('Waiting for storage confirmation...');
      try {
        await waitForMSPConfirm(finalUploadResult.fileKey);
        console.log('✅ MSP confirmed storage request on-chain');
      } catch {
        console.warn('⚠️ MSP on-chain confirmation wait timed out');
      }

      // Wait for MSP backend to index the file so it appears in listings
      try {
        await waitForBackendFileReady(bucketId, finalUploadResult.fileKey);
      } catch {
        console.warn('Backend file indexing wait timed out, proceeding anyway');
      }

      // Update project in store
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        updateProject(projectId, {
          commitmentCount: project.commitmentCount + 1,
          lastUpdated: now,
        });
      }

      // Set transaction result and show success modal
      setTransactionResult({
        txHash: finalUploadResult.txHash,
        fileKey: finalUploadResult.fileKey,
        bucketId,
        blockNumber: finalUploadResult.blockNumber,
        commitmentTitle: formData.title,
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to add commitment:', error);
      toast.error('Failed to add commitment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalContinue = () => {
    // Use bucketId (hex format) for routing, as the detail page expects bucketId
    router.push(`/projects/${bucketId}`);
  };

  // Show warning if wallet not connected
  if (!isConnected || !address) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="mb-4 text-muted-foreground">
            Please connect your wallet to add a commitment.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show initializing state
  if (isDataHavenLoading) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
          <p className="text-muted-foreground">
            Initializing DataHaven connection...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show warning if not initialized
  if (!isInitialized) {
    return (
      <Card className="border-border/40 border-yellow-500/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-yellow-500 mb-4" />
          <p className="text-muted-foreground mb-4">
            DataHaven connection not ready. Please wait or try again.
          </p>
          <Button
            onClick={() => initialize()}
            variant="outline"
            className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
          >
            Initialize Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Evidence Upload Warning Modal */}
      <Dialog open={showEvidenceWarning} onOpenChange={setShowEvidenceWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-500" />
              Evidence Upload Warning
            </DialogTitle>
            <DialogDescription className="text-left">
              Please review before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm space-y-2">
              <p className="font-medium text-yellow-400">
                The following files will be permanently stored on DataHaven:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {evidenceFiles.map((f, i) => (
                  <li key={i} className="truncate">{f.name} ({(f.size / 1024).toFixed(0)} KB)</li>
                ))}
              </ul>
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
              <p><strong>Permanent & Public:</strong> Once uploaded, these files cannot be deleted or modified. They will be publicly accessible to anyone.</p>
              <p><strong>Metadata Removal:</strong> EXIF metadata (GPS location, device info, etc.) will be automatically stripped from images before upload.</p>
              <p><strong>Before proceeding:</strong> Ensure the files do not contain personal information, credentials, or sensitive data.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEvidenceWarning(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowEvidenceWarning(false);
                proceedSubmit();
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              I Understand, Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <TransactionSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        type="commitment"
        txHash={transactionResult?.txHash}
        fileKey={transactionResult?.fileKey}
        bucketId={transactionResult?.bucketId}
        blockNumber={transactionResult?.blockNumber}
        projectName={transactionResult?.commitmentTitle}
        onContinue={handleModalContinue}
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Commitment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={handleTypeChange}
              disabled={isSubmitting}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select commitment type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COMMITMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Mainnet Launch Q2 2024"
              value={formData.title}
              onChange={handleInputChange}
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe this commitment in detail (20-2000 characters)"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isSubmitting}
              rows={5}
              maxLength={2000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {formData.description.length}/2000
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date (Optional)</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="targetDate"
                name="targetDate"
                type="date"
                className="pl-10"
                onChange={handleDateChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidenceUrl">Evidence URL (Optional)</Label>
            <Input
              id="evidenceUrl"
              name="evidenceUrl"
              type="url"
              placeholder="https://twitter.com/yourproject/status/..."
              value={formData.evidenceUrl}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Link to the official announcement, blog post, or documentation.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Evidence Files (Optional)</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="evidenceFileInput"
                className="hidden"
                accept="image/*,application/pdf"
                multiple
                onChange={handleEvidenceFileChange}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('evidenceFileInput')?.click()}
                disabled={isSubmitting}
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                Upload Files
              </Button>
              <span className="text-xs text-muted-foreground">
                Images or PDFs, max 10MB each
              </span>
            </div>
            {evidenceFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {evidenceFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-md border border-border/40 bg-muted/30 px-3 py-1.5 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEvidenceFile(index)}
                      className="text-muted-foreground hover:text-red-400 shrink-0 ml-2"
                      disabled={isSubmitting}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isUploadingEvidence ? 'Uploading evidence...' : 'Adding...'}
            </>
          ) : (
            'Add Commitment'
          )}
        </Button>
      </div>
      </form>
    </>
  );
};
