import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, FileText, Briefcase, ClipboardList, Building2, ExternalLink } from 'lucide-react';

interface PublicLgu {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
}

export function ApplicantDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showLguPicker, setShowLguPicker] = useState(false);

  const { data: lgus, isLoading: lgusLoading } = useQuery<PublicLgu[]>({
    queryKey: ['public-lgus'],
    queryFn: async () => {
      const { data } = await api.get('/lgus/public');
      return data.data || [];
    },
    enabled: showLguPicker,
  });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Welcome, {user?.firstName}! Manage your profile and applications.</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/applicant/applications">
          <Card className="p-4 hover:border-emerald-300 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">My Applications</p>
                <p className="text-xs text-muted-foreground">Track your submitted applications</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/applicant/pds">
          <Card className="p-4 hover:border-emerald-300 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Personal Data Sheet</p>
                <p className="text-xs text-muted-foreground">Update your PDS (CS Form 212)</p>
              </div>
            </div>
          </Card>
        </Link>
        <Card
          className="p-4 hover:border-emerald-300 transition-colors cursor-pointer"
          onClick={() => setShowLguPicker(true)}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-50">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Browse Careers</p>
              <p className="text-xs text-muted-foreground">Find open positions to apply for</p>
            </div>
          </div>
        </Card>
      </div>

      {/* LGU Picker Dialog */}
      <Dialog open={showLguPicker} onOpenChange={setShowLguPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select an LGU</DialogTitle>
            <DialogDescription>Choose a Local Government Unit to browse available positions.</DialogDescription>
          </DialogHeader>
          {lgusLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {lgus?.map((lgu) => (
                <button
                  key={lgu.id}
                  onClick={() => {
                    setShowLguPicker(false);
                    navigate(`/${lgu.slug}/careers`);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg border p-3 hover:bg-accent hover:border-emerald-300 transition-colors text-left"
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50 shrink-0">
                    {lgu.logo ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${lgu.logo}`}
                        alt={lgu.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{lgu.name}</p>
                    <p className="text-xs text-muted-foreground">/{lgu.slug}/careers</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
