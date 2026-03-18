import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, ArrowLeft, FileText, CheckCircle2, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Position, Lgu, PositionDocumentRequirement, Application } from '@/types';

function formatPeso(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '-';
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PositionDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const { data: lgu } = useQuery<Lgu>({
    queryKey: ['public-lgu', slug],
    queryFn: async () => {
      const { data } = await api.get(`/public/${slug}/info`);
      return data.data;
    },
    enabled: !!slug,
  });

  const { data: position, isLoading } = useQuery<Position>({
    queryKey: ['public-position', slug, id],
    queryFn: async () => {
      const { data } = await api.get(`/public/${slug}/careers/${id}`);
      return data.data;
    },
    enabled: !!slug && !!id,
  });

  // Check if already applied
  const { data: myApplications } = useQuery<Application[]>({
    queryKey: ['my-applications'],
    queryFn: async () => {
      const { data } = await api.get('/applications/my');
      return data.data || data || [];
    },
    enabled: isAuthenticated && user?.role === 'APPLICANT',
  });

  const hasApplied = myApplications?.some((a) => a.positionId === Number(id)) || false;

  const { data: requirements } = useQuery<PositionDocumentRequirement[]>({
    queryKey: ['public-position-requirements', slug, id],
    queryFn: async () => {
      const { data } = await api.get(`/public/${slug}/careers/${id}/requirements`);
      return data.data || data || [];
    },
    enabled: !!slug && !!id,
  });

  const handleApply = () => {
    if (isAuthenticated && user) {
      if (user.role === 'APPLICANT') {
        navigate(`/apply/${slug}/${id}`);
      } else {
        toast.error('Only applicants can apply for positions');
      }
    } else {
      setLoginPromptOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Position not found</p>
          <Button variant="outline" onClick={() => navigate(`/${slug}/careers`)}>
            Back to Careers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {lgu?.logo ? (
                <img
                  src={lgu.logo}
                  alt={lgu.name}
                  className="h-10 w-10 rounded-full border-2 border-emerald-100 object-cover bg-emerald-50"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
                  <Shield className="h-5 w-5 text-emerald-600" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">{lgu?.name || 'Loading...'}</h1>
                <p className="text-sm text-emerald-600 font-medium">Career Opportunities</p>
              </div>
            </div>
            {isAuthenticated && user ? (
              <Link
                to={user.role === 'APPLICANT' ? '/applicant/dashboard' : '/admin/dashboard'}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1.5"
              >
                <User className="h-4 w-4" />
                {user.firstName} {user.lastName}
              </Link>
            ) : (
              <Link
                to={`/${slug}/login`}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 text-muted-foreground"
          onClick={() => navigate(`/${slug}/careers`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Careers
        </Button>

        <div className="bg-white rounded-lg border shadow-sm p-6 sm:p-8">
          {/* Header -- LGU name + agency */}
          <div className="mb-6 pb-4 border-b">
            <p className="text-sm font-bold text-gray-900">{lgu?.name || ''}</p>
            {position.placeOfAssignment && (
              <p className="text-sm text-muted-foreground">Place of Assignment : {position.placeOfAssignment}</p>
            )}
          </div>

          {/* CSC-style field rows */}
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[220px_1fr] gap-x-4 gap-y-4">
              <div className="font-semibold text-sm text-gray-700">Position Title :</div>
              <div className="text-sm text-gray-900">{position.title}</div>

              {position.itemNumber && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Plantilla Item No. :</div>
                  <div className="text-sm text-gray-900">{position.itemNumber}</div>
                </>
              )}

              {position.salaryGrade !== null && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Salary/Job/Pay Grade :</div>
                  <div className="text-sm text-gray-900">{position.salaryGrade}</div>
                </>
              )}

              {position.monthlySalary !== null && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Monthly Salary :</div>
                  <div className="text-sm font-semibold text-emerald-600">{formatPeso(position.monthlySalary)}</div>
                </>
              )}

              {position.eligibility && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Eligibility :</div>
                  <div className="text-sm text-gray-900 whitespace-pre-line">{position.eligibility}</div>
                </>
              )}

              {position.education && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Education :</div>
                  <div className="text-sm text-gray-900 whitespace-pre-line">{position.education}</div>
                </>
              )}

              {position.training && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Training :</div>
                  <div className="text-sm text-gray-900 whitespace-pre-line">{position.training}</div>
                </>
              )}

              {position.experience && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Work Experience :</div>
                  <div className="text-sm text-gray-900 whitespace-pre-line">{position.experience}</div>
                </>
              )}

              {position.competency && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Competency :</div>
                  <div className="text-sm text-gray-900 whitespace-pre-line">{position.competency}</div>
                </>
              )}

              <div className="font-semibold text-sm text-gray-700">No. of Vacancy/ies :</div>
              <div className="text-sm text-gray-900">{position.slots}</div>
            </div>
          </div>

          {/* Instructions / Description */}
          {position.description && (
            <div className="mb-8 pt-4 border-t">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Instructions/Remarks :</h3>
              <p className="font-semibold text-sm text-gray-700 mb-2">Brief Description of the General Function of the Position:</p>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{position.description}</p>
            </div>
          )}

          {/* Dates */}
          <div className="pt-4 border-t mb-8">
            <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[220px_1fr] gap-x-4 gap-y-2">
              {position.openDate && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Posting Date :</div>
                  <div className="text-sm text-gray-900">{format(new Date(position.openDate), 'MMMM dd, yyyy')}</div>
                </>
              )}
              {position.closeDate && (
                <>
                  <div className="font-semibold text-sm text-gray-700">Closing Date :</div>
                  <div className="text-sm text-gray-900 font-semibold">{format(new Date(position.closeDate), 'MMMM dd, yyyy')}</div>
                </>
              )}
            </div>
          </div>

          {/* Apply Button */}
          <div className="pt-6 border-t">
            {hasApplied ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-lg font-semibold">You have already applied for this position</span>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-lg px-8"
                onClick={handleApply}
              >
                Apply Now
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Login Prompt Dialog */}
      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply for this Position</DialogTitle>
            <DialogDescription>
              Do you already have an account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setLoginPromptOpen(false);
                navigate(`/${slug}/login?redirect=/${slug}/careers/${id}`);
              }}
            >
              Yes, Login
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setLoginPromptOpen(false);
                navigate(`/register?redirect=/${slug}/careers/${id}`);
              }}
            >
              No, Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
