import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Save, CheckCircle, Award, Plus, Trash2, SlidersHorizontal, AlertTriangle, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { computeAssessment, templateMaxPoints } from '@/lib/assessment';

import { generateComparativeAssessment } from '@/lib/generateComparativeAssessment';
import type { AssessmentScore, AssessmentGroup, Application, Position, ApplicationStatus, PsbMember } from '@/types';

/** Weights are stored as fractions (0.35) but shown and entered as percentages (35%). */
const toPercent = (weight: number | string) => Number((Number(weight) * 100).toFixed(2));
const fromPercent = (percent: number) => Number((percent / 100).toFixed(6));


const APP_STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  SUBMITTED: { label: 'Submitted', className: 'bg-gray-500 text-white border-transparent' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-blue-500 text-white border-transparent' },
  ENDORSED: { label: 'Endorsed', className: 'bg-indigo-500 text-white border-transparent' },
  SHORTLISTED: { label: 'Shortlisted', className: 'bg-amber-500 text-white border-transparent' },
  FOR_INTERVIEW: { label: 'For Interview', className: 'bg-purple-500 text-white border-transparent' },
  INTERVIEWED: { label: 'Interviewed', className: 'bg-violet-500 text-white border-transparent' },
  QUALIFIED: { label: 'Qualified', className: 'bg-teal-500 text-white border-transparent' },
  SELECTED: { label: 'Selected', className: 'bg-emerald-500 text-white border-transparent' },
  APPOINTED: { label: 'Appointed', className: 'bg-green-600 text-white border-transparent' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500 text-white border-transparent' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-slate-500 text-white border-transparent' },
};

interface ScoreRow {
  applicationId: number;
  application: Application;
  /** factorId -> rating percent (0-100), '' while the field is being cleared */
  ratings: Record<string, number | ''>;
  remarks: string;
  dirty: boolean;
}

/** Editor-side shape — mirrors the API payload, without ids since save replaces the tree. */
interface DraftGroup {
  code: string;
  label: string;
  points: number | '';
  factors: Array<{ label: string; maxWeight: number | '' }>;
}

export function AssessmentPage() {
  const { positionId } = useParams<{ positionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [scores, setScores] = useState<Record<number, ScoreRow>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<DraftGroup[]>([]);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: position } = useQuery<Position>({
    queryKey: ['position', positionId],
    queryFn: async () => {
      const { data } = await api.get(`/positions/${positionId}`);
      return data.data;
    },
    enabled: !!positionId,
  });

  // The position's own snapshot of the factor template (created on first read server-side).
  const { data: groups, isLoading: templateLoading } = useQuery<AssessmentGroup[]>({
    queryKey: ['assessment-template', positionId],
    queryFn: async () => {
      const { data } = await api.get(`/assessments/template/position/${positionId}`);
      return data.data || [];
    },
    enabled: !!positionId,
  });

  const { data: applications, isLoading: appsLoading } = useQuery<Application[]>({
    queryKey: ['assessment-applications', positionId],
    queryFn: async () => {
      const results: Application[] = [];
      const statuses = ['INTERVIEWED', 'QUALIFIED', 'SELECTED'];
      const responses = await Promise.all(
        statuses.map((status) =>
          api.get('/applications', { params: { positionId, status, limit: 100 } })
        )
      );
      responses.forEach((res) => results.push(...(res.data.data || [])));
      return results;
    },
    enabled: !!positionId,
  });

  const { data: existingScores, isLoading: scoresLoading } = useQuery<AssessmentScore[]>({
    queryKey: ['assessments', positionId],
    queryFn: async () => {
      const { data } = await api.get(`/assessments/position/${positionId}`);
      return data.data;
    },
    enabled: !!positionId,
  });

  useEffect(() => {
    if (!applications) return;
    const map: Record<number, ScoreRow> = {};
    applications.forEach((app) => {
      const existing = existingScores?.find((s) => s.applicationId === app.id);
      map[app.id] = {
        applicationId: app.id,
        application: app,
        ratings: { ...(existing?.factorScores ?? {}) },
        remarks: existing?.remarks || '',
        dirty: false,
      };
    });
    setScores(map);
  }, [applications, existingScores]);

  const allFactors = useMemo(() => (groups ?? []).flatMap((g) => g.factors), [groups]);
  const maxPoints = useMemo(() => templateMaxPoints(groups ?? []), [groups]);

  // Ranked by the SAVED total, not the live one — otherwise rows jump under the cursor while
  // typing. Saving invalidates ['assessments'], the refetch lands, and the ranking settles then.
  const sortedRows = useMemo(() => {
    const savedTotal = (appId: number) =>
      Number(existingScores?.find((s) => s.applicationId === appId)?.totalScore ?? 0);
    return Object.values(scores)
      .map((row) => ({
        row,
        calc: computeAssessment(groups ?? [], row.ratings),
        saved: savedTotal(row.applicationId),
      }))
      .sort((a, b) => b.saved - a.saved);
  }, [scores, groups, existingScores]);

  const dirtyRows = useMemo(() => Object.values(scores).filter((r) => r.dirty), [scores]);

  const updateRating = (appId: number, factorId: number, raw: string) => {
    const value: number | '' = raw === '' ? '' : Math.max(0, Math.min(100, Number(raw)));
    setScores((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        ratings: { ...prev[appId].ratings, [String(factorId)]: value },
        dirty: true,
      },
    }));
  };

  const updateRemarks = (appId: number, remarks: string) => {
    setScores((prev) => ({ ...prev, [appId]: { ...prev[appId], remarks, dirty: true } }));
  };

  const saveMutation = useMutation({
    mutationFn: async (row: ScoreRow) => {
      const factorScores: Record<string, number> = {};
      for (const [id, val] of Object.entries(row.ratings)) {
        factorScores[id] = val === '' ? 0 : Number(val);
      }
      return api.post('/assessments', {
        applicationId: row.applicationId,
        factorScores,
        remarks: row.remarks || null,
      });
    },
    onSuccess: (_, row) => {
      queryClient.invalidateQueries({ queryKey: ['assessments', positionId] });
      setScores((prev) => ({
        ...prev,
        [row.applicationId]: { ...prev[row.applicationId], dirty: false },
      }));
      toast.success('Score saved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save score');
    },
  });

  // Saves every edited row, reporting progress so a long batch doesn't look frozen.
  const saveAllMutation = useMutation({
    mutationFn: async (rows: ScoreRow[]) => {
      setSaveProgress({ done: 0, total: rows.length });
      for (const [index, row] of rows.entries()) {
        const factorScores: Record<string, number> = {};
        for (const [id, val] of Object.entries(row.ratings)) {
          factorScores[id] = val === '' ? 0 : Number(val);
        }
        await api.post('/assessments', {
          applicationId: row.applicationId,
          factorScores,
          remarks: row.remarks || null,
        });
        setSaveProgress({ done: index + 1, total: rows.length });
      }
      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['assessments', positionId] });
      setScores((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          next[Number(key)] = { ...next[Number(key)], dirty: false };
        });
        return next;
      });
      toast.success(`Saved ${count} score${count === 1 ? '' : 's'} — ranking updated`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save scores');
    },
    onSettled: () => setSaveProgress(null),
  });

  const templateMutation = useMutation({
    mutationFn: async (payload: DraftGroup[]) => {
      return api.put(`/assessments/template/position/${positionId}`, {
        groups: payload.map((g) => ({
          code: g.code,
          label: g.label || null,
          points: g.points === '' ? 0 : Number(g.points),
          factors: g.factors.map((f) => ({
            label: f.label,
            // The editor works in percent; the API stores fractions.
            maxWeight: f.maxWeight === '' ? 0 : fromPercent(Number(f.maxWeight)),
          })),
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-template', positionId] });
      queryClient.invalidateQueries({ queryKey: ['assessments', positionId] });
      toast.success('Assessment factors updated');
      setEditorOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update factors');
    },
  });

  const qualifyMutation = useMutation({
    mutationFn: async (applicationIds: number[]) => api.post('/assessments/qualify', { applicationIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-applications', positionId] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Selected applicants marked as qualified');
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to qualify applicants');
    },
  });

  const selectMutation = useMutation({
    mutationFn: async (applicationIds: number[]) => api.post('/assessments/select', { applicationIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-applications', positionId] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Selected applicants marked for appointment');
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to select applicants');
    },
  });

  const toggleSelected = (appId: number) => {
    setSelectedIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  // Export pulls the signatory block and each applicant's PDS (for gender + eligibility, which
  // the assessment endpoint doesn't carry) and hands everything to the PDF builder.
  const exportMutation = useMutation({
    mutationFn: async () => {
      const [{ data: psbData }] = await Promise.all([api.get('/psb-members')]);
      const psb: PsbMember[] = psbData.data || [];

      const candidates = await Promise.all(
        sortedRows.map(async ({ row }) => {
          let gender = '';
          let eligibility = '';
          try {
            const { data } = await api.get(`/applications/${row.applicationId}`);
            const pds = data.data?.personalDataSheet?.data ?? {};
            gender = pds.sex || '';
            eligibility = (pds.eligibilities || [])
              .map((e: any) => e?.name)
              .filter(Boolean)
              .join('; ');
          } catch {
            // PDS is optional on the form — leave the cells blank rather than failing the export
          }
          const ratings: Record<string, number> = {};
          for (const [id, val] of Object.entries(row.ratings)) {
            ratings[id] = val === '' ? 0 : Number(val);
          }
          return {
            name: row.application.applicant
              ? `${row.application.applicant.firstName} ${row.application.applicant.lastName}`.toUpperCase()
              : `APPLICATION #${row.applicationId}`,
            gender,
            eligibility,
            ratings,
            remarks: row.remarks,
          };
        })
      );

      generateComparativeAssessment({
        lguName: user?.lgu?.name || '',
        position: {
          title: position?.title || '',
          itemNumber: position?.itemNumber ?? null,
          salaryGrade: position?.salaryGrade ?? null,
          monthlySalary: position?.monthlySalary ?? null,
          education: position?.education ?? null,
          training: position?.training ?? null,
          experience: position?.experience ?? null,
          eligibility: position?.eligibility ?? null,
          openDate: position?.openDate ?? null,
          departmentName: position?.department?.name ?? null,
          // CSC levels: SG 1-10 is First Level, 11 and above Second Level.
          level: position?.salaryGrade ? (position.salaryGrade >= 11 ? 'Second' : 'First') : '',
        },
        groups: groups ?? [],
        candidates,
        psbMembers: psb.filter((m) => m.type === 'PSB_MEMBER' && m.isActive),
        preparedBy: psb.filter((m) => m.type === 'PREPARED_BY' && m.isActive),
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate the form');
    },
  });

  const openEditor = () => {
    setDraft(
      (groups ?? []).map((g) => ({
        code: g.code,
        label: g.label ?? '',
        points: Number(g.points),
        factors: g.factors.map((f) => ({ label: f.label, maxWeight: toPercent(f.maxWeight) })),
      }))
    );
    setEditorOpen(true);
  };

  const isLoading = appsLoading || scoresLoading || templateLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasInterviewed = sortedRows.some(({ row }) => row.application.status === 'INTERVIEWED');
  const hasQualified = sortedRows.some(({ row }) => row.application.status === 'QUALIFIED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">Comparative Assessment</h1>
          <p className="text-muted-foreground">
            {position?.title || 'Loading...'}
            {position?.department?.name && ` — ${position.department.name}`}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending || sortedRows.length === 0}
        >
          {exportMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Export PDF
        </Button>
        <Button variant="outline" onClick={openEditor}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Edit Factors
        </Button>
      </div>

      {/* Factor editor */}
      {editorOpen && (
        <FactorEditor
          draft={draft}
          setDraft={setDraft}
          onCancel={() => setEditorOpen(false)}
          onSave={() => templateMutation.mutate(draft)}
          saving={templateMutation.isPending}
        />
      )}

      {/* Save bar — appears once anything is edited */}
      {(dirtyRows.length > 0 || saveProgress) && (
        <Card className="border-emerald-300 bg-emerald-50/60">
          <CardContent className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-medium text-emerald-900">
                {saveProgress
                  ? `Saving ${saveProgress.done} of ${saveProgress.total}…`
                  : `${dirtyRows.length} unsaved ${dirtyRows.length === 1 ? 'score' : 'scores'}`}
                <span className="ml-2 font-normal text-xs text-emerald-700">
                  Ranking is recalculated when you save.
                </span>
              </p>
              {saveProgress && (
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-emerald-200">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-200"
                    style={{
                      width: `${saveProgress.total ? (saveProgress.done / saveProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              )}
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => saveAllMutation.mutate(dirtyRows)}
              disabled={saveAllMutation.isPending || dirtyRows.length === 0}
            >
              {saveAllMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save All &amp; Rank
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {(hasInterviewed || hasQualified) && selectedIds.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            {hasInterviewed && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => qualifyMutation.mutate(selectedIds)}
                disabled={qualifyMutation.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Qualify
              </Button>
            )}
            {hasQualified && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => selectMutation.mutate(selectedIds)}
                disabled={selectMutation.isPending}
              >
                <Award className="mr-2 h-4 w-4" />
                Select for Appointment
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scoring table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Factors and Assigned Point Weight</span>
            <span className="text-xs font-normal text-muted-foreground">
              Enter each rating as a percentage (0–100). Total points available: {maxPoints}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allFactors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No assessment factors defined. Use “Edit Factors” to add them.
            </p>
          ) : sortedRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No interviewed applicants for this position yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  {/* Group header — spans its factors plus the subtotal column */}
                  <tr>
                    <th rowSpan={2} className="border p-2 text-left align-bottom min-w-[180px]">
                      Candidate
                    </th>
                    {(groups ?? []).map((group) => (
                      <th
                        key={group.id}
                        colSpan={group.factors.length + (group.factors.length > 1 ? 1 : 0)}
                        className="border bg-muted/60 p-2 text-center font-semibold"
                      >
                        {group.code}
                        {group.label ? ` - ${group.label}` : ''} [{Number(group.points)}]
                      </th>
                    ))}
                    <th rowSpan={2} className="border bg-emerald-50 p-2 text-center align-bottom min-w-[90px]">
                      TOTAL POINTS
                    </th>
                    <th rowSpan={2} className="border p-2 text-center align-bottom min-w-[160px]">
                      Remarks
                    </th>
                    <th rowSpan={2} className="border p-2 align-bottom" />
                  </tr>
                  <tr>
                    {(groups ?? []).flatMap((group) => [
                      ...group.factors.map((factor) => (
                        <th key={factor.id} className="border p-2 text-center font-medium min-w-[92px]">
                          <div>{factor.label}</div>
                          <div className="font-normal text-muted-foreground">
                            {toPercent(factor.maxWeight)}%
                          </div>
                        </th>
                      )),
                      // Subtotal column only where a group has more than one factor
                      ...(group.factors.length > 1
                        ? [
                            <th
                              key={`sub-${group.id}`}
                              className="border bg-muted/40 p-2 text-center font-medium min-w-[80px]"
                            >
                              Subtotal
                            </th>,
                          ]
                        : []),
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map(({ row, calc }, index) => {
                    const app = row.application;
                    const status = APP_STATUS_CONFIG[app.status];
                    return (
                      <tr key={row.applicationId} className="hover:bg-accent/40">
                        <td className="border p-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(row.applicationId)}
                              onChange={() => toggleSelected(row.applicationId)}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {app.applicant
                                  ? `${app.applicant.firstName} ${app.applicant.lastName}`
                                  : `Application #${app.id}`}
                              </div>
                              <Badge className={`${status.className} mt-0.5 text-[10px]`}>
                                {status.label}
                              </Badge>
                            </div>
                          </div>
                        </td>

                        {(groups ?? []).flatMap((group) => [
                          ...group.factors.map((factor) => (
                            <td key={factor.id} className="border p-1 text-center">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={row.ratings[String(factor.id)] ?? ''}
                                onChange={(e) =>
                                  updateRating(row.applicationId, factor.id, e.target.value)
                                }
                                className="h-8 text-center text-xs"
                              />
                            </td>
                          )),
                          ...(group.factors.length > 1
                            ? [
                                <td
                                  key={`sub-${group.id}`}
                                  className="border bg-muted/30 p-2 text-center font-medium"
                                >
                                  {calc.groupSubtotals[group.id].toFixed(4)}
                                  <div className="text-[10px] font-normal text-muted-foreground">
                                    {calc.groupPoints[group.id].toFixed(2)} pts
                                  </div>
                                </td>,
                              ]
                            : []),
                        ])}

                        <td className="border bg-emerald-50 p-2 text-center">
                          <div className="font-bold text-emerald-700">{calc.total.toFixed(2)}</div>
                          <div className="mx-auto mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-emerald-200">
                            <div
                              className="h-full bg-emerald-600 transition-all"
                              style={{
                                width: `${maxPoints ? Math.min(100, (calc.total / maxPoints) * 100) : 0}%`,
                              }}
                            />
                          </div>
                          {row.dirty && (
                            <div className="mt-1 text-[10px] font-medium text-amber-600">unsaved</div>
                          )}
                        </td>
                        <td className="border p-1">
                          <Input
                            value={row.remarks}
                            onChange={(e) => updateRemarks(row.applicationId, e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Remarks"
                          />
                        </td>
                        <td className="border p-1 text-center">
                          <Button
                            size="sm"
                            variant={row.dirty ? 'default' : 'outline'}
                            className={row.dirty ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            onClick={() => saveMutation.mutate(row)}
                            disabled={saveMutation.isPending}
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FactorEditor({
  draft,
  setDraft,
  onCancel,
  onSave,
  saving,
}: {
  draft: DraftGroup[];
  setDraft: (groups: DraftGroup[]) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const totalPoints = draft.reduce((sum, g) => sum + (g.points === '' ? 0 : Number(g.points)), 0);

  const updateGroup = (i: number, patch: Partial<DraftGroup>) =>
    setDraft(draft.map((g, gi) => (gi === i ? { ...g, ...patch } : g)));

  const updateFactor = (gi: number, fi: number, patch: Partial<DraftGroup['factors'][number]>) =>
    setDraft(
      draft.map((g, i) =>
        i === gi ? { ...g, factors: g.factors.map((f, j) => (j === fi ? { ...f, ...patch } : f)) } : g
      )
    );

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <CardTitle className="text-base">Assessment Factors</CardTitle>
        <p className="text-xs text-muted-foreground">
          Applies to this position only. Group points should sum to 100, and each group’s factor
          weights should sum to 100%. Existing ratings are carried over by factor name.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {draft.map((group, gi) => {
          // Percent-based now, so the target is 100 rather than 1.
          const weightSum = group.factors.reduce(
            (sum, f) => sum + (f.maxWeight === '' ? 0 : Number(f.maxWeight)),
            0
          );
          const weightOff = Math.abs(weightSum - 100) > 0.01;
          return (
            <div key={gi} className="rounded-md border p-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-20">
                  <label className="text-[11px] text-muted-foreground">Code</label>
                  <Input
                    value={group.code}
                    onChange={(e) => updateGroup(gi, { code: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="w-32">
                  <label className="text-[11px] text-muted-foreground">Label (optional)</label>
                  <Input
                    value={group.label}
                    onChange={(e) => updateGroup(gi, { label: e.target.value })}
                    placeholder="e.g. ETE"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[11px] text-muted-foreground">Points</label>
                  <Input
                    type="number"
                    min={0}
                    value={group.points}
                    onChange={(e) =>
                      updateGroup(gi, { points: e.target.value === '' ? '' : Number(e.target.value) })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={() => setDraft(draft.filter((_, i) => i !== gi))}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove group
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {group.factors.map((factor, fi) => (
                  <div key={fi} className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground">Factor</label>
                      <Input
                        value={factor.label}
                        onChange={(e) => updateFactor(gi, fi, { label: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-[11px] text-muted-foreground">Max weight %</label>
                      <Input
                        type="number"
                        step="1"
                        min={0}
                        max={100}
                        value={factor.maxWeight}
                        onChange={(e) =>
                          updateFactor(gi, fi, {
                            maxWeight: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={group.factors.length === 1}
                      onClick={() =>
                        updateGroup(gi, { factors: group.factors.filter((_, j) => j !== fi) })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateGroup(gi, { factors: [...group.factors, { label: '', maxWeight: '' }] })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add factor
                </Button>
                <span
                  className={`text-[11px] ${weightOff ? 'text-amber-600' : 'text-muted-foreground'}`}
                >
                  {weightOff && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                  weights sum to {Number(weightSum.toFixed(2))}% (should be 100%)
                  {group.factors.length > 1 && ' — this group shows a subtotal'}
                </span>
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft([...draft, { code: '', label: '', points: '', factors: [{ label: '', maxWeight: 100 }] }])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add group
          </Button>
          <span
            className={`text-xs ${Math.abs(totalPoints - 100) > 0.001 ? 'text-amber-600' : 'text-muted-foreground'}`}
          >
            {Math.abs(totalPoints - 100) > 0.001 && <AlertTriangle className="mr-1 inline h-3 w-3" />}
            total points: {totalPoints}
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={onSave}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Factors
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
