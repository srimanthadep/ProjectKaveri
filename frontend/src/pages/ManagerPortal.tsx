import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHotel } from '../context/HotelContext';
import { PropertyId, RoomStatus } from '../types';
import { formatINR, formatDate } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  Building,
  TrendingUp,
  Percent,
  CircleDollarSign,
  BedDouble,
  RefreshCw,
  ArrowUpDown,
  Search,
  MapPin,
} from 'lucide-react';

export const ManagerPortal: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    properties,
    selectedPropertyId,
    setSelectedPropertyId,
    selectedProperty,
    roomUnits,
    updateRoomStatus,
    analytics,
    getPropertyBookings,
  } = useHotel();
  const { success } = useToast();

  const [auditFilterStatus, setAuditFilterStatus] = useState<string>('all');
  const [auditSortBy, setAuditSortBy] = useState<'date' | 'revenue'>('date');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Room status change confirmation
  const [pendingRoomChange, setPendingRoomChange] = useState<{ roomNumber: string } | null>(null);

  // Selected property analytics data
  const propAnalytics = analytics[selectedPropertyId] || analytics.coorg;

  // Property room units
  const currentPropertyRooms = roomUnits.filter((r) => r.propertyId === selectedPropertyId);

  // Status counts
  const occupiedCount = currentPropertyRooms.filter((r) => r.status === 'occupied').length;
  const availableCount = currentPropertyRooms.filter((r) => r.status === 'available').length;
  const turnoverCount = currentPropertyRooms.filter((r) => r.status === 'turnover').length;

  // Audit Bookings
  const propertyBookings = getPropertyBookings(selectedPropertyId);

  const filteredAuditBookings = useMemo(() => {
    let list = propertyBookings.filter((b) => {
      const matchStatus = auditFilterStatus === 'all' || b.status === auditFilterStatus;
      const matchSearch =
        b.guestName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        b.voucherCode.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        (b.roomNumber && b.roomNumber.includes(auditSearchQuery));
      return matchStatus && matchSearch;
    });

    if (auditSortBy === 'revenue') {
      list.sort((a, b) => b.totalAmount - a.totalAmount);
    } else {
      list.sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime());
    }

    return list;
  }, [propertyBookings, auditFilterStatus, auditSortBy, auditSearchQuery]);

  const applyRoomStatus = (roomNumber: string, nextStatus: RoomStatus) => {
    updateRoomStatus(selectedPropertyId, roomNumber, nextStatus);
    success('Room Status Updated', `Room #${roomNumber} set to ${nextStatus.toUpperCase()}`);
  };

  const handleRoomStatusToggle = (roomNumber: string, currentStatus: RoomStatus) => {
    if (currentStatus === 'available') {
      applyRoomStatus(roomNumber, 'turnover');
    } else if (currentStatus === 'turnover') {
      applyRoomStatus(roomNumber, 'available');
    } else if (currentStatus === 'occupied') {
      setPendingRoomChange({ roomNumber });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Property Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-[#183028]" />
            <span className="text-2xs font-semibold uppercase tracking-widest text-[#8C877D]">
              General Manager Suite · Performance & Inventory Audit
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#183028]">
            Sanctuary Yield & Operations Matrix
          </h1>
          <p className="text-xs text-[#615D56] mt-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#8C6D2B]" />
            <span>{selectedProperty.name} ({selectedProperty.location}) · General Manager: <strong className="text-[#183028]">{user?.name || 'Devika Menon'}</strong></span>
          </p>
        </div>

        {/* Property Switcher */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#E3DDD1] shadow-2xs">
          <span className="text-2xs font-semibold uppercase tracking-wider text-[#8C877D]">Sanctuary:</span>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value as PropertyId)}
            className="bg-transparent text-xs font-semibold text-[#183028] focus:outline-none cursor-pointer"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. KPI Metric Cards — Quiet Luxury Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Occupancy Rate */}
        <div className="p-6 rounded-xl bg-white border border-[#EAE6DF] shadow-2xs space-y-2 hover:border-[#D5CDBC] transition-colors">
          <div className="flex items-center justify-between text-2xs uppercase tracking-widest text-[#8C877D]">
            <span>Monthly Occupancy</span>
            <Percent className="h-3.5 w-3.5 text-[#2C6B4D]" />
          </div>
          <div className="font-serif text-3xl font-medium text-[#183028] tracking-tight">
            {propAnalytics.monthlyOccupancyRate}%
          </div>
          <div className="text-2xs text-[#2C6B4D] flex items-center gap-1 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>+4.2% vs previous seasonal benchmark</span>
          </div>
        </div>

        {/* Average Daily Rate (ADR) */}
        <div className="p-6 rounded-xl bg-white border border-[#EAE6DF] shadow-2xs space-y-2 hover:border-[#D5CDBC] transition-colors">
          <div className="flex items-center justify-between text-2xs uppercase tracking-widest text-[#8C877D]">
            <span>Average Daily Rate (ADR)</span>
            <CircleDollarSign className="h-3.5 w-3.5 text-[#8C6D2B]" />
          </div>
          <div className="font-serif text-3xl font-medium text-[#183028] tracking-tight">
            {formatINR(propAnalytics.adr)}
          </div>
          <div className="text-2xs text-[#615D56]">
            Realized yield per occupied room night
          </div>
        </div>

        {/* RevPAR */}
        <div className="p-6 rounded-xl bg-white border border-[#EAE6DF] shadow-2xs space-y-2 hover:border-[#D5CDBC] transition-colors">
          <div className="flex items-center justify-between text-2xs uppercase tracking-widest text-[#8C877D]">
            <span>RevPAR</span>
            <TrendingUp className="h-3.5 w-3.5 text-[#183028]" />
          </div>
          <div className="font-serif text-3xl font-medium text-[#183028] tracking-tight">
            {formatINR(propAnalytics.revpar)}
          </div>
          <div className="text-2xs text-[#615D56]">
            Net yield across all {currentPropertyRooms.length} sanctuary suites
          </div>
        </div>
      </div>

      {/* 2. Monthly Trend Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue & ADR Trend */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-[#EAE6DF] shadow-2xs space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-medium text-[#183028]">
                Revenue & Tariff Performance
              </h3>
              <p className="text-xs text-[#615D56]">6-month gross turnover trajectory in INR</p>
            </div>
            <Badge variant="emerald" dot>Realized Data</Badge>
          </div>

          <div className="h-68 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propAnalytics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE6DF" />
                <XAxis dataKey="month" stroke="#8C877D" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8C877D"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value)), 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#FAF8F5',
                    borderColor: '#EAE6DF',
                    borderRadius: '8px',
                    color: '#183028',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                />
                <Bar dataKey="revenue" name="Monthly Revenue (₹)" fill="#183028" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Trend Line */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-[#EAE6DF] shadow-2xs space-y-4 bg-white">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#183028]">
              Occupancy Velocity
            </h3>
            <p className="text-xs text-[#615D56]">Monthly capacity utilization rate (%)</p>
          </div>

          <div className="h-68 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={propAnalytics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE6DF" />
                <XAxis dataKey="month" stroke="#8C877D" fontSize={11} tickLine={false} />
                <YAxis stroke="#8C877D" fontSize={11} domain={[50, 100]} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Occupancy']}
                  contentStyle={{
                    backgroundColor: '#FAF8F5',
                    borderColor: '#EAE6DF',
                    borderRadius: '8px',
                    color: '#183028',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="occupancy"
                  stroke="#9E7B36"
                  strokeWidth={2.5}
                  dot={{ fill: '#9E7B36', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Room Inventory & Turnaround Grid */}
      <div className="p-6 sm:p-7 rounded-2xl border border-[#EAE6DF] shadow-2xs space-y-6 bg-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl font-medium text-[#183028] flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-[#8C6D2B]" />
              <span>Sanctuary Room Inventory & Turnaround Matrix</span>
            </h3>
            <p className="text-xs text-[#615D56]">
              Real-time room status matrix for {selectedProperty.name}. Click any room card to cycle state.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-[#615D56]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#2C6B4D]" />
              <span>Available ({availableCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8C2C24]" />
              <span>Occupied ({occupiedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#B88B27]" />
              <span>Turnover ({turnoverCount})</span>
            </div>
          </div>
        </div>

        {/* Matrix Grid: Standard (101-104), Deluxe (201-204), Suite (301-304) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Standard Category */}
          <div className="space-y-3">
            <div className="text-2xs uppercase tracking-widest text-[#8C877D] font-semibold flex justify-between">
              <span>Standard Suites (101–104)</span>
              <Badge variant="secondary">Standard</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {currentPropertyRooms
                .filter((r) => r.category === 'standard')
                .map((r) => (
                  <RoomMatrixCard
                    key={r.number}
                    room={r}
                    onClick={() => handleRoomStatusToggle(r.number, r.status)}
                  />
                ))}
            </div>
          </div>

          {/* Deluxe Category */}
          <div className="space-y-3">
            <div className="text-2xs uppercase tracking-widest text-[#8C877D] font-semibold flex justify-between">
              <span>Deluxe Suites (201–204)</span>
              <Badge variant="emerald">Deluxe</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {currentPropertyRooms
                .filter((r) => r.category === 'deluxe')
                .map((r) => (
                  <RoomMatrixCard
                    key={r.number}
                    room={r}
                    onClick={() => handleRoomStatusToggle(r.number, r.status)}
                  />
                ))}
            </div>
          </div>

          {/* Suite Category */}
          <div className="space-y-3">
            <div className="text-2xs uppercase tracking-widest text-[#8C877D] font-semibold flex justify-between">
              <span>Presidential Suites (301–304)</span>
              <Badge variant="gold">Presidential</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {currentPropertyRooms
                .filter((r) => r.category === 'suite')
                .map((r) => (
                  <RoomMatrixCard
                    key={r.number}
                    room={r}
                    onClick={() => handleRoomStatusToggle(r.number, r.status)}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bookings Audit Table */}
      <div className="rounded-2xl overflow-hidden border border-[#EAE6DF] shadow-2xs bg-white">
        <div className="p-5 border-b border-[#EAE6DF] bg-[#FAF8F5]/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#183028]">
              Reservation & Revenue Audit Ledger
            </h3>
            <p className="text-xs text-[#615D56]">
              Real-time guest transaction ledger with audit sorting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C877D]" />
              <input
                type="text"
                placeholder="Search guest or ref..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="w-full h-8.5 pl-9 pr-3 rounded-lg border border-[#D9D3C7] bg-white text-xs text-[#183028] placeholder:text-[#8C877D] focus:outline-none focus:border-[#183028]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={auditFilterStatus}
              onChange={(e) => setAuditFilterStatus(e.target.value)}
              className="h-8.5 px-3 rounded-lg border border-[#D9D3C7] bg-white text-xs font-medium text-[#183028]"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">In-House</option>
              <option value="checked_out">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Sort Order */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuditSortBy(auditSortBy === 'date' ? 'revenue' : 'date')}
              className="text-xs gap-1.5 h-8.5"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span>Sort: {auditSortBy === 'date' ? 'By Date' : 'By Revenue'}</span>
            </Button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-[#615D56] text-2xs uppercase tracking-widest font-semibold border-b border-[#EAE6DF]">
              <tr>
                <th className="py-3 px-4">Ref Code</th>
                <th className="py-3 px-4">Guest Info</th>
                <th className="py-3 px-4">Room Category</th>
                <th className="py-3 px-4">Dates & Duration</th>
                <th className="py-3 px-4">Tariff Realized</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]/70">
              {filteredAuditBookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-[#183028]">{b.voucherCode}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#183028]">{b.guestName}</div>
                    <div className="text-[#8C877D] text-2xs">{b.guestEmail}</div>
                  </td>
                  <td className="py-3.5 px-4 capitalize font-medium text-[#183028]">
                    {b.roomCategory} {b.roomNumber && `(#${b.roomNumber})`}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-[#183028]">{formatDate(b.checkInDate)}</div>
                    <div className="text-[#8C877D] text-2xs">{b.nights} Nights ({b.guestsCount} Guests)</div>
                  </td>
                  <td className="py-3.5 px-4 font-serif font-semibold text-[#183028]">
                    {formatINR(b.totalAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-[#615D56]">{b.paymentMethod}</td>
                  <td className="py-3.5 px-4">
                    {b.status === 'checked_in' && <Badge variant="success" dot>In-House</Badge>}
                    {b.status === 'confirmed' && <Badge variant="warning" dot>Confirmed</Badge>}
                    {b.status === 'checked_out' && <Badge variant="secondary" dot>Completed</Badge>}
                    {b.status === 'cancelled' && <Badge variant="destructive" dot>Cancelled</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Occupied-room status change confirmation */}
      <ConfirmDialog
        isOpen={!!pendingRoomChange}
        title={`Room #${pendingRoomChange?.roomNumber ?? ''} is occupied`}
        description="This room is currently marked occupied by a guest. Changing it to Turnover / Housekeeping should only be done once the guest has checked out."
        confirmLabel="Set to Turnover"
        cancelLabel="Keep as Occupied"
        tone="destructive"
        onConfirm={() => {
          if (pendingRoomChange) {
            applyRoomStatus(pendingRoomChange.roomNumber, 'turnover');
          }
          setPendingRoomChange(null);
        }}
        onCancel={() => setPendingRoomChange(null)}
      />
    </div>
  );
};

// Sub-component for individual room card in matrix
interface RoomMatrixCardProps {
  room: any;
  onClick: () => void;
}

const RoomMatrixCard: React.FC<RoomMatrixCardProps> = ({ room, onClick }) => {
  const statusStyles = {
    available: 'border-[#CDE1D5] bg-[#EBF3EE]/60 text-[#1E4A35]',
    occupied: 'border-[#EACEC9] bg-[#FBEEEC]/60 text-[#8C2C24]',
    turnover: 'border-[#EBDDBB] bg-[#FBF5E8]/60 text-[#7A5B18]',
  };

  const statusBadges = {
    available: <Badge variant="success" dot className="text-2xs py-0.5">Ready</Badge>,
    occupied: <Badge variant="destructive" dot className="text-2xs py-0.5">Occupied</Badge>,
    turnover: <Badge variant="warning" dot className="text-2xs py-0.5">Housekeeping</Badge>,
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border transition-all hover:shadow-xs cursor-pointer ${statusStyles[room.status as RoomStatus]}`}
      title="Click to toggle room turnaround state"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-serif font-semibold text-sm">#{room.number}</span>
        {statusBadges[room.status as RoomStatus]}
      </div>

      {room.currentGuest ? (
        <div className="text-2xs font-medium truncate">{room.currentGuest}</div>
      ) : (
        <div className="text-2xs text-[#8C877D]">Vacant</div>
      )}

      <div className="mt-2 pt-1.5 border-t border-black/5 flex items-center justify-between text-2xs text-[#8C877D]">
        <span>Sanitization: {room.cleanlinessScore}%</span>
        <RefreshCw className="h-2.5 w-2.5 opacity-60" />
      </div>
    </div>
  );
};
