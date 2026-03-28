import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Users, BookOpen, MapPin, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import type { Lgu } from '@/types';

const loginSchema = z.object({
  login: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const pillars = [
  {
    icon: Users,
    title: 'Recruitment, Selection & Placement',
    description: 'Merit-based hiring with transparent processes',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100 hover:border-emerald-300',
  },
  {
    icon: BookOpen,
    title: 'Learning & Development',
    description: 'Continuous growth and capability building',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100 hover:border-blue-300',
  },
];

export function LoginPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const redirectUrl = searchParams.get('redirect');

  const { data: lgu } = useQuery<Lgu>({
    queryKey: ['lgu', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await api.get(`/lgus/slug/${slug}`);
      return data.data;
    },
    enabled: !!slug,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (formData: LoginFormData) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', formData);
      setAuth(data.user, data.token);
      toast.success('Login successful');
      if (redirectUrl) {
        navigate(redirectUrl);
      } else if (data.user.role === 'APPLICANT') {
        navigate('/applicant/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Left — Green branded section */}
      <div className="relative flex-1 bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 left-8 opacity-[0.08]">
            <Shield className="h-72 w-72 text-white" strokeWidth={0.5} />
          </div>
          <div className="absolute bottom-8 right-8 opacity-[0.05]">
            <Shield className="h-96 w-96 text-white" strokeWidth={0.3} />
          </div>
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen lg:min-h-0 lg:h-full px-8 py-12">
          <div className="w-full max-w-md text-center">
            {/* LGU Logo & Name — large and prominent (for LGU login) */}
            {slug && lgu && (
              <div className="mb-8">
                <div className="flex flex-col items-center gap-4 mb-5">
                  {lgu.logo ? (
                    <img
                      src={lgu.logo}
                      alt={lgu.name}
                      className="h-24 w-24 rounded-2xl border-2 border-white/30 object-cover bg-white/10 shadow-lg"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/10 shadow-lg">
                      <Shield className="h-12 w-12 text-white" />
                    </div>
                  )}
                  <div className="text-center">
                    <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-white">{lgu.name}</h1>
                    {lgu.address && (
                      <div className="flex items-center gap-1.5 mt-2 justify-center text-emerald-100">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <p className="text-sm">{lgu.address}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 justify-center text-emerald-200/70">
                      {lgu.contactNumber && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span className="text-xs">{lgu.contactNumber}</span>
                        </div>
                      )}
                      {lgu.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="text-xs">{lgu.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-white/20 to-transparent lg:max-w-sm mx-auto" />
              </div>
            )}

            {/* PRIME-HRM Title — secondary when LGU is present */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3 justify-center">
                <div className={`flex items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ${slug && lgu ? 'h-9 w-9' : 'h-11 w-11'}`}>
                  <Shield className={`text-white ${slug && lgu ? 'h-5 w-5' : 'h-6 w-6'}`} />
                </div>
                <h2 className={`font-bold tracking-tight text-white ${slug && lgu ? 'text-xl' : 'text-3xl xl:text-4xl'}`}>
                  PRIME-<span className="text-emerald-200">HRM</span>
                </h2>
              </div>
              <p className={`leading-relaxed max-w-lg mx-auto ${slug && lgu ? 'text-sm text-emerald-100/80' : 'text-base text-emerald-100'}`}>
                Program to Institutionalize Meritocracy and Excellence in
                Human Resource Management
              </p>
            </div>

            {/* Description */}
            <p className="text-sm text-emerald-200/60 leading-relaxed max-w-md mb-8 mx-auto hidden lg:block">
              Elevating public sector HR by assessing, assisting, and awarding
              agencies across four core pillars — shifting HR from transactional
              to strategic for better public service.
            </p>

            {/* Core Pillars */}
            <div className="hidden lg:flex gap-3 max-w-lg mx-auto">
              {pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="flex-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 p-3.5 transition-all hover:bg-white/15"
                >
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/15 mb-2">
                    <pillar.icon className="h-4 w-4 text-emerald-200" />
                  </div>
                  <h3 className="text-sm font-semibold mb-0.5 text-white">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-emerald-200/60">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <p className="mt-8 text-xs text-emerald-200/40 hidden lg:block">
              In compliance with the Civil Service Commission &mdash; Republic of the Philippines
            </p>
          </div>
        </div>
      </div>

      {/* Right — White login section */}
      <div className="flex items-center justify-center bg-white lg:w-[480px] xl:w-[520px] px-6 py-12 lg:py-0 min-h-screen lg:min-h-0 lg:h-auto">
        <div className="w-full max-w-sm">
              {/* Green accent bar */}
              <div className="h-1 w-12 rounded-full bg-gradient-to-r from-emerald-500 to-green-400 mb-6" />
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {slug
                    ? 'Sign in to access your HR management portal'
                    : 'Sign in to the system administration panel'}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login" className="text-sm font-medium text-gray-700">
                    Username or Email
                  </Label>
                  <Input
                    id="login"
                    placeholder="Enter your username or email"
                    className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white"
                    {...register('login')}
                  />
                  {errors.login && (
                    <p className="text-sm text-destructive">{errors.login.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-medium mt-2" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>

              <p className="mt-6 text-[11px] text-center text-gray-400">
                PRIME-HRM &mdash; Meritocracy and Excellence in Human Resource Management
              </p>

              {/* Temporary: Demo accounts */}
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-[11px] font-semibold text-amber-700 mb-2">Demo Accounts (temporary)</p>
                <div className="space-y-1">
                  {[
                    { role: 'HR Admin', user: 'lapulapuhr', pass: 'hradmin123' },
                    { role: 'Office Admin', user: 'lapulapueng', pass: 'office123' },
                    { role: 'Applicant', user: 'juandelacruz', pass: 'applicant123' },
                  ].map((acc) => (
                    <button
                      key={acc.user}
                      type="button"
                      className="w-full flex items-center justify-between text-[11px] text-amber-800 hover:bg-amber-100 rounded px-2 py-1 transition-colors text-left"
                      onClick={() => {
                        setValue('login', acc.user);
                        setValue('password', acc.pass);
                      }}
                    >
                      <span className="font-medium">{acc.role}</span>
                      <span className="text-amber-600">{acc.user} / {acc.pass}</span>
                    </button>
                  ))}
                </div>
              </div>
        </div>
      </div>
    </div>
  );
}
