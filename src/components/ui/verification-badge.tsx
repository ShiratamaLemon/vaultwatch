'use client';

import { cn } from '@/lib/utils';
import type { VerificationStatus as VerificationStatusType } from '@/lib/datahaven/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShieldCheck, ShieldAlert, ShieldQuestion, Shield, Loader2 } from 'lucide-react';

interface VerificationBadgeProps {
  status: VerificationStatusType;
  reason?: string;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<VerificationStatusType, {
  icon: typeof ShieldCheck;
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
}> = {
  verified: {
    icon: ShieldCheck,
    label: 'Verified',
    description: 'Data integrity verified against on-chain fingerprint',
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
  },
  unverified: {
    icon: Shield,
    label: 'Unverified',
    description: 'Data integrity verification was not performed',
    colorClass: 'text-gray-400',
    bgClass: 'bg-gray-500/10',
  },
  failed: {
    icon: ShieldAlert,
    label: 'Verification Failed',
    description: 'Data may have been tampered with',
    colorClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
  },
  pending: {
    icon: Loader2,
    label: 'Verifying',
    description: 'Verification in progress',
    colorClass: 'text-yellow-500',
    bgClass: 'bg-yellow-500/10',
  },
  unavailable: {
    icon: ShieldQuestion,
    label: 'Unavailable',
    description: 'Verification could not be performed',
    colorClass: 'text-gray-500',
    bgClass: 'bg-gray-500/10',
  },
};

const sizeConfig = {
  sm: {
    icon: 'h-3 w-3',
    text: 'text-xs',
    padding: 'px-1.5 py-0.5',
  },
  md: {
    icon: 'h-4 w-4',
    text: 'text-sm',
    padding: 'px-2 py-1',
  },
  lg: {
    icon: 'h-5 w-5',
    text: 'text-base',
    padding: 'px-3 py-1.5',
  },
};

export const VerificationBadge = ({
  status,
  reason,
  className,
  showLabel = true,
  size = 'md',
}: VerificationBadgeProps) => {
  const config = statusConfig[status];
  const sizeClasses = sizeConfig[size];
  const Icon = config.icon;

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        config.bgClass,
        sizeClasses.padding,
        className
      )}
    >
      <Icon
        className={cn(
          sizeClasses.icon,
          config.colorClass,
          status === 'pending' && 'animate-spin'
        )}
      />
      {showLabel && (
        <span className={cn(sizeClasses.text, config.colorClass, 'font-medium')}>
          {config.label}
        </span>
      )}
    </div>
  );

  const tooltipContent = reason || config.description;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Full verification status component with detailed information
 */
interface VerificationStatusPanelProps {
  status: VerificationStatusType;
  reason?: string;
  onChainFingerprint?: string;
  calculatedFingerprint?: string;
  className?: string;
}

export const VerificationStatusPanel = ({
  status,
  reason,
  onChainFingerprint,
  calculatedFingerprint,
  className,
}: VerificationStatusPanelProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-lg border p-4', config.bgClass, className)}>
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            'h-6 w-6 mt-0.5',
            config.colorClass,
            status === 'pending' && 'animate-spin'
          )}
        />
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold', config.colorClass)}>
            {config.label}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {reason || config.description}
          </p>
          
          {(onChainFingerprint || calculatedFingerprint) && (
            <div className="mt-3 space-y-2 text-xs font-mono">
              {onChainFingerprint && (
                <div>
                  <span className="text-muted-foreground">On-chain: </span>
                  <span className="text-foreground break-all">
                    {onChainFingerprint.slice(0, 20)}...{onChainFingerprint.slice(-8)}
                  </span>
                </div>
              )}
              {calculatedFingerprint && (
                <div>
                  <span className="text-muted-foreground">Calculated: </span>
                  <span className="text-foreground break-all">
                    {calculatedFingerprint.slice(0, 20)}...{calculatedFingerprint.slice(-8)}
                  </span>
                </div>
              )}
              {onChainFingerprint && calculatedFingerprint && (
                <div className={cn(
                  'font-semibold',
                  onChainFingerprint === calculatedFingerprint 
                    ? 'text-emerald-500' 
                    : 'text-red-500'
                )}>
                  {onChainFingerprint === calculatedFingerprint 
                    ? '✓ Fingerprints match' 
                    : '✗ Fingerprints do not match'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Inline verification indicator for lists
 */
interface VerificationIndicatorProps {
  status: VerificationStatusType;
  className?: string;
}

export const VerificationIndicator = ({
  status,
  className,
}: VerificationIndicatorProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon
            className={cn(
              'h-4 w-4',
              config.colorClass,
              status === 'pending' && 'animate-spin',
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerificationBadge;
