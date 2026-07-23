import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Users, BookOpen, MapPin, Phone, Mail, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { postLoginDestination } from '@/lib/modules';
import type { Lgu } from '@/types';
import { assetUrl } from '@/lib/basePath';

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
    card: 'bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-600 shadow-emerald-600/25',
    titleColor: 'text-emerald-950',
    descColor: 'text-emerald-800/70',
  },
  {
    icon: BookOpen,
    title: 'Learning & Development',
    description: 'Continuous growth and capability building',
    card: 'bg-gradient-to-br from-teal-100 to-teal-50 border-teal-200',
    iconBg: 'bg-teal-600 shadow-teal-600/25',
    titleColor: 'text-teal-950',
    descColor: 'text-teal-800/70',
  },
];

export function LoginPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth, moduleMemory } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const redirectUrl = searchParams.get('redirect');

  // Mobile-only: the branded panel stacks full-height above the form, so the form is a screen
  // down. A floating "Sign In" scrolls to it; it auto-hides once the form is on screen so it can't
  // overlap the form's own submit button.
  const formRef = useRef<HTMLDivElement>(null);
  const [showSignInFab, setShowSignInFab] = useState(false);

  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSignInFab(!entry.isIntersecting),
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focus after the smooth scroll settles — also brings up the mobile keyboard.
    setTimeout(() => document.getElementById('login')?.focus(), 450);
  };

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
      navigate(redirectUrl || postLoginDestination(data.user, moduleMemory));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Left — Light branded section with green accents */}
      <div className="relative flex-1 bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-gray-900 overflow-hidden lg:border-r lg:border-emerald-100">
        {/* Background pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 left-8 opacity-[0.06]">
            <Shield className="h-72 w-72 text-emerald-600" strokeWidth={0.5} />
          </div>
          <div className="absolute bottom-8 right-8 opacity-[0.04]">
            <Shield className="h-96 w-96 text-emerald-700" strokeWidth={0.3} />
          </div>
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-200/30 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-start justify-center min-h-screen pt-16 pb-12 lg:items-center lg:min-h-0 lg:h-full lg:px-8 lg:py-12 px-8">
          <div className="w-full max-w-md text-center">
            {/* LGU Logo & Name — large and prominent (for LGU login) */}
            {slug && lgu && (
              <div className="mb-8">
                <div className="flex flex-col items-center gap-4 mb-5">
                  {lgu.logo ? (
                    <img
                      src={assetUrl(lgu.logo)}
                      alt={lgu.name}
                      className="h-24 w-24 rounded-full border-2 border-emerald-200 object-cover bg-white shadow-md shadow-emerald-900/5"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-200 bg-white shadow-md shadow-emerald-900/5">
                      <Shield className="h-12 w-12 text-emerald-600" />
                    </div>
                  )}
                  <div className="text-center">
                    <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-gray-900">{lgu.name}</h1>
                    {lgu.address && (
                      <div className="flex items-center gap-1.5 mt-2 justify-center text-emerald-700">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <p className="text-sm">{lgu.address}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 justify-center text-gray-500">
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
                <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-emerald-200 to-transparent lg:max-w-sm mx-auto" />
              </div>
            )}

            {/* PRIME-HRM Title — secondary when LGU is present */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3 justify-center">
                <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-600/20 ${slug && lgu ? 'h-9 w-9' : 'h-11 w-11'}`}>
                  <Shield className={`text-white ${slug && lgu ? 'h-5 w-5' : 'h-6 w-6'}`} />
                </div>
                <h2 className={`font-bold tracking-tight text-gray-900 ${slug && lgu ? 'text-xl' : 'text-3xl xl:text-4xl'}`}>
                  PRIME-<span className="text-emerald-600">HRM</span>
                </h2>
              </div>
              <p className={`leading-relaxed max-w-lg mx-auto ${slug && lgu ? 'text-sm text-gray-600' : 'text-base text-gray-600'}`}>
                Program to Institutionalize Meritocracy and Excellence in
                Human Resource Management
              </p>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-500 leading-relaxed max-w-md mb-8 mx-auto hidden lg:block">
              Elevating public sector HR by assessing, assisting, and awarding
              agencies across four core pillars — shifting HR from transactional
              to strategic for better public service.
            </p>

            {/* Core Pillars */}
            <div className="hidden lg:flex gap-3 max-w-lg mx-auto">
              {pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className={`flex-1 rounded-xl border p-3.5 text-left shadow-sm ${pillar.card}`}
                >
                  <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg mb-2 shadow-sm ${pillar.iconBg}`}>
                    <pillar.icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className={`text-sm font-semibold mb-0.5 ${pillar.titleColor}`}>
                    {pillar.title}
                  </h3>
                  <p className={`text-xs ${pillar.descColor}`}>
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <p className="mt-8 text-xs text-gray-400 hidden lg:block">
              In compliance with the Civil Service Commission &mdash; Republic of the Philippines
            </p>
          </div>
        </div>
      </div>

      {/* Right — White login section */}
      <div ref={formRef} className="flex items-center justify-center bg-white lg:w-[480px] xl:w-[520px] px-6 py-12 lg:py-0 min-h-screen lg:min-h-0 lg:h-auto">
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

      {/* Mobile-only floating "Sign In" — scrolls to the form; hidden on lg and once the form shows */}
      <button
        type="button"
        onClick={scrollToForm}
        aria-label="Go to sign in"
        className={`lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all duration-300 active:scale-95 ${
          showSignInFab ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </button>
    </div>
  );
}
