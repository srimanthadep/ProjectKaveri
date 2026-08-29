import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHotel } from '../context/HotelContext';
import { PropertyId, Booking, PaymentMethod } from '../types';
import { ROOM_TYPES_DATA } from '../data/mockData';
import { formatINR, formatDate, generateIdempotencyKey } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { KeycardModal } from '../components/common/KeycardModal';
import { BookingVoucherModal } from '../components/common/BookingVoucherModal';
import {
  UserCheck,
  LogOut,
  CreditCard,
  PlusCircle,
  Search,
  MapPin,
  Sparkles,
  ShieldCheck,
  FileText,
  Clock
} from 'lucide-react';

export const StaffPortal: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    properties,
    selectedPropertyId,
    setSelectedPropertyId,
    selectedProperty,
    roomUnits,
    getPropertyBookings,
    checkInGuest,
    checkOutGuest,
    takePayment,
    createWalkInReservation,
  } = useHotel();
  const { success, error } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Keycard Modal State
  const [keycardBooking, setKeycardBooking] = useState<Booking | null>(null);
  const [isKeycardOpen, setIsKeycardOpen] = useState(false);

  // Voucher Modal State
  const [voucherBooking, setVoucherBooking] = useState<Booking | null>(null);

  // Take Payment Modal State
  const [paymentTargetBooking, setPaymentTargetBooking] = useState<Booking | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Credit/Debit Card');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey());
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  // Walk-in Guest Creator Modal State
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [walkInNights, setWalkInNights] = useState(1);
  const [walkInRoomNumber, setWalkInRoomNumber] = useState('');
  const [walkInPaymentMethod, setWalkInPaymentMethod] = useState<PaymentMethod>('Credit/Debit Card');
  const [isWalkInSubmitting, setIsWalkInSubmitting] = useState(false);

  // Filtered property bookings
  const propertyBookings = getPropertyBookings(selectedPropertyId);

  // Today stats calculations
  const todayArrivals = propertyBookings.filter((b) => b.status === 'confirmed');
  const todayDepartures = propertyBookings.filter((b) => b.status === 'checked_in');
  const inHouseGuests = propertyBookings.filter((b) => b.status === 'checked_in');

  const propertyRooms = roomUnits.filter((r) => r.propertyId === selectedPropertyId);
  const cleanAvailableRooms = propertyRooms.filter((r) => r.status === 'available');

  // Search filtered table rows
  const filteredBookings = useMemo(() => {
    return propertyBookings.filter((b) => {
      const matchSearch =
        b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.voucherCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.roomNumber && b.roomNumber.includes(searchQuery)) ||
        b.guestEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = filterStatus === 'all' || b.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [propertyBookings, searchQuery, filterStatus]);

  // Check In Handler
  const handleCheckIn = async (booking: Booking) => {
    const res = await checkInGuest(booking.id);
    if (res.success) {
      success('Guest Checked In', `Room assigned and RFID token dispatched for ${booking.guestName}.`);
      setKeycardBooking({
        ...booking,
        roomNumber: booking.roomNumber || '102',
        status: 'checked_in',
        keyCardIssued: {
          cardNumber: res.keycard?.cardNumber || `RFID-CRG-${booking.roomNumber || '102'}`,
          pin: res.keycard?.pin || '8492',
          issuedAt: new Date().toLocaleString(),
        },
      });
      setIsKeycardOpen(true);
    } else {
      error('Check-in Error', res.error);
    }
  };

  // Check Out Handler
  const handleCheckOut = async (booking: Booking) => {
    if (booking.outstandingBalance > 0) {
      error(
        'Outstanding Balance Detected',
        `Collect remaining balance of ${formatINR(booking.outstandingBalance)} before checkout.`
      );
      setPaymentTargetBooking(booking);
      setPaymentAmountInput(booking.outstandingBalance);
      setIdempotencyKey(generateIdempotencyKey());
      return;
    }

    const res = await checkOutGuest(booking.id);
    if (res.success) {
      success('Check-out Complete', `Guest ${booking.guestName} checked out. Room dispatched to Housekeeping.`);
    } else {
      error('Checkout Error', res.error);
    }
  };

  // Payment Submit Handler
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetBooking) return;
    if (paymentAmountInput <= 0) {
      error('Invalid Amount', 'Payment must be greater than zero.');
      return;
    }

    setIsPaymentProcessing(true);
    try {
      const res = await takePayment(
        paymentTargetBooking.id,
        paymentAmountInput,
        selectedPaymentMethod,
        idempotencyKey
      );
      if (res.success) {
        success(
          'Payment Recorded',
          `Collected ${formatINR(paymentAmountInput)} via ${selectedPaymentMethod} [Idempotency: ${idempotencyKey.substring(0, 10)}...]`
        );
        setPaymentTargetBooking(null);
      } else {
        error('Payment Failed', res.error);
      }
    } catch {
      error('Payment System Error', 'Unable to capture transaction.');
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  // Walk-in Submit Handler
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName || !walkInRoomNumber) {
      error('Validation Error', 'Guest name and Room selection are required.');
      return;
    }

    const selectedRoom = propertyRooms.find((r) => r.number === walkInRoomNumber);
    const category = selectedRoom?.category || 'standard';
    const rateInfo = ROOM_TYPES_DATA.find((r) => r.id === category);
    const totalTariff = (rateInfo?.basePrice || 14500) * walkInNights;

    setIsWalkInSubmitting(true);
    try {
      const newBooking = await createWalkInReservation({
        guestName: walkInName,
        guestPhone: walkInPhone || '+91 98000 00000',
        guestEmail: walkInEmail || `${walkInName.toLowerCase().replace(/\s+/g, '.')}@walkin.kaveri`,
        propertyId: selectedPropertyId,
        roomNumber: walkInRoomNumber,
        nights: walkInNights,
        paymentMethod: walkInPaymentMethod,
        paidAmount: totalTariff,
        specialRequests: 'Walk-in instant check-in',
      });

      success('Walk-In Registered', `Guest checked into Room #${walkInRoomNumber}. RFID keycard issued.`);
      setIsWalkInOpen(false);
      setWalkInName('');
      setWalkInPhone('');
      setWalkInEmail('');
      setWalkInRoomNumber('');

      // Show keycard modal
      setKeycardBooking(newBooking);
      setIsKeycardOpen(true);
    } catch {
      error('Walk-in Error', 'Failed to register walk-in guest.');
    } finally {
      setIsWalkInSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Property Scoping Notice & Header */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="emerald" className="flex items-center gap-1 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              FRONT DESK TERMINAL
            </Badge>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Staff: <strong className="text-slate-800 dark:text-slate-200">{user?.name || 'Naveen Kumar'}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white">
            Daily Operations & Front Desk Queue
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Property Scope: <strong>{selectedProperty.name}</strong> ({selectedProperty.location})</span>
          </p>
        </div>

        {/* Action Buttons & Property Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Property:</span>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value as PropertyId)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsWalkInOpen(true)}
            className="text-xs font-semibold gap-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Walk-in Guest Check-in</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Today's Expected Arrivals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
            {todayArrivals.length}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Awaiting Check-in verification</div>
        </Card>

        <Card className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-600 shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>In-House Occupancy</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
            {inHouseGuests.length} <span className="text-sm font-normal text-slate-400">/ {propertyRooms.length} Rooms</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Active Room Access active</div>
        </Card>

        <Card className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Today's Departures</span>
            <LogOut className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
            {todayDepartures.length}
          </div>
          <div className="text-[11px] text-slate-500">Checkout clearance & invoicing</div>
        </Card>

        <Card className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500 shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Clean & Ready Rooms</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
            {cleanAvailableRooms.length}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Available for immediate assignment</div>
        </Card>
      </div>

      {/* Front Desk Live Queue Table */}
      <Card className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        {/* Table Filter Controls */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search guest, #KVR code, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-semibold">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="all">All Records</option>
              <option value="confirmed">Confirmed (Arrivals)</option>
              <option value="checked_in">Checked-In (In House)</option>
              <option value="checked_out">Checked-Out</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Primary Guest</th>
                <th className="py-3.5 px-4">Category & Room</th>
                <th className="py-3.5 px-4">Stay Dates</th>
                <th className="py-3.5 px-4">Financial Status</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Desk Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No reservations matching current query or filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Ref */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {b.voucherCode}
                    </td>

                    {/* Guest */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{b.guestName}</div>
                      <div className="text-slate-500 text-[11px]">{b.guestPhone || b.guestEmail}</div>
                      {b.specialRequests && (
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate max-w-[180px]" title={b.specialRequests}>
                          Req: {b.specialRequests}
                        </div>
                      )}
                    </td>

                    {/* Room */}
                    <td className="py-4 px-4">
                      <div className="font-semibold capitalize text-slate-900 dark:text-white">{b.roomCategory}</div>
                      <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {b.roomNumber ? `Room #${b.roomNumber}` : 'Unassigned'}
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="py-4 px-4">
                      <div className="text-slate-900 dark:text-white font-medium">{formatDate(b.checkInDate)}</div>
                      <div className="text-slate-500 text-[11px]">{formatDate(b.checkOutDate)} ({b.nights}n)</div>
                    </td>

                    {/* Financial Status */}
                    <td className="py-4 px-4">
                      <div className="font-serif font-bold text-slate-900 dark:text-white">{formatINR(b.totalAmount)}</div>
                      {b.outstandingBalance > 0 ? (
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                          Due: {formatINR(b.outstandingBalance)}
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 font-medium">Settled 100%</div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {b.status === 'checked_in' && <Badge variant="success">In-House</Badge>}
                      {b.status === 'confirmed' && <Badge variant="warning">Confirmed</Badge>}
                      {b.status === 'checked_out' && <Badge variant="secondary">Checked Out</Badge>}
                      {b.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
                    </td>

                    {/* Desk Actions */}
                    <td className="py-4 px-4 text-right space-x-1.5">
                      {/* Check-in button */}
                      {b.status === 'confirmed' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCheckIn(b)}
                          className="text-[11px] h-8"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Check-In
                        </Button>
                      )}

                      {/* Check-out button */}
                      {b.status === 'checked_in' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCheckOut(b)}
                          className="text-[11px] h-8 bg-emerald-800 hover:bg-emerald-700"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1" />
                          Check-Out
                        </Button>
                      )}

                      {/* Take payment */}
                      {b.outstandingBalance > 0 && b.status !== 'cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPaymentTargetBooking(b);
                            setPaymentAmountInput(b.outstandingBalance);
                            setIdempotencyKey(generateIdempotencyKey());
                          }}
                          className="text-[11px] h-8 text-amber-700 dark:text-amber-400 border-amber-300"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" />
                          Pay Balance
                        </Button>
                      )}

                      {/* View Voucher */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVoucherBooking(b)}
                        className="text-[11px] h-8"
                        title="View Voucher"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Walk-in Reservation Modal */}
      <Dialog
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        maxWidth="lg"
        title="Walk-In Guest Registration"
        description="Register a walk-in guest and immediately dispatch an available cleaned room & RFID pass."
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Guest Full Name"
              required
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              placeholder="e.g. Vikramaditya Rao"
            />
            <Input
              label="Phone Number"
              type="tel"
              required
              value={walkInPhone}
              onChange={(e) => setWalkInPhone(e.target.value)}
              placeholder="+91 98450 00000"
            />
          </div>

          <Input
            label="Email Address (Optional)"
            type="email"
            value={walkInEmail}
            onChange={(e) => setWalkInEmail(e.target.value)}
            placeholder="guest@domain.com"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Number of Nights
              </label>
              <select
                value={walkInNights}
                onChange={(e) => setWalkInNights(parseInt(e.target.value, 10))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value={1}>1 Night</option>
                <option value={2}>2 Nights</option>
                <option value={3}>3 Nights</option>
                <option value={4}>4 Nights</option>
                <option value={5}>5 Nights</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Assign Clean Available Room
              </label>
              <select
                required
                value={walkInRoomNumber}
                onChange={(e) => setWalkInRoomNumber(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
              >
                <option value="">-- Choose Available Room --</option>
                {cleanAvailableRooms.map((r) => (
                  <option key={r.number} value={r.number}>
                    Room #{r.number} ({r.category.toUpperCase()}) - Clean
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              Payment Settlement Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Credit/Debit Card', 'UPI', 'Net Banking'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWalkInPaymentMethod(mode)}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    walkInPaymentMethod === mode
                      ? 'border-emerald-600 bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsWalkInOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isWalkInSubmitting}>
              Register & Issue Keycard
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Take Payment Modal with Idempotency Key */}
      {paymentTargetBooking && (
        <Dialog
          isOpen={!!paymentTargetBooking}
          onClose={() => setPaymentTargetBooking(null)}
          maxWidth="md"
          title="Collect Guest Payment"
          description={`Record remittance for booking ${paymentTargetBooking.voucherCode} (${paymentTargetBooking.guestName}).`}
        >
          <form onSubmit={handleProcessPayment} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Booking Value:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatINR(paymentTargetBooking.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Previously Paid:</span>
                <span className="text-emerald-600 font-medium">{formatINR(paymentTargetBooking.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400">
                <span>Remaining Balance Due:</span>
                <span>{formatINR(paymentTargetBooking.outstandingBalance)}</span>
              </div>
            </div>

            <Input
              label="Amount to Collect (INR)"
              type="number"
              required
              min={1}
              max={paymentTargetBooking.outstandingBalance}
              value={paymentAmountInput}
              onChange={(e) => setPaymentAmountInput(parseFloat(e.target.value) || 0)}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Payment Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Credit/Debit Card', 'UPI', 'Net Banking'] as PaymentMethod[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(mode)}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      selectedPaymentMethod === mode
                        ? 'border-emerald-600 bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Idempotency key indicator */}
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>IDEMPOTENCY KEY:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">{idempotencyKey}</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPaymentTargetBooking(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isPaymentProcessing}>
                Record Payment ({formatINR(paymentAmountInput)})
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* RFID Keycard Modal */}
      <KeycardModal
        booking={keycardBooking}
        isOpen={isKeycardOpen}
        onClose={() => setIsKeycardOpen(false)}
      />

      {/* Printable Booking Voucher Modal */}
      <BookingVoucherModal
        booking={voucherBooking}
        isOpen={!!voucherBooking}
        onClose={() => setVoucherBooking(null)}
      />
    </div>
  );
};
