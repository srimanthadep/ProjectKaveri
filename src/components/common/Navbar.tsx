import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHotel } from '../../context/HotelContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import {
  Compass,
  Moon,
  Sun,
  User as UserIcon,
  LogOut,
  Calendar,
  Sparkles,
  ShieldCheck,
  Building,
  KeyRound,
  Crown,
  Menu,
  X,
  MapPin,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, extraData?: any) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  darkMode,
  onToggleDarkMode,
}) => {
  const { user, logout, switchRoleDemo, isAuthenticated } = useAuth();
  const { properties, setSelectedPropertyId } = useHotel();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [destMenuOpen, setDestMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="emerald" className="flex items-center gap-1"><Crown className="w-3 h-3 text-emerald-600 dark:text-emerald-300" /> Chain Owner</Badge>;
      case 'manager':
        return <Badge variant="default" className="flex items-center gap-1 bg-emerald-700"><Building className="w-3 h-3" /> Manager</Badge>;
      case 'staff':
        return <Badge variant="warning" className="flex items-center gap-1"><KeyRound className="w-3 h-3" /> Staff Front-Desk</Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> Guest</Badge>;
    }
  };

  const getDashboardViewForRole = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'owner-dashboard';
      case 'manager':
        return 'manager-dashboard';
      case 'staff':
        return 'staff-dashboard';
      default:
        return 'guest-dashboard';
    }
  };

  return (
    <header
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled || currentView !== 'home'
          ? 'bg-white/95 dark:bg-[#090E11]/95 backdrop-blur-md shadow-xs border-b border-slate-200/80 dark:border-emerald-500/10 py-3.5'
          : 'bg-gradient-to-b from-black/85 via-black/45 to-transparent py-4 text-white border-b border-white/10'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => {
            onNavigate('home');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-3.5 text-left group cursor-pointer focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 border border-emerald-400/40 flex items-center justify-center shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            <span className="text-white font-serif font-bold text-xl tracking-tighter">K</span>
          </div>
          <div>
            <span
              className={`font-serif italic font-bold text-xl sm:text-2xl tracking-tight block ${
                isScrolled || currentView !== 'home' ? 'text-slate-900 dark:text-white' : 'text-white'
              }`}
            >
              Kaveri Stays
            </span>
            <span className="text-[9px] sm:text-[10px] tracking-[0.24em] uppercase text-emerald-600 dark:text-emerald-400 font-bold block -mt-1">
              Heritage Hospitality
            </span>
          </div>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center space-x-7">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`text-xs uppercase tracking-widest font-semibold transition-all hover:text-emerald-600 ${
              currentView === 'home'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : isScrolled || currentView !== 'home'
                ? 'text-slate-700 dark:text-slate-200'
                : 'text-white/90'
            }`}
          >
            Home
          </button>

          {/* Destinations Dropdown */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setDestMenuOpen(!destMenuOpen)}
              onMouseEnter={() => setDestMenuOpen(true)}
              className={`flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold transition-all hover:text-emerald-600 ${
                isScrolled || currentView !== 'home' ? 'text-slate-700 dark:text-slate-200' : 'text-white/90'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>Destinations</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {destMenuOpen && (
              <div
                onMouseLeave={() => setDestMenuOpen(false)}
                className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#111822] border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {properties.map((prop) => (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => {
                      setSelectedPropertyId(prop.id);
                      onNavigate('home', { scrollTo: 'destinations', propertyId: prop.id });
                      setDestMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-colors flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-300">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white font-serif">{prop.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{prop.state} • {prop.tagline.split('&')[0]}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('booking-engine')}
            className={`text-xs uppercase tracking-widest font-semibold transition-all hover:text-emerald-600 flex items-center gap-1.5 ${
              currentView === 'booking-engine'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : isScrolled || currentView !== 'home'
                ? 'text-slate-700 dark:text-slate-200'
                : 'text-white/90'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>Philosophy & Reserve</span>
          </button>

          {/* Quick Portal Switch Link */}
          {user && (
            <button
              type="button"
              onClick={() => onNavigate(getDashboardViewForRole(user.role))}
              className={`flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold transition-all hover:text-emerald-600 ${
                currentView.includes('dashboard') || currentView === 'guest-bookings'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : isScrolled || currentView !== 'home'
                  ? 'text-slate-700 dark:text-slate-200'
                  : 'text-white/90'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {user.role === 'owner'
                  ? 'Executive Suite'
                  : user.role === 'manager'
                  ? 'Manager Portal'
                  : user.role === 'staff'
                  ? 'Front Desk'
                  : 'My Stays'}
              </span>
            </button>
          )}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Role Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-600/20 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 transition-colors shadow-xs"
              title="Switch demo persona"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline text-[11px] uppercase tracking-wider opacity-70">Role:</span>
              <span className="capitalize">{user?.role || 'Guest'}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {roleSwitcherOpen && (
              <div
                onMouseLeave={() => setRoleSwitcherOpen(false)}
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-[#111822] border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in duration-150 text-left"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                  Instant Demo Persona Switch
                </div>
                <button
                  type="button"
                  onClick={() => {
                    switchRoleDemo('guest');
                    onNavigate('guest-dashboard');
                    setRoleSwitcherOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-emerald-50 dark:hover:bg-gray-800 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Siddharth Rao (Guest)</span>
                  <Badge variant="secondary">Guest</Badge>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchRoleDemo('staff');
                    onNavigate('staff-dashboard');
                    setRoleSwitcherOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-emerald-50 dark:hover:bg-gray-800 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Naveen (Front Desk Coorg)</span>
                  <Badge variant="warning">Staff</Badge>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchRoleDemo('manager');
                    onNavigate('manager-dashboard');
                    setRoleSwitcherOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-emerald-50 dark:hover:bg-gray-800 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Devika (Manager Coorg)</span>
                  <Badge variant="default">Manager</Badge>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchRoleDemo('owner');
                    onNavigate('owner-dashboard');
                    setRoleSwitcherOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-emerald-50 dark:hover:bg-gray-800 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Raghavan Kaveri (Owner)</span>
                  <Badge variant="emerald">Owner</Badge>
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`p-2 rounded-xl transition-colors ${
              isScrolled || currentView !== 'home'
                ? 'text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                : 'text-white hover:bg-white/15'
            }`}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-5 h-5 text-emerald-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          {/* User Profile / Auth Actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate(getDashboardViewForRole(user.role))}
                className="flex items-center gap-2 text-left p-1 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
              >
                <Avatar src={user.avatarUrl} alt={user.name} size="sm" />
                <div className="hidden sm:block">
                  <div
                    className={`text-xs font-bold leading-tight ${
                      isScrolled || currentView !== 'home' ? 'text-slate-900 dark:text-white' : 'text-white'
                    }`}
                  >
                    {user.name.split(' ')[0]}
                  </div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">{user.role}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className={`text-xs uppercase tracking-widest font-bold border-b pb-0.5 transition-all ${
                  isScrolled || currentView !== 'home'
                    ? 'text-slate-800 border-slate-800 hover:text-emerald-600 hover:border-emerald-600 dark:text-emerald-300 dark:border-emerald-300'
                    : 'text-white border-white hover:text-emerald-300 hover:border-emerald-300'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('booking-engine')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs uppercase tracking-widest font-bold transition-all rounded-xl shadow-sm hover:shadow-md hover:shadow-emerald-600/25 hidden sm:inline-flex items-center justify-center cursor-pointer gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Reserve Sanctuary</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-xl ${
              isScrolled || currentView !== 'home' ? 'text-slate-900 dark:text-white' : 'text-white'
            }`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-3 pb-6 bg-white dark:bg-[#090E11] border-b border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 shadow-lg">
          <div className="flex flex-col space-y-2">
            <button
              type="button"
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('booking-engine');
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Reserve a Stay</span>
            </button>
            {user && (
              <button
                type="button"
                onClick={() => {
                  onNavigate(getDashboardViewForRole(user.role));
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-between"
              >
                <span>Dashboard Portal</span>
                {getRoleBadge(user.role)}
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs uppercase font-bold text-slate-400 mb-2 px-3">Switch Demo Persona:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  switchRoleDemo('guest');
                  onNavigate('guest-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="p-2 text-xs text-left rounded-lg bg-slate-100 dark:bg-slate-800 font-medium hover:bg-emerald-50 transition-colors"
              >
                Guest Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  switchRoleDemo('staff');
                  onNavigate('staff-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="p-2 text-xs text-left rounded-lg bg-slate-100 dark:bg-slate-800 font-medium hover:bg-emerald-50 transition-colors"
              >
                Front Desk Staff
              </button>
              <button
                type="button"
                onClick={() => {
                  switchRoleDemo('manager');
                  onNavigate('manager-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="p-2 text-xs text-left rounded-lg bg-slate-100 dark:bg-slate-800 font-medium hover:bg-emerald-50 transition-colors"
              >
                Manager Analytics
              </button>
              <button
                type="button"
                onClick={() => {
                  switchRoleDemo('owner');
                  onNavigate('owner-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="p-2 text-xs text-left rounded-lg bg-slate-100 dark:bg-slate-800 font-medium hover:bg-emerald-50 transition-colors"
              >
                Executive Owner
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
