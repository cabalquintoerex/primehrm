import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Save, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { PDSData } from '@/types';
import { generatePDS } from '@/lib/generatePDS';

const STEPS = [
  'Personal Information',
  'Family Background',
  'Educational Background',
  'Civil Service Eligibility',
  'Work Experience',
  'Voluntary Work',
  'Learning & Development',
  'Other Information',
  'Questions (34-40)',
  'References & ID',
];

// Helper: allow only digits (and optionally dashes) for ID number fields
const numericOnly = (value: string) => value.replace(/[^0-9-]/g, '');

// Helper: format number with commas for salary display
const formatSalaryDisplay = (val: string) => {
  const num = val.replace(/[^0-9.]/g, '');
  if (!num) return '';
  const [whole, decimal] = num.split('.');
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
};

const emptyAddress = () => ({
  houseNo: '', street: '', subdivision: '', barangay: '', city: '', province: '', zipCode: '',
});

const emptyQuestions = () => ({
  q34a: '', q34aDetails: '', q34b: '', q34bDetails: '',
  q35a: '', q35aDetails: '', q35b: '', q35bDetails: '', q35bDateFiled: '', q35bStatus: '',
  q36: '', q36Details: '', q37: '', q37Details: '',
  q38a: '', q38aDetails: '', q38b: '', q38bDetails: '',
  q39: '', q39Details: '',
  q40a: '', q40aDetails: '', q40b: '', q40bDetails: '', q40c: '', q40cDetails: '',
});

const emptyPDS = (): PDSData => ({
  surname: '', firstName: '', middleName: '', nameExtension: '',
  dateOfBirth: '', placeOfBirth: '', sex: '', civilStatus: '', civilStatusOther: '',
  height: '', weight: '', bloodType: '',
  gsisIdNo: '', umidIdNo: '', pagibigIdNo: '', philhealthNo: '', sssNo: '', philsysNo: '', tinNo: '', agencyEmployeeNo: '',
  citizenship: 'Filipino', citizenshipType: 'by birth', citizenshipCountry: 'Philippines',
  residentialAddress: emptyAddress(),
  permanentAddress: emptyAddress(),
  telephoneNo: '', mobileNo: '', emailAddress: '',
  spouseSurname: '', spouseFirstName: '', spouseMiddleName: '', spouseNameExtension: '',
  spouseOccupation: '', spouseEmployerName: '', spouseEmployerAddress: '', spouseTelephoneNo: '',
  fatherSurname: '', fatherFirstName: '', fatherMiddleName: '', fatherNameExtension: '',
  motherMaidenSurname: '', motherFirstName: '', motherMiddleName: '',
  children: [],
  education: [],
  eligibilities: [],
  workExperience: [],
  voluntaryWork: [],
  learningDevelopment: [],
  specialSkills: [],
  nonAcademicDistinctions: [],
  membershipInAssociations: [],
  references: [],
  questions: emptyQuestions(),
  governmentIssuedId: '', governmentIdNo: '', governmentIdIssuance: '',
});

function QuestionBlock({ number, question, value, details, onValueChange, onDetailsChange, detailsLabel }: {
  number: string;
  question: string;
  value: string;
  details: string;
  onValueChange: (v: string) => void;
  onDetailsChange: (v: string) => void;
  detailsLabel?: string;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-start gap-3">
        <span className="text-xs font-bold text-gray-500 mt-0.5 shrink-0">{number}.</span>
        <p className="text-xs text-gray-700 flex-1">{question}</p>
        <div className="flex gap-2 shrink-0">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name={`q${number}`} checked={value === 'Yes'} onChange={() => onValueChange('Yes')} className="text-emerald-600" />
            <span className="text-xs">Yes</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name={`q${number}`} checked={value === 'No'} onChange={() => onValueChange('No')} className="text-emerald-600" />
            <span className="text-xs">No</span>
          </label>
        </div>
      </div>
      {value === 'Yes' && (
        <div className="ml-6">
          <Label className="text-xs">{detailsLabel || 'If YES, give details'}</Label>
          <Input value={details} onChange={(e) => onDetailsChange(e.target.value)} className="h-9 text-sm mt-1" />
        </div>
      )}
    </div>
  );
}

export function PDSFormPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<PDSData>(emptyPDS());

  const { data: pdsResult, isLoading } = useQuery({
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

  useEffect(() => {
    if (pdsResult) {
      setFormData({ ...emptyPDS(), ...pdsResult });
    }
  }, [pdsResult]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return api.post('/pds', { data: formData });
    },
    onSuccess: () => {
      toast.success('Personal Data Sheet saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save PDS');
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...(prev as any)[parent], [field]: value },
    }));
  };

  const updateArrayItem = (arrayField: string, index: number, field: string, value: any) => {
    setFormData((prev) => {
      const arr = [...((prev as any)[arrayField] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [arrayField]: arr };
    });
  };

  const updateArrayItemNested = (arrayField: string, index: number, parent: string, field: string, value: any) => {
    setFormData((prev) => {
      const arr = [...((prev as any)[arrayField] || [])];
      arr[index] = { ...arr[index], [parent]: { ...arr[index][parent], [field]: value } };
      return { ...prev, [arrayField]: arr };
    });
  };

  const addArrayItem = (arrayField: string, template: any) => {
    setFormData((prev) => ({
      ...prev,
      [arrayField]: [...((prev as any)[arrayField] || []), template],
    }));
  };

  const removeArrayItem = (arrayField: string, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [arrayField]: ((prev as any)[arrayField] || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const addStringItem = (arrayField: string) => {
    setFormData((prev) => ({
      ...prev,
      [arrayField]: [...((prev as any)[arrayField] || []), ''],
    }));
  };

  const updateStringItem = (arrayField: string, index: number, value: string) => {
    setFormData((prev) => {
      const arr = [...((prev as any)[arrayField] || [])];
      arr[index] = value;
      return { ...prev, [arrayField]: arr };
    });
  };

  const removeStringItem = (arrayField: string, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [arrayField]: ((prev as any)[arrayField] || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handlePrintPDS = () => {
    generatePDS(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const renderAddressFields = (prefix: string, label: string) => {
    const addr = (formData as any)[prefix] || emptyAddress();
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">House/Block/Lot No.</Label>
            <Input value={addr.houseNo} onChange={(e) => updateNestedField(prefix, 'houseNo', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Street</Label>
            <Input value={addr.street} onChange={(e) => updateNestedField(prefix, 'street', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subdivision/Village</Label>
            <Input value={addr.subdivision} onChange={(e) => updateNestedField(prefix, 'subdivision', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Barangay</Label>
            <Input value={addr.barangay} onChange={(e) => updateNestedField(prefix, 'barangay', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City/Municipality</Label>
            <Input value={addr.city} onChange={(e) => updateNestedField(prefix, 'city', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Province</Label>
            <Input value={addr.province} onChange={(e) => updateNestedField(prefix, 'province', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ZIP Code</Label>
            <Input value={addr.zipCode} onChange={(e) => updateNestedField(prefix, 'zipCode', e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 0: // Personal Information
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Surname *</Label>
                <Input value={formData.surname} onChange={(e) => updateField('surname', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">First Name *</Label>
                <Input value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Middle Name</Label>
                <Input value={formData.middleName} onChange={(e) => updateField('middleName', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name Extension</Label>
                <Input value={formData.nameExtension} onChange={(e) => updateField('nameExtension', e.target.value)} placeholder="Jr., Sr., III" className="h-9 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date of Birth</Label>
                <Input type="date" value={formData.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Place of Birth</Label>
                <Input value={formData.placeOfBirth} onChange={(e) => updateField('placeOfBirth', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sex at Birth</Label>
                <Select value={formData.sex} onValueChange={(v) => updateField('sex', v)}>
                  <SelectTrigger tabIndex={0} className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Civil Status</Label>
                <Select value={formData.civilStatus} onValueChange={(v) => updateField('civilStatus', v)}>
                  <SelectTrigger tabIndex={0} className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widow/er">Widow/er</SelectItem>
                    <SelectItem value="Separated">Separated</SelectItem>
                    <SelectItem value="Solo Parent">Solo Parent</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Height (m)</Label>
                <Input value={formData.height} onChange={(e) => updateField('height', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Weight (kg)</Label>
                <Input value={formData.weight} onChange={(e) => updateField('weight', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Blood Type</Label>
                <Input value={formData.bloodType} onChange={(e) => updateField('bloodType', e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">UMID ID No.</Label>
                <Input value={formData.umidIdNo || formData.gsisIdNo} inputMode="numeric" onChange={(e) => updateField('umidIdNo', numericOnly(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PAG-IBIG ID No.</Label>
                <Input value={formData.pagibigIdNo} inputMode="numeric" onChange={(e) => updateField('pagibigIdNo', numericOnly(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PhilHealth No.</Label>
                <Input value={formData.philhealthNo} inputMode="numeric" onChange={(e) => updateField('philhealthNo', numericOnly(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PhilSys Number (PSN)</Label>
                <Input value={formData.philsysNo || formData.sssNo} inputMode="numeric" onChange={(e) => updateField('philsysNo', numericOnly(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">TIN No.</Label>
                <Input value={formData.tinNo} inputMode="numeric" onChange={(e) => updateField('tinNo', numericOnly(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Agency Employee No.</Label>
                <Input value={formData.agencyEmployeeNo} onChange={(e) => updateField('agencyEmployeeNo', e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            {formData.civilStatus === 'Others' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Please specify civil status</Label>
                  <Input value={formData.civilStatusOther || ''} onChange={(e) => updateField('civilStatusOther', e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Citizenship</Label>
                <Input value={formData.citizenship} onChange={(e) => updateField('citizenship', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Citizenship Type</Label>
                <Select value={formData.citizenshipType} onValueChange={(v) => updateField('citizenshipType', v)}>
                  <SelectTrigger tabIndex={0} className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="by birth">By Birth</SelectItem>
                    <SelectItem value="by naturalization">By Naturalization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Country</Label>
                <Input value={formData.citizenshipCountry} onChange={(e) => updateField('citizenshipCountry', e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            {renderAddressFields('residentialAddress', 'Residential Address')}
            {renderAddressFields('permanentAddress', 'Permanent Address')}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Telephone No.</Label>
                <Input value={formData.telephoneNo} onChange={(e) => updateField('telephoneNo', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mobile No.</Label>
                <Input value={formData.mobileNo} onChange={(e) => updateField('mobileNo', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email Address</Label>
                <Input type="email" value={formData.emailAddress} onChange={(e) => updateField('emailAddress', e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          </div>
        );

      case 1: // Family Background
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Spouse Information</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Surname</Label>
                  <Input value={formData.spouseSurname} onChange={(e) => updateField('spouseSurname', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">First Name</Label>
                  <Input value={formData.spouseFirstName} onChange={(e) => updateField('spouseFirstName', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Middle Name</Label>
                  <Input value={formData.spouseMiddleName} onChange={(e) => updateField('spouseMiddleName', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Name Extension</Label>
                  <Input value={formData.spouseNameExtension} onChange={(e) => updateField('spouseNameExtension', e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">Occupation</Label>
                  <Input value={formData.spouseOccupation} onChange={(e) => updateField('spouseOccupation', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Employer Name</Label>
                  <Input value={formData.spouseEmployerName} onChange={(e) => updateField('spouseEmployerName', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Employer Address</Label>
                  <Input value={formData.spouseEmployerAddress} onChange={(e) => updateField('spouseEmployerAddress', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telephone No.</Label>
                  <Input value={formData.spouseTelephoneNo} onChange={(e) => updateField('spouseTelephoneNo', e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Father</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Surname</Label>
                  <Input value={formData.fatherSurname} onChange={(e) => updateField('fatherSurname', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">First Name</Label>
                  <Input value={formData.fatherFirstName} onChange={(e) => updateField('fatherFirstName', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Middle Name</Label>
                  <Input value={formData.fatherMiddleName} onChange={(e) => updateField('fatherMiddleName', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Name Extension</Label>
                  <Input value={formData.fatherNameExtension} onChange={(e) => updateField('fatherNameExtension', e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Mother</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Maiden Surname</Label>
                  <Input value={formData.motherMaidenSurname} onChange={(e) => updateField('motherMaidenSurname', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">First Name</Label>
                  <Input value={formData.motherFirstName} onChange={(e) => updateField('motherFirstName', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Middle Name</Label>
                  <Input value={formData.motherMiddleName} onChange={(e) => updateField('motherMiddleName', e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Children</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('children', { name: '', dateOfBirth: '' })}>
                  <Plus className="mr-1 h-3 w-3" /> Add Child
                </Button>
              </div>
              {(formData.children || []).map((child, i) => (
                <div key={i} className="flex items-end gap-2 mb-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Full Name</Label>
                    <Input value={child.name} onChange={(e) => updateArrayItem('children', i, 'name', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="w-40 space-y-1">
                    <Label className="text-xs">Date of Birth</Label>
                    <Input type="date" value={child.dateOfBirth} onChange={(e) => updateArrayItem('children', i, 'dateOfBirth', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeArrayItem('children', i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {formData.children.length === 0 && <p className="text-xs text-muted-foreground">No children added.</p>}
            </div>
          </div>
        );

      case 2: // Educational Background
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Add your educational background from elementary to graduate studies.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('education', {
                level: '', schoolName: '', degree: '', period: { from: '', to: '' }, units: '', yearGraduated: '', honors: '',
              })}>
                <Plus className="mr-1 h-3 w-3" /> Add Education
              </Button>
            </div>
            {(formData.education || []).map((edu, i) => (
              <div key={i} className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Entry {i + 1}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeArrayItem('education', i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Level</Label>
                    <Select value={edu.level} onValueChange={(v) => updateArrayItem('education', i, 'level', v)}>
                      <SelectTrigger tabIndex={0} className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Elementary">Elementary</SelectItem>
                        <SelectItem value="Secondary">Secondary</SelectItem>
                        <SelectItem value="Vocational">Vocational/Trade Course</SelectItem>
                        <SelectItem value="College">College</SelectItem>
                        <SelectItem value="Graduate Studies">Graduate Studies</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">School Name</Label>
                    <Input value={edu.schoolName} onChange={(e) => updateArrayItem('education', i, 'schoolName', e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Degree/Course</Label>
                    <Input value={edu.degree} onChange={(e) => updateArrayItem('education', i, 'degree', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input value={edu.period?.from || ''} onChange={(e) => updateArrayItemNested('education', i, 'period', 'from', e.target.value)} className="h-9 text-sm" placeholder="YYYY" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input value={edu.period?.to || ''} onChange={(e) => updateArrayItemNested('education', i, 'period', 'to', e.target.value)} className="h-9 text-sm" placeholder="YYYY" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Year Graduated</Label>
                    <Input value={edu.yearGraduated} onChange={(e) => updateArrayItem('education', i, 'yearGraduated', e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Highest Level/Units Earned</Label>
                    <Input value={edu.units} onChange={(e) => updateArrayItem('education', i, 'units', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Scholarship/Academic Honors</Label>
                    <Input value={edu.honors} onChange={(e) => updateArrayItem('education', i, 'honors', e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              </div>
            ))}
            {formData.education.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No education entries. Click "Add Education" to start.</p>}
          </div>
        );

      case 3: // Civil Service Eligibility
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Add your civil service eligibility/ies.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('eligibilities', {
                name: '', rating: '', dateOfExam: '', placeOfExam: '', licenseNo: '', licenseValidity: '',
              })}>
                <Plus className="mr-1 h-3 w-3" /> Add Eligibility
              </Button>
            </div>
            {(formData.eligibilities || []).map((elig, i) => (
              <div key={i} className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Eligibility {i + 1}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeArrayItem('eligibilities', i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">CES/CSEE/Career Service/RA 1080 (Board/Bar)/Under Special Laws/Category II/IV Eligibility</Label>
                    <Input value={elig.name} onChange={(e) => updateArrayItem('eligibilities', i, 'name', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rating (if applicable)</Label>
                    <Input value={elig.rating} onChange={(e) => updateArrayItem('eligibilities', i, 'rating', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date of Examination/Conferment</Label>
                    <Input type="date" value={elig.dateOfExam} onChange={(e) => updateArrayItem('eligibilities', i, 'dateOfExam', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Place of Examination/Conferment</Label>
                    <Input value={elig.placeOfExam} onChange={(e) => updateArrayItem('eligibilities', i, 'placeOfExam', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">License No.</Label>
                    <Input value={elig.licenseNo} onChange={(e) => updateArrayItem('eligibilities', i, 'licenseNo', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date of Validity</Label>
                    <Input type="date" value={elig.licenseValidity} onChange={(e) => updateArrayItem('eligibilities', i, 'licenseValidity', e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              </div>
            ))}
            {formData.eligibilities.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No eligibilities added. Click "Add Eligibility" to start.</p>}
          </div>
        );

      case 4: // Work Experience
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Include private employment. Start from your recent work.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('workExperience', {
                period: { from: '', to: '' }, positionTitle: '', department: '', monthlySalary: '', salaryGrade: '', statusOfAppointment: '', isGovernmentService: false,
              })}>
                <Plus className="mr-1 h-3 w-3" /> Add Work
              </Button>
            </div>
            {(formData.workExperience || []).map((work, i) => (
              <div key={i} className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Work Experience {i + 1}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeArrayItem('workExperience', i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={work.period?.from || ''} onChange={(e) => updateArrayItemNested('workExperience', i, 'period', 'from', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={work.period?.to || ''} onChange={(e) => updateArrayItemNested('workExperience', i, 'period', 'to', e.target.value)} className="h-9 text-sm" placeholder="Present" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Position Title</Label>
                    <Input value={work.positionTitle} onChange={(e) => updateArrayItem('workExperience', i, 'positionTitle', e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Department / Agency / Office / Company</Label>
                    <Input value={work.department} onChange={(e) => updateArrayItem('workExperience', i, 'department', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Monthly Salary</Label>
                    <Input value={formatSalaryDisplay(work.monthlySalary || '')} inputMode="numeric" onChange={(e) => updateArrayItem('workExperience', i, 'monthlySalary', e.target.value.replace(/[^0-9.]/g, ''))} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Salary Grade & Step</Label>
                    <Input value={work.salaryGrade} onChange={(e) => updateArrayItem('workExperience', i, 'salaryGrade', e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Status of Appointment</Label>
                    <Input value={work.statusOfAppointment} onChange={(e) => updateArrayItem('workExperience', i, 'statusOfAppointment', e.target.value)} placeholder="e.g., Permanent, Casual, Contractual" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Government Service</Label>
                    <Select value={work.isGovernmentService ? 'yes' : 'no'} onValueChange={(v) => updateArrayItem('workExperience', i, 'isGovernmentService', v === 'yes')}>
                      <SelectTrigger tabIndex={0} className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            {formData.workExperience.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No work experience added. Click "Add Work" to start.</p>}
          </div>
        );

      case 5: // Voluntary Work
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Voluntary work or involvement in civic / non-government / people / voluntary organizations.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('voluntaryWork', {
                organization: '', period: { from: '', to: '' }, numberOfHours: '', position: '',
              })}>
                <Plus className="mr-1 h-3 w-3" /> Add Entry
              </Button>
            </div>
            {(formData.voluntaryWork || []).map((vol, i) => (
              <div key={i} className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Entry {i + 1}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeArrayItem('voluntaryWork', i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Name & Address of Organization</Label>
                    <Input value={vol.organization} onChange={(e) => updateArrayItem('voluntaryWork', i, 'organization', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={vol.period?.from || ''} onChange={(e) => updateArrayItemNested('voluntaryWork', i, 'period', 'from', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={vol.period?.to || ''} onChange={(e) => updateArrayItemNested('voluntaryWork', i, 'period', 'to', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Number of Hours</Label>
                    <Input value={vol.numberOfHours} onChange={(e) => updateArrayItem('voluntaryWork', i, 'numberOfHours', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Position / Nature of Work</Label>
                    <Input value={vol.position} onChange={(e) => updateArrayItem('voluntaryWork', i, 'position', e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              </div>
            ))}
            {formData.voluntaryWork.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No voluntary work added. Click "Add Entry" to start.</p>}
          </div>
        );

      case 6: // Learning & Development
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Learning and development (L&D) interventions/training programs attended.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('learningDevelopment', {
                title: '', period: { from: '', to: '' }, numberOfHours: '', type: '', conductor: '',
              })}>
                <Plus className="mr-1 h-3 w-3" /> Add L&D
              </Button>
            </div>
            {(formData.learningDevelopment || []).map((ld, i) => (
              <div key={i} className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">L&D {i + 1}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeArrayItem('learningDevelopment', i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Title of Learning and Development Interventions/Training Programs</Label>
                  <Input value={ld.title} onChange={(e) => updateArrayItem('learningDevelopment', i, 'title', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={ld.period?.from || ''} onChange={(e) => updateArrayItemNested('learningDevelopment', i, 'period', 'from', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={ld.period?.to || ''} onChange={(e) => updateArrayItemNested('learningDevelopment', i, 'period', 'to', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">No. of Hours</Label>
                    <Input value={ld.numberOfHours} onChange={(e) => updateArrayItem('learningDevelopment', i, 'numberOfHours', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type of LD</Label>
                    <Select value={ld.type} onValueChange={(v) => updateArrayItem('learningDevelopment', i, 'type', v)}>
                      <SelectTrigger tabIndex={0} className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Managerial">Managerial</SelectItem>
                        <SelectItem value="Supervisory">Supervisory</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Foundation">Foundation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Conducted/Sponsored By</Label>
                  <Input value={ld.conductor} onChange={(e) => updateArrayItem('learningDevelopment', i, 'conductor', e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            ))}
            {formData.learningDevelopment.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No L&D entries added. Click "Add L&D" to start.</p>}
          </div>
        );

      case 7: // Other Information
        return (
          <div className="space-y-6">
            {/* Special Skills */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Special Skills and Hobbies</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => addStringItem('specialSkills')}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
              {(formData.specialSkills || []).map((skill, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Input value={skill} onChange={(e) => updateStringItem('specialSkills', i, e.target.value)} className="h-9 text-sm" />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeStringItem('specialSkills', i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {formData.specialSkills.length === 0 && <p className="text-xs text-muted-foreground">No skills added.</p>}
            </div>

            {/* Non-Academic Distinctions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Non-Academic Distinctions / Recognition</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => addStringItem('nonAcademicDistinctions')}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
              {(formData.nonAcademicDistinctions || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Input value={item} onChange={(e) => updateStringItem('nonAcademicDistinctions', i, e.target.value)} className="h-9 text-sm" />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeStringItem('nonAcademicDistinctions', i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {formData.nonAcademicDistinctions.length === 0 && <p className="text-xs text-muted-foreground">No distinctions added.</p>}
            </div>

            {/* Membership in Associations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Membership in Association/Organization</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => addStringItem('membershipInAssociations')}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
              {(formData.membershipInAssociations || []).map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Input value={item} onChange={(e) => updateStringItem('membershipInAssociations', i, e.target.value)} className="h-9 text-sm" />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeStringItem('membershipInAssociations', i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {formData.membershipInAssociations.length === 0 && <p className="text-xs text-muted-foreground">No memberships added.</p>}
            </div>

          </div>
        );

      case 8: // Questions (34-40)
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Answer the following questions truthfully. Provide details for any "Yes" response.</p>

            {/* Q34 */}
            <QuestionBlock
              number="34a"
              question="Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau or Department where you will be appointed, within the third degree?"
              value={(formData.questions || emptyQuestions()).q34a}
              details={(formData.questions || emptyQuestions()).q34aDetails}
              onValueChange={(v) => updateNestedField('questions', 'q34a', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q34aDetails', v)}
            />
            <QuestionBlock
              number="34b"
              question="Within the fourth degree (for Local Government Unit - Career Employees)?"
              value={(formData.questions || emptyQuestions()).q34b}
              details={(formData.questions || emptyQuestions()).q34bDetails}
              onValueChange={(v) => updateNestedField('questions', 'q34b', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q34bDetails', v)}
            />

            {/* Q35 */}
            <QuestionBlock
              number="35a"
              question="Have you ever been found guilty of any administrative offense?"
              value={(formData.questions || emptyQuestions()).q35a}
              details={(formData.questions || emptyQuestions()).q35aDetails}
              onValueChange={(v) => updateNestedField('questions', 'q35a', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q35aDetails', v)}
            />
            <div className="space-y-2">
              <QuestionBlock
                number="35b"
                question="Have you been criminally charged before any court?"
                value={(formData.questions || emptyQuestions()).q35b}
                details={(formData.questions || emptyQuestions()).q35bDetails}
                onValueChange={(v) => updateNestedField('questions', 'q35b', v)}
                onDetailsChange={(v) => updateNestedField('questions', 'q35bDetails', v)}
              />
              {(formData.questions || emptyQuestions()).q35b === 'Yes' && (
                <div className="ml-6 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date Filed</Label>
                    <Input type="date" value={(formData.questions || emptyQuestions()).q35bDateFiled} onChange={(e) => updateNestedField('questions', 'q35bDateFiled', e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status of Case/s</Label>
                    <Input value={(formData.questions || emptyQuestions()).q35bStatus} onChange={(e) => updateNestedField('questions', 'q35bStatus', e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              )}
            </div>

            {/* Q36 */}
            <QuestionBlock
              number="36"
              question="Have you ever been convicted of any crime or violation of any law, decree, ordinance or regulation by any court or tribunal?"
              value={(formData.questions || emptyQuestions()).q36}
              details={(formData.questions || emptyQuestions()).q36Details}
              onValueChange={(v) => updateNestedField('questions', 'q36', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q36Details', v)}
            />

            {/* Q37 */}
            <QuestionBlock
              number="37"
              question="Have you ever been separated from the service in any of the following modes: resignation, retirement, dropped from the rolls, dismissal, termination, end of term, finished contract or phased out (abolition) in the public or private sector?"
              value={(formData.questions || emptyQuestions()).q37}
              details={(formData.questions || emptyQuestions()).q37Details}
              onValueChange={(v) => updateNestedField('questions', 'q37', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q37Details', v)}
            />

            {/* Q38 */}
            <QuestionBlock
              number="38a"
              question="Have you ever been a candidate in a national or local election held within the last year (except Barangay election)?"
              value={(formData.questions || emptyQuestions()).q38a}
              details={(formData.questions || emptyQuestions()).q38aDetails}
              onValueChange={(v) => updateNestedField('questions', 'q38a', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q38aDetails', v)}
            />
            <QuestionBlock
              number="38b"
              question="Have you resigned from the government service during the three (3)-month period before the last election to promote/actively campaign for a national or local candidate?"
              value={(formData.questions || emptyQuestions()).q38b}
              details={(formData.questions || emptyQuestions()).q38bDetails}
              onValueChange={(v) => updateNestedField('questions', 'q38b', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q38bDetails', v)}
            />

            {/* Q39 */}
            <QuestionBlock
              number="39"
              question="Have you acquired the status of an immigrant or permanent resident of another country?"
              value={(formData.questions || emptyQuestions()).q39}
              details={(formData.questions || emptyQuestions()).q39Details}
              onValueChange={(v) => updateNestedField('questions', 'q39', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q39Details', v)}
              detailsLabel="If YES, give details (country)"
            />

            {/* Q40 */}
            <div className="space-y-1 mb-3">
              <p className="text-xs font-semibold text-gray-700">40. Pursuant to: (a) Indigenous People's Act (RA 8371); (b) Magna Carta for Disabled Persons (RA 7277, as amended); and (c) Expanded Solo Parents Welfare Act (RA 11861):</p>
            </div>
            <QuestionBlock
              number="40a"
              question="Are you a member of any indigenous group?"
              value={(formData.questions || emptyQuestions()).q40a}
              details={(formData.questions || emptyQuestions()).q40aDetails}
              onValueChange={(v) => updateNestedField('questions', 'q40a', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q40aDetails', v)}
              detailsLabel="If YES, please specify"
            />
            <QuestionBlock
              number="40b"
              question="Are you a person with disability?"
              value={(formData.questions || emptyQuestions()).q40b}
              details={(formData.questions || emptyQuestions()).q40bDetails}
              onValueChange={(v) => updateNestedField('questions', 'q40b', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q40bDetails', v)}
              detailsLabel="If YES, please specify ID No"
            />
            <QuestionBlock
              number="40c"
              question="Are you a solo parent?"
              value={(formData.questions || emptyQuestions()).q40c}
              details={(formData.questions || emptyQuestions()).q40cDetails}
              onValueChange={(v) => updateNestedField('questions', 'q40c', v)}
              onDetailsChange={(v) => updateNestedField('questions', 'q40cDetails', v)}
              detailsLabel="If YES, please specify ID No"
            />
          </div>
        );

      case 9: // References & Government ID
        return (
          <div className="space-y-6">
            {/* References */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">41. References (Person not related by consanguinity or affinity to applicant/appointee)</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('references', { name: '', address: '', telephoneNo: '', email: '' })}>
                  <Plus className="mr-1 h-3 w-3" /> Add Reference
                </Button>
              </div>
              {(formData.references || []).map((ref, i) => (
                <div key={i} className="rounded-md border p-3 mb-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Reference {i + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeArrayItem('references', i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name (First Name, MI, Surname)</Label>
                      <Input value={ref.name} onChange={(e) => updateArrayItem('references', i, 'name', e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Office/Residential Address</Label>
                      <Input value={ref.address} onChange={(e) => updateArrayItem('references', i, 'address', e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Contact No.</Label>
                      <Input value={ref.telephoneNo} onChange={(e) => updateArrayItem('references', i, 'telephoneNo', e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email Address</Label>
                      <Input type="email" value={ref.email || ''} onChange={(e) => updateArrayItem('references', i, 'email', e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
              {formData.references.length === 0 && <p className="text-xs text-muted-foreground">No references added. Add at least 3 references.</p>}
            </div>

            {/* Government ID */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">42. Government Issued ID</h4>
              <p className="text-xs text-muted-foreground mb-3">Government Issued ID (i.e. Passport, GSIS, SSS, PRC, Driver's License, etc.)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Government Issued ID</Label>
                  <Input value={formData.governmentIssuedId || ''} onChange={(e) => updateField('governmentIssuedId', e.target.value)} placeholder="e.g., Driver's License" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ID/License/Passport No.</Label>
                  <Input value={formData.governmentIdNo || ''} onChange={(e) => updateField('governmentIdNo', e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date/Place of Issuance</Label>
                  <Input value={formData.governmentIdIssuance || ''} onChange={(e) => updateField('governmentIdIssuance', e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* Declaration */}
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs text-gray-700 leading-relaxed">
                <strong>Declaration:</strong> I declare under oath that I have personally accomplished this Personal Data Sheet which is a true, correct, and complete statement pursuant to the provisions of pertinent laws, rules, and regulations of the Republic of the Philippines. I authorize the agency head/authorized representative to verify/validate the contents stated herein. I agree that any misrepresentation made in this document and its attachments shall cause the filing of administrative/criminal case/s against me.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Personal Data Sheet</h1>
        <p className="text-muted-foreground">CS Form No. 212 (Revised 2025)</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              i === step
                ? 'bg-emerald-600 text-white'
                : i < step
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
              i === step ? 'bg-white text-emerald-600' : i < step ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-white'
            }`}>
              {i + 1}
            </span>
            <span className="hidden sm:inline">{s}</span>
          </button>
        ))}
      </div>

      {/* Form Content */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{STEPS[step]}</h2>
        {renderStep()}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          {step < STEPS.length - 1 && (
            <Button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintPDS}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print PDS
          </Button>
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
          {step === STEPS.length - 1 && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save PDS
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
