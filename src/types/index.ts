export type UserRole = 'guest' | 'staff' | 'manager' | 'owner';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  propertyId?: PropertyId; // for staff/manager scoped to property
  avatarUrl?: string;
  lifetimeNights?: number;
  totalSpent?: number;
}

export type PropertyId = 'coorg' | 'ooty' | 'alleppey';

export interface Property {
  id: PropertyId;
  name: string;
  tagline: string;
  state: 'Karnataka' | 'Tamil Nadu' | 'Kerala';
  location: string;
  description: string;
  heroImage: string;
  galleryImages: string[];
  startingRate: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  highlights: string[];
  signatureExperience: string;
  totalRooms: number;
}

export type RoomCategory = 'standard' | 'deluxe' | 'suite';

export interface RoomTypeInfo {
  id: RoomCategory;
  name: string;
  propertyId: PropertyId;
  basePrice: number;
  maxGuests: number;
  sizeSqFt: number;
  bedConfig: string;
  description: string;
  image: string;
  inclusions: string[];
  features: string[];
}

export type RoomStatus = 'available' | 'occupied' | 'turnover';

export interface RoomUnit {
  number: string;
  category: RoomCategory;
  propertyId: PropertyId;
  status: RoomStatus;
  currentGuest?: string;
  checkoutDate?: string;
  cleanlinessScore: number;
  lastCleaned?: string;
}

export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type PaymentMethod = 'Credit/Debit Card' | 'UPI' | 'Net Banking' | 'Pay at Hotel';

export interface Review {
  rating: number;
  comment: string;
  date: string;
  guestName: string;
  guestLocation?: string;
}

export interface Booking {
  id: string;
  voucherCode: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyId: PropertyId;
  roomCategory: RoomCategory;
  roomNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestsCount: number;
  nightlyRate: number;
  totalAmount: number;
  paidAmount: number;
  depositAmount: number;
  outstandingBalance: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'partial' | 'pending';
  status: BookingStatus;
  specialRequests?: string;
  idempotencyKey?: string;
  createdAt: string;
  keyCardIssued?: {
    cardNumber: string;
    pin: string;
    issuedAt: string;
  };
  review?: Review;
}

export interface PropertyAnalytics {
  propertyId: PropertyId;
  propertyName: string;
  monthlyOccupancyRate: number; // e.g. 84.5
  adr: number; // Average Daily Rate in INR
  revpar: number; // Revenue Per Available Room in INR
  monthlyRevenue: number;
  totalBookings: number;
  activeGuests: number;
  monthlyTrend: {
    month: string;
    revenue: number;
    occupancy: number;
    adr: number;
  }[];
}

export interface ChainExecutiveMetrics {
  grandTotalRevenue: number;
  overallOccupancyRate: number;
  totalActiveGuests: number;
  totalRoomsAcrossChain: number;
  propertyContributions: {
    propertyId: PropertyId;
    propertyName: string;
    revenue: number;
    percentage: number;
    occupancy: number;
  }[];
}
