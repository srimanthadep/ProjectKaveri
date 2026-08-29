import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHotel } from '../context/HotelContext';
import { PropertyId, RoomStatus } from '../types';
import { formatINR, formatDate } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
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
  Search
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

  const handleRoomStatusToggle = (roomNumber: string, currentStatus: RoomStatus) => {
    let nextStatus: RoomStatus = 'available';
    if (currentStatus === 'available') nextStatus = 'turnover';
    else if (currentStatus === 'turnover') nextStatus = 'available';
    else if (currentStatus === 'occupied') {
      if (confirm(`Room #${roomNumber} is currently marked occupied. Change status to Turnover / Housekeeping?`)) {
        nextStatus = 'turnover';
      } else {
        return;
      }
    }

    updateRoomStatus(selectedPropertyId, roomNumber, nextStatus);
    success('Room Status Updated', `Room #${roomNumber} set to ${nextStatus.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Manager Header & Property Switcher */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="emerald" className="flex items-center gap-1 font-mono text-[11px]">
              <Building className="w-3.5 h-3.5" />
              GENERAL MANAGER SUITE
            </Badge>
            <span className="text-xs text-slate-500">
              Manager: <strong className="text-slate-800 dark:text-slate-200">{user?.name || 'Devika Menon'}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white">
            Property Performance & Inventory Audit
          </h1>
          <p className="text-xs text-slate-500">
            Real-time RevPAR, occupancy optimization, and live room turnaround control for {selectedProperty.name}.
          </p>
        </div>

        {/* Property Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-500">Inspecting:</span>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value as PropertyId)}
            className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Occupancy Rate */}
        <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-4 border-t-emerald-600 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Monthly Occupancy Rate</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-white">
            {propAnalytics.monthlyOccupancyRate}%
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+4.2% higher vs previous season benchmark</span>
          </div>
        </Card>

        {/* Average Daily Rate (ADR) */}
        <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-4 border-t-emerald-500 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Average Daily Rate (ADR)</span>
            <CircleDollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl sm:text-4xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
            {formatINR(propAnalytics.adr)}
          </div>
          <div className="text-xs text-slate-500">
            Gross realized rate per occupied guest night
          </div>
        </Card>

        {/* RevPAR */}
        <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-4 border-t-teal-600 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>RevPAR (Revenue Per Available Room)</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-white">
            {formatINR(propAnalytics.revpar)}
          </div>
          <div className="text-xs text-slate-500">
            Net yield calculated across all 12 property suites
          </div>
        </Card>
      </div>

      {/* 2. Monthly Trend Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Revenue & ADR Trend */}
        <Card className="lg:col-span-8 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
                Revenue & Realized Tariff Performance
              </h3>
              <p className="text-xs text-slate-500">Monthly gross turnover trend in INR</p>
            </div>
            <Badge variant="emerald">6-Month Trajectory</Badge>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propAnalytics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value)), 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#059669',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenue" name="Monthly Revenue (₹)" fill="#059669" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Occupancy Trend Line */}
        <Card className="lg:col-span-4 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 bg-white dark:bg-slate-900">
          <div>
            <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
              Occupancy Velocity (%)
            </h3>
            <p className="text-xs text-slate-500">Monthly capacity utilization</p>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={propAnalytics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={11} domain={[50, 100]} />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Occupancy']}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#059669',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="occupancy"
                  name="Occupancy %"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 3. Room Inventory & Turnaround Grid */}
      <Card className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 bg-white dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-emerald-600" />
              <span>Room Inventory & Housekeeping Turnaround Grid</span>
            </h3>
            <p className="text-xs text-slate-500">
              Live status matrix for {selectedProperty.name} suites. Click any room card to toggle turnaround state.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Available ({availableCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Occupied ({occupiedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Turnover ({turnoverCount})</span>
            </div>
          </div>
        </div>

        {/* Matrix Grid: Standard (101-104), Deluxe (201-204), Suite (301-304) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Standard Category */}
          <div className="space-y-3">
            <div className="text-xs uppercase font-bold tracking-wider text-slate-500 flex justify-between">
              <span>Standard (Rooms 101–104)</span>
              <Badge variant="secondary">Standard</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="text-xs uppercase font-bold tracking-wider text-slate-500 flex justify-between">
              <span>Deluxe (Rooms 201–204)</span>
              <Badge variant="emerald">Deluxe</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="text-xs uppercase font-bold tracking-wider text-slate-500 flex justify-between">
              <span>Presidential Suite (301–304)</span>
              <Badge variant="emerald" className="bg-emerald-800 text-white">Suite</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
      </Card>

      {/* 4. Bookings Audit Table */}
      <Card className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
              Bookings & Revenue Audit Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Filterable transaction ledger with revenue sorting and audit logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search guest or ref..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={auditFilterStatus}
              onChange={(e) => setAuditFilterStatus(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
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
              className="text-xs gap-1.5 h-9"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort: {auditSortBy === 'date' ? 'By Date' : 'By Revenue'}</span>
            </Button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAuditBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold">{b.voucherCode}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{b.guestName}</div>
                    <div className="text-slate-400 text-[10px]">{b.guestEmail}</div>
                  </td>
                  <td className="py-3.5 px-4 capitalize">
                    {b.roomCategory} {b.roomNumber && `(#${b.roomNumber})`}
                  </td>
                  <td className="py-3.5 px-4">
                    <div>{formatDate(b.checkInDate)}</div>
                    <div className="text-slate-400 text-[10px]">{b.nights} Nights ({b.guestsCount} Guests)</div>
                  </td>
                  <td className="py-3.5 px-4 font-serif font-bold text-emerald-700 dark:text-emerald-400">
                    {formatINR(b.totalAmount)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{b.paymentMethod}</td>
                  <td className="py-3.5 px-4">
                    {b.status === 'checked_in' && <Badge variant="success">In-House</Badge>}
                    {b.status === 'confirmed' && <Badge variant="warning">Confirmed</Badge>}
                    {b.status === 'checked_out' && <Badge variant="secondary">Completed</Badge>}
                    {b.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// Sub-component for individual room card in matrix
interface RoomMatrixCardProps {
  room: any;
  onClick: () => void;
}

const RoomMatrixCard: React.FC<RoomMatrixCardProps> = ({ room, onClick }) => {
  const statusColors = {
    available: 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300',
    occupied: 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300',
    turnover: 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300',
  };

  const statusBadges = {
    available: <Badge variant="success" className="text-[9px] py-0 px-1.5">Clean / Ready</Badge>,
    occupied: <Badge variant="destructive" className="text-[9px] py-0 px-1.5">Occupied</Badge>,
    turnover: <Badge variant="warning" className="text-[9px] py-0 px-1.5">Housekeeping</Badge>,
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-2xl border-2 transition-all hover:scale-[1.02] cursor-pointer shadow-sm ${statusColors[room.status as RoomStatus]}`}
      title="Click to toggle room turnaround state"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-serif font-bold text-base">#{room.number}</span>
        {statusBadges[room.status as RoomStatus]}
      </div>

      {room.currentGuest ? (
        <div className="text-[11px] font-semibold truncate">{room.currentGuest}</div>
      ) : (
        <div className="text-[10px] text-slate-500">No active guest</div>
      )}

      <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>Cleanliness: {room.cleanlinessScore}%</span>
        <RefreshCw className="w-3 h-3 opacity-60" />
      </div>
    </div>
  );
};
