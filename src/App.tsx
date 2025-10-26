import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Facilities from "./pages/Facilities";
import MyBookings from "./pages/MyBookings";
import NewBooking from "./pages/NewBooking";
import ExternalBooking from "./pages/ExternalBooking";
import SystemSettings from "./pages/SystemSettings";
import CalendarPage from "./pages/Calendar";
import Feedback from "./pages/Feedback";
import Profile from "./pages/Profile";
import UserManagement from "./pages/admin/UserManagement";
import Analytics from "./pages/admin/Analytics";
import QRScanner from "./pages/admin/QRScanner";
import FacilityManagement from "./pages/admin/FacilityManagement";
import FeedbackManagement from "./pages/admin/FeedbackManagement";
import ManageBookings from "./pages/admin/ManageBookings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="facilities" element={<Facilities />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="booking/new" element={<NewBooking />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="external-booking" element={<ExternalBooking />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="feedback/:bookingId" element={<Feedback />} />
        
        {/* Admin Routes */}
        <Route path="admin/users" element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="admin/facilities" element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <FacilityManagement />
          </ProtectedRoute>
        } />
        <Route path="admin/bookings" element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <ManageBookings />
          </ProtectedRoute>
        } />
        <Route path="admin/analytics" element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="admin/qr-scanner" element={
          <ProtectedRoute requiredRoles={['ADMIN', 'STAFF']}>
            <QRScanner />
          </ProtectedRoute>
        } />
        <Route path="admin/feedback" element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <FeedbackManagement />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
