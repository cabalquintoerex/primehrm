/**
 * Default comparative assessment template (CS Comparative Assessment Form).
 *
 * Taken from the reference workbook. Point weights across groups sum to 100, and the
 * max weights within a multi-factor group sum to 1.
 *
 *   I  - [25] PERFORMANCE
 *   II - ETE [40] EDUCATION 0.35 / Relevant TRAINING 0.30 / Relevant EXPERIENCE 0.35
 *   III- [30] PSYCHO-SOCIAL ATTRIBUTES & POTENTIAL
 *   IV - [5]  OUTSTANDING ACCOMPLISHMENTS
 */
export interface DefaultFactor {
  label: string;
  maxWeight: number;
}

export interface DefaultGroup {
  code: string;
  label: string | null;
  points: number;
  factors: DefaultFactor[];
}

export const DEFAULT_ASSESSMENT_TEMPLATE: DefaultGroup[] = [
  {
    code: 'I',
    label: null,
    points: 25,
    factors: [{ label: 'PERFORMANCE', maxWeight: 1 }],
  },
  {
    code: 'II',
    label: 'ETE',
    points: 40,
    factors: [
      { label: 'EDUCATION', maxWeight: 0.35 },
      { label: 'Relevant TRAINING', maxWeight: 0.3 },
      { label: 'Relevant EXPERIENCE', maxWeight: 0.35 },
    ],
  },
  {
    code: 'III',
    label: null,
    points: 30,
    factors: [{ label: 'PSYCHO-SOCIAL ATTRIBUTES & POTENTIAL', maxWeight: 1 }],
  },
  {
    code: 'IV',
    label: null,
    points: 5,
    factors: [{ label: 'OUTSTANDING ACCOMPLISHMENTS', maxWeight: 1 }],
  },
];

export interface ScoredFactor {
  id: number;
  maxWeight: number | string;
}

export interface ScoredGroup {
  id: number;
  points: number | string;
  factors: ScoredFactor[];
}

/**
 * The workbook's computation, expressed once:
 *
 *   factor equivalent % = maxWeight x rating%          (G13 = $G$11 * rating)
 *   group subtotal      = sum of those equivalents      (H14 = SUM(G13:I13))
 *   group points        = subtotal x group points       (G15 = H14 * 40)
 *   total               = sum of group points           (L15 = SUM(F15:K15))
 *
 * Single-factor groups are the degenerate case where maxWeight = 1.
 */
export function computeAssessment(
  groups: ScoredGroup[],
  ratings: Record<string, number>
): { groupSubtotals: Record<number, number>; groupPoints: Record<number, number>; total: number } {
  const groupSubtotals: Record<number, number> = {};
  const groupPoints: Record<number, number> = {};
  let total = 0;

  for (const group of groups) {
    let subtotal = 0;
    for (const factor of group.factors) {
      const rating = Number(ratings[String(factor.id)] ?? 0);
      subtotal += Number(factor.maxWeight) * (rating / 100);
    }
    const points = subtotal * Number(group.points);
    groupSubtotals[group.id] = subtotal;
    groupPoints[group.id] = points;
    total += points;
  }

  return { groupSubtotals, groupPoints, total };
}
