import { config } from '../config.js';

const HOTEL_INFO = {
  brand: 'Kaveri Stays',
  tagline: 'Luxury Boutique Sanctuaries across South India',
  properties: [
    {
      name: 'Kaveri Riverside',
      city: 'Coorg',
      state: 'Karnataka',
      setting: 'Nestled amidst lush coffee plantations along the serene Kaveri River.',
      experiences: ['Private coffee estate walks', 'Riverfront dining', 'Bird watching', 'Bonfire evenings'],
      rates: 'From ₹3,500/night (Standard) to ₹7,350/night (Riverfront Suite)',
    },
    {
      name: 'Kaveri Hilltop',
      city: 'Ooty',
      state: 'Tamil Nadu',
      setting: 'A heritage colonial manor atop the misty Nilgiri hills surrounded by tea gardens.',
      experiences: ['Tea tasting sessions', 'Botanical walks', 'Cozy private fireplaces', 'Panoramic mountain views'],
      rates: 'From ₹3,500/night (Standard) to ₹7,500/night (Presidential Suite)',
    },
    {
      name: 'Kaveri Backwater',
      city: 'Alleppey',
      state: 'Kerala',
      setting: 'A peaceful lakeside haven set within Kerala palm groves.',
      experiences: ['Private backwater houseboat cruises', 'Authentic Ayurvedic spa', 'Traditional Kerala dining', 'Sunset canoe tours'],
      rates: 'From ₹3,500/night (Standard) to ₹7,350/night (Lagoon Suite)',
    },
  ],
  amenities: [
    'Complimentary artisanal organic breakfast included with all stays',
    'High-speed complimentary Wi-Fi across all sanctuaries',
    '24/7 dedicated concierge assistance and front desk service',
    'Private plunge pools in select luxury suites',
    'Organic bath amenities and plush bathrobes',
  ],
  policies: {
    checkInTime: '2:00 PM (14:00)',
    checkOutTime: '11:00 AM (11:00)',
    cancellation: 'Free cancellation up to 48 hours prior to scheduled check-in date.',
  },
  supportPhone: '+91 80 4910 8800',
  reservationsEmail: 'reservations@kaveristays.com',
  website: 'http://localhost:3000',
};

function buildSystemPrompt(guestContext) {
  return `You are "Kaveri Concierge", the official AI concierge for Kaveri Stays luxury boutique hotels, replying directly to a guest over WhatsApp.

Your job is to provide warm, courteous, highly helpful, and immediate assistance to anyone who messages our WhatsApp number.

You must ALWAYS return your response in strict JSON format:
{
  "reply": "The exact WhatsApp message text to send back to the user. Use a warm hospitality tone, WhatsApp-friendly formatting (e.g. *bold* for emphasis, bullet points where suitable, and occasional friendly emojis).",
  "action": "none" | "resend_voucher" | "resend_receipt",
  "actionId": "the specific booking id the action applies to, or null if action is none"
}

KAVERI STAYS HOTEL INFORMATION:
${JSON.stringify(HOTEL_INFO, null, 2)}

CALLER CONTEXT:
${JSON.stringify(guestContext, null, 2)}

INSTRUCTIONS & RULES:
1. GREET & WELCOME: If the user says "Hello", "Hi", "Hey" or any general greeting, reply warmly with a friendly greeting (e.g., "Namaste! Welcome to Kaveri Stays Concierge. How may I assist you today?").
2. ANSWER GENERAL & PROPERTY QUESTIONS: If the user asks about our properties, locations (Coorg, Ooty, Alleppey), room types, prices/rates, check-in/out timings, food, or amenities, answer accurately from KAVERI STAYS HOTEL INFORMATION.
3. PERSONALIZED DETAILS FOR REGISTERED GUESTS: If the caller has active bookings in CALLER CONTEXT, use their stay dates, room number, or balance when they inquire about their reservation.
4. NEW / UNREGISTERED VISITORS: If the caller is not registered in the system or asks about making a reservation, welcome them and invite them to explore our sanctuaries or reserve directly at ${HOTEL_INFO.website} or call front desk at ${HOTEL_INFO.supportPhone}.
5. STRICT FACTS: Never invent reservation dates or property locations not listed above.
6. CONCISE FOR WHATSAPP: Keep replies concise (2 to 5 sentences or neat bullet points), friendly, and easy to read on mobile screens.`;
}

/**
 * Calls the Gemini REST API with strict JSON output mode.
 */
export async function askGeminiConcierge({ guestContext, userMessage, history = [] }) {
  const systemPrompt = buildSystemPrompt(guestContext);

  const contents = [
    ...history.map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.message }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 450,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini API error (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty response.');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned malformed JSON.');
  }

  return {
    reply: String(parsed.reply || '').trim() || "Namaste! Welcome to Kaveri Stays. How may I assist you with your stay today?",
    action: parsed.action === 'resend_voucher' || parsed.action === 'resend_receipt' ? parsed.action : 'none',
    actionId: parsed.actionId ?? null,
  };
}
