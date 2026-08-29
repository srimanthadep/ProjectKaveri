import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { Property, PropertyId, RoomCategory } from '../types';
import { ROOM_TYPES_DATA, TESTIMONIALS_DATA } from '../data/mockData';
import { formatINR } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
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

  return (
    <div className="w-full">
      {/* 1. Modern White & Green Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Narrative & Clean Form */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6 lg:pr-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Luxury Boutique Sanctuaries
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-slate-900 dark:text-white leading-[1.15] tracking-tight">
                Authentic Luxury in South India's <span className="text-emerald-700 dark:text-emerald-400 italic">Finest Retreats</span>
              </h1>
            </div>

            <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-md">
              Discover serene riverside cottages in Coorg, colonial tea valley manors in Ooty, and private luxury houseboats in the backwaters of Alleppey.
            </p>

            {/* Clean Reservation Form Card */}
            <div className="bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 rounded-2xl relative z-10 flex flex-col space-y-4">
              <form onSubmit={handleSearchAvailability} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                      Destination
                    </label>
                    <select
                      value={selectedDest}
                      onChange={(e) => setSelectedDest(e.target.value as PropertyId)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="coorg">Kaveri Riverside, Coorg</option>
                      <option value="ooty">Kaveri Hilltop, Ooty</option>
                      <option value="alleppey">Kaveri Backwater, Alleppey</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                      Guests
                    </label>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                      <option value="4">4 Guests (Suite)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                      Check-In
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                      Check-Out
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center shadow-md font-semibold tracking-wide"
                >
                  <Search className="w-4 h-4" />
                  <span>Check Sanctuary Availability</span>
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column: High-End Showcase Grid */}
          <div className="lg:col-span-7 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 relative flex flex-col justify-between rounded-3xl overflow-hidden border border-emerald-800/40 shadow-2xl min-h-[500px]">
            <div className="relative z-10 p-6 sm:p-8 flex-grow flex flex-col justify-center">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
                {/* 01 Coorg */}
                <div
                  onClick={() => {
                    setSelectedPropertyId('coorg');
                    onNavigate('booking-engine', { propertyId: 'coorg' });
                  }}
                  className="group relative overflow-hidden rounded-2xl flex flex-col justify-end p-5 border border-white/20 bg-gradient-to-t from-black/85 via-black/40 to-transparent hover:border-emerald-400 transition-all duration-300 cursor-pointer min-h-[220px] sm:min-h-[320px]"
                >
                  <img
                    src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"
                    alt="Coorg"
                    className="absolute inset-0 w-full h-full object-cover -z-10 group-hover:scale-110 transition-transform duration-700 brightness-[0.75]"
                  />
                  <div className="absolute top-4 right-4 text-emerald-300 font-mono text-xl font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                    01
                  </div>
                  <div className="relative z-10">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold block">
                      Karnataka
                    </span>
                    <h3 className="text-white font-serif text-lg sm:text-xl font-bold mt-1">
                      Kaveri Riverside
                    </h3>
                    <p className="text-white/80 text-[11px] mt-1.5 leading-relaxed line-clamp-2">
                      Riverside cottages & coffee plantation retreat in Coorg.
                    </p>
                    <div className="mt-3 h-[2px] w-0 group-hover:w-full bg-emerald-400 transition-all duration-500" />
                  </div>
                </div>

                {/* 02 Ooty */}
                <div
                  onClick={() => {
                    setSelectedPropertyId('ooty');
                    onNavigate('booking-engine', { propertyId: 'ooty' });
                  }}
                  className="group relative overflow-hidden rounded-2xl flex flex-col justify-end p-5 border border-white/20 bg-gradient-to-t from-black/85 via-black/40 to-transparent hover:border-emerald-400 transition-all duration-300 cursor-pointer min-h-[220px] sm:min-h-[320px]"
                >
                  <img
                    src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80"
                    alt="Ooty"
                    className="absolute inset-0 w-full h-full object-cover -z-10 group-hover:scale-110 transition-transform duration-700 brightness-[0.75]"
                  />
                  <div className="absolute top-4 right-4 text-emerald-300 font-mono text-xl font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                    02
                  </div>
                  <div className="relative z-10">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold block">
                      Tamil Nadu
                    </span>
                    <h3 className="text-white font-serif text-lg sm:text-xl font-bold mt-1">
                      Kaveri Hilltop
                    </h3>
                    <p className="text-white/80 text-[11px] mt-1.5 leading-relaxed line-clamp-2">
                      Highland heritage manor in misty tea valleys of Ooty.
                    </p>
                    <div className="mt-3 h-[2px] w-0 group-hover:w-full bg-emerald-400 transition-all duration-500" />
                  </div>
                </div>

                {/* 03 Alleppey */}
                <div
                  onClick={() => {
                    setSelectedPropertyId('alleppey');
                    onNavigate('booking-engine', { propertyId: 'alleppey' });
                  }}
                  className="group relative overflow-hidden rounded-2xl flex flex-col justify-end p-5 border border-white/20 bg-gradient-to-t from-black/85 via-black/40 to-transparent hover:border-emerald-400 transition-all duration-300 cursor-pointer min-h-[220px] sm:min-h-[320px]"
                >
                  <img
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
                    alt="Alleppey"
                    className="absolute inset-0 w-full h-full object-cover -z-10 group-hover:scale-110 transition-transform duration-700 brightness-[0.75]"
                  />
                  <div className="absolute top-4 right-4 text-emerald-300 font-mono text-xl font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                    03
                  </div>
                  <div className="relative z-10">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold block">
                      Kerala
                    </span>
                    <h3 className="text-white font-serif text-lg sm:text-xl font-bold mt-1">
                      Kaveri Backwater
                    </h3>
                    <p className="text-white/80 text-[11px] mt-1.5 leading-relaxed line-clamp-2">
                      Lagoon villas with private luxury houseboats in Alleppey.
                    </p>
                    <div className="mt-3 h-[2px] w-0 group-hover:w-full bg-emerald-400 transition-all duration-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Stats Ticker Strip */}
            <div className="relative z-10 bg-black/30 border-t border-white/10 px-6 sm:px-8 py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-8 sm:space-x-12">
                <div>
                  <div className="text-emerald-300 text-lg font-serif font-bold">4.9 / 5</div>
                  <div className="text-white/70 text-[10px] uppercase tracking-wider font-semibold">Guest Rating</div>
                </div>
                <div>
                  <div className="text-emerald-300 text-lg font-serif font-bold">120+</div>
                  <div className="text-white/70 text-[10px] uppercase tracking-wider font-semibold">Luxury Villas</div>
                </div>
                <div>
                  <div className="text-emerald-300 text-lg font-serif font-bold">100% Eco</div>
                  <div className="text-white/70 text-[10px] uppercase tracking-wider font-semibold">Regenerative</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('booking-engine')}
                  className="text-xs uppercase tracking-wider font-semibold text-emerald-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Explore Sanctuaries</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Brand Story & Philosophy Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Image Composition */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80"
                  alt="Kaveri Stays Philosophy"
                  className="w-full h-[460px] object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 p-6 rounded-2xl bg-emerald-900 text-white max-w-xs shadow-2xl hidden sm:block border border-emerald-600/40">
                <div className="text-2xl font-serif font-bold text-emerald-300">100% Organic</div>
                <div className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                  Estate-harvested coffees, fresh cardamom, farm-to-table cuisine, and zero single-use plastics.
                </div>
              </div>
            </div>

            {/* Narrative */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Our Heritage & Ethos</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-white leading-tight">
                Rooted in South India's Soul, Crafted for the Discerning Traveller.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Kaveri Stays was born from an intimate reverence for the sacred waters of South India—from the Brahmagiri mist where the river Kaveri originates in Coorg, to the highland tea knolls of the Nilgiris, and the serene coastal lagoons of Kerala.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Coffee className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <div className="font-serif font-bold text-sm text-slate-900 dark:text-white">Farm to Table</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Estate culinary rituals with master chefs.</div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Trees className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <div className="font-serif font-bold text-sm text-slate-900 dark:text-white">Biodiverse Land</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">120+ acres of private preserved flora.</div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Waves className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <div className="font-serif font-bold text-sm text-slate-900 dark:text-white">Solar Houseboats</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Zero-emission luxury lake cruising.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Destination Showcase Cards */}
      <section id="destinations" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              <span>Three Premier Sanctuaries</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-white">
              Explore Our Signature Destinations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Each destination captures the architectural integrity, authentic gastronomy, and untouched natural grandeur of its geography.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {properties.map((prop) => (
              <Card
                key={prop.id}
                className="group overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between bg-white dark:bg-slate-900"
              >
                <div>
                  {/* Image with zoom effect */}
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={prop.heroImage}
                      alt={prop.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <Badge variant="emerald" className="backdrop-blur-md">
                        {prop.state}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1 border border-white/20">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{prop.rating}</span>
                      <span className="text-slate-300 text-[10px]">({prop.reviewCount})</span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="text-2xl font-serif font-bold leading-tight">{prop.name}</h3>
                      <p className="text-xs text-slate-200 line-clamp-1">{prop.tagline}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {prop.description}
                    </p>

                    {/* Amenities pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {prop.amenities.slice(0, 3).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                        >
                          {amenity}
                        </span>
                      ))}
                      {prop.amenities.length > 3 && (
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-500">
                          +{prop.amenities.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      <span className="font-bold text-slate-900 dark:text-white">Signature Ritual:</span> {prop.signatureExperience}
                    </div>
                  </div>
                </div>

                {/* Footer Price & CTAs */}
                <div className="p-6 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Starting from</span>
                    <span className="text-lg font-serif font-bold text-emerald-700 dark:text-emerald-400">
                      {formatINR(prop.startingRate)}
                    </span>
                    <span className="text-[10px] text-slate-400"> / night</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActivePropertyModal(prop)}
                      className="text-xs"
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
                      className="text-xs"
                    >
                      Book Stay
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Room Types Carousel / Showcase */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <BedDouble className="w-3.5 h-3.5" />
              <span>Architectural Living</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-white">
              Boutique Room & Villa Categories
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Tailored accommodations balancing ancestral woodwork with state-of-the-art climate control, soaking tubs, and butler service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {ROOM_TYPES_DATA.map((room) => (
              <Card
                key={room.id}
                className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-56">
                    <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3">
                      <Badge variant="emerald">{room.features[0]}</Badge>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-white text-xs font-serif font-bold border border-white/10">
                      {formatINR(room.basePrice)} <span className="text-[10px] font-sans font-normal">/ night</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white">{room.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {room.features[1]}</span>
                        <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {room.bedConfig.split('(')[0]}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{room.description}</p>

                    {/* Inclusions */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Included with Stay:</div>
                      <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        {room.inclusions.slice(0, 3).map((inc, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      onNavigate('booking-engine', { roomCategory: room.id });
                    }}
                    className="w-full text-xs font-semibold uppercase tracking-wider"
                  >
                    Select {room.name.split(' ')[0]}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Verified Guest Reviews / Social Proof */}
      <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              <span>Verified Patron Experiences</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-white">
              Words from Our Honoured Guests
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Read authentic memoirs from leaders, artists, and families who have found sanctuary at Kaveri Stays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS_DATA.map((t) => (
              <Card
                key={t.id}
                className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-4 relative flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <h4 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                    "{t.title}"
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{t.comment}"
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.guestName}
                    className="w-10 h-10 rounded-full object-cover border border-emerald-400/40"
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{t.guestName}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.guestLocation}</div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">{t.propertyName}</div>
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

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
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
                    className="h-24 w-full object-cover rounded-xl border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity"
                  />
                ))}
              </div>
            </div>

            {/* Amenities & Signature Ritual */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                Curated Amenities & Inclusions
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300">
                {activePropertyModal.amenities.map((am, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{am}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs text-slate-500">From </span>
                <span className="text-xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
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
