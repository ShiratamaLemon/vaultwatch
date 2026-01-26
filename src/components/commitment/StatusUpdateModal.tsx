'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Commitment, CommitmentStatus } from '@/types';
import { COMMITMENT_STATUS_LABELS } from '@/types';

interface StatusUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitment: Commitment;
  onUpdate: (commitmentId: string, newStatus: CommitmentStatus, reason: string) => Promise<void>;
}

const statusOptions: CommitmentStatus[] = [
  'pending',
  'completed',
  'delayed',
  'cancelled',
  'modified',
];

export const StatusUpdateModal = ({
  open,
  onOpenChange,
  commitment,
  onUpdate,
}: StatusUpdateModalProps) => {
  const [newStatus, setNewStatus] = useState<CommitmentStatus>(commitment.status);
  const [reason, setReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async () => {
    if (newStatus === commitment.status) {
      toast.error('Please select a different status');
      return;
    }

    if (!reason.trim() && newStatus !== 'completed') {
      toast.error('Please provide a reason for this status change');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(commitment.id, newStatus, reason.trim());
      toast.success('Status updated successfully');
      onOpenChange(false);
      // Reset form
      setReason('');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Commitment Status</DialogTitle>
          <DialogDescription>
            Change the status of &quot;{commitment.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="text-sm text-muted-foreground">
              {COMMITMENT_STATUS_LABELS[commitment.status]}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newStatus">New Status</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as CommitmentStatus)}
              disabled={isUpdating}
            >
              <SelectTrigger id="newStatus">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    disabled={status === commitment.status}
                  >
                    {COMMITMENT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason {newStatus !== 'completed' && '*'}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                newStatus === 'completed'
                  ? 'Optional: Add details about completion...'
                  : 'Explain why this status is being changed...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isUpdating}
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reason.length}/500
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <strong>Note:</strong> This status change will be permanently recorded
            on DataHaven and cannot be undone. The change history will be visible
            to all users.
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUpdating || newStatus === commitment.status}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
