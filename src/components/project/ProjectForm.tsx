'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, AlertCircle } from 'lucide-react';
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
  PROJECT_CATEGORY_LABELS,
  type ProjectCategory,
  type ProjectFormData,
  type ProjectIndexEntry,
} from '@/types';

interface TransactionResult {
  txHash?: string;
  fileKey?: string;
  bucketId?: string;
  /** Block number for Substrate explorer links */
  blockNumber?: number;
  projectId: string;
  projectName: string;
}

export const ProjectForm = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { addProject } = useProjectStore();
  const {
    isInitialized,
    isLoading: isDataHavenLoading,
    createBucket,
    uploadFile,
    initialize,
  } = useDataHaven();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    category: 'other',
    website: '',
    twitter: '',
    discord: '',
    github: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: ProjectCategory) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.name || formData.name.length < 3) {
      return 'Project name must be at least 3 characters';
    }
    if (!formData.description || formData.description.length < 10) {
      return 'Description must be at least 10 characters';
    }
    if (!formData.website) {
      return 'Website URL is required';
    }
    try {
      new URL(formData.website);
    } catch {
      return 'Please enter a valid website URL';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Check if DataHaven is initialized
    if (!isInitialized) {
      toast.error('DataHaven is not ready. Please wait for initialization...');
      // Try to initialize
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
      const projectId = uuidv4();
      const now = Date.now();

      // Create bucket on DataHaven
      toast.info('Creating project bucket on DataHaven...');
      const bucketResult = await createBucket(`vaultwatch-${projectId}`);

      if (!bucketResult) {
        throw new Error('Failed to create bucket');
      }

      // Upload project metadata
      toast.info('Uploading project metadata...');
      const projectData = {
        id: projectId,
        ...formData,
        status: 'active' as const,
        ownerAddress: address,
        createdAt: now,
        updatedAt: now,
      };

      const uploadResult = await uploadFile(
        bucketResult.bucketId,
        'metadata.json',
        projectData,
        'project'
      );

      if (!uploadResult) {
        throw new Error('Failed to upload project metadata');
      }

      // Add to local store
      const indexEntry: ProjectIndexEntry = {
        id: projectId,
        name: formData.name,
        category: formData.category,
        status: 'active',
        ownerAddress: address,
        bucketId: bucketResult.bucketId,
        commitmentCount: 0,
        lastUpdated: now,
      };

      addProject(indexEntry);

      // Set transaction result and show success modal
      // Use the upload block number as it's the final operation
      setTransactionResult({
        txHash: uploadResult.txHash || bucketResult.txHash,
        fileKey: uploadResult.fileKey,
        bucketId: bucketResult.bucketId,
        blockNumber: uploadResult.blockNumber || bucketResult.blockNumber,
        projectId,
        projectName: formData.name,
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to register project:', error);
      toast.error('Failed to register project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="mb-4 text-muted-foreground">
            Please connect your wallet to register a project.
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
            <Loader2 className={`mr-2 h-4 w-4 ${isDataHavenLoading ? 'animate-spin' : 'hidden'}`} />
            Initialize Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleModalContinue = () => {
    if (transactionResult?.bucketId) {
      // Use bucketId (hex format) for routing, as the detail page expects bucketId
      router.push(`/projects/${transactionResult.bucketId}`);
    }
  };

  return (
    <>
      {/* Success Modal */}
      <TransactionSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        type="project"
        txHash={transactionResult?.txHash}
        fileKey={transactionResult?.fileKey}
        bucketId={transactionResult?.bucketId}
        blockNumber={transactionResult?.blockNumber}
        projectName={transactionResult?.projectName}
        onContinue={handleModalContinue}
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter your project name"
              value={formData.name}
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
              placeholder="Describe your project (10-500 characters)"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isSubmitting}
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {formData.description.length}/500
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={handleCategoryChange}
              disabled={isSubmitting}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website">Website *</Label>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://your-project.com"
              value={formData.website}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter/X</Label>
            <Input
              id="twitter"
              name="twitter"
              type="url"
              placeholder="https://twitter.com/yourproject"
              value={formData.twitter}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discord">Discord</Label>
            <Input
              id="discord"
              name="discord"
              type="url"
              placeholder="https://discord.gg/yourproject"
              value={formData.discord}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              name="github"
              type="url"
              placeholder="https://github.com/yourproject"
              value={formData.github}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
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
              Registering...
            </>
          ) : (
            'Register Project'
          )}
        </Button>
      </div>
      </form>
    </>
  );
};
