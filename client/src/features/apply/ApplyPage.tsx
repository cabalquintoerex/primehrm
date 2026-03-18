import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, X, CheckCircle2, AlertCircle, UserCheck, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Position, PositionDocumentRequirement, PDSData } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

// Keywords that indicate a PDS requirement (auto-fulfilled by the system)
const PDS_KEYWORDS = ['personal data sheet', 'pds'];

function isPdsRequirement(label: string): boolean {
  const lower = label.toLowerCase();
  return PDS_KEYWORDS.some(kw => lower.includes(kw)) && !lower.includes('work experience');
}

export function ApplyPage() {
  const { slug, positionId } = useParams<{ slug: string; positionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<Record<number, File>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Check if PDS exists — returns the raw PDS JSON (same shape as PDS form query)
  const { data: pds, isLoading: pdsLoading } = useQuery<PDSData | null>({
    queryKey: ['pds'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/pds');
        return data.data?.data || data.data || null;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
  });

  // Fetch position info
  const { data: position, isLoading: positionLoading } = useQuery<Position>({
    queryKey: ['public-position', slug, positionId],
    queryFn: async () => {
      const { data } = await api.get(`/public/${slug}/careers/${positionId}`);
      return data.data;
    },
    enabled: !!slug && !!positionId,
  });

  // Fetch requirements
  const { data: requirements, isLoading: reqLoading } = useQuery<PositionDocumentRequirement[]>({
    queryKey: ['public-position-requirements', slug, positionId],
    queryFn: async () => {
      const { data } = await api.get(`/public/${slug}/careers/${positionId}/requirements`);
      return data.data || data || [];
    },
    enabled: !!slug && !!positionId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // 1. Submit application
      const { data: appData } = await api.post('/applications', { positionId: Number(positionId) });
      const applicationId = appData.data?.id || appData.id;

      // 2. Upload each document
      for (const [reqId, file] of Object.entries(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('requirementId', String(reqId));
        await api.post(`/applications/${applicationId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      toast.success('Application submitted successfully!');
      navigate('/applicant/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit application');
    },
  });

  const handleFileChange = (requirementId: number, file: File | null) => {
    if (!file) {
      const updated = { ...files };
      delete updated[requirementId];
      setFiles(updated);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must not exceed 5MB');
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only PDF, JPEG, and PNG files are accepted');
      return;
    }
    setFiles({ ...files, [requirementId]: file });
  };

  const handleSubmit = () => {
    // Check required documents (skip PDS requirements as they're auto-attached)
    const missingRequired = requirements?.filter(
      (req) => req.isRequired && !files[req.id] && !isPdsRequirement(req.label)
    );
    if (missingRequired && missingRequired.length > 0) {
      toast.error(`Please upload all required documents: ${missingRequired.map(r => r.label).join(', ')}`);
      return;
    }
    submitMutation.mutate();
  };

  const isLoading = pdsLoading || positionLoading || reqLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // If no PDS, show prompt
  if (!pds) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Personal Data Sheet Required</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Please complete your Personal Data Sheet (PDS) first before applying for a position.
          </p>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => navigate('/applicant/pds')}
          >
            Complete PDS
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Position Info */}
        <Card className="p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Apply for Position</h1>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Position:</span>
              <span className="text-sm text-gray-900">{position?.title}</span>
            </div>
            {position?.itemNumber && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Item No.:</span>
                <span className="text-sm text-gray-900">{position.itemNumber}</span>
              </div>
            )}
            {position?.salaryGrade && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Salary Grade:</span>
                <span className="text-sm text-gray-900">{position.salaryGrade}</span>
              </div>
            )}
          </div>
        </Card>

        {/* PDS Profile Summary */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              Applicant Profile
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/applicant/pds')}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit PDS
            </Button>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {pds.firstName} {pds.middleName ? `${pds.middleName.charAt(0)}. ` : ''}{pds.surname}{pds.nameExtension ? ` ${pds.nameExtension}` : ''}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <span className="ml-2 font-medium text-gray-900">{pds.emailAddress || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mobile:</span>
                <span className="ml-2 font-medium text-gray-900">{pds.mobileNo || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date of Birth:</span>
                <span className="ml-2 font-medium text-gray-900">{pds.dateOfBirth || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sex:</span>
                <span className="ml-2 font-medium text-gray-900">{pds.sex || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Civil Status:</span>
                <span className="ml-2 font-medium text-gray-900">{pds.civilStatus || '-'}</span>
              </div>
            </div>
            {pds.education && pds.education.length > 0 && (
              <div className="pt-2 border-t border-emerald-200">
                <span className="text-xs text-muted-foreground">Highest Education:</span>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {pds.education[pds.education.length - 1]?.degree || pds.education[pds.education.length - 1]?.level} — {pds.education[pds.education.length - 1]?.schoolName}
                </span>
              </div>
            )}
            {pds.eligibilities && pds.eligibilities.length > 0 && (
              <div className="pt-2 border-t border-emerald-200">
                <span className="text-xs text-muted-foreground">Eligibility:</span>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {pds.eligibilities.map(e => e.name).join(', ')}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Your PDS information will be attached to this application automatically.
          </p>
        </Card>

        {/* Document Upload */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Upload Documents</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload the required documents for this application. Accepted formats: PDF, JPEG, PNG. Maximum file size: 5MB.
          </p>

          <div className="space-y-4">
            {requirements?.map((req) => {
              const autoFulfilled = isPdsRequirement(req.label);

              if (autoFulfilled) {
                return (
                  <div key={req.id} className="rounded-md border border-emerald-200 bg-emerald-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {req.label}
                          <Badge className="bg-emerald-600 text-[10px] py-0">Auto-attached</Badge>
                        </p>
                        <p className="text-xs text-emerald-700 mt-1">
                          Your Personal Data Sheet from your profile will be automatically attached to this application.
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    </div>
                  </div>
                );
              }

              return (
                <div key={req.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {req.label}
                        {req.isRequired && (
                          <Badge variant="secondary" className="text-[10px] py-0">Required</Badge>
                        )}
                      </p>
                      {req.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                      )}
                    </div>
                    {files[req.id] && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>

                  {files[req.id] ? (
                    <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-md">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700 flex-1 truncate">{files[req.id].name}</span>
                      <span className="text-xs text-emerald-600">
                        {(files[req.id].size / 1024).toFixed(0)} KB
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleFileChange(req.id, null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={(el) => { fileInputRefs.current[req.id] = el; }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFileChange(req.id, file);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[req.id]?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Application
          </Button>
        </div>
      </div>
    </div>
  );
}
