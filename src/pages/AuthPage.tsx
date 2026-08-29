import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import {
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  ShieldCheck,
  Building,
  KeyRound,
  Crown,
  Quote
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onNavigate: (view: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onNavigate }) => {
  const { login, register } = useAuth();
  const { success, error } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Rotating quotes on the left hero
  const quotes = [
    {
      text: 'Luxury is the preservation of silence, nature, and untouched indigenous craft.',
      author: 'Kaveri Stays Founding Philosophy',
      location: 'Coorg, Karnataka',
    },
    {
      text: 'The mist over Lovedale Valley carries stories older than time itself.',
      author: 'Nilgiri Heritage Gazette',
      location: 'Ooty, Tamil Nadu',
    },
  ];

  const handleDemoFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('KaveriLuxury2026!');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Missing Credentials', 'Please provide a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        success('Welcome to Kaveri Stays', `Logged in successfully as ${email}`);
        // Role-based redirection
        switch (res.role) {
          case 'owner':
            onNavigate('owner-dashboard');
            break;
          case 'manager':
            onNavigate('manager-dashboard');
            break;
          case 'staff':
            onNavigate('staff-dashboard');
            break;
          default:
            onNavigate('guest-dashboard');
            break;
        }
      } else {
        error('Authentication Failed', res.error);
      }
    } catch {
      error('Login Error', 'Unable to authenticate. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      error('Validation Error', 'Full name and email are strictly required.');
      return;
    }
    if (password && confirmPassword && password !== confirmPassword) {
      error('Password Mismatch', 'Password and Confirm Password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({ name, email, phone });
      if (res.success) {
        success('Account Created', 'Welcome to the Kaveri Stays Guest Circle.');
        onNavigate('guest-dashboard');
      } else {
        error('Registration Failed', res.error);
      }
    } catch {
      error('Registration Error', 'Unable to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#070B0E]">
      <div className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111822] grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Side: Luxury Resort Photography & Quotes */}
        <div className="lg:col-span-5 relative bg-emerald-950 text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          {/* Background image overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"
              alt="Kaveri Stays Atmosphere"
              className="w-full h-full object-cover brightness-[0.38] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/70 to-black/60" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center font-serif font-bold text-lg text-white shadow-md">
                K
              </div>
              <span className="font-serif font-bold text-xl tracking-tight text-white">
                KAVERI STAYS
              </span>
            </div>
            <p className="text-xs text-emerald-300 tracking-wider uppercase font-medium">
              Member Sanctuary & Staff Portals
            </p>
          </div>

          {/* Inspirational Quote Card */}
          <div className="relative z-10 p-6 rounded-2xl bg-emerald-900/60 backdrop-blur-md border border-emerald-500/30 space-y-3 my-8 shadow-xl">
            <Quote className="w-6 h-6 text-emerald-400" />
            <p className="text-xs sm:text-sm text-emerald-50 font-serif italic leading-relaxed">
              "{quotes[0].text}"
            </p>
            <div className="text-[10px] text-emerald-300 font-semibold tracking-wider uppercase">
              — {quotes[0].author} • {quotes[0].location}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px] text-emerald-200">
            <span>Karnataka • Tamil Nadu • Kerala</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit Encrypted
            </span>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          {/* Switch tabs */}
          <div className="flex items-center gap-1.5 mb-6 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 w-fit">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#111822] text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#111822] text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              New Guest Register
            </button>
          </div>

          {mode === 'login' ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">
                  Welcome to Kaveri Stays
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Access your upcoming bookings, front desk dispatch, or property analytics.
                </p>
              </div>

              {/* One-Click Demo Fill Row */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    One-Click Demo Credentials
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Click to Populate</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDemoFill('guest@kaveristays.com')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151D28] text-left hover:border-emerald-500 transition-all group shadow-2xs"
                  >
                    <div className="text-[10px] font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">Guest</div>
                    <div className="text-[9px] text-slate-400 truncate">guest@kaveri...</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('staff.coorg@kaveristays.com')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151D28] text-left hover:border-emerald-500 transition-all group shadow-2xs"
                  >
                    <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 group-hover:text-emerald-600">Front Desk</div>
                    <div className="text-[9px] text-slate-400 truncate">staff.coorg@...</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('manager.coorg@kaveristays.com')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151D28] text-left hover:border-emerald-500 transition-all group shadow-2xs"
                  >
                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-600">Manager</div>
                    <div className="text-[9px] text-slate-400 truncate">manager.coorg...</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('owner@kaveristays.com')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151D28] text-left hover:border-emerald-500 transition-all group shadow-2xs"
                  >
                    <div className="text-[10px] font-bold text-teal-700 dark:text-teal-400 group-hover:text-emerald-600">Owner</div>
                    <div className="text-[9px] text-slate-400 truncate">owner@kaveri...</div>
                  </button>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. guest@kaveristays.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <Input
                  label="Password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full text-xs font-semibold uppercase tracking-wider gap-2 shadow-lg shadow-emerald-700/20"
                >
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </div>
          ) : (
            /* Registration Form */
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">
                  Join the Kaveri Guest Circle
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Register to manage bookings, unlock member-only seasonal tariff privileges, and reserve stays.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Siddharth Rao"
                  leftIcon={<UserIcon className="w-4 h-4" />}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />

                  <Input
                    label="Phone Number (Optional)"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 12345"
                    leftIcon={<Phone className="w-4 h-4" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                  />
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Enforces verified Guest membership privileges.</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full text-xs font-semibold uppercase tracking-wider gap-2 shadow-lg shadow-emerald-700/20"
                >
                  <span>Complete Guest Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
