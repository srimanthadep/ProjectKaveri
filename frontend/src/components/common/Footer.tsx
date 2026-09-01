import React, { useState } from 'react';
import kaveriLogo from '../../assets/kaveri_logo.png';
import {
  MapPin,
  Phone,
  Mail,
  Award,
  ShieldCheck,
  Send,
  ArrowUpRight,
  Sparkles,
  Clock,
  Compass,
  Coffee,
  Trees,
  Waves,
  MessageSquare
} from 'lucide-react';
import { useToast } from '../ui/Toast';

const SANCTUARIES = [
  {
    name: 'Kaveri Riverside',
    place: 'Coorg',
    detail: 'Arabica coffee estate & private riverfront',
    state: 'Karnataka',
    icon: Coffee,
  },
  {
    name: 'Kaveri Hilltop',
    place: 'Ooty',
    detail: 'Lovedale Valley Victorian stone manor',
    state: 'Tamil Nadu',
    icon: Trees,
  },
  {
    name: 'Kaveri Backwater',
    place: 'Alleppey',
    detail: 'Punnamada Lake solar kettuvallams',
    state: 'Kerala',
    icon: Waves,
  },
];

const PORTALS = [
  { label: 'Reserve Sanctuary Suite', view: 'booking-engine', highlight: true },
  { label: 'Guest Circle — My Bookings', view: 'guest-dashboard' },
  { label: 'Front Desk & Room Dispatch', view: 'staff-dashboard' },
  { label: 'General Manager Yield Matrix', view: 'manager-dashboard' },
  { label: 'Executive Portfolio Suite', view: 'owner-dashboard' },
];

export const Footer: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { success } = useToast();
  const [subscriberEmail, setSubscriberEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberEmail) return;
    success('Invitation Confirmed', `Private seasonal memoirs will be sent to ${subscriberEmail}.`);
    setSubscriberEmail('');
  };

  return (
    <footer className="relative overflow-hidden border-t border-[#C59B27]/20 bg-[#0A1814] text-[#C7D6CF]">
      {/* Background Decorative Grid & Ambience */}
      <div className="emerald-pattern pointer-events-none absolute inset-0 opacity-[0.04]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-radial from-[#C59B27]/10 via-[#1D3E37]/15 to-transparent blur-3xl" />

      {/* Pre-Footer: Pillars of Mindful Luxury */}
      <div className="relative z-10 border-b border-white/[0.07] bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            <div className="flex items-center gap-3.5 group">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#C59B27]/30 bg-[#1D3E37]/60 text-[#C59B27] shadow-sm transition-transform duration-300 group-hover:scale-105">
                <Trees className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold text-[#FAF8F4] tracking-[-0.01em]">
                  Regenerative Sanctuaries
                </h4>
                <p className="text-2xs text-[#9A958A] mt-0.5">100% solar powered & zero single-use plastic</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 group">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#C59B27]/30 bg-[#1D3E37]/60 text-[#C59B27] shadow-sm transition-transform duration-300 group-hover:scale-105">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold text-[#FAF8F4] tracking-[-0.01em]">
                  Single-Estate Gastronomy
                </h4>
                <p className="text-2xs text-[#9A958A] mt-0.5">Hyper-local seasonal harvest banquets</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 group">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#C59B27]/30 bg-[#1D3E37]/60 text-[#C59B27] shadow-sm transition-transform duration-300 group-hover:scale-105">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold text-[#FAF8F4] tracking-[-0.01em]">
                  24/7 Dedicated Concierge
                </h4>
                <p className="text-2xs text-[#9A958A] mt-0.5">Curated itinerary design & private dispatch</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        <div className="mb-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          
          {/* Col 1: Brand & Accreditations (4 cols) */}
          <div className="space-y-6 lg:col-span-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-[#C59B27]/30 bg-white p-1 shadow-md">
                <img src={kaveriLogo} alt="Kaveri Stays" className="h-full w-full rounded-xl object-contain" />
              </div>
              <div>
                <span className="block font-serif text-2xl font-bold tracking-[-0.02em] text-[#FAF8F4]">
                  Kaveri Stays
                </span>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#C59B27]">
                  Heritage Hospitality · South India
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-[#C7D6CF]/75 max-w-sm">
              Mindful sanctuaries balancing ancestral South Indian woodwork, private riverfronts, and highland mist with contemporary quiet luxury across Karnataka, Tamil Nadu, and Kerala.
            </p>

            {/* Accolades */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C59B27]/30 bg-[#C59B27]/10 px-3.5 py-1.5 shadow-2xs">
                <Award className="h-3.5 w-3.5 shrink-0 text-[#C59B27]" />
                <span className="text-2xs font-semibold text-[#E3C979] tracking-wide">Condé Nast Gold 2026</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-2xs text-[#FAF8F4]/80">
                <Sparkles className="h-3 w-3 text-[#C59B27]" />
                <span>Forbes Luxury Circle</span>
              </div>
            </div>
          </div>

          {/* Col 2: Our 3 Sanctuaries (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-2xs font-bold uppercase tracking-[0.2em] text-[#C59B27]">
              Our Sanctuaries
            </h3>
            <ul className="space-y-3">
              {SANCTUARIES.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.place}>
                    <button
                      type="button"
                      onClick={() => onNavigate('booking-engine')}
                      className="group flex items-start gap-3 text-left w-full p-2 rounded-xl transition-all hover:bg-white/[0.04]"
                    >
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#1D3E37]/50 text-[#C59B27] transition-all group-hover:border-[#C59B27]/40 group-hover:bg-[#C59B27]/20">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-serif text-sm font-semibold text-[#FAF8F4] group-hover:text-[#E3C979] transition-colors">
                          {s.name}
                          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#C59B27]" />
                        </span>
                        <span className="block truncate text-2xs text-[#9A958A] mt-0.5">{s.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Col 3: Portals & Access (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-2xs font-bold uppercase tracking-[0.2em] text-[#C59B27]">
              Portals & Access
            </h3>
            <ul className="space-y-2.5">
              {PORTALS.map((p) => (
                <li key={p.view}>
                  <button
                    type="button"
                    onClick={() => onNavigate(p.view)}
                    className="group flex items-center justify-between w-full text-left text-xs text-[#C7D6CF]/75 hover:text-[#FAF8F4] transition-colors py-1"
                  >
                    <span className={p.highlight ? 'text-[#FAF8F4] font-semibold flex items-center gap-1.5' : ''}>
                      {p.highlight && <span className="h-1.5 w-1.5 rounded-full bg-[#C59B27]" />}
                      {p.label}
                    </span>
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity text-[#9A958A]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Private Concierge & Newsletter (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-2xs font-bold uppercase tracking-[0.2em] text-[#C59B27]">
              Private Concierge
            </h3>

            <p className="text-xs text-[#C7D6CF]/75 leading-relaxed">
              Invitations for seasonal spice harvests, tea degustations, and exclusive villa releases.
            </p>

            {/* Newsletter Input */}
            <form onSubmit={handleSubscribe} className="relative flex items-center">
              <label htmlFor="footer-subscriber-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-subscriber-email"
                type="email"
                required
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                placeholder="Enter your email..."
                className="h-11 w-full rounded-xl border border-white/12 bg-white/[0.06] pl-3.5 pr-12 text-xs text-[#FAF8F4] placeholder:text-[#9A958A] transition-all focus:border-[#C59B27] focus:bg-white/[0.1] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Subscribe to memoirs"
                className="absolute right-1.5 h-8 w-8 grid place-items-center rounded-lg bg-[#C59B27] text-[#0C1E1A] hover:bg-[#D8AC36] transition-colors cursor-pointer shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

            {/* Contact Details */}
            <div className="pt-2 space-y-2 border-t border-white/[0.06]">
              <a
                href="tel:+918049108800"
                className="flex items-center gap-2.5 text-xs text-[#C7D6CF]/80 hover:text-[#FAF8F4] transition-colors group"
              >
                <span className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.05] text-[#C59B27] group-hover:bg-[#C59B27]/20 transition-colors">
                  <Phone className="h-3 w-3" />
                </span>
                <span className="font-mono tracking-tight">+91 80 4910 8800</span>
              </a>

              <a
                href="mailto:reservations@kaveristays.com"
                className="flex items-center gap-2.5 text-xs text-[#C7D6CF]/80 hover:text-[#FAF8F4] transition-colors group"
              >
                <span className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.05] text-[#C59B27] group-hover:bg-[#C59B27]/20 transition-colors">
                  <Mail className="h-3 w-3" />
                </span>
                <span>reservations@kaveristays.com</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Sustainability Standards */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.08] pt-8 text-2xs text-[#9A958A]">
          <p>© {new Date().getFullYear()} Kaveri Stays Hospitality Group. All rights reserved.</p>
          
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-[#C7D6CF]/70">
              <ShieldCheck className="h-3.5 w-3.5 text-[#C59B27]" />
              <span>100% Solar-Powered · Zero Single-Use Plastic</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('whatsapp')}
              className="text-[#C59B27] hover:underline font-medium"
            >
              WhatsApp Concierge
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
