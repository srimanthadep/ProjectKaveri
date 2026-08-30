import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Mic, Sparkles, Calendar, Users, CreditCard, Building } from 'lucide-react';
import geminiLogo from '../../assets/gemini-logo.png';
import { chatWithAI, type ChatTurn } from '../../lib/aiClient';
import './GeminiAssistant.css';

interface GeminiAssistantProps {
  /** Current SPA view (e.g. "guest-dashboard", "manager-dashboard") — drives
   *  route-aware suggestions and is passed to the backend for context. */
  currentView: string;
  onNavigate: (view: string) => void;
}

interface DisplayAction {
  label: string;
  view: string;
  icon: React.ReactNode;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isError?: boolean;
  actions?: DisplayAction[];
}

const SpeechRecognitionCtor: any =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const WELCOME_MESSAGE: DisplayMessage = {
  id: 'welcome',
  role: 'model',
  content:
    "Hello! I'm your Kaveri Stays concierge. Ask me about your bookings, our sanctuaries, or how to get around the site.",
  timestamp: new Date(),
};

/** Route-aware starter prompts, keyed off the SPA's currentView string
 *  (this app has no react-router — currentView is the source of truth). */
function getSuggestions(view: string): { text: string; prompt: string }[] {
  if (view === 'guest-dashboard' || view === 'guest-bookings' || view === 'booking-engine') {
    return [
      { text: 'When is my next stay?', prompt: 'When is my next upcoming booking, and at which property?' },
      { text: 'How do I cancel a booking?', prompt: 'How do I cancel one of my reservations?' },
      { text: 'What is included in my rate?', prompt: 'What amenities and experiences are included in a standard booking?' },
    ];
  }
  if (view === 'staff-dashboard') {
    return [
      { text: "Today's check-ins", prompt: 'How many confirmed bookings are expected to check in soon at my property?' },
      { text: 'How do I check in a guest?', prompt: 'Walk me through checking in a guest at the front desk.' },
      { text: 'Recording a payment', prompt: 'How do I record a new payment instalment for a booking?' },
    ];
  }
  if (view === 'manager-dashboard') {
    return [
      { text: 'Property occupancy summary', prompt: 'Give me a quick summary of my property\'s current room count and active bookings.' },
      { text: 'How is ADR calculated?', prompt: 'How is the Average Daily Rate (ADR) metric calculated for my property?' },
      { text: 'Room turnover status', prompt: 'How do I mark a room as ready after a guest checks out?' },
    ];
  }
  if (view === 'owner-dashboard') {
    return [
      { text: 'Chain-wide performance', prompt: 'Give me a summary of active bookings and room counts across all three properties.' },
      { text: 'Compare property occupancy', prompt: 'How can I compare occupancy across Coorg, Ooty, and Alleppey?' },
      { text: 'Revenue reporting', prompt: 'What revenue reports are available to me as an owner?' },
    ];
  }
  return [
    { text: 'Book a sanctuary', prompt: 'How do I book a stay at one of the Kaveri properties?' },
    { text: 'What are the check-in times?', prompt: 'What are the check-in and check-out times across Kaveri properties?' },
    { text: 'Tell me about the properties', prompt: 'Give me an overview of the three Kaveri Stays properties.' },
  ];
}

/** Parses keywords in the AI's reply into quick in-app navigation buttons.
 *  Uses the SPA's `onNavigate(view)` prop so clicks switch pages cleanly. */
function buildActionsFromReply(reply: string): DisplayAction[] {
  const lower = reply.toLowerCase();
  const actions: DisplayAction[] = [];

  if (lower.includes('booking') || lower.includes('reservation') || lower.includes('stay')) {
    actions.push({ label: 'My bookings', view: 'guest-bookings', icon: <Calendar className="h-3.5 w-3.5" /> });
  }
  if (lower.includes('payment') || lower.includes('deposit') || lower.includes('invoice')) {
    actions.push({ label: 'Reserve a stay', view: 'booking-engine', icon: <CreditCard className="h-3.5 w-3.5" /> });
  }
  if (lower.includes('property') || lower.includes('sanctuary') || lower.includes('sanctuaries')) {
    actions.push({ label: 'View properties', view: 'landing', icon: <Building className="h-3.5 w-3.5" /> });
  }
  if (lower.includes('guest directory') || lower.includes('guest record')) {
    actions.push({ label: 'Front desk', view: 'staff-dashboard', icon: <Users className="h-3.5 w-3.5" /> });
  }

  const seen = new Set<string>();
  return actions.filter((a) => (seen.has(a.view) ? false : (seen.add(a.view), true))).slice(0, 2);
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ currentView, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!SpeechRecognitionCtor) return;
    const rec = new SpeechRecognitionCtor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      window.alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const suggestions = useMemo(() => getSuggestions(currentView), [currentView]);

  const handleSend = async (overrideText?: string) => {
    const content = (overrideText ?? inputValue).trim();
    if (!content || isThinking) return;

    if (!overrideText) setInputValue('');

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const history: ChatTurn[] = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await chatWithAI(content, history, currentView);
      const actions = buildActionsFromReply(res.data);

      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          content: res.data,
          timestamp: new Date(),
          actions: actions.length > 0 ? actions : undefined,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content:
            err?.message?.includes('unavailable')
              ? "The concierge assistant isn't configured yet — please try again later or contact the front desk directly."
              : 'Sorry, I ran into a connection issue reaching the concierge. Please try again.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="gf-container">
      <div className={`gf-panel ${isOpen ? 'gf-open' : ''}`} role="dialog" aria-label="Kaveri AI concierge" aria-hidden={!isOpen}>
        <div className="gf-header">
          <div className="gf-header-title">
            <span className="gf-header-avatar">
              <img src={geminiLogo} alt="" />
            </span>
            <div>
              <span className="gf-header-name">Kaveri Concierge</span>
              <p className="gf-header-sub">AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="gf-status-indicator">
              <span className="gf-status-dot" />
              Online
            </span>
            <button type="button" className="gf-close-btn" onClick={() => setIsOpen(false)} aria-label="Close assistant">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="gf-shortcuts">
          <button type="button" className="gf-shortcut-chip" onClick={() => onNavigate('landing')}>
            Home
          </button>
          <button type="button" className="gf-shortcut-chip" onClick={() => onNavigate('booking-engine')}>
            Reserve
          </button>
          <button type="button" className="gf-shortcut-chip" onClick={() => onNavigate('guest-bookings')}>
            My Stays
          </button>
        </div>

        <div className="gf-messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`gf-message ${message.role}`}>
              <div className={`gf-bubble ${message.isError ? 'gf-bubble-error' : ''}`}>
                <p style={{ margin: 0 }}>{message.content}</p>
                {message.actions && (
                  <div className="gf-bubble-actions">
                    {message.actions.map((action) => (
                      <button
                        key={action.view}
                        type="button"
                        className="gf-bubble-action"
                        onClick={() => onNavigate(action.view)}
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="gf-message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {isThinking && (
            <div className="gf-message model">
              <div className="gf-bubble">
                <div className="gf-typing">
                  <span className="gf-typing-dot" />
                  <span className="gf-typing-dot" />
                  <span className="gf-typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Starter suggestions — only show before the first prompt */}
        {messages.length <= 1 && !isThinking && (
          <div className="gf-suggestions">
            <span className="gf-suggestions-title">
              <Sparkles className="h-3 w-3" />
              Suggested questions
            </span>
            <div className="gf-chips-wrapper">
              {suggestions.map((s) => (
                <button key={s.text} type="button" className="gf-chip" onClick={() => handleSend(s.prompt)}>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="gf-footer">
          <div className="gf-input-row">
            <div className="gf-input-wrapper">
              <input
                className="gf-input"
                placeholder="Ask the concierge anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isThinking}
              />
              <button
                type="button"
                className={`gf-voice-btn ${isListening ? 'active' : ''}`}
                onClick={toggleListening}
                disabled={isThinking}
                title="Voice input"
              >
                <Mic className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              className="gf-send-btn"
              onClick={() => handleSend()}
              disabled={isThinking || !inputValue.trim()}
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="gf-disclaimer">AI can make mistakes. Verify important details.</p>
        </div>
      </div>

      <button
        type="button"
        className={`gf-trigger ${isThinking ? 'gf-thinking' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        <img src={geminiLogo} alt="Gemini AI" className="gf-logo-img" />
      </button>
    </div>
  );
};
