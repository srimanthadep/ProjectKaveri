import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHotel } from '../context/HotelContext';
import { PropertyId } from '../types';
import { formatINR } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Crown,
  TrendingUp,
  Users,
  Search,
  Award
} from 'lucide-react';

export const OwnerPortal: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { properties, bookings, users, analytics, setSelectedPropertyId } = useHotel();

  const [customerSearch, setCustomerSearch] = useState('');

  // Multi-property revenue calculation
  const propertyRevenues = useMemo(() => {
    return properties.map((prop) => {
      const propBookings = bookings.filter(
        (b) => b.propertyId === prop.id && b.status !== 'cancelled'
      );
      const totalRev = propBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const bookedNights = propBookings.reduce((sum, b) => sum + b.nights, 0);
      return {
        id: prop.id,
        name: prop.name,
        state: prop.state,
        revenue: totalRev,
        bookedNights,
        bookingCount: propBookings.length,
      };
    });
  }, [properties, bookings]);

  // Grand Total Chain Revenue
  const chainGrandTotal = useMemo(() => {
    return propertyRevenues.reduce((sum, p) => sum + p.revenue, 0);
  }, [propertyRevenues]);

  // Pie chart data for contribution
  const pieData = propertyRevenues.map((p) => ({
    name: p.name.split(' (')[0],
    value: p.revenue,
    percent: Math.round((p.revenue / (chainGrandTotal || 1)) * 100),
  }));

  const PIE_COLORS = ['#059669', '#10B981', '#0D9488'];

  // Combined monthly trend for all properties
  const multiPropertyMonthlyTrend = useMemo(() => {
    const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    return months.map((m, idx) => ({
      month: m,
      coorg: analytics.coorg.monthlyTrend[idx]?.revenue || 0,
      ooty: analytics.ooty.monthlyTrend[idx]?.revenue || 0,
      alleppey: analytics.alleppey.monthlyTrend[idx]?.revenue || 0,
    }));
  }, [analytics]);

  // Filtered customer directory
  const filteredCustomers = useMemo(() => {
    const guestsOnly = users.filter((u) => u.role === 'guest');
    return guestsOnly.filter((g) => {
      return (
        g.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        g.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (g.phone && g.phone.includes(customerSearch))
      );
    });
  }, [users, customerSearch]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Executive Command Header */}
      <div className="rounded-2xl bg-[#183028] p-6 sm:p-8 text-[#FAF8F5] border border-[#224036] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#9E7B36]" />
            <span className="text-2xs font-semibold uppercase tracking-widest text-[#E6DCBF]">
              Executive Portfolio Suite · Principal: {user?.name || 'Siddharth Varma'}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#FAF8F5] tracking-tight">
            Kaveri Hospitality Governance
          </h1>
          <p className="text-xs text-[#C7D6CF] max-w-2xl leading-relaxed">
            Consolidated enterprise revenue, multi-property asset yield, cross-state portfolio governance, and patron directory.
          </p>
        </div>

        {/* Grand Total Revenue Ticker Banner */}
        <div className="p-4 sm:p-5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-sm space-y-1 text-right shrink-0">
          <div className="text-2xs uppercase font-semibold tracking-widest text-[#E6DCBF]">
            Chain Grand Total Revenue
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-medium text-[#FAF8F5] tracking-tight">
            {formatINR(chainGrandTotal)}
          </div>
          <div className="text-2xs text-[#C7D6CF] flex items-center justify-end gap-1 font-medium">
            <TrendingUp className="h-3.5 w-3.5 text-[#9E7B36]" />
            <span>Across 36 Boutique Suites & Villas</span>
          </div>
        </div>
      </div>

      {/* Property Contribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {propertyRevenues.map((p) => (
          <div
            key={p.id}
            className="p-6 rounded-xl border border-[#EAE6DF] bg-white shadow-2xs hover:border-[#D5CDBC] transition-all space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="emerald" dot>
                  {p.state}
                </Badge>
                <h3 className="font-serif text-lg font-medium text-[#183028] mt-1.5">
                  {p.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[#183028]">
                  {Math.round((p.revenue / (chainGrandTotal || 1)) * 100)}%
                </span>
                <span className="text-2xs text-[#8C877D] block">Contribution</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-2xs uppercase tracking-widest text-[#8C877D]">Gross Realized Tariff</div>
              <div className="font-serif text-2xl font-medium text-[#183028]">
                {formatINR(p.revenue)}
              </div>
            </div>

            <div className="pt-3 border-t border-[#EAE6DF] grid grid-cols-2 gap-2 text-xs text-[#615D56]">
              <div>
                <span className="font-medium text-[#183028]">{p.bookingCount}</span>
                <span className="block text-2xs text-[#8C877D]">Total Stays</span>
              </div>
              <div>
                <span className="font-medium text-[#183028]">{p.bookedNights}</span>
                <span className="block text-2xs text-[#8C877D]">Room Nights Sold</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPropertyId(p.id);
                onNavigate('manager-dashboard');
              }}
              className="w-full text-xs font-medium"
            >
              Open Property Deep-Dive
            </Button>
          </div>
        ))}
      </div>

      {/* Multi-Property Revenue Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Multi-Property Stacked Bar Chart */}
        <Card className="lg:col-span-8 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-serif font-bold text-slate-900">
                Multi-Property Revenue Comparison (Coorg vs Ooty vs Alleppey)
              </h3>
              <p className="text-xs text-slate-500">Comparative monthly turnover by destination</p>
            </div>
            <Badge variant="emerald">Consolidated</Badge>
          </div>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={multiPropertyMonthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), '']}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#059669',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="coorg" name="Coorg (Riverside)" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ooty" name="Ooty (Hilltop)" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="alleppey" name="Alleppey (Backwater)" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Portfolio Distribution Donut */}
        <Card className="lg:col-span-4 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 bg-white">
          <div>
            <h3 className="text-lg font-serif font-bold text-slate-900">
              Revenue Share Allocation
            </h3>
            <p className="text-xs text-slate-500">Chain asset yield breakdown</p>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), 'Tariff']}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#059669',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-700 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.percent}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Customer Directory & VIP High-Net-Worth Roster */}
      <Card className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Patron Directory & Lifetime Spend Ledger</span>
            </h3>
            <p className="text-xs text-slate-500">
              Registered patrons across all destinations with lifetime booking values.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patron by name, email, phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-1 focus:ring-emerald-500 text-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Patron Profile</th>
                <th className="py-3.5 px-4">Contact Coordinates</th>
                <th className="py-3.5 px-4">Lifetime Nights</th>
                <th className="py-3.5 px-4">Lifetime Spend (INR)</th>
                <th className="py-3.5 px-4">Tier Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((g) => {
                const spend = g.totalSpent || 0;
                const isVIP = spend > 50000 || (g.lifetimeNights || 0) >= 5;
                return (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-sm">{g.name}</div>
                      <div className="text-[10px] text-slate-400">ID: {g.id}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-900 font-medium">{g.email}</div>
                      <div className="text-slate-500 text-[11px]">{g.phone || '+91 98450 12345'}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {g.lifetimeNights || 0} Nights
                    </td>
                    <td className="py-4 px-4 font-serif font-bold text-emerald-700 text-sm">
                      {formatINR(spend)}
                    </td>
                    <td className="py-4 px-4">
                      {isVIP ? (
                        <Badge variant="emerald" className="flex items-center gap-1 w-fit">
                          <Award className="w-3 h-3" />
                          <span>Kaveri Sovereign VIP</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Member Patron</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
