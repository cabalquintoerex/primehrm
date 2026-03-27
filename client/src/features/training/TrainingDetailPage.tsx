import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, CheckCircle, UserPlus, Trash2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import type { Training, TrainingStatus, TrainingType, Department } from '@/types';

const STATUS_CONFIG: Record<TrainingStatus, { label: string; className: string }> = {
  UPCOMING: { label: 'Upcoming', className: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' },
  ONGOING: { label: 'Ongoing', className: 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500 hover:bg-red-600 text-white border-transparent' },
};

const TYPE_LABELS: Record<TrainingType, string> = {
  MANAGERIAL: 'Managerial',
  SUPERVISORY: 'Supervisory',
  TECHNICAL: 'Technical',
  FOUNDATION: 'Foundation',
};

interface ParticipantEntry {
  firstName: string;
  lastName: string;
  department: string;
}

const emptyEntry = (): ParticipantEntry => ({ firstName: '', lastName: '', department: '' });

export function TrainingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [entries, setEntries] = useState<ParticipantEntry[]>([emptyEntry()]);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});

  const { data: training, isLoading } = useQuery<Training>({
    queryKey: ['training', id],
    queryFn: async () => {
      const { data } = await api.get(`/trainings/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  // Fetch departments for the dropdown
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: { limit: 100 } });
      return data.data;
    },
    enabled: addParticipantOpen,
  });

  const addParticipantsMutation = useMutation({
    mutationFn: async (participants: ParticipantEntry[]) => {
      return api.post(`/trainings/${id}/participants`, { participants });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training', id] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Participants added');
      setAddParticipantOpen(false);
      setEntries([emptyEntry()]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add participants');
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      return api.delete(`/trainings/${id}/participants/${participantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training', id] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Participant removed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove participant');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (attendanceData: { participantId: number; attended: boolean }[]) => {
      await api.put(`/trainings/${id}/attendance`, { attendance: attendanceData });
      return api.put(`/trainings/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training', id] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Training marked as completed');
      setCompleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete training');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/trainings/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training', id] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Training cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel training');
    },
  });

  const openCompleteDialog = () => {
    if (training?.participants) {
      const initial: Record<number, boolean> = {};
      training.participants.forEach((p) => {
        initial[p.id] = p.attended ?? true;
      });
      setAttendance(initial);
    }
    setCompleteDialogOpen(true);
  };

  const handleComplete = () => {
    if (!training?.participants) return;
    const attendanceData = training.participants.map((p) => ({
      participantId: p.id,
      attended: attendance[p.id] ?? false,
    }));
    completeMutation.mutate(attendanceData);
  };

  const updateEntry = (index: number, field: keyof ParticipantEntry, value: string) => {
    setEntries((prev) => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const addRow = () => setEntries((prev) => [...prev, emptyEntry()]);
  const removeRow = (index: number) => setEntries((prev) => prev.filter((_, i) => i !== index));

  const validEntries = entries.filter((e) => e.firstName.trim() && e.lastName.trim());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!training) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/admin/training')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Training
        </Button>
        <p className="text-muted-foreground">Training program not found.</p>
      </div>
    );
  }

  const isActive = training.status === 'UPCOMING' || training.status === 'ONGOING';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/training')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">{training.title}</h1>
          <p className="text-muted-foreground">
            {format(new Date(training.startDate), 'MMMM d, yyyy')} - {format(new Date(training.endDate), 'MMMM d, yyyy')}
          </p>
        </div>
        <Badge className={STATUS_CONFIG[training.status].className}>
          {STATUS_CONFIG[training.status].label}
        </Badge>
      </div>

      {/* Training Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Training Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Title</p>
              <p className="font-medium">{training.title}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{TYPE_LABELS[training.type]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Venue</p>
              <p className="font-medium">{training.venue || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Conducted By</p>
              <p className="font-medium">{training.conductedBy || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Start Date</p>
              <p className="font-medium">{format(new Date(training.startDate), 'MMMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">End Date</p>
              <p className="font-medium">{format(new Date(training.endDate), 'MMMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Number of Hours</p>
              <p className="font-medium">{training.numberOfHours != null ? Number(training.numberOfHours) : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created By</p>
              <p className="font-medium">
                {training.creator ? `${training.creator.firstName} ${training.creator.lastName}` : '-'}
              </p>
            </div>
            {training.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Description</p>
                <p className="font-medium whitespace-pre-wrap">{training.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isSuperAdmin && isActive && (
        <div className="flex gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={openCompleteDialog}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark Complete
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Training
          </Button>
        </div>
      )}

      {/* Participants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Participants ({training.participants?.length || 0})</CardTitle>
          {!isSuperAdmin && isActive && (
            <Button size="sm" onClick={() => { setEntries([emptyEntry()]); setAddParticipantOpen(true); }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Participants
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!training.participants || training.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No participants yet. Add participants to this training program.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Attended</TableHead>
                    <TableHead>Completed</TableHead>
                    {!isSuperAdmin && isActive && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {training.participants.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.firstName} {p.lastName}
                      </TableCell>
                      <TableCell>{p.department || '-'}</TableCell>
                      <TableCell>
                        {p.attended === null ? (
                          <Badge variant="outline">Pending</Badge>
                        ) : p.attended ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-transparent">Yes</Badge>
                        ) : (
                          <Badge className="bg-red-500 hover:bg-red-600 text-white border-transparent">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.completedAt ? format(new Date(p.completedAt), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      {!isSuperAdmin && isActive && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeParticipantMutation.mutate(p.id)}
                            disabled={removeParticipantMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Participants Dialog */}
      <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Participants</DialogTitle>
            <DialogDescription>
              Fill in participant information. You can add multiple participants at once.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3 py-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>First Name *</span>
              <span>Last Name *</span>
              <span>Department</span>
              <span className="w-8" />
            </div>
            {entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
                <Input
                  value={entry.firstName}
                  onChange={(e) => updateEntry(index, 'firstName', e.target.value)}
                  placeholder="Juan"
                  className="text-sm"
                />
                <Input
                  value={entry.lastName}
                  onChange={(e) => updateEntry(index, 'lastName', e.target.value)}
                  placeholder="Dela Cruz"
                  className="text-sm"
                />
                <Select
                  value={entry.department || 'none'}
                  onValueChange={(val) => updateEntry(index, 'department', val === 'none' ? '' : val)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(index)}
                  disabled={entries.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddParticipantOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addParticipantsMutation.mutate(validEntries)}
              disabled={validEntries.length === 0 || addParticipantsMutation.isPending}
            >
              {addParticipantsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {validEntries.length} Participant{validEntries.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Training Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Training as Complete</DialogTitle>
            <DialogDescription>
              Mark attendance for each participant. Participants marked as attended will have their completion recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto">
            {training.participants?.map((p) => (
              <label key={p.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={attendance[p.id] ?? false}
                  onChange={(e) => setAttendance((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium">{p.firstName} {p.lastName}</span>
                  {p.department && (
                    <span className="text-xs text-muted-foreground ml-2">({p.department})</span>
                  )}
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Training
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
