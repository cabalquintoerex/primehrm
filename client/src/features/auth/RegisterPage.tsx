import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const redirectUrl = searchParams.get('redirect');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (formData: RegisterFormData) => {
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = formData;
      const { data } = await api.post('/auth/register', payload);
      setAuth(data.user, data.token);
      toast.success('Registration successful');
      if (redirectUrl) {
        navigate(redirectUrl);
      } else if (data.user.role === 'APPLICANT') {
        navigate('/applicant/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-gray-50 to-emerald-50/30 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-8 opacity-[0.05]">
          <Shield className="h-72 w-72 text-emerald-500" strokeWidth={0.5} />
        </div>
        <div className="absolute bottom-8 right-8 opacity-[0.04]">
          <Shield className="h-96 w-96 text-blue-500" strokeWidth={0.3} />
        </div>
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-200/15 blur-3xl" />
      </div>

      {/* Centered card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white shadow-xl shadow-emerald-100/40 border border-gray-100/80 p-8">
            {/* Icon & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-200/50 mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Create Account</h2>
              <p className="text-sm text-gray-500 mt-1">Register as an applicant</p>
            </div>

            {/* Green accent bar */}
            <div className="h-1 w-12 rounded-full bg-gradient-to-r from-emerald-500 to-green-400 mb-6 mx-auto" />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Juan"
                    className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Dela Cruz"
                    className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white"
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="juan@example.com"
                  className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username
                </Label>
                <Input
                  id="username"
                  placeholder="juandelacruz"
                  className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11 text-sm font-medium mt-2" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
            </form>

            <p className="mt-6 text-sm text-center text-gray-500">
              Already have an account?{' '}
              <Link to="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Sign in
              </Link>
            </p>

            <p className="mt-4 text-[11px] text-center text-gray-400">
              PRIME-HRM &mdash; Meritocracy and Excellence in Human Resource Management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
