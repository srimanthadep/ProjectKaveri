import React from 'react';
import { MapPin, Phone, Mail, Award, ShieldCheck, Heart, Sparkles, Send } from 'lucide-react';
import { Button } from '../ui/Button';

export const Footer: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#05261E] text-slate-300 pt-16 pb-12 border-t border-emerald-500/20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-15 emerald-pattern pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <span className="text-white font-serif font-bold text-xl">K</span>
              </div>
              <div>
                <span className="font-serif italic text-2xl font-bold tracking-tight text-white block">
                  Kaveri Stays
                </span>
                <span className="text-[9px] tracking-[0.24em] uppercase text-emerald-400 font-bold block">
                  Heritage Hospitality
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Curating mindful luxury sanctuaries rooted in South Indian heritage architecture, organic biodiversity plantations, and regenerative hospitality across Karnataka, Tamil Nadu, and Kerala.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-500/30">
                <Award className="w-4 h-4 text-emerald-300" />
                <span className="tracking-wide">Condé Nast Traveller Gold 2026</span>
              </div>
            </div>
          </div>

          {/* Destinations */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-[0.22em] font-bold text-emerald-400 font-sans">
              Our Sanctuaries
            </h4>
            <ul className="space-y-3 text-xs">
              <li className="space-y-0.5 group cursor-pointer" onClick={() => onNavigate('home')}>
                <div className="font-medium text-white flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                  <div className="w-5 h-5 rounded-md bg-emerald-900/60 flex items-center justify-center text-emerald-400">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <span className="font-serif text-sm">Kaveri Riverside (Coorg)</span>
                </div>
                <div className="text-slate-400 pl-7 text-[11px]">Arabica Coffee Estates, Karnataka</div>
              </li>
              <li className="space-y-0.5 group cursor-pointer" onClick={() => onNavigate('home')}>
                <div className="font-medium text-white flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                  <div className="w-5 h-5 rounded-md bg-emerald-900/60 flex items-center justify-center text-emerald-400">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <span className="font-serif text-sm">Kaveri Hilltop (Ooty)</span>
                </div>
                <div className="text-slate-400 pl-7 text-[11px]">Lovedale Valley, Tamil Nadu</div>
              </li>
              <li className="space-y-0.5 group cursor-pointer" onClick={() => onNavigate('home')}>
                <div className="font-medium text-white flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                  <div className="w-5 h-5 rounded-md bg-emerald-900/60 flex items-center justify-center text-emerald-400">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <span className="font-serif text-sm">Kaveri Backwater (Alleppey)</span>
                </div>
                <div className="text-slate-400 pl-7 text-[11px]">Punnamada Lake, Kerala</div>
              </li>
            </ul>
          </div>

          {/* Quick Portal Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-[0.22em] font-bold text-emerald-400 font-sans">
              Portals & Access
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('booking-engine')}
                  className="hover:text-emerald-300 transition-colors text-left flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Reserve a Cottage / Villa</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('guest-dashboard')}
                  className="hover:text-emerald-300 transition-colors text-left flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Guest "My Stays" Hub</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('staff-dashboard')}
                  className="hover:text-emerald-300 transition-colors text-left flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Front Desk Staff Operations</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('manager-dashboard')}
                  className="hover:text-emerald-300 transition-colors text-left flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Property Manager Analytics</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('owner-dashboard')}
                  className="hover:text-emerald-300 transition-colors text-left flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Chain Owner Executive Suite</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter & Concierge */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-[0.22em] font-bold text-emerald-400 font-sans">
              Private Concierge
            </h4>
            <p className="text-xs text-slate-300">
              Receive private invitations for seasonal harvests, tea tastings, and exclusive villa releases.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Thank you for subscribing to Kaveri Stays private invitations.');
              }}
              className="flex items-center gap-2"
            >
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="h-10 w-full px-3.5 rounded-xl bg-white/10 border border-emerald-500/30 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-md"
                title="Subscribe"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="pt-2 text-[11px] text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>+91 80 4910 8800 (24/7 Concierge)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>reservations@kaveristays.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="text-[10px] uppercase tracking-[0.2em] opacity-75 text-slate-300">
            © {new Date().getFullYear()} Kaveri Stays Hospitality Group
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Eco-Certified 100% Solar & Zero-Single-Use-Plastic
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
