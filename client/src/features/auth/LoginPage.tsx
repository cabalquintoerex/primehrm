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
import { Shield, Loader2, Users, Award, BookOpen, TrendingUp } from 'lucide-react';
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
    enabled: true,
  },
  {
    icon: BookOpen,
    title: 'Learning & Development',
    description: 'Continuous growth and capability building',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100 hover:border-blue-300',
    enabled: true,
  },
  {
    icon: TrendingUp,
    title: 'Performance Management',
    description: 'Results-oriented performance systems',
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    border: 'border-gray-100',
    enabled: false,
  },
  {
    icon: Award,
    title: 'Rewards & Recognition',
    description: 'Recognizing excellence in public service',
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    border: 'border-gray-100',
    enabled: false,
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
    <div className="relative min-h-screen bg-gradient-to-br from-white via-gray-50 to-emerald-50/30 overflow-hidden">
      {/* Background pattern — colorful subtle icons */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-8 opacity-[0.05]">
          <Shield className="h-72 w-72 text-emerald-500" strokeWidth={0.5} />
        </div>
        <div className="absolute bottom-8 right-8 opacity-[0.04]">
          <Shield className="h-96 w-96 text-blue-500" strokeWidth={0.3} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.025]">
          <Shield className="h-[550px] w-[550px] text-emerald-600" strokeWidth={0.2} />
        </div>
        {/* Gradient orbs for depth */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-200/15 blur-3xl" />
      </div>

      {/* Main content — two sections flowing naturally */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto flex w-full max-w-6xl flex-col lg:flex-row items-center gap-12 xl:gap-20 px-6 py-12">

          {/* Left — Branding & Description */}
          <div className="flex-1 text-center lg:text-left">
            {/* LGU Logo & Name — large and prominent (for LGU login) */}
            {slug && lgu && (
              <div className="mb-6">
                <div className="flex items-center gap-4 justify-center lg:justify-start mb-4">
                  {lgu.logo ? (
                    <img
                      src={lgu.logo}
                      alt={lgu.name}
                      className="h-16 w-16 rounded-full border-2 border-emerald-200 object-cover bg-emerald-50 shadow-md"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 shadow-md">
                      <Shield className="h-8 w-8 text-emerald-600" />
                    </div>
                  )}
                  <div className="text-left">
                    <h1 className="text-xl xl:text-2xl font-bold tracking-tight text-gray-900">{lgu.name}</h1>
                    {lgu.address && (
                      <p className="text-sm text-gray-500 mt-1">{lgu.address}</p>
                    )}
                  </div>
                </div>
                <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-emerald-200 to-transparent lg:max-w-sm mx-auto lg:mx-0" />
              </div>
            )}

            {/* PRIME-HRM Title — secondary when LGU is present */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3 justify-center lg:justify-start">
                <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-200/50 ${slug && lgu ? 'h-9 w-9' : 'h-11 w-11'}`}>
                  <Shield className={`text-white ${slug && lgu ? 'h-5 w-5' : 'h-6 w-6'}`} />
                </div>
                <h2 className={`font-bold tracking-tight ${slug && lgu ? 'text-xl text-gray-700' : 'text-3xl xl:text-4xl text-gray-900'}`}>
                  PRIME-<span className="text-emerald-600">HRM</span>
                </h2>
              </div>
              <p className={`leading-relaxed max-w-lg mx-auto lg:mx-0 ${slug && lgu ? 'text-sm text-gray-500' : 'text-base text-gray-600'}`}>
                Program to Institutionalize Meritocracy and Excellence in
                Human Resource Management
              </p>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400 leading-relaxed max-w-md mb-8 mx-auto lg:mx-0 hidden lg:block">
              Elevating public sector HR by assessing, assisting, and awarding
              agencies across four core pillars — shifting HR from transactional
              to strategic for better public service.
            </p>

            {/* Four Pillars */}
            <div className="hidden lg:grid grid-cols-2 gap-3 max-w-lg">
              {pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className={`relative rounded-lg bg-white border p-3.5 transition-all hover:shadow-sm ${pillar.border} ${!pillar.enabled ? 'opacity-50' : ''}`}
                >
                  <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ${pillar.bg} mb-2`}>
                    <pillar.icon className={`h-4 w-4 ${pillar.color}`} />
                  </div>
                  <h3 className={`text-sm font-semibold mb-0.5 ${pillar.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                    {pillar.title}
                  </h3>
                  <p className={`text-xs ${pillar.enabled ? 'text-gray-400' : 'text-gray-300'}`}>
                    {pillar.description}
                  </p>
                  {!pillar.enabled && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                      Soon
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <p className="mt-8 text-xs text-gray-400 hidden lg:block">
              In compliance with the Civil Service Commission &mdash; Republic of the Philippines
            </p>
          </div>

          {/* Right — Login Form */}
          <div className="w-full max-w-sm lg:max-w-md">
            <div className="rounded-2xl bg-white shadow-xl shadow-emerald-100/40 border border-gray-100/80 p-8 lg:p-10">
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
      </div>
    </div>
  );
}
