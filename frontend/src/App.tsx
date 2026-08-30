import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HotelProvider, useHotel } from './context/HotelContext';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Navbar } from './components/common/Navbar';
import { PortalHeader } from './components/common/PortalHeader';
import { Footer } from './components/common/Footer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { GeminiAssistant } from './components/common/GeminiAssistant';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { GuestPortal } from './pages/GuestPortal';
import { StaffPortal } from './pages/StaffPortal';
import { ManagerPortal } from './pages/ManagerPortal';
import { OwnerPortal } from './pages/OwnerPortal';
import { WhatsAppPortal } from './pages/WhatsAppPortal';
import { PropertyId, RoomCategory } from './types';

// ------------------------------------------------------------------
// URL routing: map each internal view to a real browser path so the
// address bar reflects the current screen and deep links / refresh work.
// ------------------------------------------------------------------
const VIEW_TO_PATH: Record<string, string> = {
  landing: '/',
  login: '/login',
  register: '/register',
  'booking-engine': '/book',
  'guest-dashboard': '/guest',
  'guest-bookings': '/guest/stays',
  'staff-dashboard': '/staff',
  'manager-dashboard': '/manager',
  'owner-dashboard': '/owner',
  whatsapp: '/whatsapp',
};

const PATH_TO_VIEW: Record<string, string> = Object.entries(VIEW_TO_PATH).reduce(
  (acc, [view, path]) => {
    acc[path] = view;
    return acc;
  },
  {} as Record<string, string>
);

const viewFromPath = (pathname: string): string => {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PATH_TO_VIEW[clean] ?? 'landing';
};

function AppContent() {
  const { user } = useAuth();
  const { error } = useToast();

  const [currentView, setCurrentView] = useState<string>(() =>
    viewFromPath(window.location.pathname)
  );
  const [bookingPreload, setBookingPreload] = useState<{
    propertyId?: PropertyId;
    roomCategory?: RoomCategory;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }>({});

  // Always light mode — remove dark class if present
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Sync browser back/forward buttons to the current view.
  useEffect(() => {
    const handlePopState = () => setCurrentView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Ensure the address bar reflects the initial view on first paint.
  useEffect(() => {
    const target = VIEW_TO_PATH[currentView] ?? '/';
    if (window.location.pathname !== target) {
      window.history.replaceState({ view: currentView }, '', target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigate = (view: string, extraData?: any) => {
    // If extraData passed for booking engine
    if (extraData) {
      setBookingPreload(extraData);
    }

    // Role-based protection check
    if (view === 'staff-dashboard' && user?.role === 'guest') {
      error('Access Restricted', 'Staff credentials required for Front Desk dispatch.');
      return;
    }
    if (view === 'manager-dashboard' && user?.role !== 'manager' && user?.role !== 'owner') {
      error('Access Restricted', 'Property Manager or Executive credentials required.');
      return;
    }
    if (view === 'owner-dashboard' && user?.role !== 'owner') {
      error('Access Restricted', 'Executive Owner credentials required.');
      return;
    }

    setCurrentView(view);

    // Reflect the view in the address bar (creates a history entry).
    const target = VIEW_TO_PATH[view] ?? '/';
    if (window.location.pathname !== target) {
      window.history.pushState({ view }, '', target);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF3EB] text-[#1D3E37] selection:bg-[#1D3E37] selection:text-[#FAF3EB]">
      {/* Landing uses the full marketing navbar */}
      {currentView === 'landing' && (
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          isDarkMode={false}
          onToggleDarkMode={() => {}}
        />
      )}

      {/* Portals use a slim header with home + account controls (not on landing or auth) */}
      {currentView !== 'landing' && currentView !== 'login' && currentView !== 'register' && (
        <PortalHeader currentView={currentView} onNavigate={handleNavigate} />
      )}

      {/* Main Routed Content — each screen has its own error boundary so a
          crash in one portal doesn't take down the entire app. */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <ErrorBoundary section="Homepage">
            <LandingPage onNavigate={handleNavigate} />
          </ErrorBoundary>
        )}

        {(currentView === 'booking-engine' || currentView === 'guest-dashboard' || currentView === 'guest-bookings') && (
          <ErrorBoundary section="Guest Portal">
            <GuestPortal
              initialTab={currentView === 'guest-bookings' ? 'my-stays' : 'booking-engine'}
              onNavigate={handleNavigate}
              bookingPreload={bookingPreload}
            />
          </ErrorBoundary>
        )}

        {currentView === 'staff-dashboard' && (
          <ErrorBoundary section="Front Desk">
            <StaffPortal onNavigate={handleNavigate} />
          </ErrorBoundary>
        )}

        {currentView === 'manager-dashboard' && (
          <ErrorBoundary section="Manager Portal">
            <ManagerPortal onNavigate={handleNavigate} />
          </ErrorBoundary>
        )}

        {currentView === 'owner-dashboard' && (
          <ErrorBoundary section="Owner Portal">
            <OwnerPortal onNavigate={handleNavigate} />
          </ErrorBoundary>
        )}

        {currentView === 'whatsapp' && (
          <ErrorBoundary section="WhatsApp Center">
            <WhatsAppPortal onNavigate={handleNavigate} />
          </ErrorBoundary>
        )}

        {currentView === 'login' && (
          <AuthPage initialMode="login" onNavigate={handleNavigate} />
        )}

        {currentView === 'register' && (
          <AuthPage initialMode="register" onNavigate={handleNavigate} />
        )}
      </main>

      {/* Footer is exclusive to the landing page */}
      {currentView === 'landing' && <Footer onNavigate={handleNavigate} />}

      {/* Floating Gemini concierge — mounted globally, not shown on auth
          screens (a login/register form shouldn't compete for attention). */}
      {currentView !== 'login' && currentView !== 'register' && (
        <GeminiAssistant currentView={currentView} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HotelProvider>
          <AppContent />
        </HotelProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
