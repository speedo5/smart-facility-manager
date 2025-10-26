import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Filter, Users, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameDay } from "date-fns";
import { Booking, BookingStatus } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { bookingApi } from "@/utils/api";

const statusColors: Record<BookingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PENDING_ADMIN: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  CHECKED_IN: "bg-blue-100 text-blue-800",
  CHECKED_OUT: "bg-purple-100 text-purple-800",
  EXPIRED: "bg-red-100 text-red-800"
};

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        // admin sees all bookings; users see their own
        const params: any = { limit: 1000 };
        if (user?.role === 'ADMIN') {
          params.all = 'true';
        }
        const resp = await bookingApi.getAll(params);
        if (resp && resp.success && mounted) {
          const normalize = (b: any): Booking => ({
            ...b,
            user: b.userId || b.user || null,
            facilitiesData: b.facilities || b.facilitiesData || [],
          });
          setBookings(resp.data.map((b: any) => normalize(b)));
        } else if (mounted) {
          setError('Failed to fetch bookings');
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to fetch bookings');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchBookings();
    return () => { mounted = false; };
  }, [user?.role]);

  // Filter bookings based on user role
  const userBookings = user?.role === 'ADMIN'
    ? bookings
    : bookings.filter(booking => booking.user?._id === user?._id || booking.userId === user?._id);

  const filteredBookings = userBookings.filter(booking => {
    const matchesDate = isSameDay(new Date(booking.startTime), selectedDate);
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  const getBookingDates = () => {
    return userBookings.map(booking => new Date(booking.startTime));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Booking Calendar</h1>
        <p className="text-muted-foreground">
          {user?.role === 'ADMIN' 
            ? 'View all bookings by date and manage schedules.' 
            : 'View your bookings by date and manage your schedule.'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="shadow-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{
                hasBookings: getBookingDates()
              }}
              modifiersStyles={{
                hasBookings: { 
                  backgroundColor: "hsl(var(--primary))", 
                  color: "white",
                  fontWeight: "bold"
                }
              }}
              className="rounded-md border pointer-events-auto"
            />
            <div className="mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span>Days with bookings</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Bookings for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </CardTitle>
                <CardDescription>
                  {filteredBookings.length} bookings found
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PENDING_ADMIN">Pending Admin</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                    <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No bookings found</h3>
                <p className="text-muted-foreground">
                  No bookings scheduled for the selected date.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <Card key={booking._id} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {booking.facilitiesData?.[0]?.name}
                            </h4>
                            <Badge className={statusColors[booking.status]}>
                              {booking.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{booking.user?.fullName} ({booking.user?.role})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{booking.facilitiesData?.[0]?.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          {booking.status === "PENDING_ADMIN" && (
                            <Button size="sm" className="bg-gradient-primary">
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}