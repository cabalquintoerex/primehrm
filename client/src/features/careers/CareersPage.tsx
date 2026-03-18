import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Shield, MapPin, Hash, Calendar, User, CheckCircle2, Briefcase } from 'lucide-react';
import type { Position, Lgu, PaginatedResponse, Application } from '@/types';

function formatPeso(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '-';
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CareersPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: lgu } = useQuery<Lgu>({
    queryKey: ['public-lgu', slug],
    queryFn: async () => {
      const { data } = await api.get(`/public/${slug}/info`);
      return data.data;
    },
    enabled: !!slug,
  });

  // Fetch applicant's applications to check "already applied"
  const { data: myApplications } = useQuery<Application[]>({
    queryKey: ['my-applications'],
    queryFn: async () => {
      const { data } = await api.get('/applications/my');
      return data.data || data || [];
    },
    enabled: isAuthenticated && user?.role === 'APPLICANT',
  });

  const appliedPositionIds = new Set(myApplications?.map((a) => a.positionId) || []);

  const { data, isLoading } = useQuery<PaginatedResponse<Position>>({
    queryKey: ['public-careers', slug, search, page],
    queryFn: async () => {
      const { data } = await api.get(`/public/${slug}/careers`, {
        params: { search, page, limit: 12 },
      });
      return data;
    },
    enabled: !!slug,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-gray-50/50">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-slate-800">
        {/* Background image - full cover */}
        {lgu?.headerBg && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${lgu.headerBg}')` }}
          />
        )}
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-slate-900/60" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top bar */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-300" />
              <span className="text-xs font-medium text-slate-200">PRIME-HRM</span>
            </div>
            {isAuthenticated && user ? (
              <Link
                to={user.role === 'APPLICANT' ? '/applicant/dashboard' : '/admin/dashboard'}
                className="text-xs font-medium text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <User className="h-3.5 w-3.5" />
                {user.firstName} {user.lastName}
              </Link>
            ) : (
              <Link
                to={`/${slug}/login`}
                className="text-xs font-medium text-slate-200 hover:text-white transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Hero content */}
          <div className="py-10 sm:py-14 text-center">
            <div className="flex justify-center mb-5">
              {lgu?.logo ? (
                <img
                  src={lgu.logo}
                  alt={lgu.name}
                  className="h-24 w-24 rounded-full border-4 border-white/40 object-cover bg-white shadow-xl"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/40 bg-white/20 shadow-xl backdrop-blur-sm">
                  <Shield className="h-12 w-12 text-white" />
                </div>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-widest text-sky-300 uppercase mb-1">PRIME-HRM</h2>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {lgu?.name || 'Loading...'}
            </h1>
            <p className="text-slate-200 text-sm sm:text-base max-w-lg mx-auto">
              Explore career opportunities and join our team in public service.
            </p>

            {/* Search bar */}
            <div className="mt-8 max-w-lg mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search positions, departments..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10 h-11 bg-white border-0 shadow-lg text-sm rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      {data && !isLoading && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4 text-emerald-600" />
              <span>
                <span className="font-semibold text-gray-900">{data.meta.total}</span> open position{data.meta.total !== 1 ? 's' : ''} available
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Position Cards */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-muted-foreground">Loading positions...</p>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700">No open positions at this time</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later for new opportunities.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.data.map((position) => (
                <Card
                  key={position.id}
                  className="bg-white border shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-200 flex flex-col group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight group-hover:text-emerald-700 transition-colors">
                        {position.title}
                      </CardTitle>
                      {appliedPositionIds.has(position.id) && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Applied
                        </Badge>
                      )}
                    </div>
                    {position.department?.name && (
                      <p className="text-xs text-muted-foreground">{position.department.name}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm flex-1">
                    {position.itemNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5" />
                          Plantilla Item No.
                        </span>
                        <span className="font-medium text-gray-700">{position.itemNumber}</span>
                      </div>
                    )}
                    {position.salaryGrade !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Salary/Job/Pay Grade</span>
                        <span className="font-medium text-gray-700">{position.salaryGrade}</span>
                      </div>
                    )}
                    {position.monthlySalary !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Monthly Salary</span>
                        <span className="font-semibold text-emerald-700">{formatPeso(position.monthlySalary)}</span>
                      </div>
                    )}
                    {position.placeOfAssignment && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          Assignment
                        </span>
                        <span className="font-medium text-gray-700 text-right max-w-[55%]">{position.placeOfAssignment}</span>
                      </div>
                    )}
                    {position.openDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Posted
                        </span>
                        <span className="font-medium text-gray-700">
                          {new Date(position.openDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {position.closeDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Deadline
                        </span>
                        <span className="font-medium text-red-600">
                          {new Date(position.closeDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => navigate(`/${slug}/careers/${position.id}`)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {data && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 12 + 1}-{Math.min(page * 12, data.meta.total)} of {data.meta.total}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.meta.totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              <span>Powered by PRIME-HRM</span>
            </div>
            <span>{lgu?.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
