import React, { useState, useEffect, useRef } from 'react';
import kaveriLogo from '../../assets/kaveri_logo.png';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import {
  Home,
  LogOut,
  ChevronDown,
  Crown,
  Building,
  KeyRound,
  User as UserIcon,
  MessageSquare,
} from 'lucide-react';

interface PortalHeaderProps {
  currentView: string;
  onNavigate: (view: string, extraData?: any) => void;
}

const ROLE_META: Record<
  string,
  { label: string; icon: React.ElementType; dot: string }
> = {
  owner: { label: 'Chain Owner', icon: Crown, dot: 'bg-[#C59B27]' },
  manager: { label: 'Property Manager', icon: Building, dot: 'bg-[#2F6154]' },
  staff: { label: 'Front Desk', icon: KeyRound, dot: 'bg-[#B08A1F]' },
  guest: { label: 'Guest', icon: UserIcon, dot: 'bg-[#6F6F68]' },
};

export const PortalHeader: React.FC<PortalHeaderProps> = ({ currentView, onNavigate }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const roleKey = user?.role ?? 'guest';
  const role = ROLE_META[roleKey] ?? ROLE_META.guest;
  const RoleIcon = role.icon;

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    onNavigate('landing');
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#E7E3DA] bg-[#FAF8F4]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand lockup → home */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="group flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B27]"
          aria-label="Back to home"
        >
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-[#E7E3DA] bg-white p-0.5 shadow-xs transition-transform duration-200 group-hover:scale-[1.04]">
            <img src={kaveriLogo} alt="" className="h-full w-full rounded-md object-contain" />
          </span>
          <span className="hidden font-serif text-lg font-semibold tracking-[-0.02em] text-[#1D3E37] sm:block">
            Kaveri Stays
          </span>
        </button>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={() => onNavigate('whatsapp')}
            className={`hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex ${
              currentView === 'whatsapp'
                ? 'bg-[#1D3E37] text-white shadow-xs'
                : 'text-[#545B56] hover:bg-[#F4F2ED] hover:text-[#1D3E37]'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp</span>
          </button>

          {/* Home */}
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#545B56] transition-colors hover:bg-[#F4F2ED] hover:text-[#1D3E37] sm:flex"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </button>

          <span className="hidden h-6 w-px bg-[#E7E3DA] sm:block" />

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2.5 rounded-xl border border-transparent py-1 pl-1 pr-2 transition-colors hover:border-[#E7E3DA] hover:bg-white"
            >
              <Avatar src={user?.avatarUrl} alt={user?.name} size="sm" />
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-semibold text-[#1D3E37]">
                  {user?.name?.split(' ')[0] ?? 'Guest'}
                </span>
                <span className="flex items-center gap-1 text-2xs text-[#6F6F68]">
                  <span className={`h-1.5 w-1.5 rounded-full ${role.dot}`} />
                  {role.label}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[#9A958A] transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border border-[#E7E3DA] bg-white p-1.5 shadow-lg"
              >
                {/* Identity block */}
                <div className="flex items-center gap-3 rounded-xl px-2.5 py-2.5">
                  <Avatar src={user?.avatarUrl} alt={user?.name} size="md" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#1D3E37]">
                      {user?.name ?? 'Guest'}
                    </div>
                    <div className="truncate text-xs text-[#6F6F68]">{user?.email ?? '—'}</div>
                  </div>
                </div>

                <div className="my-1 flex items-center gap-1.5 rounded-lg bg-[#F4F2ED] px-2.5 py-1.5">
                  <RoleIcon className="h-3.5 w-3.5 text-[#2F6154]" />
                  <span className="text-xs font-medium text-[#3C463F]">{role.label}</span>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate('landing');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-[#3C463F] transition-colors hover:bg-[#F4F2ED] sm:hidden"
                >
                  <Home className="h-4 w-4 text-[#6F6F68]" />
                  Home
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-[#A8332B] transition-colors hover:bg-[#FBECEA]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
