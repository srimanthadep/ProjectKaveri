import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Booking } from '../../types';
import { ShieldCheck, Wifi, Check } from 'lucide-react';

interface KeycardModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const KeycardModal: React.FC<KeycardModalProps> = ({ booking, isOpen, onClose }) => {
  if (!booking) return null;

  const keycard = booking.keyCardIssued || {
    cardNumber: `RFID-${booking.propertyId.toUpperCase()}-${booking.roomNumber || '101'}-A`,
    pin: '8492',
    issuedAt: 'Just Now',
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="space-y-6 text-center">
        <div className="space-y-1">
          <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">
            Guest Checked In Successfully
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Digital RFID Access Token & Room Pass Assigned
          </p>
        </div>

        {/* Visual RFID Card */}
        <div className="relative mx-auto w-full max-w-sm rounded-2xl bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-950 p-6 text-white border border-emerald-500/50 shadow-2xl overflow-hidden text-left">
          {/* Card background watermark */}
          <div className="absolute -right-8 -bottom-8 opacity-10 text-8xl font-serif font-black">
            K
          </div>

          <div className="flex items-center justify-between pb-6 border-b border-white/15">
            <div>
              <span className="font-serif font-bold text-lg text-white block">KAVERI STAYS</span>
              <span className="text-[9px] uppercase tracking-widest text-emerald-300">RFID ACCESS PASS</span>
            </div>
            <Wifi className="w-6 h-6 text-emerald-300 rotate-90" />
          </div>

          <div className="py-4 space-y-3">
            <div>
              <div className="text-[10px] uppercase text-emerald-100/70">Assigned Suite / Room</div>
              <div className="text-3xl font-serif font-bold text-emerald-200">
                Room {booking.roomNumber || '201'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] text-emerald-100/70">GUEST NAME</div>
                <div className="font-semibold truncate">{booking.guestName}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-100/70">SECURITY PIN</div>
                <div className="font-mono font-bold text-emerald-300 text-sm tracking-widest">{keycard.pin}</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/15 flex items-center justify-between text-[10px] text-emerald-100/80 font-mono">
            <span>{keycard.cardNumber}</span>
            <span>Valid till {booking.checkOutDate}</span>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl flex items-center gap-2.5 text-left border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Hand the physical RFID keycard to the guest and share the 4-digit master PIN for the suite door lock.</span>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Done & Return to Desk
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
