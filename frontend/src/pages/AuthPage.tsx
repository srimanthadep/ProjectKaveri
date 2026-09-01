import React, { useState } from 'react';
import kaveriLogo from '../assets/kaveri_logo.png';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Building,
  KeyRound,
  Crown,
  Quote,
  Check,
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onNavigate: (view: string) => void;
}

const DEMO_ACCOUNTS = [
  { key: 'guest', label: 'Guest', email: 'guest@kaveristays.com', icon: UserIcon },
  { key: 'staff', label: 'Front Desk', email: 'staff.coorg@kaveristays.com', icon: KeyRound },
  { key: 'manager', label: 'Manager', email: 'manager.coorg@kaveristays.com', icon: Building },
  { key: 'owner', label: 'Owner', email: 'owner@kaveristays.com', icon: Crown },
] as const;

const TRUST_POINTS = [
  'Verified member reservations',
  'Front-desk & property dispatch',
  'Encrypted analytics access',
];

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
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const heroQuote = {
    text: 'Luxury is the preservation of silence, nature, and untouched indigenous craft.',
    author: 'Kaveri Stays Founding Philosophy',
    location: 'Coorg, Karnataka',
  };

  const handleDemoFill = async (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword('DemoPassword123!');
    setActiveDemo(account.key);

    // Instant One-Click Demo Authentication
    setIsLoading(true);
    try {
      const res = await login(account.email, 'DemoPassword123!');
      if (res.success) {
        success('Demo Access Granted', `Authenticated as ${account.label} (${account.email})`);
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
        error('Authentication Failed', res.error || 'Invalid credentials');
      }
    } catch {
      error('Login Error', 'Unable to authenticate demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Missing Credentials', 'Please provide a valid email address.');
      return;
    }

    const pwd = password.trim() || 'DemoPassword123!';
    setIsLoading(true);
    try {
      const res = await login(email, pwd);
      if (res.success) {
        success('Welcome to Kaveri Stays', `Logged in successfully as ${email}`);
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
    if (password && password.length < 6) {
      error('Password Requirement', 'Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: password || undefined,
      });
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
    <div className="relative grid h-screen w-full grid-cols-1 overflow-hidden bg-[#FAF8F4] lg:grid-cols-2">
      <button
        type="button"
        onClick={() => onNavigate('landing')}
        className="group absolute right-5 top-5 z-30 inline-flex items-center gap-2 rounded-full border border-[#1D3E37]/15 bg-[#1D3E37] px-3.5 py-2 text-xs font-medium text-[#FAF8F4] shadow-md transition-colors hover:bg-[#17332D] hover:text-[#E3C979] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B27]"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span>Back to home</span>
      </button>

      {/* ============================ Left: editorial hero ============================ */}
      <aside className="relative hidden h-screen flex-col justify-between overflow-hidden bg-[#0C1E1A] px-10 pb-10 pt-10 text-white lg:flex xl:px-14">
        {/* Photography + layered wash */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80"
            alt=""
            className="h-full w-full scale-105 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0C1E1A] via-[#0C1E1A]/85 to-[#0C1E1A]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C1E1A] via-transparent to-[#0C1E1A]/30" />
          <div className="emerald-pattern absolute inset-0 opacity-[0.05]" />
        </div>

        {/* Brand lockup */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 p-0.5 backdrop-blur-sm">
            <img src={kaveriLogo} alt="Kaveri Stays" className="h-full w-full rounded-lg object-contain" />
          </div>
          <div className="leading-none">
            <span className="block font-serif text-xl font-semibold tracking-[-0.02em] text-white">
              Kaveri Stays
            </span>
            <span className="text-eyebrow mt-1 block text-[#C59B27]">Heritage Hospitality</span>
          </div>
        </div>

        {/* Editorial statement */}
        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-5">
            <Quote className="h-9 w-9 text-[#C59B27]" />
            <p className="font-serif text-[1.75rem] font-light italic leading-[1.35] tracking-[-0.01em] text-[#F3F6F4]">
              {heroQuote.text}
            </p>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#C59B27]" />
              <span className="text-xs font-medium tracking-[0.04em] text-[#C7D6CF]/80">
                {heroQuote.author} · {heroQuote.location}
              </span>
            </div>
          </div>

          <ul className="space-y-2.5 pt-2">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-sm text-[#C7D6CF]/90">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#C59B27]/15 text-[#C59B27]">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer trust row */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-[#C7D6CF]/70">
          <span className="tracking-[0.03em]">Karnataka · Tamil Nadu · Kerala</span>
          <span className="flex items-center gap-1.5 font-medium text-[#C59B27]">
            <ShieldCheck className="h-3.5 w-3.5" /> 256-bit encrypted
          </span>
        </div>
      </aside>

      {/* ============================ Right: form ============================ */}
      <main className="flex h-screen flex-col justify-center overflow-y-auto px-5 pb-8 pt-8 sm:px-10 lg:px-14 lg:pt-10 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          {/* Segmented switch */}
          <div className="mb-6 inline-flex rounded-full border border-[#E7E3DA] bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                mode === 'login'
                  ? 'bg-[#1D3E37] text-[#FAF8F4] shadow-sm'
                  : 'text-[#6F6F68] hover:text-[#1D3E37]'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors duration-150 ${
                mode === 'register'
                  ? 'bg-[#1D3E37] text-[#FAF8F4] shadow-sm'
                  : 'text-[#6F6F68] hover:text-[#1D3E37]'
              }`}
            >
              New guest
            </button>
          </div>

          {mode === 'login' ? (
            <div className="space-y-6">
              <header className="space-y-1.5">
                <h1 className="font-serif text-3xl font-semibold tracking-[-0.02em] text-[#1D3E37]">
                  Welcome back
                </h1>
                <p className="text-sm leading-relaxed text-[#545B56]">
                  Access your upcoming bookings, front-desk dispatch, or property analytics.
                </p>
              </header>

              {/* Demo credentials */}
              <div className="rounded-2xl border border-[#E7E3DA] bg-white/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-eyebrow text-[#8A7A45]">One-click demo access</span>
                  <span className="text-xs text-[#9A958A]">Tap to fill</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((account) => {
                    const Icon = account.icon;
                    const isActive = activeDemo === account.key;
                    return (
                      <button
                        key={account.key}
                        type="button"
                        onClick={() => handleDemoFill(account)}
                        className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                          isActive
                            ? 'border-[#1D3E37] bg-[#1D3E37]/[0.04] ring-1 ring-[#1D3E37]/10'
                            : 'border-[#E7E3DA] bg-white hover:border-[#C7D6CF] hover:bg-[#F4F2ED]'
                        }`}
                      >
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${
                            isActive
                              ? 'bg-[#1D3E37] text-[#C59B27]'
                              : 'bg-[#F4F2ED] text-[#6F6F68] group-hover:text-[#1D3E37]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-[#1D3E37]">{account.label}</span>
                          <span className="block truncate text-2xs text-[#9A958A]">{account.email}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@kaveristays.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-label">Password</span>
                    <button
                      type="button"
                      className="text-xs font-medium text-[#2F6154] transition-colors hover:text-[#1D3E37]"
                    >
                      Forgot?
                    </button>
                  </div>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    leftIcon={<Lock className="h-4 w-4" />}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="mt-2 w-full gap-2"
                >
                  <span>Sign in to portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <p className="text-center text-sm text-[#6F6F68]">
                New to Kaveri Stays?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-medium text-[#1D3E37] underline decoration-[#C59B27] decoration-1 underline-offset-4 transition-colors hover:text-[#C59B27]"
                >
                  Create a guest account
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <header className="space-y-1.5">
                <h1 className="font-serif text-3xl font-semibold tracking-[-0.02em] text-[#1D3E37]">
                  Join the Guest Circle
                </h1>
                <p className="text-sm leading-relaxed text-[#545B56]">
                  Manage bookings, unlock member-only seasonal tariffs, and reserve stays across all three
                  sanctuaries.
                </p>
              </header>

              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  label="Full name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Siddharth Rao"
                  leftIcon={<UserIcon className="h-4 w-4" />}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Email address"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    leftIcon={<Mail className="h-4 w-4" />}
                  />
                  <Input
                    label="Phone (optional)"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 12345"
                    leftIcon={<Phone className="h-4 w-4" />}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 10 characters"
                    helperText="At least 10 characters"
                    leftIcon={<Lock className="h-4 w-4" />}
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    leftIcon={<Lock className="h-4 w-4" />}
                  />
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-[#F4F2ED] px-3.5 py-2.5 text-xs text-[#545B56]">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#2F6154]" />
                  <span>Registration grants verified Guest membership privileges only.</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="mt-1 w-full gap-2"
                >
                  <span>Create account</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <p className="text-center text-sm text-[#6F6F68]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-medium text-[#1D3E37] underline decoration-[#C59B27] decoration-1 underline-offset-4 transition-colors hover:text-[#C59B27]"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
