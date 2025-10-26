import { 
  Calendar, 
  Building2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Users,
  MapPin 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { bookingApi, facilityApi } from "@/utils/api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  pendingApprovals: number;
  availableFacilities: number;
  utilizationRate: number;
}

interface DashboardBooking {
  _id: string;
  facility: string;
  date: string;
  time: string;
  status: string;
  type?: string;
  checkInCode?: string;
  qrEnabled?: boolean;
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  
  // State management for real data
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    pendingApprovals: 0,
    availableFacilities: 0,
    utilizationRate: 0
  });
  
  const [recentBookings, setRecentBookings] = useState<DashboardBooking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<DashboardBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch bookings (admins see all)
        const bookingsParams: any = { limit: 1000 };
        if (hasRole('ADMIN')) bookingsParams.all = 'true';
        const bookingsResp = await bookingApi.getAll(bookingsParams);
        if (bookingsResp.success) {
          const now = new Date();
          const allBookings = bookingsResp.data;
          
          // Calculate stats
          const total = allBookings.length;
          const active = allBookings.filter(b => b.status === 'CHECKED_IN').length;
          const completed = allBookings.filter(b => ['CHECKED_OUT', 'EXPIRED'].includes(b.status)).length;
          const pending = allBookings.filter(b => ['PENDING', 'PENDING_ADMIN'].includes(b.status)).length;

          // Get available facilities
          const facilitiesResp = await facilityApi.getAll();
          const availableFacilities = facilitiesResp.success ? 
            facilitiesResp.data.filter(f => f.active && !f.maintenanceMode).length : 0;

          setStats({
            totalBookings: total,
            activeBookings: active,
            completedBookings: completed,
            pendingApprovals: pending,
            availableFacilities,
            utilizationRate: Math.round((active / availableFacilities) * 100) || 0
          });

          // Process bookings for display
          const processedBookings = allBookings.map(booking => {
            const facilityArr = booking.facilities || booking.facilitiesData || [];
            const facilityNames = (facilityArr || []).map((f: any) => (f?.name || f || 'Unknown Facility')).join(', ');
            const primary = facilityArr && facilityArr.length > 0 ? facilityArr[0] : null;
            return {
              _id: booking._id,
              facility: facilityNames || 'Unknown Facility',
              date: format(new Date(booking.startTime), 'yyyy-MM-dd'),
              time: `${format(new Date(booking.startTime), 'HH:mm')} - ${format(new Date(booking.endTime), 'HH:mm')}`,
              status: booking.status,
              type: primary?.type,
              checkInCode: booking.checkInCode,
              qrEnabled: primary?.qrEnabled
            };
          });

          // Set recent bookings (last 5 bookings for admin, 3 otherwise)
          const recentLimit = hasRole('ADMIN') ? 5 : 3;
          setRecentBookings(processedBookings
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, recentLimit)
          );

          // Set upcoming approved bookings (next 2)
          setUpcomingBookings(processedBookings
            .filter(b => b.status === 'APPROVED' && new Date(`${b.date} ${b.time.split(' - ')[0]}`) > now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 2)
          );
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load dashboard data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

const getStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-accent text-accent-foreground';
    case 'PENDING_ADMIN':
      return 'bg-warning text-warning-foreground';
    case 'CHECKED_IN':
      return 'bg-status-checked-in text-white';
    case 'REJECTED':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.fullName.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your facility bookings and system activity.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedBookings} completed
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-checked-in">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              Currently in use
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Facilities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.availableFacilities}</div>
            <p className="text-xs text-muted-foreground">
              Ready for booking
            </p>
          </CardContent>
        </Card>

        {hasRole('ADMIN') && (
          <Card className="shadow-card hover:shadow-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Bookings
            </CardTitle>
            <CardDescription>Your latest facility bookings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : recentBookings.length > 0 ? (
              recentBookings.map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <p className="font-medium">{booking.facility}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.date} • {booking.time}
                    </p>
                  </div>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No recent bookings found
              </div>
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link to="/bookings">View All Bookings</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Upcoming Bookings
            </CardTitle>
            <CardDescription>Your approved bookings ready for check-in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => (
                <div key={booking._id} className="p-3 rounded-lg border border-accent/20 bg-accent-soft">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{booking.facility}</p>
                    <Badge variant="outline" className="bg-white">
                      {booking.qrEnabled ? "QR Enabled" : "Code Only"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {booking.date} • {booking.time}
                  </p>
                  {booking.checkInCode && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Check-in Code:</span>
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded">
                        {booking.checkInCode}
                      </code>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No upcoming bookings found
              </div>
            )}
            <Button className="w-full bg-gradient-primary" asChild>
              <Link to="/booking/new">Book New Facility</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/facilities">
                <Building2 className="mr-2 h-4 w-4" />
                Browse Facilities
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/booking/new">
                <Calendar className="mr-2 h-4 w-4" />
                New Booking
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/bookings">
                <Clock className="mr-2 h-4 w-4" />
                My Bookings
              </Link>
            </Button>

            {hasRole('ADMIN') && (
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/admin/bookings">
                  <Users className="mr-2 h-4 w-4" />
                  Admin Panel
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}