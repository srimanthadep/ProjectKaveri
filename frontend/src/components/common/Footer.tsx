import React, { useState } from 'react';
import kaveriLogo from '../../assets/kaveri_logo.png';
import { MapPin, Phone, Mail, Award, ShieldCheck, Send } from 'lucide-react';
import { useToast } from '../ui/Toast';

const SANCTUARIES = [
  { name: 'Kaveri Riverside', place: 'Coorg', detail: 'Arabica coffee estates, Karnataka' },
  { name: 'Kaveri Hilltop', place: 'Ooty', detail: 'Lovedale Valley, Tamil Nadu' },
  { name: 'Kaveri Backwater', place: 'Alleppey', detail: 'Punnamada Lake, Kerala' },
];

const PORTALS = [
  { label: 'Reserve a cottage or villa', view: 'booking-engine' },
  { label: 'Guest — My Stays', view: 'guest-dashboard' },
  { label: 'Front desk operations', view: 'staff-dashboard' },
  { label: 'Property manager analytics', view: 'manager-dashboard' },
  { label: 'Chain owner executive suite', view: 'owner-dashboard' },
];

export const Footer: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { success } = useToast();
  const [subscriberEmail, setSubscriberEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    success('You are on the list', 'Private invitations will be sent to ' + subscriberEmail + '.');
    setSubscriberEmail('');
  };

  return (
    <footer className="relative overflow-hidden border-t border-[#C59B27]/15 bg-[#16201B] text-[#C7D6CF]">
      <div className="emerald-pattern pointer-events-none absolute inset-0 opacity-[0.06]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="mb-14 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white p-0.5">
                <img src={kaveriLogo} alt="" className="h-full w-full rounded-lg object-contain" />
              </div>
              <div className="leading-none">
                <span className="block font-serif text-[1.375rem] font-semibold tracking-[-0.02em] text-[#FAF8F4]">
                  Kaveri Stays
                </span>
                <span className="text-eyebrow mt-1 block text-[#C59B27]">Heritage Hospitality</span>
              </div>
            </div>

            <p className="max-w-sm text-sm leading-relaxed text-[#C7D6CF]/75">
              Mindful luxury sanctuaries rooted in South Indian heritage architecture and regenerative
              hospitality, across Karnataka, Tamil Nadu and Kerala.
            </p>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#C59B27]/25 bg-[#C59B27]/8 px-3 py-1.5">
              <Award className="h-3.5 w-3.5 shrink-0 text-[#C59B27]" />
              <span className="text-xs font-medium text-[#E3C979]">Condé Nast Traveller Gold 2026</span>
            </div>
          </div>

          {/* Sanctuaries */}
          <div>
            <h3 className="text-eyebrow mb-5 text-[#C59B27]">Our Sanctuaries</h3>
            <ul className="space-y-4">
              {SANCTUARIES.map((s) => (
                <li key={s.place}>
                  <button
                    type="button"
                    onClick={() => onNavigate('booking-engine')}
                    className="group flex items-start gap-2.5 text-left"
                  >
                    <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/6 text-[#C7D6CF]/70 transition-colors group-hover:bg-[#C59B27]/15 group-hover:text-[#C59B27]">
                      <MapPin className="h-3 w-3" />
                    </span>
                    <span>
                      <span className="block font-serif text-[0.9375rem] font-medium tracking-[-0.012em] text-[#FAF8F4] transition-colors group-hover:text-[#E3C979]">
                        {s.name} <span className="text-[#C7D6CF]/50">({s.place})</span>
                      </span>
                      <span className="block text-xs text-[#C7D6CF]/60">{s.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h3 className="text-eyebrow mb-5 text-[#C59B27]">Portals & Access</h3>
            <ul className="space-y-2.5">
              {PORTALS.map((p) => (
                <li key={p.view}>
                  <button
                    type="button"
                    onClick={() => onNavigate(p.view)}
                    className="text-left text-sm text-[#C7D6CF]/75 transition-colors hover:text-[#FAF8F4]"
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Concierge */}
          <div>
            <h3 className="text-eyebrow mb-5 text-[#C59B27]">Private Concierge</h3>

            <p className="mb-4 text-sm leading-relaxed text-[#C7D6CF]/75">
              Invitations for seasonal harvests, tea tastings and exclusive villa releases.
            </p>

            <form onSubmit={handleSubscribe} className="flex items-center gap-2">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                required
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 w-full rounded-xl border border-white/12 bg-white/6 px-3.5 text-sm text-[#FAF8F4] placeholder:text-[#C7D6CF]/40 transition-colors focus:border-[#C59B27]/50 focus:bg-white/10 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#C59B27] text-[#1A1508] transition-colors hover:bg-[#D8AC36]"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

            <div className="mt-5 space-y-2.5">
              <a
                href="tel:+918049108800"
                className="flex items-center gap-2.5 text-sm text-[#C7D6CF]/75 transition-colors hover:text-[#FAF8F4]"
              >
                <Phone className="h-3.5 w-3.5 shrink-0 text-[#C59B27]/70" />
                <span className="tabular">+91 80 4910 8800</span>
              </a>
              <a
                href="mailto:reservations@kaveristays.com"
                className="flex items-center gap-2.5 text-sm text-[#C7D6CF]/75 transition-colors hover:text-[#FAF8F4]"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#C59B27]/70" />
                <span>reservations@kaveristays.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-7 sm:flex-row">
          <p className="text-xs text-[#C7D6CF]/50">
            © {new Date().getFullYear()} Kaveri Stays Hospitality Group
          </p>
          <p className="flex items-center gap-2 text-xs text-[#C7D6CF]/60">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#C59B27]/70" />
            <span>Eco-certified · 100% solar · zero single-use plastic</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
