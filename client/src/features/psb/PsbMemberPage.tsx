import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { PsbMember, SignatoryType, Lgu } from '@/types';

const TYPE_LABELS: Record<SignatoryType, string> = {
  PSB_MEMBER: 'HRMPSB Member',
  PREPARED_BY: 'Prepared By',
};

/** Common board roles — free text is still allowed, these are just quick picks. */
const ROLE_SUGGESTIONS = [
  'Chairperson, HRMPSB',
  'Vice Chairperson, HRMPSB',
  'Member, HRMPSB',
  'Member, HRMPSB-PEACE Representative',
];

interface FormState {
  id?: number;
  name: string;
  designation: string;
  psbRole: string;
  type: SignatoryType;
  sortOrder: number;
  isActive: boolean;
  lguId?: number;
}

const emptyForm = (): FormState => ({
  name: '',
  designation: '',
  psbRole: 'Member, HRMPSB',
  type: 'PSB_MEMBER',
  sortOrder: 0,
  isActive: true,
});

export function PsbMemberPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<PsbMember | null>(null);
  const [lguFilter, setLguFilter] = useState<string>('');

  // Super admins pick an LGU; LGU admins are pinned to their own server-side.
  const { data: lgus } = useQuery<Lgu[]>({
    queryKey: ['lgus-all'],
    queryFn: async () => {
      const { data } = await api.get('/lgus', { params: { limit: 100 } });
      return data.data || [];
    },
    enabled: isSuperAdmin,
  });

  const { data: members, isLoading } = useQuery<PsbMember[]>({
    queryKey: ['psb-members', lguFilter],
    queryFn: async () => {
      const params = lguFilter ? { lguId: lguFilter } : {};
      const { data } = await api.get('/psb-members', { params });
      return data.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const body = {
        name: payload.name,
        designation: payload.designation,
        psbRole: payload.psbRole,
        type: payload.type,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
        ...(isSuperAdmin && payload.lguId ? { lguId: payload.lguId } : {}),
      };
      return payload.id
        ? api.put(`/psb-members/${payload.id}`, body)
        : api.post('/psb-members', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psb-members'] });
      toast.success(form.id ? 'Signatory updated' : 'Signatory added');
      setDialogOpen(false);
      setForm(emptyForm());
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save signatory');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/psb-members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psb-members'] });
      toast.success('Signatory removed');
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove signatory');
    },
  });

  const openCreate = () => {
    setForm({ ...emptyForm(), sortOrder: (members?.length ?? 0) + 1 });
    setDialogOpen(true);
  };

  const openEdit = (member: PsbMember) => {
    setForm({
      id: member.id,
      name: member.name,
      designation: member.designation ?? '',
      psbRole: member.psbRole ?? '',
      type: member.type,
      sortOrder: member.sortOrder,
      isActive: member.isActive,
      lguId: member.lguId,
    });
    setDialogOpen(true);
  };

  const psbMembers = (members ?? []).filter((m) => m.type === 'PSB_MEMBER');
  const preparedBy = (members ?? []).filter((m) => m.type === 'PREPARED_BY');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            HRMPSB Signatories
          </h1>
          <p className="text-sm text-muted-foreground">
            The signature block printed on the Comparative Assessment Form.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Select value={lguFilter || 'ALL'} onValueChange={(v) => setLguFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All LGUs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All LGUs</SelectItem>
                {lgus?.map((lgu) => (
                  <SelectItem key={lgu.id} value={String(lgu.id)}>{lgu.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Signatory
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          <SignatoryTable
            title="HRMPSB Members"
            caption="Printed in this order, left to right, on the form's signature block."
            rows={psbMembers}
            showLgu={isSuperAdmin}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
          <SignatoryTable
            title="Prepared By"
            caption="Printed under “Prepared by:” at the foot of the form."
            rows={preparedBy}
            showLgu={isSuperAdmin}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        </>
      )}

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Signatory' : 'Add Signatory'}</DialogTitle>
            <DialogDescription>
              Appears on the Comparative Assessment Form signature block.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isSuperAdmin && !form.id && (
              <div className="space-y-1.5">
                <Label>LGU</Label>
                <Select
                  value={form.lguId ? String(form.lguId) : ''}
                  onValueChange={(v) => setForm({ ...form, lguId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select LGU" />
                  </SelectTrigger>
                  <SelectContent>
                    {lgus?.map((lgu) => (
                      <SelectItem key={lgu.id} value={String(lgu.id)}>{lgu.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                placeholder="e.g. PAMELA S. BARICUATRO"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={form.designation}
                placeholder="e.g. Governor"
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as SignatoryType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PSB_MEMBER">HRMPSB Member</SelectItem>
                  <SelectItem value="PREPARED_BY">Prepared By</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === 'PSB_MEMBER' && (
              <div className="space-y-1.5">
                <Label htmlFor="psbRole">Role on the board</Label>
                <Input
                  id="psbRole"
                  value={form.psbRole}
                  placeholder="e.g. Chairperson, HRMPSB"
                  onChange={(e) => setForm({ ...form, psbRole: e.target.value })}
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {ROLE_SUGGESTIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-emerald-300 hover:text-emerald-700"
                      onClick={() => setForm({ ...form, psbRole: role })}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="sortOrder">Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  className="w-24"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
                <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name.trim()}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? 'Save Changes' : 'Add Signatory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove signatory</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium">{deleteTarget?.name}</span> from the signature
              block? Forms already generated are unaffected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SignatoryTable({
  title,
  caption,
  rows,
  showLgu,
  onEdit,
  onDelete,
}: {
  title: string;
  caption: string;
  rows: PsbMember[];
  showLgu: boolean;
  onEdit: (m: PsbMember) => void;
  onDelete: (m: PsbMember) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-xs">Order</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Designation</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                {showLgu && <TableHead className="text-xs">LGU</TableHead>}
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="w-24 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showLgu ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">
                    No signatories yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="text-xs text-muted-foreground">{member.sortOrder}</TableCell>
                    <TableCell className="text-sm font-medium">{member.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.designation || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.psbRole || '—'}</TableCell>
                    {showLgu && (
                      <TableCell className="text-sm text-muted-foreground">{member.lgu?.name || '—'}</TableCell>
                    )}
                    <TableCell>
                      <Badge
                        className={
                          member.isActive
                            ? 'bg-emerald-100 text-emerald-700 border-0'
                            : 'bg-gray-100 text-gray-600 border-0'
                        }
                      >
                        {member.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(member)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(member)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export { TYPE_LABELS };
