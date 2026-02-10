import type { Commitment } from '@/types';

export interface TransparencyScore {
  score: number;           // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;           // Tailwind color class
  breakdown: {
    fulfillment: number;   // 0-100 (weight: 50%)
    deadline: number;      // 0-100 (weight: 25%)
    evidence: number;      // 0-100 (weight: 25%)
  };
  totalCommitments: number;
  completedCount: number;
}

type Grade = TransparencyScore['grade'];

const STATUS_POINTS: Record<string, number> = {
  completed: 100,
  modified: 40,
  pending: 50,
  delayed: 25,
  cancelled: 0,
};

const GRADE_THRESHOLDS: { min: number; grade: Grade }[] = [
  { min: 80, grade: 'A' },
  { min: 60, grade: 'B' },
  { min: 40, grade: 'C' },
  { min: 20, grade: 'D' },
  { min: 0, grade: 'F' },
];

const GRADE_COLORS: Record<Grade, string> = {
  A: 'text-emerald-400',
  B: 'text-lime-400',
  C: 'text-yellow-400',
  D: 'text-orange-400',
  F: 'text-red-400',
};

function getGrade(score: number): Grade {
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (score >= min) return grade;
  }
  return 'F';
}

export function getGradeFromScore(score: number): { grade: Grade; color: string } {
  const grade = getGrade(score);
  return { grade, color: GRADE_COLORS[grade] };
}

export function calculateTransparencyScore(commitments: Commitment[]): TransparencyScore | null {
  if (commitments.length === 0) return null;

  // --- Fulfillment (50%) ---
  const fulfillmentTotal = commitments.reduce(
    (sum, c) => sum + (STATUS_POINTS[c.status] ?? 50),
    0
  );
  const fulfillment = Math.round(fulfillmentTotal / commitments.length);

  // --- Deadline Adherence (25%) ---
  const now = Date.now();
  const deadlineCommitments = commitments.filter((c) => c.targetDate != null);

  let deadline: number;
  if (deadlineCommitments.length === 0) {
    deadline = fulfillment; // fallback to fulfillment score
  } else {
    const deadlineTotal = deadlineCommitments.reduce((sum, c) => {
      const target = c.targetDate!;
      if (c.status === 'completed') {
        const updated = c.statusUpdatedAt ?? c.updatedAt;
        return sum + (updated <= target ? 100 : 50);
      }
      if ((c.status === 'delayed' || c.status === 'pending') && now > target) {
        return sum + 25;
      }
      return sum + 100; // not yet due
    }, 0);
    deadline = Math.round(deadlineTotal / deadlineCommitments.length);
  }

  // --- Evidence (25%) ---
  const evidenceCommitments = commitments.filter(
    (c) => c.status === 'completed' || c.status === 'delayed'
  );

  let evidence: number;
  if (evidenceCommitments.length === 0) {
    evidence = 100; // no penalty
  } else {
    const evidenceTotal = evidenceCommitments.reduce(
      (sum, c) => sum + (c.evidenceUrl ? 100 : 0),
      0
    );
    evidence = Math.round(evidenceTotal / evidenceCommitments.length);
  }

  // --- Weighted Total ---
  const score = Math.round(fulfillment * 0.5 + deadline * 0.25 + evidence * 0.25);
  const grade = getGrade(score);

  return {
    score,
    grade,
    color: GRADE_COLORS[grade],
    breakdown: { fulfillment, deadline, evidence },
    totalCommitments: commitments.length,
    completedCount: commitments.filter((c) => c.status === 'completed').length,
  };
}
