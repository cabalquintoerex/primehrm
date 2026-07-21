import type { AssessmentGroup } from '@/types';

/**
 * Mirrors server/src/config/assessmentDefaults.ts `computeAssessment`.
 *
 *   factor equivalent % = maxWeight x rating%
 *   group subtotal      = sum of those equivalents
 *   group points        = subtotal x group points
 *   total               = sum of group points
 *
 * The client computes this only for live display while typing — the server always recomputes
 * and stores the authoritative total on save.
 */
export function computeAssessment(
  groups: AssessmentGroup[],
  ratings: Record<string, number | ''>
) {
  const groupSubtotals: Record<number, number> = {};
  const groupPoints: Record<number, number> = {};
  let total = 0;

  for (const group of groups) {
    let subtotal = 0;
    for (const factor of group.factors) {
      const raw = ratings[String(factor.id)];
      const rating = raw === '' || raw == null ? 0 : Number(raw);
      subtotal += Number(factor.maxWeight) * (rating / 100);
    }
    const points = subtotal * Number(group.points);
    groupSubtotals[group.id] = subtotal;
    groupPoints[group.id] = points;
    total += points;
  }

  return { groupSubtotals, groupPoints, total };
}

/** Total points available across the template (100 on the CSC default). */
export function templateMaxPoints(groups: AssessmentGroup[]): number {
  return groups.reduce((sum, g) => sum + Number(g.points), 0);
}

/** Per-group max weight sum — should be 1; anything else is flagged in the editor. */
export function groupWeightSum(group: AssessmentGroup): number {
  return group.factors.reduce((sum, f) => sum + Number(f.maxWeight), 0);
}
