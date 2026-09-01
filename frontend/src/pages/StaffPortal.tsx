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
import { CustomDropdown } from '../components/ui/CustomDropdown';
import { KeycardModal } from '../components/common/KeycardModal';
import { BookingVoucherModal } from '../components/common/BookingVoucherModal';
import {
  UserCheck,
  LogOut,
  CreditCard,
  Plus,
  Search,
  MapPin,
  Sparkles,
  FileText,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  Users,
  ShieldCheck,
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
          `Collected ${formatINR(paymentAmountInput)} via ${selectedPaymentMethod}`
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

      setKeycardBooking(newBooking);
      setIsKeycardOpen(true);
    } catch {
      error('Walk-in Error', 'Failed to register walk-in guest.');
    } finally {
      setIsWalkInSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Property Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2C6B4D]" />
            <span className="text-eyebrow text-[#8C877D]">
              Front Desk Management · {selectedProperty.name}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#183028]">
            Daily Operations & Guest Registry
          </h1>
          <p className="text-xs text-[#615D56] mt-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#8C6D2B]" />
            <span>{selectedProperty.location} · Staff On Duty: <strong className="text-[#183028]">{user?.name || 'Front Desk'}</strong></span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <CustomDropdown
              value={selectedPropertyId}
              onChange={(val) => setSelectedPropertyId(val as PropertyId)}
              buttonClassName="h-9.5 text-xs font-semibold bg-white border-[#E3DDD1]"
              options={properties.map((p) => ({
                value: p.id,
                label: p.name,
                sublabel: `${p.state} · ${p.location}`,
              }))}
            />
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsWalkInOpen(true)}
            className="text-xs gap-1.5 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Walk-In Registration</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid — Quiet, Bespoke Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Arrivals */}
        <div className="p-5 rounded-xl bg-white border border-[#EAE6DF] shadow-2xs space-y-2 hover:border-[#D5CDBC] transition-colors">
          <div className="flex items-center justify-between text-2xs uppercase tracking-widest text-[#8C877D]">
            <span>Today's Arrivals</span>
            <Clock className="h-3.5 w-3.5 text-[#B88B27]" />
          </div>
          <div className="font-serif text-3xl font-medium text-[#183028] tracking-tight">
            {todayArrivals.length}
          </div>
          <div className="text-2xs text-[#7A5B18] font-medium flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#B88B27]" />
            Awaiting check-in verification
          </div>
        </div>

        {/* Tile 2: In-House Occupancy */}
        <div className="p-5 rounded-xl bg-white border border-[#EAE6DF] shadow-2xs space-y-2 hover:border-[#D5CDBC] transition-colors">
          <div className="flex items-center justify-between text-2xs uppercase tracking-widest text-[#8C877D]">
            <span>In-House Guests</span>
            <Users className="h-3.5 w-3.5 text-[#2C6B4D]" />
          </div>
          <div className="font-serif text-3xl font-medium text-[#183028] tracking-tight">
            {inHouseGuests.length}{' '}
            <span className="text-xs font-sans font-normal text-[#8C877D]">/ {propertyRooms.length} Rooms</span>
          </div>
          <div className="text-2xs text-[#2C6B4D] font-medium flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2C6B4D]" />
            Active room access enabled
          </div>
        </div>

        {/* Tile 3: Departures */}
        <div className="p-5 rounded-xl bg-white border border-[#EAE6DF] shadow-2xs space-y-2 hover:border-[#D5CDBC] transition-colors">
          <div className="flex items-center justify-between text-2xs uppercase tracking-widest text-[#8C877D]">
            <span>Scheduled Departures</span>
            <LogOut className="h-3.5 w-3.5 text-[#615D56]" />
          </div>
          <div className="font-serif text-3xl font-medium text-[#183028] tracking-tight">
            {todayDepartures.length}
          </div>
          <div className="text-2xs text-[#615D56] font-medium flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8C877D]" />
            Checkout clearance & invoicing
          </div>
        </div>

        {/* Tile 4: Clean Rooms */}
        <div className="p-5 rounded-xl bg-white border border-[#EAE6DF] shadow-2xs space-y-2 hover:border-[#D5CDBC] transition-colors">
          <div className="flex items-center justify-between text-2xs uppercase tracking-widest text-[#8C877D]">
            <span>Clean & Ready Units</span>
            <Sparkles className="h-3.5 w-3.5 text-[#8C6D2B]" />
          </div>
          <div className="font-serif text-3xl font-medium text-[#2C6B4D] tracking-tight">
            {cleanAvailableRooms.length}
          </div>
          <div className="text-2xs text-[#2C6B4D] font-medium flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2C6B4D]" />
            Ready for instant assignment
          </div>
        </div>
      </div>

      {/* Guest Queue & Reservation Roster */}
      <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#EAE6DF] bg-[#FAF8F5]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C877D]" />
            <input
              type="text"
              placeholder="Search by guest, #KVR ref, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-white rounded-lg border border-[#D9D3C7] text-xs text-[#183028] placeholder:text-[#8C877D] focus:outline-none focus:border-[#183028] transition-colors"
            />
          </div>

          <div className="w-48">
            <CustomDropdown
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
              buttonClassName="h-9 text-xs bg-white border-[#D9D3C7]"
              options={[
                { value: 'all', label: 'All Reservations' },
                { value: 'confirmed', label: 'Confirmed Arrivals' },
                { value: 'checked_in', label: 'In-House Guests' },
                { value: 'checked_out', label: 'Checked Out' },
              ]}
            />
          </div>
        </div>

        {/* Table Roster */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-[#615D56] text-2xs uppercase tracking-widest font-semibold border-b border-[#EAE6DF]">
              <tr>
                <th className="py-3 px-4 font-semibold">Booking Ref</th>
                <th className="py-3 px-4 font-semibold">Primary Guest</th>
                <th className="py-3 px-4 font-semibold">Room & Category</th>
                <th className="py-3 px-4 font-semibold">Stay Dates</th>
                <th className="py-3 px-4 font-semibold">Tariff & Balance</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Desk Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]/70">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-xs text-[#8C877D]">
                    No guest reservations match the current filter or search term.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    {/* Booking Ref */}
                    <td className="py-4 px-4 font-mono font-medium text-[#183028] text-xs">
                      {b.voucherCode}
                    </td>

                    {/* Primary Guest */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#183028]">{b.guestName}</div>
                      <div className="text-2xs text-[#8C877D] font-mono mt-0.5">{b.guestPhone || b.guestEmail}</div>
                      {b.specialRequests && (
                        <div className="text-[11px] text-[#615D56] italic mt-0.5 truncate max-w-[200px]" title={b.specialRequests}>
                          "{b.specialRequests}"
                        </div>
                      )}
                    </td>

                    {/* Room & Category */}
                    <td className="py-4 px-4">
                      <div className="capitalize font-medium text-[#183028]">{b.roomCategory}</div>
                      <div className="text-2xs text-[#2C6B4D] font-semibold mt-0.5">
                        {b.roomNumber ? `Room #${b.roomNumber}` : 'Unassigned'}
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="py-4 px-4">
                      <div className="text-[#183028] font-medium">{formatDate(b.checkInDate)}</div>
                      <div className="text-2xs text-[#8C877D] mt-0.5">
                        {formatDate(b.checkOutDate)} · {b.nights} {b.nights === 1 ? 'night' : 'nights'}
                      </div>
                    </td>

                    {/* Financial Status */}
                    <td className="py-4 px-4">
                      <div className="font-serif font-semibold text-[#183028] text-sm">
                        {formatINR(b.totalAmount)}
                      </div>
                      {b.outstandingBalance > 0 ? (
                        <div className="text-2xs text-[#8C2C24] font-medium mt-0.5">
                          Due: {formatINR(b.outstandingBalance)}
                        </div>
                      ) : (
                        <div className="text-2xs text-[#2C6B4D] font-medium mt-0.5">Settled in Full</div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {b.status === 'checked_in' && (
                        <Badge variant="success" dot>
                          In-House
                        </Badge>
                      )}
                      {b.status === 'confirmed' && (
                        <Badge variant="warning" dot>
                          Confirmed
                        </Badge>
                      )}
                      {b.status === 'checked_out' && (
                        <Badge variant="secondary" dot>
                          Checked Out
                        </Badge>
                      )}
                      {b.status === 'cancelled' && (
                        <Badge variant="destructive" dot>
                          Cancelled
                        </Badge>
                      )}
                    </td>

                    {/* Desk Actions */}
                    <td className="py-4 px-4 text-right space-x-1.5">
                      {/* Check-In button */}
                      {b.status === 'confirmed' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCheckIn(b)}
                          className="text-xs h-7.5"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          Check-In
                        </Button>
                      )}

                      {/* Check-Out button */}
                      {b.status === 'checked_in' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCheckOut(b)}
                          className="text-xs h-7.5 text-[#183028]"
                        >
                          <LogOut className="h-3.5 w-3.5 mr-1 text-[#615D56]" />
                          Check-Out
                        </Button>
                      )}

                      {/* Pay balance */}
                      {b.outstandingBalance > 0 && b.status !== 'cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPaymentTargetBooking(b);
                            setPaymentAmountInput(b.outstandingBalance);
                            setIdempotencyKey(generateIdempotencyKey());
                          }}
                          className="text-xs h-7.5 text-[#7A5B18] border-[#EBDDBB] hover:bg-[#FBF5E8]"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          Pay Balance
                        </Button>
                      )}

                      {/* Voucher View */}
                      <button
                        type="button"
                        onClick={() => setVoucherBooking(b)}
                        className="inline-grid h-7.5 w-7.5 place-items-center rounded-md text-[#8C877D] hover:text-[#183028] hover:bg-[#F2ECE1] transition-colors"
                        title="View Guest Voucher"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Walk-in Reservation Modal */}
      <Dialog
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        maxWidth="lg"
        title="Walk-In Guest Registration"
        description="Register an on-arrival guest, assign a sanitized room, and issue an RFID pass."
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Guest Full Name"
              required
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              placeholder="e.g. Siddharth Rao"
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
            placeholder="guest@kaveristays.com"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <CustomDropdown
                label="Number of Nights"
                value={walkInNights}
                onChange={(val) => setWalkInNights(val as number)}
                buttonClassName="h-10 text-xs"
                options={[
                  { value: 1, label: '1 Night' },
                  { value: 2, label: '2 Nights' },
                  { value: 3, label: '3 Nights' },
                  { value: 4, label: '4 Nights' },
                  { value: 5, label: '5 Nights' },
                ]}
              />
            </div>

            <div>
              <CustomDropdown
                label="Assign Clean Room"
                value={walkInRoomNumber}
                onChange={(val) => setWalkInRoomNumber(val as string)}
                placeholder="-- Choose Ready Room --"
                buttonClassName="h-10 text-xs text-[#2C6B4D] font-semibold"
                options={cleanAvailableRooms.map((r) => ({
                  value: r.number,
                  label: `Room #${r.number}`,
                  sublabel: `${r.category.toUpperCase()} · Cleaned`,
                  badge: `${r.cleanlinessScore}%`,
                }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-label block">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Credit/Debit Card', 'UPI', 'Net Banking'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWalkInPaymentMethod(mode)}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    walkInPaymentMethod === mode
                      ? 'border-[#183028] bg-[#EBF3EE] text-[#183028] font-semibold'
                      : 'border-[#E3DDD1] bg-white text-[#615D56]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE6DF]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsWalkInOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isWalkInSubmitting}>
              Register & Issue Keycard
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Collect Payment Modal */}
      {paymentTargetBooking && (
        <Dialog
          isOpen={!!paymentTargetBooking}
          onClose={() => setPaymentTargetBooking(null)}
          maxWidth="md"
          title="Collect Outstanding Balance"
          description={`Record remittance for reservation ${paymentTargetBooking.voucherCode} (${paymentTargetBooking.guestName}).`}
        >
          <form onSubmit={handleProcessPayment} className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#615D56]">Total Stay Tariff:</span>
                <span className="font-semibold text-[#183028]">{formatINR(paymentTargetBooking.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#615D56]">Amount Paid:</span>
                <span className="text-[#2C6B4D] font-medium">{formatINR(paymentTargetBooking.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#8C2C24] pt-1 border-t border-[#EAE6DF]">
                <span>Outstanding Balance:</span>
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
              <label className="text-label block">Payment Channel</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Credit/Debit Card', 'UPI', 'Net Banking'] as PaymentMethod[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(mode)}
                    className={`p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      selectedPaymentMethod === mode
                        ? 'border-[#183028] bg-[#EBF3EE] text-[#183028] font-semibold'
                        : 'border-[#E3DDD1] bg-white text-[#615D56]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#FAF8F5] text-2xs font-mono text-[#8C877D] flex items-center justify-between border border-[#EAE6DF]">
              <span>IDEMPOTENCY KEY:</span>
              <span className="text-[#183028] font-bold">{idempotencyKey.substring(0, 18)}...</span>
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
