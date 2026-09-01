import React, { useState, useEffect } from 'react';
import kaveriLogo from '../../assets/kaveri_logo.png';
import { useAuth } from '../../context/AuthContext';
import { useHotel } from '../../context/HotelContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import {
  User as UserIcon,
  LogOut,
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
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
}) => {
  const { user, logout, switchRoleDemo, isAuthenticated } = useAuth();
  const { properties, setSelectedPropertyId } = useHotel();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [destMenuOpen, setDestMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="emerald" className="flex items-center gap-1"><Crown className="w-3 h-3" /> Chain Owner</Badge>;
      case 'manager':
        return <Badge variant="default" className="flex items-center gap-1"><Building className="w-3 h-3" /> Manager</Badge>;
      case 'staff':
        return <Badge variant="warning" className="flex items-center gap-1"><KeyRound className="w-3 h-3" /> Staff</Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> Guest</Badge>;
    }
  };

  const getDashboardViewForRole = (role?: string) => {
    switch (role) {
      case 'owner': return 'owner-dashboard';
      case 'manager': return 'manager-dashboard';
      case 'staff': return 'staff-dashboard';
      default: return 'guest-dashboard';
    }
  };

  const navLinkClass = (isActive: boolean) =>
    `relative text-xs sm:text-sm font-medium tracking-[-0.01em] cursor-pointer transition-colors duration-150 py-1 ${
      isActive
        ? 'text-[#183028] after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-full after:rounded-full after:bg-[#9E7B36]'
        : 'text-[#615D56] hover:text-[#183028]'
    }`;

  return (
    <header
      id="main-navigation"
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'border-b border-[#EAE6DF] bg-white/95 py-2.5 shadow-2xs backdrop-blur-xl'
          : 'border-b border-[#EAE6DF]/60 bg-[#FAF8F5]/90 py-3.5 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
          className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#E7E3DA] bg-white p-0.5 shadow-xs transition-transform duration-200 group-hover:scale-[1.04]">
            <img src={kaveriLogo} alt="" className="h-full w-full rounded-lg object-contain" />
          </div>
          <span className="block font-serif text-xl font-semibold tracking-[-0.02em] text-[#1D3E37] sm:text-[1.375rem]">
            Kaveri Stays
          </span>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden items-center gap-8 lg:flex">
          <button type="button" onClick={() => onNavigate('landing')} className={navLinkClass(currentView === 'landing')}>
            Home
          </button>

          {/* Destinations Dropdown */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setDestMenuOpen(!destMenuOpen)}
              onMouseEnter={() => setDestMenuOpen(true)}
              className={`flex items-center gap-1.5 ${navLinkClass(false)}`}
            >
              <span>Destinations</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>

            {destMenuOpen && (
              <div
                onMouseLeave={() => setDestMenuOpen(false)}
                className="absolute left-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-[#E7E3DA] bg-white p-1.5 shadow-lg"
              >
                {properties.map((prop) => (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => {
                      setSelectedPropertyId(prop.id);
                      onNavigate('booking-engine', { propertyId: prop.id });
                      setDestMenuOpen(false);
                    }}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#F4F2ED]"
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#F4F2ED] text-[#2F6154]">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-serif text-[0.9375rem] font-semibold tracking-[-0.012em] text-[#1D3E37]">
                        {prop.name}
                      </span>
                      <span className="block truncate text-xs text-[#6F6F68]">
                        {prop.state} · {prop.tagline.split('&')[0].trim()}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('booking-engine')}
            className={navLinkClass(currentView === 'booking-engine')}
          >
            Reserve
          </button>

          <button
            type="button"
            onClick={() => onNavigate('whatsapp')}
            className={navLinkClass(currentView === 'whatsapp')}
          >
            WhatsApp Hub
          </button>

          {/* Quick Portal Switch Link */}
          {user && (
            <button
              type="button"
              onClick={() => onNavigate(getDashboardViewForRole(user.role))}
              className={navLinkClass(currentView.includes('dashboard') || currentView === 'guest-bookings')}
            >
              {user.role === 'owner' ? 'Executive Suite'
                : user.role === 'manager' ? 'Manager Portal'
                : user.role === 'staff' ? 'Front Desk'
                : 'My Stays'}
            </button>
          )}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Role Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="hidden items-center gap-1.5 rounded-lg border border-[#E7E3DA] bg-white px-2.5 py-1.5 text-xs font-medium text-[#3C463F] shadow-xs transition-colors hover:border-[#D3CEC2] hover:bg-[#F4F2ED] sm:flex"
              title="Switch demo persona"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#9A958A]" />
              <span className="capitalize">{user?.role || 'Guest'}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {roleSwitcherOpen && (
              <div
                onMouseLeave={() => setRoleSwitcherOpen(false)}
                className="absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border border-[#E7E3DA] bg-white p-1.5 text-left shadow-lg"
              >
                <div className="text-eyebrow px-2.5 pb-1.5 pt-2 text-[#9A958A]">
                  Demo persona
                </div>
                {[
                  { role: 'guest' as const, name: 'Siddharth Rao (Guest)', view: 'guest-dashboard', badge: 'secondary' as const },
                  { role: 'staff' as const, name: 'Naveen (Front Desk Coorg)', view: 'staff-dashboard', badge: 'warning' as const },
                  { role: 'manager' as const, name: 'Devika (Manager Coorg)', view: 'manager-dashboard', badge: 'default' as const },
                  { role: 'owner' as const, name: 'Raghavan Kaveri (Owner)', view: 'owner-dashboard', badge: 'emerald' as const },
                ].map(({ role, name, view, badge }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      switchRoleDemo(role);
                      onNavigate(view);
                      setRoleSwitcherOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[#F4F2ED]"
                  >
                    <span className="truncate text-xs font-medium text-[#3C463F]">{name}</span>
                    <Badge variant={badge}>{role.charAt(0).toUpperCase() + role.slice(1)}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Profile / Auth Actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate(getDashboardViewForRole(user.role))}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1 pr-2 text-left transition-colors hover:bg-[#F4F2ED]"
              >
                <Avatar alt={user.name} size="sm" />
                <span className="hidden leading-tight sm:block">
                  <span className="block text-xs font-semibold text-[#1D3E37]">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="block text-2xs capitalize text-[#6F6F68]">{user.role}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="grid h-9 w-9 place-items-center rounded-xl text-[#6F6F68] transition-colors hover:bg-[#FBECEA] hover:text-[#A8332B]"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => onNavigate('login')}>
                Sign in
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('booking-engine')}
                className="hidden sm:inline-flex"
              >
                Reserve a stay
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className="grid h-9 w-9 place-items-center rounded-xl text-[#1D3E37] transition-colors hover:bg-[#F4F2ED] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute inset-x-0 top-full border-b border-[#E7E3DA] bg-white px-4 py-3 shadow-lg lg:hidden">
          <button type="button" onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#1D3E37] transition-colors hover:bg-[#F4F2ED]">
            Home
          </button>
          <button type="button" onClick={() => { onNavigate('booking-engine'); setMobileMenuOpen(false); }}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#1D3E37] transition-colors hover:bg-[#F4F2ED]">
            Reserve
          </button>
          {user && (
            <button type="button" onClick={() => { onNavigate(getDashboardViewForRole(user.role)); setMobileMenuOpen(false); }}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#1D3E37] transition-colors hover:bg-[#F4F2ED]">
              {user.role === 'owner' ? 'Executive Suite'
                : user.role === 'manager' ? 'Manager Portal'
                : user.role === 'staff' ? 'Front Desk'
                : 'My Stays'}
            </button>
          )}

          <div className="my-2 h-px bg-[#E7E3DA]" />
          <div className="text-eyebrow px-3 pb-1 text-[#9A958A]">Destinations</div>

          {properties.map((prop) => (
            <button key={prop.id} type="button" onClick={() => {
              setSelectedPropertyId(prop.id);
              onNavigate('booking-engine', { propertyId: prop.id });
              setMobileMenuOpen(false);
            }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-[#545B56] transition-colors hover:bg-[#F4F2ED]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9A958A]" />
              <span className="truncate">{prop.name} · {prop.state}</span>
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
