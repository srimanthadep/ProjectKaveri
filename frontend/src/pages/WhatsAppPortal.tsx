import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  QrCode,
  MessageSquare,
  Send,
  RefreshCw,
  LogOut,
  CheckCheck,
  Check,
  Clock,
  Sparkles,
  Smartphone,
  Radio,
  Search,
  Users,
  Bot,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Copy,
  Zap,
  ArrowRight,
  PhoneCall,
  History,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import {
  WhatsAppStatus,
  WaChat,
  WaMessage,
  WaLogItem,
  getWhatsAppStatus,
  initWhatsAppConnection,
  logoutWhatsApp,
  listWaChats,
  listWaMessages,
  sendWaMessage,
  markWaChatRead,
  sendWaBroadcast,
  listWaOutboundLog,
  WHATSAPP_SERVICE_URL,
} from '../lib/whatsappClient';

interface WhatsAppPortalProps {
  onNavigate: (view: string, extraData?: any) => void;
}

type TabType = 'pairing' | 'inbox' | 'broadcast' | 'ai-bot';

export const WhatsAppPortal: React.FC<WhatsAppPortalProps> = ({ onNavigate }) => {
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('pairing');
  const [status, setStatus] = useState<WhatsAppStatus>({
    status: 'disconnected',
    qr: null,
    botEnabled: true,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Inbox state
  const [chats, setChats] = useState<WaChat[]>([]);
  const [selectedChatJid, setSelectedChatJid] = useState<string | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Broadcast state
  const [broadcastPhone, setBroadcastPhone] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [outboundLogs, setOutboundLogs] = useState<WaLogItem[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // AI simulator state
  const [simulatedPrompt, setSimulatedPrompt] = useState('Do you have room available in Coorg next weekend?');
  const [simulatedReply, setSimulatedReply] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial status and data
  const refreshStatus = async () => {
    try {
      const s = await getWhatsAppStatus();
      setStatus(s);
    } catch (err: any) {
      console.warn('Status check failed:', err);
    }
  };

  const refreshChats = async () => {
    try {
      const items = await listWaChats();
      setChats(items);
      if (items.length > 0 && !selectedChatJid) {
        setSelectedChatJid(items[0].jid);
      }
    } catch (err) {
      console.warn('Failed to load chats:', err);
    }
  };

  const refreshLogs = async () => {
    try {
      const logs = await listWaOutboundLog(30);
      setOutboundLogs(logs);
    } catch (err) {
      console.warn('Failed to load logs:', err);
    }
  };

  // Socket.io Real-time connection
  useEffect(() => {
    refreshStatus();
    refreshChats();
    refreshLogs();

    const socket = io(WHATSAPP_SERVICE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WhatsAppPortal] Socket.io connected to WhatsApp service');
    });

    socket.on('whatsapp:status', (newStatus: WhatsAppStatus) => {
      setStatus(newStatus);
    });

    socket.on('whatsapp:new-message', (msg: WaMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      refreshChats();
      refreshLogs();
    });

    socket.on('whatsapp:chat-update', () => {
      refreshChats();
    });

    socket.on('whatsapp:message-status', ({ id, status }: { id: string; status: any }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m))
      );
    });

    // Fallback polling for QR refresh if status is awaiting_qr
    const interval = setInterval(() => {
      refreshStatus();
      if (activeTab === 'inbox') refreshChats();
      if (activeTab === 'broadcast') refreshLogs();
    }, 3000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [activeTab]);

  // Load messages when selected chat changes
  useEffect(() => {
    if (!selectedChatJid) return;
    let isMounted = true;
    setLoadingMessages(true);
    markWaChatRead(selectedChatJid).catch(() => {});

    listWaMessages(selectedChatJid, 50)
      .then((msgs) => {
        if (isMounted) {
          setMessages(msgs);
          setLoadingMessages(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load thread messages:', err);
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChatJid]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const s = await initWhatsAppConnection();
      setStatus(s);
      success('Pairing Started', 'WhatsApp session initialized. Scan the QR code below.');
    } catch (err: any) {
      error('Connection Failed', err?.message || 'Could not reach WhatsApp service.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to disconnect and clear the WhatsApp session?')) {
      return;
    }
    try {
      await logoutWhatsApp();
      await refreshStatus();
      setChats([]);
      setMessages([]);
      setSelectedChatJid(null);
      info('Session Cleared', 'WhatsApp session has been unlinked.');
    } catch (err: any) {
      error('Logout Failed', err?.message || 'Failed to logout session.');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedChatJid || !messageInput.trim() || isSending) return;

    const text = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: WaMessage = {
      id: tempId,
      chatJid: selectedChatJid,
      senderJid: null,
      fromMe: true,
      body: text,
      type: 'text',
      mediaUrl: null,
      status: 'sent',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await sendWaMessage(selectedChatJid, text);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: res.id || tempId } : m))
      );
      refreshChats();
    } catch (err: any) {
      error('Failed to Send', err?.message || 'Message could not be delivered.');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastPhone.trim() || !broadcastText.trim() || isBroadcasting) return;

    setIsBroadcasting(true);
    try {
      await sendWaBroadcast(broadcastPhone.trim(), broadcastText.trim());
      success('Broadcast Dispatched', `Message queued for ${broadcastPhone}`);
      setBroadcastText('');
      refreshLogs();
    } catch (err: any) {
      error('Broadcast Failed', err?.message || 'Failed to send outbound message.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleSimulateAi = async () => {
    if (!simulatedPrompt.trim() || isSimulating) return;
    setIsSimulating(true);
    setSimulatedReply(null);

    try {
      const res = await fetch('http://localhost:8000/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: simulatedPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'AI request failed');
      setSimulatedReply(data.data);
    } catch (err: any) {
      setSimulatedReply(`Error: ${err?.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const applyTemplate = (text: string) => {
    setBroadcastText(text);
  };

  const filteredChats = chats.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = (c.name || c.guestName || '').toLowerCase();
    const jid = c.jid.toLowerCase();
    return name.includes(q) || jid.includes(q);
  });

  const selectedChat = chats.find((c) => c.jid === selectedChatJid);

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E7E3DA] mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#2F6154] text-white shadow-xs">
              <MessageSquare className="h-4 w-4" />
            </span>
            <span className="text-eyebrow text-[#2F6154]">Kaveri Automation Hub</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#1D3E37]">
            WhatsApp Concierge & Automation Center
          </h1>
          <p className="text-sm text-[#545B56] mt-1 max-w-2xl">
            Real-time multi-device WhatsApp gateway, live guest inbox, automated booking broadcasts, and Gemini 3.5 AI concierge engine.
          </p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#E7E3DA] bg-white px-3.5 py-2 shadow-xs">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status.status === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : status.status === 'awaiting_qr'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1D3E37]">
              {status.status === 'connected'
                ? 'Connected & Live'
                : status.status === 'awaiting_qr'
                ? 'Scan QR Code'
                : status.status === 'connecting'
                ? 'Connecting...'
                : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#E7E3DA] bg-[#F3F6F4] px-3.5 py-2 shadow-xs">
            <Bot className="h-4 w-4 text-[#2F6154]" />
            <span className="text-xs font-medium text-[#1D3E37]">
              Gemini 3.5 AI Concierge Active
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsRefreshing(true);
              await refreshStatus();
              await refreshChats();
              await refreshLogs();
              setIsRefreshing(false);
              success('Refreshed', 'WhatsApp status updated.');
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E7E3DA] mb-8 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('pairing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'pairing'
              ? 'bg-[#1D3E37] text-white shadow-xs'
              : 'text-[#545B56] hover:text-[#1D3E37] hover:bg-white'
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>Device QR & Pairing</span>
          {status.status === 'awaiting_qr' && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-amber-400 text-[#1D3E37] text-2xs font-bold animate-pulse">
              Action Required
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'inbox'
              ? 'bg-[#1D3E37] text-white shadow-xs'
              : 'text-[#545B56] hover:text-[#1D3E37] hover:bg-white'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Live Guest Inbox</span>
          {chats.some((c) => c.unreadCount > 0) && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-2xs font-bold">
              {chats.reduce((sum, c) => sum + c.unreadCount, 0)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'broadcast'
              ? 'bg-[#1D3E37] text-white shadow-xs'
              : 'text-[#545B56] hover:text-[#1D3E37] hover:bg-white'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Outbound Dispatcher & Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai-bot')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'ai-bot'
              ? 'bg-[#1D3E37] text-white shadow-xs'
              : 'text-[#545B56] hover:text-[#1D3E37] hover:bg-white'
          }`}
        >
          <Sparkles className="h-4 w-4 text-[#C59B27]" />
          <span>AI Concierge Engine</span>
        </button>
      </div>

      {/* Tab 1: QR Pairing & Device Setup */}
      {activeTab === 'pairing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: QR Display Card */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <Card className="w-full max-w-md p-8 text-center bg-white border border-[#E7E3DA] shadow-md rounded-2xl relative overflow-hidden">
              <div className="text-eyebrow text-[#C59B27] mb-2">WhatsApp Multi-Device Link</div>
              <h2 className="font-serif text-xl font-semibold text-[#1D3E37] mb-2">
                Pair Official Hotel WhatsApp
              </h2>
              <p className="text-xs text-[#545B56] mb-6">
                Scan this QR code with the official Kaveri Stays WhatsApp phone to enable real-time messaging and AI automations.
              </p>

              {/* QR Container */}
              <div className="relative mx-auto my-4 p-4 rounded-2xl border-2 border-dashed border-[#C7D6CF] bg-[#FAF8F4] flex flex-col items-center justify-center min-h-[300px] w-full max-w-[300px]">
                {status.status === 'connected' ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[#1D3E37]">
                      Successfully Paired
                    </h3>
                    <p className="text-xs text-[#545B56]">
                      Session is actively authenticated with SQLite Signal key persistence.
                    </p>
                    <Badge variant="emerald" className="mt-2">
                      Active Gateway Online
                    </Badge>
                  </div>
                ) : status.status === 'awaiting_qr' && status.qr ? (
                  <div className="relative group">
                    <img
                      src={status.qr}
                      alt="WhatsApp QR Code"
                      className="w-64 h-64 rounded-xl shadow-xs border border-[#E7E3DA] bg-white object-contain"
                    />
                    <div className="absolute inset-0 rounded-xl border-2 border-[#2F6154] pointer-events-none opacity-40 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-[#E4EBE7] text-[#2F6154] flex items-center justify-center animate-spin">
                      <RefreshCw className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-medium text-[#545B56]">
                      {status.status === 'connecting'
                        ? 'Establishing secure WhatsApp handshake...'
                        : 'Waiting for QR generation...'}
                    </p>
                  </div>
                )}
              </div>

              {/* QR Status Label */}
              <div className="mt-4 text-xs font-semibold text-[#2F6154]">
                {status.status === 'connected' && '✅ Device connected and receiving webhooks'}
                {status.status === 'awaiting_qr' && '⚡ Scan code (auto-refreshes every 20s)'}
                {status.status === 'disconnected' && '⚠️ Service disconnected — click Initialize below'}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting || status.status === 'connected'}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isConnecting ? 'animate-spin' : ''}`} />
                  {status.status === 'connected' ? 'Connected' : 'Generate Fresh QR'}
                </Button>

                {status.status === 'connected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    Unlink Device
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Step-by-Step Instructions & System Diagnostics */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="p-6 bg-white border border-[#E7E3DA] shadow-sm rounded-2xl">
              <h3 className="font-serif text-lg font-semibold text-[#1D3E37] mb-4 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[#2F6154]" />
                How to Link Your WhatsApp Device
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#E4EBE7] text-xs font-bold text-[#1D3E37]">
                    1
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#1D3E37]">Open WhatsApp</h4>
                    <p className="text-xs text-[#545B56] mt-0.5">
                      Open WhatsApp on the mobile phone registered for Kaveri front desk or reservations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#E4EBE7] text-xs font-bold text-[#1D3E37]">
                    2
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#1D3E37]">Navigate to Linked Devices</h4>
                    <p className="text-xs text-[#545B56] mt-0.5">
                      Tap <strong>Settings</strong> (iOS) or <strong>Three Dots Menu</strong> (Android) &rarr; <strong>Linked Devices</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#E4EBE7] text-xs font-bold text-[#1D3E37]">
                    3
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#1D3E37]">Scan the Screen</h4>
                    <p className="text-xs text-[#545B56] mt-0.5">
                      Tap <strong>Link a Device</strong> and point the camera viewfinder at the QR code on the left.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#E4EBE7] text-xs font-bold text-[#1D3E37]">
                    4
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#1D3E37]">Instant Synchronisation</h4>
                    <p className="text-xs text-[#545B56] mt-0.5">
                      The screen updates automatically to <strong>Connected</strong>. All incoming messages will sync to the inbox.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Diagnostics Card */}
            <Card className="p-6 bg-[#FAF8F4] border border-[#E7E3DA] rounded-2xl">
              <h3 className="text-eyebrow text-[#6F6F68] mb-3">Service Architecture Telemetry</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-[#E7E3DA]">
                  <span className="text-2xs text-[#9A958A] block">Gateway Runtime</span>
                  <span className="font-semibold text-[#1D3E37]">Baileys v6.7 Multi-Device</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E7E3DA]">
                  <span className="text-2xs text-[#9A958A] block">Local Node Service</span>
                  <span className="font-semibold text-[#1D3E37]">http://localhost:4500</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E7E3DA]">
                  <span className="text-2xs text-[#9A958A] block">Session Key Store</span>
                  <span className="font-semibold text-[#1D3E37]">SQLite WAL Mode (`whatsapp.db`)</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E7E3DA]">
                  <span className="text-2xs text-[#9A958A] block">Concierge AI Model</span>
                  <span className="font-semibold text-[#1D3E37]">gemini-3.5-flash-lite</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Live WhatsApp Inbox (Web Chat Layout) */}
      {activeTab === 'inbox' && (
        <div className="bg-white rounded-2xl border border-[#E7E3DA] shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
          {/* Left Column: Chat Conversation List */}
          <div className="md:col-span-4 border-r border-[#E7E3DA] flex flex-col bg-[#FAF8F4]">
            {/* Search header */}
            <div className="p-4 border-b border-[#E7E3DA]">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9A958A]" />
                <input
                  type="text"
                  placeholder="Search guest name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-[#E7E3DA] text-xs focus:outline-none focus:border-[#2F6154]"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E7E3DA]/60">
              {filteredChats.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#9A958A]">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No active WhatsApp threads found.</p>
                  <p className="mt-1 text-2xs">Inbound messages from guests will appear here live.</p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isSelected = chat.jid === selectedChatJid;
                  return (
                    <button
                      key={chat.jid}
                      type="button"
                      onClick={() => setSelectedChatJid(chat.jid)}
                      className={`w-full p-4 flex items-start gap-3 text-left transition-colors cursor-pointer ${
                        isSelected ? 'bg-white shadow-xs border-l-4 border-[#2F6154]' : 'hover:bg-white/60'
                      }`}
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-[#E4EBE7] text-[#1D3E37] font-semibold flex items-center justify-center text-sm border border-[#C7D6CF]">
                        {(chat.name || chat.guestName || 'G').charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-xs text-[#1D3E37] truncate">
                            {chat.name || chat.guestName || chat.jid.split('@')[0]}
                          </span>
                          {chat.lastMessageAt && (
                            <span className="text-2xs text-[#9A958A] shrink-0">
                              {new Date(chat.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#545B56] truncate">
                          {chat.lastMessagePreview || 'No messages yet'}
                        </p>
                      </div>

                      {chat.unreadCount > 0 && (
                        <span className="h-5 w-5 rounded-full bg-[#2F6154] text-white text-2xs font-bold grid place-items-center shrink-0">
                          {chat.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Conversation Thread */}
          <div className="md:col-span-8 flex flex-col bg-[#FDFCFB]">
            {selectedChat ? (
              <>
                {/* Chat Top Bar */}
                <div className="px-6 py-3.5 border-b border-[#E7E3DA] bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#2F6154] text-white font-semibold flex items-center justify-center text-sm">
                      {(selectedChat.name || 'G').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#1D3E37]">
                        {selectedChat.name || selectedChat.guestName || selectedChat.jid.split('@')[0]}
                      </h3>
                      <span className="text-2xs text-[#6F6F68] font-mono">
                        {selectedChat.jid.replace('@s.whatsapp.net', '')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="emerald">Live Channel</Badge>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-[#FAF8F4]/40">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full text-xs text-[#9A958A]">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading message history...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[#9A958A]">
                      No messages exchanged yet in this thread.
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex flex-col ${m.fromMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                            m.fromMe
                              ? 'bg-[#1D3E37] text-[#FAF8F4] rounded-br-xs'
                              : 'bg-white border border-[#E7E3DA] text-[#1D3E37] rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              m.fromMe ? 'text-[#FAF8F4]/70' : 'text-[#9A958A]'
                            }`}
                          >
                            <span>
                              {new Date(m.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {m.fromMe && (
                              <span>
                                {m.status === 'read' ? (
                                  <CheckCheck className="h-3 w-3 text-cyan-400" />
                                ) : m.status === 'delivered' ? (
                                  <CheckCheck className="h-3 w-3 text-[#FAF8F4]/70" />
                                ) : (
                                  <Check className="h-3 w-3 text-[#FAF8F4]/50" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatScrollRef} />
                </div>

                {/* Message Input Box */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-[#E7E3DA] bg-white">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type a message to reply on WhatsApp..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={isSending || status.status !== 'connected'}
                      className="flex-1 px-4 py-2.5 bg-[#FAF8F4] rounded-xl border border-[#E7E3DA] text-xs focus:outline-none focus:border-[#2F6154]"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSending || !messageInput.trim() || status.status !== 'connected'}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Send
                    </Button>
                  </div>
                  {status.status !== 'connected' && (
                    <p className="text-2xs text-amber-700 mt-1.5">
                      ⚠️ Connect WhatsApp in the 'Device QR & Pairing' tab to send messages.
                    </p>
                  )}
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#9A958A]">
                <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                <h4 className="font-serif text-base font-semibold text-[#1D3E37] mb-1">
                  Select a Conversation
                </h4>
                <p className="text-xs max-w-sm">
                  Choose a thread from the list on the left to read messages and reply to guests in real time.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Outbound Dispatcher & Logs */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Dispatcher Form */}
          <div className="lg:col-span-5">
            <Card className="p-6 bg-white border border-[#E7E3DA] shadow-sm rounded-2xl">
              <h3 className="font-serif text-lg font-semibold text-[#1D3E37] mb-1 flex items-center gap-2">
                <Send className="h-4 w-4 text-[#2F6154]" />
                Direct WhatsApp Dispatcher
              </h3>
              <p className="text-xs text-[#545B56] mb-4">
                Send direct booking confirmations, check-in instructions, or custom notices.
              </p>

              {/* Quick Template Chips */}
              <div className="mb-4">
                <span className="text-2xs text-[#6F6F68] font-semibold uppercase tracking-wider block mb-2">
                  Quick Pre-made Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      applyTemplate(
                        'Namaste! Welcome to Kaveri Riverside, Coorg. Your check-in is confirmed for 2:00 PM. Our concierge desk is here to assist you with airport pickup and plantation tours.'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F4] border border-[#E7E3DA] text-2xs text-[#1D3E37] hover:bg-[#E4EBE7] transition-colors"
                  >
                    🌿 Check-in Welcome
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyTemplate(
                        'Your booking voucher #KV-8921 is confirmed at Kaveri Hilltop, Ooty. Digital keycard access code: 4921. Breakfast is served daily from 7:30 AM to 10:30 AM.'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F4] border border-[#E7E3DA] text-2xs text-[#1D3E37] hover:bg-[#E4EBE7] transition-colors"
                  >
                    🔑 Booking Confirmation
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyTemplate(
                        'Reminder: Your Backwater Sunset Cruise at Kaveri Alleppey is scheduled for 5:30 PM this evening. Please meet our guide at the main jetty.'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F4] border border-[#E7E3DA] text-2xs text-[#1D3E37] hover:bg-[#E4EBE7] transition-colors"
                  >
                    🚤 Experience Alert
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="text-label block mb-1">Recipient Phone Number (with Country Code)</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210 or 919876543210"
                    value={broadcastPhone}
                    onChange={(e) => setBroadcastPhone(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E7E3DA] text-xs bg-[#FAF8F4] focus:outline-none focus:border-[#2F6154]"
                  />
                </div>

                <div>
                  <label className="text-label block mb-1">Message Body</label>
                  <textarea
                    rows={4}
                    placeholder="Type the message content..."
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E7E3DA] text-xs bg-[#FAF8F4] focus:outline-none focus:border-[#2F6154]"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isBroadcasting || !broadcastPhone.trim() || !broadcastText.trim()}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {isBroadcasting ? 'Dispatching...' : 'Dispatch Message'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Outbound Logs Table */}
          <div className="lg:col-span-7">
            <Card className="p-6 bg-white border border-[#E7E3DA] shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[#1D3E37]">
                    Outbound Dispatch Audit Log
                  </h3>
                  <p className="text-xs text-[#545B56]">Historical record of queued and sent WhatsApp alerts.</p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshLogs}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E7E3DA] bg-[#FAF8F4] text-[#6F6F68]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Recipient</th>
                      <th className="py-2.5 px-3 font-semibold">Action / Message</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3DA]/60">
                    {outboundLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-[#9A958A]">
                          No outbound log entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      outboundLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#FAF8F4]/50">
                          <td className="py-2.5 px-3 font-mono font-medium text-[#1D3E37]">
                            {log.phone}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <span className="block font-semibold text-2xs uppercase text-[#2F6154]">
                              {log.action}
                            </span>
                            <span className="truncate block text-2xs text-[#545B56]">
                              {log.message}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                log.status === 'sent' || log.status === 'delivered'
                                  ? 'emerald'
                                  : log.status === 'pending'
                                  ? 'warning'
                                  : 'destructive'
                              }
                            >
                              {log.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-2xs text-[#9A958A]">
                            {log.createdAt
                              ? new Date(log.createdAt * 1000).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 4: AI Concierge Engine */}
      {activeTab === 'ai-bot' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Architecture Overview */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="p-6 bg-white border border-[#E7E3DA] shadow-sm rounded-2xl">
              <div className="flex items-center gap-2 text-eyebrow text-[#C59B27] mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                Autonomous Guest Assistant
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#1D3E37] mb-2">
                Grounded Gemini 3.5 AI Integration
              </h3>
              <p className="text-xs text-[#545B56] leading-relaxed mb-4">
                When guests message the Kaveri WhatsApp number, the background bot listens for incoming inquiries. It performs real-time guest lookup against the PostgreSQL/SQLite database, constructs a strict security-grounded context object, and answers guest questions accurately.
              </p>

              <div className="space-y-3">
                <div className="p-3.5 bg-[#FAF8F4] rounded-xl border border-[#E7E3DA]">
                  <h4 className="text-xs font-bold text-[#1D3E37] mb-1">
                    🛡️ Deterministic Grounded Security
                  </h4>
                  <p className="text-2xs text-[#545B56]">
                    The AI model has no raw SQL execution rights. It only receives verified JSON parameters for the specific caller's booking, property details, and amenities.
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF8F4] rounded-xl border border-[#E7E3DA]">
                  <h4 className="text-xs font-bold text-[#1D3E37] mb-1">
                    ⚡ Zero-Latency LID Resolution
                  </h4>
                  <p className="text-2xs text-[#545B56]">
                    WhatsApp Linked ID (`@lid`) addresses are automatically converted to standard phone numbers through Baileys signal repositories to resolve guest identities.
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF8F4] rounded-xl border border-[#E7E3DA]">
                  <h4 className="text-xs font-bold text-[#1D3E37] mb-1">
                    📊 Rate Limiting & Spend Guard
                  </h4>
                  <p className="text-2xs text-[#545B56]">
                    Token bucket rate limiting caps automated replies at 20 turns/hour per guest to prevent bot loops and spam.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Live Simulator & Tester */}
          <div className="lg:col-span-6">
            <Card className="p-6 bg-white border border-[#E7E3DA] shadow-sm rounded-2xl">
              <h3 className="font-serif text-lg font-semibold text-[#1D3E37] mb-1 flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#2F6154]" />
                Concierge AI Simulator
              </h3>
              <p className="text-xs text-[#545B56] mb-4">
                Test how the Gemini AI concierge responds to guest inquiries using the active system prompt.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-label block mb-1">Sample Guest Query</label>
                  <textarea
                    rows={3}
                    value={simulatedPrompt}
                    onChange={(e) => setSimulatedPrompt(e.target.value)}
                    placeholder="Type a sample question a guest would ask on WhatsApp..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E7E3DA] text-xs bg-[#FAF8F4] focus:outline-none focus:border-[#2F6154]"
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={handleSimulateAi}
                  disabled={isSimulating || !simulatedPrompt.trim()}
                  className="w-full"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {isSimulating ? 'Generating Grounded Response...' : 'Simulate WhatsApp AI Reply'}
                </Button>

                {simulatedReply && (
                  <div className="p-4 rounded-xl border border-[#C7D6CF] bg-[#F3F6F4] text-xs text-[#1D3E37] space-y-1.5 animate-fadeIn">
                    <span className="text-eyebrow text-[#2F6154] block">Simulated WhatsApp Output:</span>
                    <p className="whitespace-pre-wrap leading-relaxed">{simulatedReply}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
