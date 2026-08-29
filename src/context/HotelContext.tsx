import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Property,
  PropertyId,
  RoomCategory,
  RoomUnit,
  RoomStatus,
  Booking,
  BookingStatus,
  PaymentMethod,
  PropertyAnalytics,
  ChainExecutiveMetrics,
  Review,
} from '../types';
import {
  INITIAL_PROPERTIES,
  ROOM_TYPES_DATA,
  INITIAL_ROOM_UNITS,
  INITIAL_BOOKINGS,
  MOCK_PROPERTY_ANALYTICS,
} from '../data/mockData';
import { generateVoucherCode, generateIdempotencyKey } from '../lib/utils';
import { useAuth } from './AuthContext';

interface CreateBookingParams {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyId: PropertyId;
  roomCategory: RoomCategory;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestsCount: number;
  nightlyRate: number;
  totalAmount: number;
  depositAmount: number;
  paymentMethod: PaymentMethod;
  specialRequests?: string;
}

interface HotelContextType {
  properties: Property[];
  selectedPropertyId: PropertyId;
  setSelectedPropertyId: (id: PropertyId) => void;
  selectedProperty: Property;
  roomUnits: RoomUnit[];
  bookings: Booking[];
  analytics: Record<string, PropertyAnalytics>;
  chainMetrics: ChainExecutiveMetrics;

  // Booking operations
  createBooking: (params: CreateBookingParams) => Promise<Booking>;
  checkInGuest: (bookingId: string) => Promise<{ success: boolean; keycard?: { cardNumber: string; pin: string }; error?: string }>;
  checkOutGuest: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
  takePayment: (bookingId: string, amount: number, method: PaymentMethod, idempotencyKey?: string) => Promise<{ success: boolean; error?: string }>;
  cancelBooking: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
  submitReview: (bookingId: string, rating: number, comment: string) => Promise<{ success: boolean; error?: string }>;
  
  // Room inventory operations
  updateRoomStatus: (propertyId: PropertyId, roomNumber: string, status: RoomStatus) => void;
  createWalkInReservation: (data: {
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    propertyId: PropertyId;
    roomNumber: string;
    nights: number;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    specialRequests?: string;
  }) => Promise<Booking>;

  // Filters & Queries
  getPropertyBookings: (propertyId?: PropertyId) => Booking[];
  getGuestBookings: (guestEmail?: string) => Booking[];
  getAvailableRoomsForCategory: (propertyId: PropertyId, category: RoomCategory) => RoomUnit[];
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

const STORAGE_KEY_ROOMS = 'kaveri_stays_rooms';
const STORAGE_KEY_BOOKINGS = 'kaveri_stays_bookings';

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [properties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [selectedPropertyId, setSelectedPropertyId] = useState<PropertyId>('coorg');

  const [roomUnits, setRoomUnits] = useState<RoomUnit[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROOMS);
      return stored ? JSON.parse(stored) : INITIAL_ROOM_UNITS;
    } catch {
      return INITIAL_ROOM_UNITS;
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BOOKINGS);
      return stored ? JSON.parse(stored) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  });

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(roomUnits));
  }, [roomUnits]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  }, [bookings]);

  // Set default selected property if scoped user logs in
  useEffect(() => {
    if (user?.propertyId) {
      setSelectedPropertyId(user.propertyId);
    }
  }, [user]);

  const selectedProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || properties[0];
  }, [properties, selectedPropertyId]);

  const getAvailableRoomsForCategory = (propertyId: PropertyId, category: RoomCategory) => {
    return roomUnits.filter(
      (r) => r.propertyId === propertyId && r.category === category && r.status === 'available'
    );
  };

  const createBooking = async (params: CreateBookingParams): Promise<Booking> => {
    // Find available room
    const available = getAvailableRoomsForCategory(params.propertyId, params.roomCategory);
    const assignedRoomNumber = available.length > 0 ? available[0].number : undefined;

    const voucherCode = generateVoucherCode();
    const idempotencyKey = generateIdempotencyKey();

    const isFullPaid = params.depositAmount >= params.totalAmount;
    const paidAmount = params.depositAmount;
    const outstandingBalance = Math.max(0, params.totalAmount - paidAmount);

    const newBooking: Booking = {
      id: `b-${Date.now()}`,
      voucherCode,
      guestId: user?.id || `guest-${Date.now()}`,
      guestName: params.guestName,
      guestEmail: params.guestEmail,
      guestPhone: params.guestPhone,
      propertyId: params.propertyId,
      roomCategory: params.roomCategory,
      roomNumber: assignedRoomNumber,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      nights: params.nights,
      guestsCount: params.guestsCount,
      nightlyRate: params.nightlyRate,
      totalAmount: params.totalAmount,
      paidAmount,
      depositAmount: params.depositAmount,
      outstandingBalance,
      paymentMethod: params.paymentMethod,
      paymentStatus: isFullPaid ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
      status: 'confirmed',
      specialRequests: params.specialRequests,
      idempotencyKey,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setBookings((prev) => [newBooking, ...prev]);

    return newBooking;
  };

  const checkInGuest = async (
    bookingId: string
  ): Promise<{ success: boolean; keycard?: { cardNumber: string; pin: string }; error?: string }> => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return { success: false, error: 'Booking reference not found.' };
    }

    if (booking.status === 'checked_in') {
      return { success: false, error: 'Guest is already checked in.' };
    }

    // Determine room number
    let roomNum = booking.roomNumber;
    if (!roomNum) {
      const avail = getAvailableRoomsForCategory(booking.propertyId, booking.roomCategory);
      if (avail.length === 0) {
        return { success: false, error: 'No cleaned rooms currently available in this category.' };
      }
      roomNum = avail[0].number;
    }

    const keycardCode = `RFID-${booking.propertyId.toUpperCase().slice(0, 3)}-${roomNum}-${Math.random()
      .toString(36)
      .substring(2, 4)
      .toUpperCase()}`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    // Update room unit status to occupied
    setRoomUnits((prev) =>
      prev.map((r) => {
        if (r.propertyId === booking.propertyId && r.number === roomNum) {
          return {
            ...r,
            status: 'occupied',
            currentGuest: booking.guestName,
            checkoutDate: booking.checkOutDate,
          };
        }
        return r;
      })
    );

    // Update booking
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            roomNumber: roomNum,
            status: 'checked_in',
            keyCardIssued: {
              cardNumber: keycardCode,
              pin,
              issuedAt: new Date().toLocaleString(),
            },
          };
        }
        return b;
      })
    );

    return {
      success: true,
      keycard: {
        cardNumber: keycardCode,
        pin,
      },
    };
  };

  const checkOutGuest = async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return { success: false, error: 'Booking record not found.' };
    }

    // Strict validation of zero outstanding balance
    if (booking.outstandingBalance > 0) {
      return {
        success: false,
        error: `Cannot complete checkout: Outstanding balance of ₹${booking.outstandingBalance.toLocaleString()} must be settled first.`,
      };
    }

    // Mark room as turnover
    if (booking.roomNumber) {
      setRoomUnits((prev) =>
        prev.map((r) => {
          if (r.propertyId === booking.propertyId && r.number === booking.roomNumber) {
            return {
              ...r,
              status: 'turnover',
              currentGuest: undefined,
              checkoutDate: undefined,
              cleanlinessScore: 65,
            };
          }
          return r;
        })
      );
    }

    // Transition booking to checked_out
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'checked_out' as BookingStatus } : b))
    );

    return { success: true };
  };

  const takePayment = async (
    bookingId: string,
    amount: number,
    method: PaymentMethod,
    idempotencyKey?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    const newPaid = booking.paidAmount + amount;
    const newBalance = Math.max(0, booking.totalAmount - newPaid);

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            paidAmount: newPaid,
            outstandingBalance: newBalance,
            paymentMethod: method,
            paymentStatus: newBalance === 0 ? 'paid' : 'partial',
            idempotencyKey: idempotencyKey || b.idempotencyKey,
          };
        }
        return b;
      })
    );

    return { success: true };
  };

  const cancelBooking = async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return { success: false, error: 'Booking not found.' };

    if (booking.roomNumber && booking.status === 'checked_in') {
      setRoomUnits((prev) =>
        prev.map((r) => {
          if (r.propertyId === booking.propertyId && r.number === booking.roomNumber) {
            return { ...r, status: 'available', currentGuest: undefined };
          }
          return r;
        })
      );
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b))
    );

    return { success: true };
  };

  const submitReview = async (
    bookingId: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; error?: string }> => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return { success: false, error: 'Booking not found.' };

    const newReview: Review = {
      rating,
      comment,
      date: new Date().toISOString().split('T')[0],
      guestName: booking.guestName,
    };

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, review: newReview } : b))
    );

    return { success: true };
  };

  const updateRoomStatus = (propertyId: PropertyId, roomNumber: string, status: RoomStatus) => {
    setRoomUnits((prev) =>
      prev.map((r) => {
        if (r.propertyId === propertyId && r.number === roomNumber) {
          return {
            ...r,
            status,
            cleanlinessScore: status === 'available' ? 100 : status === 'turnover' ? 65 : r.cleanlinessScore,
            lastCleaned: status === 'available' ? 'Just now' : r.lastCleaned,
            currentGuest: status === 'available' || status === 'turnover' ? undefined : r.currentGuest,
          };
        }
        return r;
      })
    );
  };

  const createWalkInReservation = async (data: {
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    propertyId: PropertyId;
    roomNumber: string;
    nights: number;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    specialRequests?: string;
  }): Promise<Booking> => {
    const room = roomUnits.find((r) => r.propertyId === data.propertyId && r.number === data.roomNumber);
    const category: RoomCategory = room ? room.category : 'standard';
    const rateInfo = ROOM_TYPES_DATA.find((rt) => rt.id === category);
    const nightlyRate = rateInfo ? rateInfo.basePrice : 14500;
    const totalAmount = nightlyRate * data.nights;
    const balance = Math.max(0, totalAmount - data.paidAmount);

    const todayStr = new Date().toISOString().split('T')[0];
    const checkoutDate = new Date(Date.now() + data.nights * 86400000).toISOString().split('T')[0];

    const newBooking: Booking = {
      id: `walkin-${Date.now()}`,
      voucherCode: generateVoucherCode(),
      guestId: `walkin-guest-${Date.now()}`,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      propertyId: data.propertyId,
      roomCategory: category,
      roomNumber: data.roomNumber,
      checkInDate: todayStr,
      checkOutDate: checkoutDate,
      nights: data.nights,
      guestsCount: 2,
      nightlyRate,
      totalAmount,
      paidAmount: data.paidAmount,
      depositAmount: data.paidAmount,
      outstandingBalance: balance,
      paymentMethod: data.paymentMethod,
      paymentStatus: balance === 0 ? 'paid' : 'partial',
      status: 'checked_in',
      specialRequests: data.specialRequests || 'Walk-in express check-in',
      idempotencyKey: generateIdempotencyKey(),
      createdAt: todayStr,
      keyCardIssued: {
        cardNumber: `RFID-${data.propertyId.toUpperCase().slice(0, 3)}-${data.roomNumber}-W`,
        pin: Math.floor(1000 + Math.random() * 9000).toString(),
        issuedAt: new Date().toLocaleString(),
      },
    };

    // Update room unit to occupied
    setRoomUnits((prev) =>
      prev.map((r) => {
        if (r.propertyId === data.propertyId && r.number === data.roomNumber) {
          return {
            ...r,
            status: 'occupied',
            currentGuest: data.guestName,
            checkoutDate,
          };
        }
        return r;
      })
    );

    setBookings((prev) => [newBooking, ...prev]);
    return newBooking;
  };

  const getPropertyBookings = (propertyId?: PropertyId) => {
    const propId = propertyId || selectedPropertyId;
    return bookings.filter((b) => b.propertyId === propId);
  };

  const getGuestBookings = (guestEmail?: string) => {
    const email = guestEmail || user?.email;
    if (!email) return [];
    return bookings.filter((b) => b.guestEmail.toLowerCase() === email.toLowerCase());
  };

  // Dynamic analytics calculations
  const analytics = useMemo(() => {
    const result: Record<string, PropertyAnalytics> = { ...MOCK_PROPERTY_ANALYTICS };

    properties.forEach((prop) => {
      const propRooms = roomUnits.filter((r) => r.propertyId === prop.id);
      const occupiedRooms = propRooms.filter((r) => r.status === 'occupied').length;
      const totalRooms = propRooms.length || 12;
      const realOccupancy = Math.round((occupiedRooms / totalRooms) * 1000) / 10;

      const propBookings = bookings.filter((b) => b.propertyId === prop.id && b.status !== 'cancelled');
      const totalRev = propBookings.reduce((sum, b) => sum + b.paidAmount, 0);

      const baseAnalytics = MOCK_PROPERTY_ANALYTICS[prop.id];
      result[prop.id] = {
        ...baseAnalytics,
        monthlyOccupancyRate: realOccupancy > 0 ? realOccupancy : baseAnalytics.monthlyOccupancyRate,
        monthlyRevenue: baseAnalytics.monthlyRevenue + (totalRev > 0 ? totalRev * 0.2 : 0),
        totalBookings: baseAnalytics.totalBookings + propBookings.length,
      };
    });

    return result;
  }, [properties, roomUnits, bookings]);

  // Executive Chain Metrics
  const chainMetrics: ChainExecutiveMetrics = useMemo(() => {
    const coorgRev = analytics.coorg?.monthlyRevenue || 6780000;
    const ootyRev = analytics.ooty?.monthlyRevenue || 7240000;
    const alleppeyRev = analytics.alleppey?.monthlyRevenue || 9050000;
    const grandTotal = coorgRev + ootyRev + alleppeyRev;

    const totalRooms = roomUnits.length || 36;
    const occupiedCount = roomUnits.filter((r) => r.status === 'occupied').length;
    const overallOccupancy = Math.round((occupiedCount / totalRooms) * 1000) / 10;

    return {
      grandTotalRevenue: grandTotal,
      overallOccupancyRate: overallOccupancy || 85.9,
      totalActiveGuests: occupiedCount * 2,
      totalRoomsAcrossChain: totalRooms,
      propertyContributions: [
        {
          propertyId: 'coorg',
          propertyName: 'Kaveri Riverside (Coorg)',
          revenue: coorgRev,
          percentage: Math.round((coorgRev / grandTotal) * 100),
          occupancy: analytics.coorg?.monthlyOccupancyRate || 86.4,
        },
        {
          propertyId: 'ooty',
          propertyName: 'Kaveri Hilltop (Ooty)',
          revenue: ootyRev,
          percentage: Math.round((ootyRev / grandTotal) * 100),
          occupancy: analytics.ooty?.monthlyOccupancyRate || 82.1,
        },
        {
          propertyId: 'alleppey',
          propertyName: 'Kaveri Backwater (Alleppey)',
          revenue: alleppeyRev,
          percentage: Math.round((alleppeyRev / grandTotal) * 100),
          occupancy: analytics.alleppey?.monthlyOccupancyRate || 89.2,
        },
      ],
    };
  }, [analytics, roomUnits]);

  return (
    <HotelContext.Provider
      value={{
        properties,
        selectedPropertyId,
        setSelectedPropertyId,
        selectedProperty,
        roomUnits,
        bookings,
        analytics,
        chainMetrics,
        createBooking,
        checkInGuest,
        checkOutGuest,
        takePayment,
        cancelBooking,
        submitReview,
        updateRoomStatus,
        createWalkInReservation,
        getPropertyBookings,
        getGuestBookings,
        getAvailableRoomsForCategory,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};
