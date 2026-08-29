import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HotelProvider, useHotel } from './context/HotelContext';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { GuestPortal } from './pages/GuestPortal';
import { StaffPortal } from './pages/StaffPortal';
import { ManagerPortal } from './pages/ManagerPortal';
import { OwnerPortal } from './pages/OwnerPortal';
import { PropertyId, RoomCategory } from './types';

function AppContent() {
  const { user } = useAuth();
  const { error } = useToast();

  const [currentView, setCurrentView] = useState<string>('landing');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [bookingPreload, setBookingPreload] = useState<{
    propertyId?: PropertyId;
    roomCategory?: RoomCategory;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }>({});

  // Apply dark mode class to document root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-600 selection:text-white transition-colors duration-200">
      {/* Universal Luxury Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Routed Content */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onNavigate={handleNavigate}
          />
        )}

        {(currentView === 'booking-engine' || currentView === 'guest-dashboard' || currentView === 'guest-bookings') && (
          <GuestPortal
            initialTab={currentView === 'guest-bookings' ? 'my-stays' : 'booking-engine'}
            onNavigate={handleNavigate}
            bookingPreload={bookingPreload}
          />
        )}

        {currentView === 'staff-dashboard' && (
          <StaffPortal onNavigate={handleNavigate} />
        )}

        {currentView === 'manager-dashboard' && (
          <ManagerPortal onNavigate={handleNavigate} />
        )}

        {currentView === 'owner-dashboard' && (
          <OwnerPortal onNavigate={handleNavigate} />
        )}

        {currentView === 'login' && (
          <AuthPage initialMode="login" onNavigate={handleNavigate} />
        )}

        {currentView === 'register' && (
          <AuthPage initialMode="register" onNavigate={handleNavigate} />
        )}
      </main>

      {/* Luxury Footer */}
      <Footer onNavigate={handleNavigate} />
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
