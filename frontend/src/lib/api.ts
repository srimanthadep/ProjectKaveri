// Centralized typed REST API client for Kaveri Stays FastAPI Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthToken(): string | null {
  try {
    return localStorage.getItem('kaveri_stays_jwt_token');
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !token.startsWith('mock-')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const body = await res.json();
      if (body.error) {
        if (typeof body.error === 'string') {
          errorDetail = body.error;
        } else if (body.error.detail && Array.isArray(body.error.detail)) {
          errorDetail = body.error.detail.map((d: any) => d.reason || d.msg || `${d.field}: ${d.reason}`).join('; ');
        } else if (body.error.message) {
          errorDetail = body.error.message;
        } else {
          errorDetail = JSON.stringify(body.error);
        }
      } else if (body.detail) {
        if (typeof body.detail === 'string') {
          errorDetail = body.detail;
        } else if (body.detail.message) {
          errorDetail = body.detail.message;
        } else if (Array.isArray(body.detail)) {
          errorDetail = body.detail.map((e: any) => e.msg || e.message || e.reason).join(', ');
        } else {
          errorDetail = JSON.stringify(body.detail);
        }
      } else if (body.message) {
        errorDetail = body.message;
      }
    } catch {
      errorDetail = `HTTP error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password?: string }) =>
      request<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password || 'DemoPassword123!',
        }),
      }),

    register: (data: { email: string; password?: string; full_name: string; phone?: string }) => {
      const payload: Record<string, any> = {
        email: data.email.trim().toLowerCase(),
        password: data.password || 'DemoPassword123!',
        full_name: data.full_name.trim(),
      };
      if (data.phone && data.phone.trim()) {
        payload.phone = data.phone.trim();
      }
      return request<{
        id: number;
        email: string;
        full_name: string;
        role: string;
        property_id: number | null;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    me: () =>
      request<{
        id: number;
        email: string;
        full_name: string;
        role: string;
        property_id: number | null;
      }>('/me'),

    logout: () => {
      const token = getAuthToken();
      if (!token) return Promise.resolve();
      return request<void>('/auth/logout', {
        method: 'POST',
      }).catch(() => {});
    },
  },

  // Properties & Inventory
  properties: {
    list: () =>
      request<{
        items: Array<{
          id: number;
          name: string;
          city: string;
          stars: number;
        }>;
      }>('/properties'),

    get: (propertyId: number | string) =>
      request<{
        id: number;
        name: string;
        city: string;
        stars: number;
      }>(`/properties/${propertyId}`),

    rooms: (propertyId: number | string, limit = 100, offset = 0) =>
      request<{
        items: Array<{
          id: number;
          property_id: number;
          room_number: string;
          room_type: {
            name: string;
            max_occupancy: number;
          };
        }>;
        meta: { limit: number; offset: number; total: number };
      }>(`/properties/${propertyId}/rooms?limit=${limit}&offset=${offset}`),

    availability: (propertyId: number | string, checkIn: string, checkOut: string, roomType?: string) => {
      const q = new URLSearchParams({
        from: checkIn,
        to: checkOut,
      });
      if (roomType) {
        q.set('room_type', roomType);
      }
      return request<{
        property_id: number;
        from_: string;
        to: string;
        items: Array<{
          room_id: number;
          room_number: string;
          room_type: {
            name: string;
            max_occupancy: number;
          };
          nights: number;
          total_rate: string;
        }>;
      }>(`/properties/${propertyId}/availability?${q.toString()}`);
    },
  },

  // Bookings
  bookings: {
    list: (params: {
      property_id?: number | string;
      status?: string;
      guest_id?: number | string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    } = {}) => {
      const q = new URLSearchParams();
      if (params.property_id) q.set('property_id', String(params.property_id));
      if (params.status) q.set('status', params.status);
      if (params.guest_id) q.set('guest_id', String(params.guest_id));
      if (params.from) q.set('from', params.from);
      if (params.to) q.set('to', params.to);
      if (params.limit) q.set('limit', String(params.limit));
      if (params.offset) q.set('offset', String(params.offset));
      return request<{
        items: Array<{
          id: number;
          property_id: number;
          room_id: number;
          room_number: string;
          guest_id: number;
          guest_name: string;
          check_in: string;
          check_out: string;
          nights: number;
          guests: number;
          status: string;
          total_amount: string;
          total_paid: string;
          balance: string;
          created_at: string;
        }>;
        meta: { limit: number; offset: number; total: number };
      }>(`/bookings?${q.toString()}`);
    },

    get: (bookingId: number | string) =>
      request<{
        id: number;
        property_id: number;
        room_id: number;
        room_number: string;
        guest_id: number;
        guest_name: string;
        check_in: string;
        check_out: string;
        nights: number;
        guests: number;
        status: string;
        total_amount: string;
        total_paid: string;
        balance: string;
        created_at: string;
      }>(`/bookings/${bookingId}`),

    create: (data: {
      room_id: number;
      check_in: string;
      check_out: string;
      guests: number;
      guest_id?: number;
      deposit?: {
        amount: string;
        method: 'card' | 'upi' | 'bank_transfer' | 'cash';
        idempotency_key?: string;
      };
    }) =>
      request<any>('/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    checkIn: (bookingId: number | string) =>
      request<any>(`/bookings/${bookingId}/check-in`, {
        method: 'POST',
      }),

    checkOut: (bookingId: number | string) =>
      request<any>(`/bookings/${bookingId}/check-out`, {
        method: 'POST',
      }),

    cancel: (bookingId: number | string) =>
      request<any>(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
      }),
  },

  // Payments
  payments: {
    list: (bookingId: number | string) =>
      request<{
        items: Array<{
          id: number;
          booking_id: number;
          amount: string;
          method: string;
          reference: string | null;
          paid_at: string;
        }>;
        total_paid: string;
        balance: string;
      }>(`/bookings/${bookingId}/payments`),

    create: (data: {
      booking_id: number;
      amount: string | number;
      method: 'card' | 'upi' | 'bank_transfer' | 'cash';
      reference?: string;
      idempotency_key?: string;
    }) => {
      const idempotencyKey = data.idempotency_key || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return request<any>(`/bookings/${data.booking_id}/payments`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount: String(data.amount),
          method: data.method,
          reference: data.reference || null,
        }),
      });
    },
  },

  // Reviews
  reviews: {
    list: (propertyId: number | string, params: { limit?: number; offset?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.limit) q.set('limit', String(params.limit));
      if (params.offset) q.set('offset', String(params.offset));
      return request<{
        items: Array<{
          id: number;
          booking_id: number;
          rating: number;
          comment: string | null;
          guest_name: string | null;
          created_at: string;
        }>;
        meta: { limit: number; offset: number; total: number };
      }>(`/properties/${propertyId}/reviews?${q.toString()}`);
    },

    create: (data: { booking_id: number; rating: number; comment: string }) =>
      request<any>(`/bookings/${data.booking_id}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating: data.rating, comment: data.comment }),
      }),
  },

  // Guests
  guests: {
    list: (params: { email?: string; phone?: string; limit?: number; offset?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.email) q.set('email', params.email);
      if (params.phone) q.set('phone', params.phone);
      if (params.limit) q.set('limit', String(params.limit));
      if (params.offset) q.set('offset', String(params.offset));
      return request<{
        items: Array<{
          id: number;
          email: string;
          full_name: string;
          phone: string | null;
          stay_count: number;
        }>;
        meta: { limit: number; offset: number; total: number };
      }>(`/guests?${q.toString()}`);
    },
  },

  // Reports
  reports: {
    occupancy: (from: string, to: string, propertyId?: number | string) => {
      const q = new URLSearchParams({ from, to });
      if (propertyId) q.set('property_id', String(propertyId));
      return request<{
        items: Array<{
          property_id: number;
          property_name: string;
          month: string;
          room_nights_available: number;
          room_nights_sold: number;
          occupancy_pct: string;
        }>;
      }>(`/reports/occupancy?${q.toString()}`);
    },

    revenue: (from: string, to: string, propertyId?: number | string) => {
      const q = new URLSearchParams({ from, to });
      if (propertyId) q.set('property_id', String(propertyId));
      return request<{
        items: Array<{
          property_id: number;
          property_name: string;
          month: string;
          revenue: string;
        }>;
      }>(`/reports/revenue?${q.toString()}`);
    },
  },
};
