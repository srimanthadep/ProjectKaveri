import React, { useState, useMemo } from 'react';
import { useHotel } from '../context/HotelContext';
import { Property, PropertyId, RoomCategory } from '../types';
import { ROOM_TYPES_DATA, TESTIMONIALS_DATA } from '../data/mockData';
import { formatINR } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Stack } from '../components/ui/Stack';
import {
  MapPin,
  Search,
  Star,
  Sparkles,
  ArrowRight,
  Coffee,
  Trees,
  Waves,
  CheckCircle2,
  BedDouble,
  Compass,
  Calendar,
  Users,
  ShieldCheck
} from 'lucide-react';
import { Dialog } from '../components/ui/Dialog';

interface LandingPageProps {
  onNavigate: (view: string, extraData?: any) => void;
  onOpenBookingModal?: (params?: { propertyId: PropertyId; roomCategory?: RoomCategory }) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenBookingModal }) => {
  const { properties, setSelectedPropertyId } = useHotel();

  // Floating search bar state
  const [selectedDest, setSelectedDest] = useState<PropertyId>('coorg');
  const [checkIn, setCheckIn] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [guests, setGuests] = useState('2');

  // Property detail modal state
  const [activePropertyModal, setActivePropertyModal] = useState<Property | null>(null);

  const handleSearchAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedPropertyId(selectedDest);
    onNavigate('booking-engine', {
      propertyId: selectedDest,
      checkIn,
      checkOut,
      guests: parseInt(guests, 10),
    });
  };

  const stackCards = useMemo(() => [
    // 01 Coorg
    <div
      key="coorg"
      className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/20 select-none group bg-[#183028]"
    >
      <img
        src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80"
        alt="Kaveri Riverside"
        className="w-full h-full object-cover brightness-[0.85] group-hover:scale-105 transition-transform duration-700 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/15 pointer-events-none" />
      <div className="absolute top-3.5 sm:top-5 left-3.5 sm:left-5 right-3.5 sm:right-5 flex items-center justify-between z-10">
        <span className="inline-flex items-center rounded-lg bg-white/95 px-2.5 sm:px-3 py-1 sm:py-1.5 text-2xs sm:text-xs font-semibold uppercase tracking-wider text-[#183028] shadow-sm">
          Karnataka · Coorg
        </span>
        <span className="bg-black/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-white text-2xs sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 border border-white/20 shadow-sm">
          <Star className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-[#E6DCBF] fill-[#E6DCBF]" />
          <span className="font-semibold">4.95</span>
          <span className="text-white/70 text-[10px] sm:text-[11px]">(328 reviews)</span>
        </span>
      </div>
      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 text-white z-10 space-y-1.5 sm:space-y-2">
        <span className="text-2xs sm:text-xs uppercase tracking-widest text-[#E6DCBF] font-semibold block">
          120-Acre Private Coffee Plantation
        </span>
        <h3 className="font-serif text-xl sm:text-3xl lg:text-[2rem] font-medium text-white tracking-tight leading-tight drop-shadow-sm">
          Kaveri Riverside
        </h3>
        <p className="text-2xs sm:text-sm text-white/85 line-clamp-2 leading-relaxed">
          Riverside cottages nestled along the sacred river bends with private plunge pools, woodfire culinary rituals, and aromatic arabica trails.
        </p>
        <div className="pt-2.5 sm:pt-3 border-t border-white/15 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-2xs text-white/70 uppercase tracking-widest block font-medium">Starting from</span>
            <span className="font-serif text-lg sm:text-2xl font-medium text-white">₹14,500</span>
            <span className="text-[10px] sm:text-2xs text-white/70"> / night</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPropertyId('coorg');
              onNavigate('booking-engine', { propertyId: 'coorg' });
            }}
            className="px-3.5 sm:px-4.5 py-1.5 sm:py-2 rounded-xl bg-white text-[#183028] text-2xs sm:text-sm font-semibold hover:bg-[#FAF8F5] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            Reserve Stay
          </button>
        </div>
      </div>
    </div>,

    // 02 Ooty
    <div
      key="ooty"
      className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/20 select-none group bg-[#183028]"
    >
      <img
        src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80"
        alt="Kaveri Hilltop"
        className="w-full h-full object-cover brightness-[0.85] group-hover:scale-105 transition-transform duration-700 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/15 pointer-events-none" />
      <div className="absolute top-3.5 sm:top-5 left-3.5 sm:left-5 right-3.5 sm:right-5 flex items-center justify-between z-10">
        <span className="inline-flex items-center rounded-lg bg-white/95 px-2.5 sm:px-3 py-1 sm:py-1.5 text-2xs sm:text-xs font-semibold uppercase tracking-wider text-[#183028] shadow-sm">
          Tamil Nadu · Ooty
        </span>
        <span className="bg-black/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-white text-2xs sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 border border-white/20 shadow-sm">
          <Star className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-[#E6DCBF] fill-[#E6DCBF]" />
          <span className="font-semibold">4.92</span>
          <span className="text-white/70 text-[10px] sm:text-[11px]">(264 reviews)</span>
        </span>
      </div>
      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 text-white z-10 space-y-1.5 sm:space-y-2">
        <span className="text-2xs sm:text-xs uppercase tracking-widest text-[#E6DCBF] font-semibold block">
          7,200 Ft Highland Heritage Manor
        </span>
        <h3 className="font-serif text-xl sm:text-3xl lg:text-[2rem] font-medium text-white tracking-tight leading-tight drop-shadow-sm">
          Kaveri Hilltop
        </h3>
        <p className="text-2xs sm:text-sm text-white/85 line-clamp-2 leading-relaxed">
          Restored Victorian stone masonry, private English tea lawns, heated hydrotherapy pool, and panoramic misty Nilgiri mountain vistas.
        </p>
        <div className="pt-2.5 sm:pt-3 border-t border-white/15 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-2xs text-white/70 uppercase tracking-widest block font-medium">Starting from</span>
            <span className="font-serif text-lg sm:text-2xl font-medium text-white">₹18,000</span>
            <span className="text-[10px] sm:text-2xs text-white/70"> / night</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPropertyId('ooty');
              onNavigate('booking-engine', { propertyId: 'ooty' });
            }}
            className="px-3.5 sm:px-4.5 py-1.5 sm:py-2 rounded-xl bg-white text-[#183028] text-2xs sm:text-sm font-semibold hover:bg-[#FAF8F5] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            Reserve Stay
          </button>
        </div>
      </div>
    </div>,

    // 03 Alleppey
    <div
      key="alleppey"
      className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/20 select-none group bg-[#183028]"
    >
      <img
        src="https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1600&q=80"
        alt="Kaveri Backwater"
        className="w-full h-full object-cover brightness-[0.85] group-hover:scale-105 transition-transform duration-700 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/15 pointer-events-none" />
      <div className="absolute top-3.5 sm:top-5 left-3.5 sm:left-5 right-3.5 sm:right-5 flex items-center justify-between z-10">
        <span className="inline-flex items-center rounded-lg bg-white/95 px-2.5 sm:px-3 py-1 sm:py-1.5 text-2xs sm:text-xs font-semibold uppercase tracking-wider text-[#183028] shadow-sm">
          Kerala · Alleppey
        </span>
        <span className="bg-black/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-white text-2xs sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 border border-white/20 shadow-sm">
          <Star className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-[#E6DCBF] fill-[#E6DCBF]" />
          <span className="font-semibold">4.98</span>
          <span className="text-white/70 text-[10px] sm:text-[11px]">(412 reviews)</span>
        </span>
      </div>
      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 text-white z-10 space-y-1.5 sm:space-y-2">
        <span className="text-2xs sm:text-xs uppercase tracking-widest text-[#E6DCBF] font-semibold block">
          Private Luxury Lagoon Houseboats
        </span>
        <h3 className="font-serif text-xl sm:text-3xl lg:text-[2rem] font-medium text-white tracking-tight leading-tight drop-shadow-sm">
          Kaveri Backwater
        </h3>
        <p className="text-2xs sm:text-sm text-white/85 line-clamp-2 leading-relaxed">
          Handcrafted teakwood lagoon villas and private solar-powered luxury kettuvallam houseboats floating on tranquil Vembanad waters.
        </p>
        <div className="pt-2.5 sm:pt-3 border-t border-white/15 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-2xs text-white/70 uppercase tracking-widest block font-medium">Starting from</span>
            <span className="font-serif text-lg sm:text-2xl font-medium text-white">₹22,000</span>
            <span className="text-[10px] sm:text-2xs text-white/70"> / night</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPropertyId('alleppey');
              onNavigate('booking-engine', { propertyId: 'alleppey' });
            }}
            className="px-3.5 sm:px-4.5 py-1.5 sm:py-2 rounded-xl bg-white text-[#183028] text-2xs sm:text-sm font-semibold hover:bg-[#FAF8F5] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            Reserve Stay
          </button>
        </div>
      </div>
    </div>,
  ], [onNavigate, setSelectedPropertyId]);

  return (
    <div className="w-full">
      {/* 1. Modern Luxury Hero Section */}
      <section className="pt-20 sm:pt-24 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Narrative & Luxury Concierge Form (Order 2 on Mobile, Order 1 on Desktop) */}
          <div className="lg:col-span-5 order-2 lg:order-1 flex flex-col justify-center space-y-5 sm:space-y-6 lg:pr-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[3.25rem] font-medium text-[#183028] leading-[1.16] sm:leading-[1.14] tracking-tight">
                Authentic Luxury in South India's <span className="font-serif italic font-normal text-[#9E7B36]">Finest Retreats</span>
              </h1>
            </div>

            {/* Luxury Reservation Concierge Card */}
            <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 shadow-sm border border-[#E4DFD5] rounded-2xl relative z-10 space-y-3.5 sm:space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-2.5">
                <div className="flex items-center gap-1.5 text-2xs uppercase tracking-widest font-semibold text-[#8C877D]">
                  <Compass className="h-3.5 w-3.5 text-[#9E7B36]" />
                  <span>Sanctuary Reservation</span>
                </div>
                <span className="text-[11px] text-[#2C6B4D] font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Best Rate Guaranteed
                </span>
              </div>

              <form onSubmit={handleSearchAvailability} className="space-y-3 sm:space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="relative">
                    <label className="text-2xs uppercase tracking-wider font-semibold text-[#8C877D] block mb-1">
                      Destination
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDest}
                        onChange={(e) => setSelectedDest(e.target.value as PropertyId)}
                        className="w-full rounded-lg border border-[#D9D3C7] bg-[#FAF8F5]/60 hover:bg-white pl-3 pr-8 py-2 text-xs font-medium text-[#183028] focus:outline-none focus:border-[#183028] focus:bg-white cursor-pointer transition-colors appearance-none"
                      >
                        <option value="coorg">Kaveri Riverside (Coorg)</option>
                        <option value="ooty">Kaveri Hilltop (Ooty)</option>
                        <option value="alleppey">Kaveri Backwater (Alleppey)</option>
                      </select>
                      <MapPin className="h-3.5 w-3.5 text-[#8C877D] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="text-2xs uppercase tracking-wider font-semibold text-[#8C877D] block mb-1">
                      Guests
                    </label>
                    <div className="relative">
                      <select
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        className="w-full rounded-lg border border-[#D9D3C7] bg-[#FAF8F5]/60 hover:bg-white pl-3 pr-8 py-2 text-xs font-medium text-[#183028] focus:outline-none focus:border-[#183028] focus:bg-white cursor-pointer transition-colors appearance-none"
                      >
                        <option value="1">1 Guest (Solo Traveler)</option>
                        <option value="2">2 Guests (Couple / Double)</option>
                        <option value="3">3 Guests (Triple)</option>
                        <option value="4">4 Guests (Private Suite)</option>
                      </select>
                      <Users className="h-3.5 w-3.5 text-[#8C877D] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="text-2xs uppercase tracking-wider font-semibold text-[#8C877D] block mb-1">
                      Check-In
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full rounded-lg border border-[#D9D3C7] bg-[#FAF8F5]/60 hover:bg-white px-2.5 sm:px-3 py-2 text-xs font-medium text-[#183028] focus:outline-none focus:border-[#183028] focus:bg-white cursor-pointer transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-2xs uppercase tracking-wider font-semibold text-[#8C877D] block mb-1">
                      Check-Out
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full rounded-lg border border-[#D9D3C7] bg-[#FAF8F5]/60 hover:bg-white px-2.5 sm:px-3 py-2 text-xs font-medium text-[#183028] focus:outline-none focus:border-[#183028] focus:bg-white cursor-pointer transition-colors"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full text-xs font-medium h-10.5 sm:h-11 shadow-sm mt-1"
                >
                  <Search className="h-3.5 w-3.5 mr-1.5 text-[#E6DCBF]" />
                  <span>Check Sanctuary Availability</span>
                </Button>
              </form>

              <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3 pt-0.5 sm:pt-1 text-[10px] sm:text-[11px] text-[#8C877D]">
                <span>✓ Flexible Rescheduling</span>
                <span>·</span>
                <span>✓ Estate Welcome Ritual</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Luxury Card Stack (Order 1 on Mobile, Order 2 on Desktop) */}
          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col justify-center items-center lg:items-end w-full">
            <div className="w-full max-w-lg sm:max-w-xl lg:max-w-[640px] h-[390px] xs:h-[430px] sm:h-[500px] lg:h-[550px] relative">
              <Stack
                randomRotation={false}
                sensitivity={180}
                sendToBackOnClick={true}
                autoplay={true}
                autoplayDelay={4000}
                pauseOnHover={true}
                cards={stackCards}
              />
            </div>

            {/* Subtitle Interaction Cue */}
            <div className="flex items-center justify-between w-full max-w-lg sm:max-w-xl lg:max-w-[640px] mt-2.5 sm:mt-3 px-1 text-2xs text-[#8C877D]">
              <span className="flex items-center gap-1.5 text-[11px] sm:text-2xs">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2C6B4D] animate-pulse" />
                Tap or swipe cards to explore
              </span>
              <button
                type="button"
                onClick={() => onNavigate('booking-engine')}
                className="font-medium text-[#183028] hover:text-[#9E7B36] transition-colors cursor-pointer text-[11px] sm:text-2xs"
              >
                View all 3 sanctuaries →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Brand Story & Philosophy Section */}
      <section className="py-12 sm:py-20 bg-slate-50 text-slate-900 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Image Composition */}
            <div className="relative">
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80"
                  alt="Kaveri Stays Philosophy"
                  className="w-full h-[280px] xs:h-[340px] sm:h-[400px] lg:h-[460px] object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 p-4 sm:p-6 rounded-2xl bg-emerald-900 text-white max-w-xs shadow-2xl hidden sm:block border border-emerald-600/40">
                <div className="text-xl sm:text-2xl font-serif font-bold text-emerald-300">100% Organic</div>
                <div className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                  Estate-harvested coffees, fresh cardamom, farm-to-table cuisine, and zero single-use plastics.
                </div>
              </div>
            </div>

            {/* Narrative */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900 leading-tight">
                Rooted in South India's Soul, Crafted for the Discerning Traveller.
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed">
                Kaveri Stays was born from an intimate reverence for the sacred waters of South India—from the Brahmagiri mist where the river Kaveri originates in Coorg, to the highland tea knolls of the Nilgiris, and the serene coastal lagoons of Kerala.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1 sm:pt-2">
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs text-center sm:text-left">
                  <Coffee className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-600 mb-1 sm:mb-2 mx-auto sm:mx-0" />
                  <div className="font-serif font-bold text-2xs sm:text-sm text-slate-900 leading-tight">Farm to Table</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 hidden xs:block">Estate culinary rituals.</div>
                </div>
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs text-center sm:text-left">
                  <Trees className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-600 mb-1 sm:mb-2 mx-auto sm:mx-0" />
                  <div className="font-serif font-bold text-2xs sm:text-sm text-slate-900 leading-tight">Biodiverse</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 hidden xs:block">120+ acres flora.</div>
                </div>
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs text-center sm:text-left">
                  <Waves className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-600 mb-1 sm:mb-2 mx-auto sm:mx-0" />
                  <div className="font-serif font-bold text-2xs sm:text-sm text-slate-900 leading-tight">Solar Boats</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 hidden xs:block">Zero-emission luxury.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Destination Showcase Cards */}
      <section id="destinations" className="py-10 sm:py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-12">
          <div className="text-center space-y-1.5 sm:space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-2xs sm:text-xs font-semibold uppercase tracking-wider">
              <Compass className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>Three Premier Sanctuaries</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900">
              Explore Our Signature Destinations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Each destination captures the architectural integrity, authentic gastronomy, and untouched natural grandeur of its geography.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
            {properties.map((prop) => (
              <div
                key={prop.id}
                className="group overflow-hidden rounded-2xl border border-[#EAE6DF] shadow-2xs hover:shadow-md hover:border-[#D5CDBC] transition-all duration-300 flex flex-col justify-between bg-white"
              >
                <div>
                  {/* Image with zoom effect & high-contrast dark scrim */}
                  <div className="relative h-48 xs:h-56 sm:h-68 lg:h-72 overflow-hidden rounded-t-2xl">
                    <img
                      src={prop.heroImage}
                      alt={prop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10">
                      <span className="inline-flex items-center rounded-md bg-white/95 px-2 sm:px-2.5 py-0.5 sm:py-1 text-2xs font-semibold uppercase tracking-wider text-[#183028] shadow-xs">
                        {prop.state}
                      </span>
                    </div>
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 bg-black/60 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-white text-2xs font-medium flex items-center gap-1 border border-white/20 shadow-xs">
                      <Star className="h-3 w-3 text-[#E6DCBF] fill-[#E6DCBF]" />
                      <span>{prop.rating}</span>
                      <span className="text-white/70 text-[10px]">({prop.reviewCount})</span>
                    </div>
                    <div className="absolute bottom-3 sm:bottom-4 left-3.5 sm:left-5 right-3.5 sm:right-5 text-white z-10">
                      <h3 className="font-serif text-lg sm:text-2xl font-medium tracking-tight text-white drop-shadow-sm" style={{ color: '#ffffff' }}>
                        {prop.name}
                      </h3>
                      <p className="text-2xs sm:text-xs text-white/90 font-normal tracking-wide mt-0.5 line-clamp-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        {prop.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3.5 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
                    <p className="text-xs text-[#615D56] line-clamp-2 sm:line-clamp-3 leading-relaxed">
                      {prop.description}
                    </p>

                    {/* Amenities pills */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {prop.amenities.slice(0, 3).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-[#FAF8F5] border border-[#EAE6DF] text-[10px] sm:text-2xs font-medium text-[#4A463F]"
                        >
                          {amenity}
                        </span>
                      ))}
                      {prop.amenities.length > 3 && (
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-[#FAF8F5] border border-[#EAE6DF] text-[10px] sm:text-2xs font-medium text-[#8C877D]">
                          +{prop.amenities.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="pt-2 sm:pt-3 border-t border-[#EAE6DF] text-2xs sm:text-xs text-[#615D56] leading-relaxed">
                      <span className="font-semibold text-[#183028]">Signature Ritual:</span>{' '}
                      <span className="text-[#4A463F]">{prop.signatureExperience}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Price & CTAs */}
                <div className="p-3.5 sm:p-5 lg:p-6 pt-0 flex flex-row items-center justify-between border-t border-[#EAE6DF] mt-1 sm:mt-2">
                  <div>
                    <span className="text-[10px] sm:text-2xs text-[#8C877D] uppercase tracking-widest block font-semibold">Starting from</span>
                    <span className="font-serif text-lg sm:text-2xl font-medium text-[#183028] tracking-tight">
                      {formatINR(prop.startingRate)}
                    </span>
                    <span className="text-[10px] sm:text-2xs text-[#8C877D]"> / night</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivePropertyModal(prop)}
                      className="text-2xs sm:text-xs px-2.5 sm:px-3 h-8 sm:h-9"
                    >
                      Details
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedPropertyId(prop.id);
                        onNavigate('booking-engine', { propertyId: prop.id });
                      }}
                      className="text-2xs sm:text-xs px-3 sm:px-4 h-8 sm:h-9"
                    >
                      Book Stay
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Room Types - 2-in-a-row Mobile Grid / 3-in-a-row Desktop */}
      <section className="py-10 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-12">
          <div className="text-center space-y-1.5 sm:space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-2xs sm:text-xs font-semibold uppercase tracking-wider">
              <BedDouble className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>Architectural Living</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900">
              Boutique Room & Villa Categories
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Tailored accommodations balancing ancestral woodwork with state-of-the-art climate control, soaking tubs, and butler service.
            </p>
          </div>

          {/* 2-in-a-row Grid on Mobile, 3-in-a-row on Desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
            {ROOM_TYPES_DATA.map((room) => (
              <Card
                key={room.id}
                className="overflow-hidden rounded-xl sm:rounded-3xl border border-slate-200 bg-white shadow-xs hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-28 xs:h-36 sm:h-56 overflow-hidden">
                    <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                      <Badge variant="emerald" className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5">{room.features[0]}</Badge>
                    </div>
                    <div className="absolute bottom-1.5 right-1.5 sm:bottom-3 sm:right-3 bg-black/80 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-xl text-white text-[10px] sm:text-xs font-serif font-bold border border-white/10">
                      {formatINR(room.basePrice)} <span className="text-[8px] sm:text-[10px] font-sans font-normal">/ nt</span>
                    </div>
                  </div>

                  <div className="p-2.5 xs:p-3.5 sm:p-6 space-y-1.5 sm:space-y-4">
                    <div>
                      <h3 className="text-xs xs:text-sm sm:text-xl font-serif font-bold text-slate-900 line-clamp-1">{room.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-4 text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                        <span className="flex items-center gap-1"><Users className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 text-emerald-600" /> {room.features[1]}</span>
                        <span className="hidden xs:inline-flex items-center gap-1"><BedDouble className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 text-emerald-600" /> {room.bedConfig.split('(')[0]}</span>
                      </div>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed line-clamp-2 hidden sm:block">{room.description}</p>

                    {/* Inclusions (Desktop View) */}
                    <div className="space-y-1 sm:space-y-1.5 pt-1.5 sm:pt-2 border-t border-slate-100 hidden sm:block">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Included with Stay:</div>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {room.inclusions.slice(0, 3).map((inc, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 xs:p-3.5 sm:p-6 pt-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onNavigate('booking-engine', { roomCategory: room.id });
                    }}
                    className="w-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider h-7 xs:h-8 sm:h-10"
                  >
                    Select
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Verified Guest Reviews / Social Proof */}
      <section className="py-10 sm:py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-12">
          <div className="text-center space-y-1.5 sm:space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-2xs sm:text-xs font-semibold uppercase tracking-wider">
              <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-emerald-600 text-emerald-600" />
              <span>Verified Patron Experiences</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900">
              Words from Our Honoured Guests
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Read authentic memoirs from leaders, artists, and families who have found sanctuary at Kaveri Stays.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
            {TESTIMONIALS_DATA.map((t) => (
              <Card
                key={t.id}
                className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 space-y-3 sm:space-y-4 relative flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-amber-400" />
                    ))}
                  </div>
                  <h4 className="font-serif font-bold text-xs sm:text-base text-slate-900">
                    "{t.title}"
                  </h4>
                  <p className="text-2xs sm:text-xs text-slate-600 leading-relaxed italic line-clamp-3 sm:line-clamp-none">
                    "{t.comment}"
                  </p>
                </div>

                <div className="pt-2.5 sm:pt-4 border-t border-slate-200 flex items-center gap-2.5 sm:gap-3">
                  <img
                    src={t.avatar}
                    alt={t.guestName}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-emerald-400/40"
                  />
                  <div>
                    <div className="font-bold text-2xs sm:text-xs text-slate-900">{t.guestName}</div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500">{t.guestLocation}</div>
                    <div className="text-[9px] sm:text-[10px] text-emerald-700 font-semibold">{t.propertyName}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Property Detail Modal */}
      {activePropertyModal && (
        <Dialog
          isOpen={!!activePropertyModal}
          onClose={() => setActivePropertyModal(null)}
          maxWidth="3xl"
        >
          <div className="space-y-6">
            <div className="relative h-72 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 overflow-hidden rounded-t-2xl">
              <img
                src={activePropertyModal.heroImage}
                alt={activePropertyModal.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <Badge variant="emerald" className="mb-2">{activePropertyModal.state}</Badge>
                <h2 className="text-3xl font-serif font-bold">{activePropertyModal.name}</h2>
                <p className="text-xs text-slate-200 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                  {activePropertyModal.location}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              {activePropertyModal.description}
            </p>

            {/* Gallery Grid */}
            <div className="space-y-2">
              <div className="text-xs uppercase font-semibold text-slate-400">Resort Gallery</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {activePropertyModal.galleryImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt="Gallery"
                    className="h-24 w-full object-cover rounded-xl border border-slate-200 hover:opacity-90 transition-opacity"
                  />
                ))}
              </div>
            </div>

            {/* Amenities & Signature Ritual */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-sm text-slate-900">
                Curated Amenities & Inclusions
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700">
                {activePropertyModal.amenities.map((am, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{am}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div>
                <span className="text-xs text-slate-500">From </span>
                <span className="text-xl font-serif font-bold text-emerald-700">
                  {formatINR(activePropertyModal.startingRate)}
                </span>
                <span className="text-xs text-slate-400"> / night</span>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setSelectedPropertyId(activePropertyModal.id);
                  setActivePropertyModal(null);
                  onNavigate('booking-engine', { propertyId: activePropertyModal.id });
                }}
              >
                Book This Property
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
