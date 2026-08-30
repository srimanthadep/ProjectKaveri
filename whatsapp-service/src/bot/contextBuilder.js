import { getGuestBookings, getBookingPayments } from '../kaveriClient.js';

const PROPERTY_NAMES = {
  1: 'Kaveri Riverside (Coorg)',
  2: 'Kaveri Hilltop (Ooty)',
  3: 'Kaveri Backwater (Alleppey)',
};

/**
 * Builds a structured, JSON-serializable context object for the Gemini AI concierge.
 * For registered guests with existing records, includes their bookings, rooms, and payments.
 * For new visitors / prospective guests, provides a clean prospective visitor context so the AI
 * can answer general property, amenities, rate, and booking questions.
 */
export async function buildGuestContext(guest) {
  if (!guest) {
    return {
      isRegisteredGuest: false,
      name: 'Guest',
      status: 'Visitor / Prospective Guest',
      note: 'This caller is messaging via WhatsApp. Greet warmly and answer any property, booking, or amenity questions.',
    };
  }

  const bookings = await getGuestBookings(guest.id, { limit: 5 }).catch(() => []);

  const enriched = await Promise.all(
    bookings.map(async (b) => {
      const payments = await getBookingPayments(b.id).catch(() => []);
      return {
        bookingId: b.id,
        property: PROPERTY_NAMES[b.property_id] || `Property #${b.property_id}`,
        roomNumber: b.room_number,
        checkIn: b.check_in,
        checkOut: b.check_out,
        nights: b.nights,
        guests: b.guests,
        status: b.status,
        totalAmount: b.total_amount,
        totalPaid: b.total_paid,
        balance: b.balance,
        payments: payments.map((p) => ({
          amount: p.amount,
          method: p.method,
          paidAt: p.paid_at,
        })),
      };
    })
  );

  return {
    isRegisteredGuest: true,
    name: guest.full_name,
    email: guest.email,
    phone: guest.phone,
    stayCount: guest.stay_count,
    bookings: enriched,
  };
}
