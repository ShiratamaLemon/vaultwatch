'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Calendar, AlertCircle } from 'lucide-react';
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
    initialize,
  } = useDataHaven();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
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

    // Check if DataHaven is initialized
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

    setIsSubmitting(true);

    try {
      const commitmentId = uuidv4();
      const now = Date.now();

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
              Adding...
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
