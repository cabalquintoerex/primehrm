import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Trash2, Download, Save, Briefcase, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { generateWES } from '@/lib/generateWES';
import type { WESData, WESEntry } from '@/types';

const emptyEntry = (): WESEntry => ({
  duration: '',
  position: '',
  officeUnit: '',
  immediateSupervisor: '',
  agencyAndLocation: '',
  accomplishments: [''],
  summaryOfDuties: '',
});

/**
 * Coerce a stored entry into the current shape. Rows saved under the retired WES shape (or any
 * partial data) would otherwise reach the render with `accomplishments` undefined and crash the
 * page on `.map()`. Unknown fields are dropped; missing ones fall back to empty.
 */
const normaliseEntry = (raw: any): WESEntry => ({
  ...emptyEntry(),
  ...(raw && typeof raw === 'object' ? raw : {}),
  accomplishments: Array.isArray(raw?.accomplishments) && raw.accomplishments.length
    ? raw.accomplishments
    : [''],
  duration: typeof raw?.duration === 'string' ? raw.duration : '',
  position: typeof raw?.position === 'string' ? raw.position : '',
  officeUnit: typeof raw?.officeUnit === 'string' ? raw.officeUnit : '',
  immediateSupervisor: typeof raw?.immediateSupervisor === 'string' ? raw.immediateSupervisor : '',
  agencyAndLocation: typeof raw?.agencyAndLocation === 'string' ? raw.agencyAndLocation : '',
  summaryOfDuties: typeof raw?.summaryOfDuties === 'string' ? raw.summaryOfDuties : '',
});

const FIELDS: Array<{ key: keyof Omit<WESEntry, 'accomplishments' | 'summaryOfDuties'>; label: string; placeholder: string; full?: boolean }> = [
  { key: 'duration', label: 'Duration', placeholder: 'e.g. February 11, 2011 – Present' },
  { key: 'position', label: 'Position', placeholder: 'e.g. Human Resource Management Officer III' },
  { key: 'officeUnit', label: 'Name of Office/Unit', placeholder: 'e.g. Finance and Administrative Service' },
  { key: 'immediateSupervisor', label: 'Immediate Supervisor', placeholder: 'e.g. Maria Estrada' },
  { key: 'agencyAndLocation', label: 'Name of Agency/Organization and Location', placeholder: 'e.g. Department of Human Resources, Metro Manila', full: true },
];

export function WESFormPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<WESEntry[]>([emptyEntry()]);

  const { data: wes, isLoading } = useQuery<WESData | null>({
    queryKey: ['wes'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/wes');
        return data.data?.data ?? null;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
  });

  // Sync on query result rather than inside queryFn — setState in queryFn is unreliable
  // with cached queries (same fix as the PDS form).
  useEffect(() => {
    if (Array.isArray(wes?.entries) && wes.entries.length) {
      setEntries(wes.entries.map(normaliseEntry));
    }
  }, [wes]);

  const saveMutation = useMutation({
    mutationFn: async () => api.post('/wes', { data: { entries } }),
    onSuccess: () => toast.success('Work Experience Sheet saved successfully'),
    onError: (error: any) =>
      toast.error(error.response?.data?.message || 'Failed to save Work Experience Sheet'),
  });

  const updateEntry = (idx: number, patch: Partial<WESEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const updateAccomplishment = (entryIdx: number, accIdx: number, value: string) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === entryIdx
          ? { ...e, accomplishments: e.accomplishments.map((a, j) => (j === accIdx ? value : a)) }
          : e
      )
    );
  };

  const addAccomplishment = (entryIdx: number) =>
    updateEntry(entryIdx, { accomplishments: [...entries[entryIdx].accomplishments, ''] });

  const removeAccomplishment = (entryIdx: number, accIdx: number) =>
    updateEntry(entryIdx, {
      accomplishments: entries[entryIdx].accomplishments.filter((_, j) => j !== accIdx),
    });

  const addEntry = () => setEntries((prev) => [...prev, emptyEntry()]);

  const removeEntry = (idx: number) => {
    if (entries.length === 1) {
      setEntries([emptyEntry()]);
      return;
    }
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDownload = () => {
    const printedName = user ? `${user.firstName} ${user.lastName}`.toUpperCase() : '';
    generateWES({ entries }, printedName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground"
            onClick={() => navigate('/applicant/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-600" />
            Work Experience Sheet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Attachment to CS Form No. 212. Separate from your PDS — fill this in on its own.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Instructions — reproduced from the form itself */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <p className="text-sm font-semibold text-amber-900 mb-2">Instructions</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-amber-800">
          <li>Include only the work experiences relevant to the position being applied to.</li>
          <li>
            The duration should include start and finish dates, if known, month in abbreviated form,
            if known, and year in full. For the current position, use the word{' '}
            <span className="font-semibold">Present</span>, e.g., 1998-Present. Work experience
            should be listed from most recent first.
          </li>
        </ol>
      </Card>

      {/* Entries */}
      {entries.map((entry, idx) => (
        <Card key={idx} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">
              Work Experience {idx + 1}
              {entry.position && (
                <span className="ml-2 font-normal text-muted-foreground">— {entry.position}</span>
              )}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => removeEntry(idx)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remove
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className={`space-y-1.5 ${field.full ? 'sm:col-span-2' : ''}`}>
                <Label htmlFor={`${field.key}-${idx}`} className="text-xs font-medium text-gray-700">
                  {field.label}
                </Label>
                <Input
                  id={`${field.key}-${idx}`}
                  value={entry[field.key]}
                  placeholder={field.placeholder}
                  onChange={(e) => updateEntry(idx, { [field.key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          {/* Accomplishments */}
          <div className="mt-5">
            <Label className="text-xs font-medium text-gray-700">
              List of Accomplishments and Contributions{' '}
              <span className="text-muted-foreground font-normal">(if any)</span>
            </Label>
            <div className="mt-2 space-y-2">
              {(entry.accomplishments ?? []).map((acc, accIdx) => (
                <div key={accIdx} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">•</span>
                  <Input
                    value={acc}
                    placeholder="e.g. Developed recruitment plan"
                    onChange={(e) => updateAccomplishment(idx, accIdx, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeAccomplishment(idx, accIdx)}
                    disabled={(entry.accomplishments ?? []).length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => addAccomplishment(idx)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add accomplishment
            </Button>
          </div>

          {/* Summary of duties */}
          <div className="mt-5 space-y-1.5">
            <Label htmlFor={`duties-${idx}`} className="text-xs font-medium text-gray-700">
              Summary of Actual Duties
            </Label>
            <Textarea
              id={`duties-${idx}`}
              rows={5}
              value={entry.summaryOfDuties}
              placeholder="Responsible for the management of the recruitment and selection process and the coordination of training activities of the Department..."
              onChange={(e) => updateEntry(idx, { summaryOfDuties: e.target.value })}
            />
          </div>
        </Card>
      ))}

      <Button variant="outline" className="w-full" onClick={addEntry}>
        <Plus className="mr-2 h-4 w-4" />
        Add Work Experience
      </Button>

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Work Experience Sheet
        </Button>
      </div>
    </div>
  );
}
