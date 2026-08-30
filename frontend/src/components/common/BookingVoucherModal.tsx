import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Booking } from '../../types';
import { formatINR, formatDate } from '../../lib/utils';
import { useHotel } from '../../context/HotelContext';
import { Printer, Download, Sparkles, MapPin, Calendar, Clock, Key, CheckCircle2 } from 'lucide-react';

interface BookingVoucherModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingVoucherModal: React.FC<BookingVoucherModalProps> = ({
  booking,
  isOpen,
  onClose,
}) => {
  const { properties } = useHotel();

  if (!booking) return null;

  const property = properties.find((p) => p.id === booking.propertyId) || properties[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="space-y-6 print:p-0">
        {/* Header Ribbon */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-6 text-white border border-emerald-500/30 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-widest">
                <Sparkles className="w-4 h-4" />
                <span>Official Booking Voucher</span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-white tracking-tight">
                {property.name}
              </h3>
              <p className="text-xs text-emerald-100/90 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                {property.location}
              </p>
            </div>

            <div className="text-left sm:text-right bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20">
              <div className="text-[10px] uppercase tracking-wider text-emerald-300">Reservation Code</div>
              <div className="text-xl font-mono font-bold text-white">{booking.voucherCode}</div>
              <Badge variant="emerald" className="mt-1">
                {booking.status.toUpperCase().replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Guest & Stay Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Guest Info */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Primary Guest
            </div>
            <div className="text-sm font-bold text-slate-900">{booking.guestName}</div>
            <div className="text-slate-600">{booking.guestEmail}</div>
            <div className="text-slate-600">{booking.guestPhone || '+91 Not provided'}</div>
            {booking.roomNumber && (
              <div className="pt-2 flex items-center gap-2 text-emerald-700 font-semibold">
                <Key className="w-4 h-4" />
                <span>Assigned Suite/Room #{booking.roomNumber}</span>
              </div>
            )}
          </div>

          {/* Stay Timeline */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Stay Itinerary ({booking.nights} Nights)
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <div className="text-slate-500 text-[10px]">CHECK-IN</div>
                <div className="font-semibold text-slate-900">{formatDate(booking.checkInDate)}</div>
                <div className="text-slate-400 text-[10px]">From 14:00 hrs</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">CHECK-OUT</div>
                <div className="font-semibold text-slate-900">{formatDate(booking.checkOutDate)}</div>
                <div className="text-slate-400 text-[10px]">Until 11:00 hrs</div>
              </div>
            </div>
            <div className="pt-1 text-slate-600">
              <span className="font-semibold capitalize">{booking.roomCategory} Category</span> • {booking.guestsCount} Guests
            </div>
          </div>
        </div>

        {/* Financial Accounting Breakdown */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
          <div className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Tariff & Payment Breakdown
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{formatINR(booking.nightlyRate)} × {booking.nights} Nights</span>
              <span>{formatINR(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes, Luxury Surcharge & Plantation Cess</span>
              <span className="text-emerald-600 font-medium">Included</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Mode</span>
              <span className="font-medium">{booking.paymentMethod}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold text-sm">
              <span className="text-slate-900">Total Booking Value</span>
              <span className="text-emerald-700 font-bold">{formatINR(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-700 font-medium">
              <span>Paid / Deposit Remitted</span>
              <span>{formatINR(booking.paidAmount)}</span>
            </div>
            {booking.outstandingBalance > 0 ? (
              <div className="flex justify-between text-xs text-amber-600 font-bold bg-amber-50 p-2 rounded-lg">
                <span>Outstanding Balance at Check-in</span>
                <span>{formatINR(booking.outstandingBalance)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Fully Settled & Guaranteed Reservation</span>
              </div>
            )}
          </div>
        </div>

        {/* Special Inclusions Note */}
        <div className="text-xs text-slate-500 space-y-1 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
          <div className="font-semibold text-emerald-900">Voucher Inclusions:</div>
          <p>• Gourmet regional breakfast & afternoon high tea included daily.</p>
          <p>• Complimentary property experience: {property.signatureExperience}.</p>
          {booking.specialRequests && (
            <p className="text-slate-700">
              <span className="font-medium">Special Request Log:</span> "{booking.specialRequests}"
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4 text-slate-500" />
            Print Voucher
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              handlePrint();
            }}
            className="gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Save as PDF
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
