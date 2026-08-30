import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useHotel } from '../context/HotelContext';
import { PropertyId, RoomCategory, Booking, PaymentMethod } from '../types';
import { ROOM_TYPES_DATA } from '../data/mockData';
import { formatINR, formatDate, calculateNights } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { Dialog } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { BookingVoucherModal } from '../components/common/BookingVoucherModal';
import { ReviewModal } from '../components/common/ReviewModal';
import {
  Calendar,
  Sparkles,
  CreditCard,
  Key,
  Star,
  FileText,
  BedDouble,
  Clock,
  CheckCircle2,
  Users
} from 'lucide-react';

interface GuestPortalProps {
  initialTab?: string;
  onNavigate: (view: string) => void;
  bookingPreload?: {
    propertyId?: PropertyId;
    roomCategory?: RoomCategory;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  };
}

export const GuestPortal: React.FC<GuestPortalProps> = ({
  initialTab = 'booking-engine',
  onNavigate,
  bookingPreload,
}) => {
  const { user } = useAuth();
  const { properties, getGuestBookings, createBooking, cancelBooking } = useHotel();
  const { success, error } = useToast();

  const [activeMainTab, setActiveMainTab] = useState(initialTab);
  const [staysSubTab, setStaysSubTab] = useState<'upcoming' | 'active' | 'past'>('upcoming');

  // Booking Engine Filter State
  const [selectedPropertyId, setSelectedPropertyId] = useState<PropertyId>(
    bookingPreload?.propertyId || 'coorg'
  );
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory>(
    bookingPreload?.roomCategory || 'deluxe'
  );
  const [checkInDate, setCheckInDate] = useState<string>(() => {
    if (bookingPreload?.checkIn) return bookingPreload.checkIn;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [checkOutDate, setCheckOutDate] = useState<string>(() => {
    if (bookingPreload?.checkOut) return bookingPreload.checkOut;
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  });
  const [guestsCount, setGuestsCount] = useState<number>(bookingPreload?.guests || 2);

  // Reservation Modal & Checkout State
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit/Debit Card');
  const [paymentDepositOption, setPaymentDepositOption] = useState<'full' | 'deposit'>('full');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  // Voucher and Review Modal States
  const [selectedVoucherBooking, setSelectedVoucherBooking] = useState<Booking | null>(null);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<Booking | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Cancellation confirmation state (replaces window.confirm)
  const [bookingPendingCancel, setBookingPendingCancel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Calculate pricing
  const currentProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || properties[0];
  }, [properties, selectedPropertyId]);

  const currentRoomInfo = useMemo(() => {
    return (
      ROOM_TYPES_DATA.find((r) => r.id === selectedCategory) || ROOM_TYPES_DATA[0]
    );
  }, [selectedCategory]);

  const nights = useMemo(() => {
    return calculateNights(checkInDate, checkOutDate);
  }, [checkInDate, checkOutDate]);

  // Pricing calculation
  const nightlyRate = currentRoomInfo.basePrice;
  const totalTariff = nightlyRate * nights;
  const depositRequired = Math.round(totalTariff * 0.35); // 35% deposit minimum
  const depositAmountToCharge = paymentDepositOption === 'full' ? totalTariff : depositRequired;

  // Guest Stays Filtered
  const allGuestBookings = getGuestBookings(user?.email);

  const upcomingStays = allGuestBookings.filter((b) => b.status === 'confirmed');
  const activeStays = allGuestBookings.filter((b) => b.status === 'checked_in');
  const pastStays = allGuestBookings.filter((b) => b.status === 'checked_out' || b.status === 'cancelled');

  const handleConfirmReservation = async () => {
    if (!user) {
      error('Sign In Required', 'Please sign in or register to complete your reservation.');
      onNavigate('login');
      return;
    }

    setIsBookingSubmitting(true);
    try {
      const newBooking = await createBooking({
        guestName: user.name,
        guestEmail: user.email,
        guestPhone: user.phone || '+91 98450 12345',
        propertyId: selectedPropertyId,
        roomCategory: selectedCategory,
        checkInDate,
        checkOutDate,
        nights,
        guestsCount,
        nightlyRate,
        totalAmount: totalTariff,
        depositAmount: depositAmountToCharge,
        paymentMethod,
        specialRequests,
      });

      // Fire confetti celebrating booking
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#059669', '#10B981', '#34D399', '#FFFFFF'],
      });

      setConfirmedBooking(newBooking);
      setIsReservationModalOpen(false);
      success('Reservation Confirmed', `Booking ${newBooking.voucherCode} created successfully!`);
    } catch {
      error('Booking Failed', 'Unable to record reservation. Please retry.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleCancel = (bookingId: string) => {
    setBookingPendingCancel(bookingId);
  };

  const confirmCancellation = async () => {
    if (!bookingPendingCancel) return;
    setIsCancelling(true);
    try {
      const res = await cancelBooking(bookingPendingCancel);
      if (res.success) {
        success('Reservation Cancelled', 'Your booking has been cancelled and funds scheduled for refund.');
      } else {
        error('Cancellation Error', res.error);
      }
    } finally {
      setIsCancelling(false);
      setBookingPendingCancel(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-6 sm:p-8 text-white border border-emerald-700/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Welcome back, {user?.name || 'Honoured Guest'}
          </h1>
          <p className="text-xs text-emerald-100/90">
            Manage your boutique reservations, download digital stay vouchers, and discover bespoke plantation retreats.
          </p>
        </div>

        {/* Member Stats */}
        <div className="flex items-center gap-3 bg-white/10 p-3.5 rounded-2xl backdrop-blur-md border border-white/20">
          <div className="text-center px-2">
            <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">Nights Stayed</div>
            <div className="text-xl font-serif font-bold text-white">{user?.lifetimeNights || 8}</div>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-center px-2">
            <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">Active Stays</div>
            <div className="text-xl font-serif font-bold text-white">{activeStays.length + upcomingStays.length}</div>
          </div>
        </div>
      </div>

      {/* Main View Tabs: Reserve vs My Stays */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
        <Tabs
          tabs={[
            { id: 'booking-engine', label: 'Reserve a Sanctuary', icon: <BedDouble className="w-4 h-4" /> },
            {
              id: 'my-stays',
              label: 'My Stays Hub',
              count: allGuestBookings.length,
              icon: <Calendar className="w-4 h-4" />,
            },
          ]}
          activeTab={activeMainTab}
          onChange={(tab) => setActiveMainTab(tab)}
        />

        {activeMainTab === 'my-stays' && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setStaysSubTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                staysSubTab === 'upcoming'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Upcoming ({upcomingStays.length})
            </button>
            <button
              type="button"
              onClick={() => setStaysSubTab('active')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                staysSubTab === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              In-House / Active ({activeStays.length})
            </button>
            <button
              type="button"
              onClick={() => setStaysSubTab('past')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                staysSubTab === 'past'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Past Trips ({pastStays.length})
            </button>
          </div>
        )}
      </div>

      {/* 1. REAL-TIME BOOKING ENGINE VIEW */}
      {activeMainTab === 'booking-engine' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls / Filter Column */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 rounded-3xl space-y-5 border border-slate-200 bg-white shadow-sm">
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Customize Your Stay</span>
                </h3>
                <p className="text-xs text-slate-500">Real-time availability and dynamic night calculations</p>
              </div>

              {/* Destination Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Sanctuary
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value as PropertyId)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Check-In"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
                <Input
                  label="Check-Out"
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>

              {/* Guests Count */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Guests Count
                </label>
                <select
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(parseInt(e.target.value, 10))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests (Standard / Deluxe)</option>
                  <option value={3}>3 Guests (Deluxe / Suite)</option>
                  <option value={4}>4 Guests (Presidential Suite)</option>
                </select>
              </div>

              {/* Live Tariff Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-semibold text-slate-900 flex justify-between">
                  <span>Itinerary Duration:</span>
                  <span className="font-bold text-emerald-700">{nights} Night{nights > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Nightly Tariff:</span>
                  <span>{formatINR(nightlyRate)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
                  <span className="text-slate-900">Estimated Total:</span>
                  <span className="text-emerald-700 font-serif text-base">{formatINR(totalTariff)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsReservationModalOpen(true)}
                className="w-full text-xs font-bold uppercase tracking-wider shadow-md"
              >
                Proceed to Reserve ({formatINR(totalTariff)})
              </Button>
            </Card>
          </div>

          {/* Room Selection Cards Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-900">
                  Available Quarters at {currentProperty.name}
                </h3>
                <p className="text-xs text-slate-500">{currentProperty.tagline}</p>
              </div>
              <Badge variant="emerald">{currentProperty.state}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {ROOM_TYPES_DATA.map((rt) => {
                const isSelected = selectedCategory === rt.id;
                return (
                  <Card
                    key={rt.id}
                    className={`overflow-hidden rounded-3xl transition-all cursor-pointer border-2 bg-white ${
                      isSelected
                        ? 'border-emerald-600 shadow-xl ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedCategory(rt.id)}
                  >
                    <div className="relative h-44">
                      <img src={rt.image} alt={rt.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="emerald" className="shadow-md">
                            Selected
                          </Badge>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-white text-xs font-bold font-serif">
                        {formatINR(rt.basePrice)} <span className="text-[9px] font-normal font-sans">/ nt</span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="font-serif font-bold text-sm text-slate-900">
                          {rt.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{rt.sizeSqFt} sq.ft</span> • <span>Max {rt.maxGuests} Guests</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {rt.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="text-[9px] uppercase font-bold text-slate-400">Inclusions:</div>
                        <ul className="text-[10px] text-slate-600 space-y-0.5">
                          {rt.inclusions.slice(0, 2).map((inc, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        variant={isSelected ? 'primary' : 'secondary'}
                        size="sm"
                        className="w-full text-xs font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory(rt.id);
                          setIsReservationModalOpen(true);
                        }}
                      >
                        {isSelected ? 'Reserve This Room' : 'Select'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. "MY STAYS" HUB VIEW */}
      {activeMainTab === 'my-stays' && (
        <div className="space-y-6">
          {/* Active Stays list depending on subtab */}
          {staysSubTab === 'upcoming' && (
            <div className="space-y-4">
              {upcomingStays.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-slate-300 space-y-3">
                  <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-lg font-serif font-bold text-slate-900">No Upcoming Stays</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You currently have no scheduled reservations. Explore our boutique properties to book your next getaway.
                  </p>
                  <Button variant="primary" size="sm" onClick={() => setActiveMainTab('booking-engine')}>
                    Explore Destinations
                  </Button>
                </div>
              ) : (
                upcomingStays.map((booking) => (
                  <StayCard
                    key={booking.id}
                    booking={booking}
                    onViewVoucher={() => setSelectedVoucherBooking(booking)}
                    onCancel={() => handleCancel(booking.id)}
                  />
                ))
              )}
            </div>
          )}

          {staysSubTab === 'active' && (
            <div className="space-y-4">
              {activeStays.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-slate-300 space-y-3">
                  <Key className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="text-lg font-serif font-bold text-slate-900">No Active Check-Ins</h4>
                  <p className="text-xs text-slate-500">
                    You do not currently have any guests checked in under your account.
                  </p>
                </div>
              ) : (
                activeStays.map((booking) => (
                  <StayCard
                    key={booking.id}
                    booking={booking}
                    onViewVoucher={() => setSelectedVoucherBooking(booking)}
                  />
                ))
              )}
            </div>
          )}

          {staysSubTab === 'past' && (
            <div className="space-y-4">
              {pastStays.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-slate-300 space-y-3">
                  <Clock className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-lg font-serif font-bold text-slate-900">No Past Trips Found</h4>
                  <p className="text-xs text-slate-500">Completed stays will appear here for review and tax invoicing.</p>
                </div>
              ) : (
                pastStays.map((booking) => (
                  <StayCard
                    key={booking.id}
                    booking={booking}
                    onViewVoucher={() => setSelectedVoucherBooking(booking)}
                    onWriteReview={() => setSelectedReviewBooking(booking)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Reservation Drawer / Modal */}
      <Dialog
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        maxWidth="lg"
        title="Confirm Your Sanctuary Reservation"
        description="Review your luxury stay details, select payment preference, and secure your booking."
      >
        <div className="space-y-5">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-serif font-bold text-sm text-slate-900">{currentProperty.name}</div>
                <div className="text-slate-500">{currentRoomInfo.name}</div>
              </div>
              <Badge variant="emerald">{nights} Nights</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
              <div>
                <span className="font-medium text-slate-900 block">Check-in:</span>
                <span>{formatDate(checkInDate)} (from 14:00)</span>
              </div>
              <div>
                <span className="font-medium text-slate-900 block">Check-out:</span>
                <span>{formatDate(checkOutDate)} (till 11:00)</span>
              </div>
            </div>
          </div>

          {/* Payment Option Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Deposit Option
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentDepositOption('full')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentDepositOption === 'full'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Pay Full Amount (100%)</div>
                <div className="text-sm font-serif font-bold text-emerald-700 mt-1">
                  {formatINR(totalTariff)}
                </div>
                <div className="text-[10px] text-slate-500">Zero balance at check-in</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentDepositOption('deposit')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentDepositOption === 'deposit'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Pay 35% Advance Deposit</div>
                <div className="text-sm font-serif font-bold text-emerald-700 mt-1">
                  {formatINR(depositRequired)}
                </div>
                <div className="text-[10px] text-slate-500">Balance {formatINR(totalTariff - depositRequired)} at hotel</div>
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Payment Gateway Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Credit/Debit Card', 'UPI', 'Net Banking'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMethod(mode)}
                  className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                    paymentMethod === mode
                      ? 'border-emerald-600 bg-emerald-100/60 text-emerald-800 font-bold'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Special Requests (Dietary, Anniversary, Airport Cab)
            </label>
            <textarea
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="e.g. Vegetarian Kodava feast, airport transfer from Mangalore, quiet villa..."
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReservationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isBookingSubmitting}
              onClick={handleConfirmReservation}
              className="gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Confirm & Remit {formatINR(depositAmountToCharge)}</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Booking Confirmation Success Modal */}
      {confirmedBooking && (
        <Dialog
          isOpen={!!confirmedBooking}
          onClose={() => setConfirmedBooking(null)}
          maxWidth="md"
        >
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-serif font-bold text-slate-900">
                Reservation Confirmed!
              </h3>
              <p className="text-xs text-slate-500">
                Your luxury stay has been registered. An official voucher has been dispatched to your email.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Reference:</span>
                <span className="font-mono font-bold text-slate-900">{confirmedBooking.voucherCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates:</span>
                <span className="font-semibold">{formatDate(confirmedBooking.checkInDate)} – {formatDate(confirmedBooking.checkOutDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-emerald-600">{formatINR(confirmedBooking.paidAmount)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedVoucherBooking(confirmedBooking);
                  setConfirmedBooking(null);
                }}
                className="w-full sm:w-auto"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                View & Download Voucher
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmedBooking(null)}
                className="w-full sm:w-auto"
              >
                Return to My Stays
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Downloadable Voucher Modal */}
      <BookingVoucherModal
        booking={selectedVoucherBooking}
        isOpen={!!selectedVoucherBooking}
        onClose={() => setSelectedVoucherBooking(null)}
      />

      {/* Review Submission Modal for Checked-Out Stays */}
      <ReviewModal
        booking={selectedReviewBooking}
        isOpen={!!selectedReviewBooking}
        onClose={() => setSelectedReviewBooking(null)}
      />

      {/* Cancellation confirmation — replaces window.confirm */}
      <ConfirmDialog
        isOpen={!!bookingPendingCancel}
        title="Cancel this reservation?"
        description="Your room will be released back to availability and any deposit will be scheduled for refund. This cannot be undone."
        confirmLabel="Cancel reservation"
        cancelLabel="Keep reservation"
        tone="destructive"
        isLoading={isCancelling}
        onConfirm={confirmCancellation}
        onCancel={() => setBookingPendingCancel(null)}
      />
    </div>
  );
};

// Sub-component for individual stay card
interface StayCardProps {
  booking: Booking;
  onViewVoucher: () => void;
  onCancel?: () => void;
  onWriteReview?: () => void;
}

const StayCard: React.FC<StayCardProps> = ({
  booking,
  onViewVoucher,
  onCancel,
  onWriteReview,
}) => {
  const { properties } = useHotel();
  const property = properties.find((p) => p.id === booking.propertyId) || properties[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge variant="success">Active In-House</Badge>;
      case 'confirmed':
        return <Badge variant="emerald">Confirmed</Badge>;
      case 'checked_out':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-serif font-bold text-xl shrink-0 shadow-md">
            {booking.propertyId === 'coorg' ? 'CR' : booking.propertyId === 'ooty' ? 'CH' : 'CB'}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-500">{booking.voucherCode}</span>
              {getStatusBadge(booking.status)}
              <span className="text-xs text-slate-400">• {property.state}</span>
            </div>
            <h4 className="text-lg font-serif font-bold text-slate-900">
              {property.name}
            </h4>
            <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
              <span>{formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)}</span>
              <span>•</span>
              <span className="capitalize">{booking.roomCategory} Category ({booking.nights} Nights)</span>
              {booking.roomNumber && (
                <>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">Room #{booking.roomNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Financials & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto justify-between border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-500">Total Booking Value</div>
            <div className="text-base font-serif font-bold text-emerald-700">
              {formatINR(booking.totalAmount)}
            </div>
            {booking.outstandingBalance > 0 ? (
              <div className="text-[11px] text-amber-600 font-bold">
                Balance Due: {formatINR(booking.outstandingBalance)}
              </div>
            ) : (
              <div className="text-[11px] text-emerald-600 font-medium">
                Fully Remitted
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={onViewVoucher} className="text-xs">
              <FileText className="w-3.5 h-3.5 mr-1" />
              Voucher
            </Button>

            {booking.status === 'checked_out' && !booking.review && onWriteReview && (
              <Button variant="primary" size="sm" onClick={onWriteReview} className="text-xs">
                <Star className="w-3.5 h-3.5 mr-1" />
                Write Review
              </Button>
            )}

            {booking.status === 'confirmed' && onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel} className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
