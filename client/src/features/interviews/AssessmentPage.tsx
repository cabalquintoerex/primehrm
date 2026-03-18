import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Save, CheckCircle, Award } from 'lucide-react';
import { toast } from 'sonner';
import type { AssessmentScore, Application, Position, ApplicationStatus } from '@/types';

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
  educationScore: number;
  trainingScore: number;
  experienceScore: number;
  performanceScore: number;
  psychosocialScore: number;
  potentialScore: number;
  interviewScore: number;
  remarks: string;
  existingId?: number;
  dirty: boolean;
}

function toNum(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  return Number(val) || 0;
}

export function AssessmentPage() {
  const { positionId } = useParams<{ positionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [scores, setScores] = useState<Record<number, ScoreRow>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Fetch position
  const { data: position } = useQuery<Position>({
    queryKey: ['position', positionId],
    queryFn: async () => {
      const { data } = await api.get(`/positions/${positionId}`);
      return data.data;
    },
    enabled: !!positionId,
  });

  // Fetch applications for this position (INTERVIEWED, QUALIFIED, SELECTED statuses)
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
      responses.forEach((res) => {
        results.push(...(res.data.data || []));
      });
      return results;
    },
    enabled: !!positionId,
  });

  // Fetch existing scores
  const { data: existingScores, isLoading: scoresLoading } = useQuery<AssessmentScore[]>({
    queryKey: ['assessments', positionId],
    queryFn: async () => {
      const { data } = await api.get(`/assessments/position/${positionId}`);
      return data.data;
    },
    enabled: !!positionId,
  });

  // Initialize scores from applications and existing scores
  useEffect(() => {
    if (!applications) return;

    const scoreMap: Record<number, ScoreRow> = {};

    applications.forEach((app) => {
      const existing = existingScores?.find((s) => s.applicationId === app.id);
      scoreMap[app.id] = {
        applicationId: app.id,
        application: app,
        educationScore: toNum(existing?.educationScore),
        trainingScore: toNum(existing?.trainingScore),
        experienceScore: toNum(existing?.experienceScore),
        performanceScore: toNum(existing?.performanceScore),
        psychosocialScore: toNum(existing?.psychosocialScore),
        potentialScore: toNum(existing?.potentialScore),
        interviewScore: toNum(existing?.interviewScore),
        remarks: existing?.remarks || '',
        existingId: existing?.id,
        dirty: false,
      };
    });

    setScores(scoreMap);
  }, [applications, existingScores]);

  // Compute sorted rows by total descending
  const sortedRows = useMemo(() => {
    return Object.values(scores).sort((a, b) => {
      const totalA = a.educationScore + a.trainingScore + a.experienceScore +
        a.performanceScore + a.psychosocialScore + a.potentialScore + a.interviewScore;
      const totalB = b.educationScore + b.trainingScore + b.experienceScore +
        b.performanceScore + b.psychosocialScore + b.potentialScore + b.interviewScore;
      return totalB - totalA;
    });
  }, [scores]);

  const updateScore = (appId: number, field: keyof ScoreRow, value: number | string) => {
    setScores((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], [field]: value, dirty: true },
    }));
  };

  // Save score mutation
  const saveMutation = useMutation({
    mutationFn: async (row: ScoreRow) => {
      return api.post('/assessments', {
        applicationId: row.applicationId,
        positionId: Number(positionId),
        educationScore: row.educationScore,
        trainingScore: row.trainingScore,
        experienceScore: row.experienceScore,
        performanceScore: row.performanceScore,
        psychosocialScore: row.psychosocialScore,
        potentialScore: row.potentialScore,
        interviewScore: row.interviewScore,
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

  // Qualify mutation
  const qualifyMutation = useMutation({
    mutationFn: async (applicationIds: number[]) => {
      return api.post('/assessments/qualify', { applicationIds });
    },
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

  // Select for appointment mutation
  const selectMutation = useMutation({
    mutationFn: async (applicationIds: number[]) => {
      return api.post('/assessments/select', { applicationIds });
    },
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

  const isLoading = appsLoading || scoresLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasInterviewed = sortedRows.some((r) => r.application.status === 'INTERVIEWED');
  const hasQualified = sortedRows.some((r) => r.application.status === 'QUALIFIED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">
            Comparative Assessment
          </h1>
          <p className="text-muted-foreground">
            {position?.title || 'Loading...'}
            {position?.department?.name && ` — ${position.department.name}`}
          </p>
        </div>
      </div>

      {/* Actions */}
      {selectedIds.length > 0 && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.length} applicant(s) selected</span>
            {hasInterviewed && (
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => qualifyMutation.mutate(selectedIds)}
                disabled={qualifyMutation.isPending}
              >
                {qualifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-2 h-4 w-4" />
                Qualify Selected
              </Button>
            )}
            {hasQualified && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => selectMutation.mutate(selectedIds)}
                disabled={selectMutation.isPending}
              >
                {selectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Award className="mr-2 h-4 w-4" />
                Select for Appointment
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assessment Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === sortedRows.length && sortedRows.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(sortedRows.map((r) => r.applicationId));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-center">Education</TableHead>
              <TableHead className="w-20 text-center">Training</TableHead>
              <TableHead className="w-20 text-center">Experience</TableHead>
              <TableHead className="w-20 text-center">Performance</TableHead>
              <TableHead className="w-20 text-center">Psychosocial</TableHead>
              <TableHead className="w-20 text-center">Potential</TableHead>
              <TableHead className="w-20 text-center">Interview</TableHead>
              <TableHead className="w-20 text-center font-bold">Total</TableHead>
              <TableHead className="w-32">Remarks</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                  No applicants found for assessment
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row, index) => {
                const total = row.educationScore + row.trainingScore + row.experienceScore +
                  row.performanceScore + row.psychosocialScore + row.potentialScore + row.interviewScore;
                const applicant = row.application.applicant;

                return (
                  <TableRow key={row.applicationId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.applicationId)}
                        onChange={() => toggleSelected(row.applicationId)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="text-center font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {applicant ? `${applicant.firstName} ${applicant.lastName}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={APP_STATUS_CONFIG[row.application.status].className}>
                        {APP_STATUS_CONFIG[row.application.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-16 h-8 text-center text-sm p-1"
                        value={row.educationScore || ''}
                        onChange={(e) => updateScore(row.applicationId, 'educationScore', Number(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-16 h-8 text-center text-sm p-1"
                        value={row.trainingScore || ''}
                        onChange={(e) => updateScore(row.applicationId, 'trainingScore', Number(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-16 h-8 text-center text-sm p-1"
                        value={row.experienceScore || ''}
                        onChange={(e) => updateScore(row.applicationId, 'experienceScore', Number(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-16 h-8 text-center text-sm p-1"
                        value={row.performanceScore || ''}
                        onChange={(e) => updateScore(row.applicationId, 'performanceScore', Number(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-16 h-8 text-center text-sm p-1"
                        value={row.psychosocialScore || ''}
                        onChange={(e) => updateScore(row.applicationId, 'psychosocialScore', Number(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-16 h-8 text-center text-sm p-1"
                        value={row.potentialScore || ''}
                        onChange={(e) => updateScore(row.applicationId, 'potentialScore', Number(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-16 h-8 text-center text-sm p-1"
                        value={row.interviewScore || ''}
                        onChange={(e) => updateScore(row.applicationId, 'interviewScore', Number(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell className="text-center font-bold">{total}</TableCell>
                    <TableCell>
                      <Input
                        className="w-28 h-8 text-sm p-1"
                        placeholder="Remarks"
                        value={row.remarks}
                        onChange={(e) => updateScore(row.applicationId, 'remarks', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => saveMutation.mutate(row)}
                        disabled={!row.dirty || saveMutation.isPending}
                        title="Save score"
                      >
                        <Save className={`h-4 w-4 ${row.dirty ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
