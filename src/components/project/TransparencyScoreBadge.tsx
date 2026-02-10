'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TransparencyScore } from '@/lib/transparency-score';
import { getGradeFromScore } from '@/lib/transparency-score';
import { BarChart3 } from 'lucide-react';

interface TransparencyScoreBadgeProps {
  score: TransparencyScore | null;
  variant?: 'compact' | 'detailed';
}

const CIRCLE_SIZE = 100;
const STROKE_WIDTH = 8;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CircularProgress({ value, color }: { value: number; color: string }) {
  const offset = CIRCUMFERENCE - (value / 100) * CIRCUMFERENCE;

  return (
    <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} className="mx-auto">
      <circle
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        className="text-muted/30"
      />
      <circle
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={color}
        transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
      />
    </svg>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const { color } = getGradeFromScore(value);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={color}>{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/30">
        <div
          className={`h-1.5 rounded-full ${color.replace('text-', 'bg-')}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export const TransparencyScoreBadge = ({
  score,
  variant = 'compact',
}: TransparencyScoreBadgeProps) => {
  if (variant === 'compact') {
    if (!score) {
      return (
        <span className="text-xs text-muted-foreground">&mdash;</span>
      );
    }
    const { grade, color } = getGradeFromScore(score.score);
    return (
      <span className={`text-xs font-semibold ${color}`}>
        {grade} {score.score}
      </span>
    );
  }

  // detailed variant
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <BarChart3 className="mr-2 h-5 w-5 text-emerald-400" />
          Transparency Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!score ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Not enough data
          </p>
        ) : (
          <div className="space-y-4">
            {/* Circular progress with score */}
            <div className="relative">
              <CircularProgress value={score.score} color={score.color} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${score.color}`}>
                  {score.grade}
                </span>
                <span className="text-xs text-muted-foreground">
                  {score.score}/100
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-3">
              <BreakdownBar label="Fulfillment" value={score.breakdown.fulfillment} />
              <BreakdownBar label="Deadline" value={score.breakdown.deadline} />
              <BreakdownBar label="Evidence" value={score.breakdown.evidence} />
            </div>

            {/* Summary */}
            <div className="text-xs text-muted-foreground text-center pt-1">
              {score.completedCount}/{score.totalCommitments} commitments completed
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
