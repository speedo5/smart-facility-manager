import { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Eye,
  MoreHorizontal,
  LogIn,
  LogOut,
  Copy,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FeedbackDialog } from "@/components/ui/feedback-dialog";
import { Booking, BookingStatus } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { bookingApi } from "@/utils/api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { checkInRequestApi } from "@/utils/api";
import FacilityQrImage from "@/components/ui/facility-qr-image";

// Bookings state will be fetched from the API

const getStatusConfig = (status: BookingStatus) => {
  switch (status) {
    case 'APPROVED':
      return { color: 'bg-accent text-accent-foreground', icon: CheckCircle };
    case 'PENDING_ADMIN':
      return { color: 'bg-warning text-warning-foreground', icon: AlertCircle };
    case 'REJECTED':
      return { color: 'bg-destructive text-destructive-foreground', icon: XCircle };
    case 'CHECKED_IN':
      return { color: 'bg-status-checked-in text-white', icon: CheckCircle };
    case 'CHECKED_OUT':
      return { color: 'bg-muted text-muted-foreground', icon: CheckCircle };
    default:
      return { color: 'bg-muted text-muted-foreground', icon: Clock };
  }
};

export default function MyBookings() {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Bookings state and loading/error
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
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
        if (mounted) setError(err.message || 'Failed to fetch bookings');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchBookings();
    return () => { mounted = false; };
  }, [user?.role]);

  const now = new Date();
  const upcomingBookings = bookings.filter(b => b.status === 'APPROVED' && new Date(b.startTime) > now);
  const activeBookings = bookings.filter(b => b.status === 'CHECKED_IN');
  const pendingBookings = bookings.filter(b => b.status === 'PENDING' || b.status === 'PENDING_ADMIN');
  const pastBookings = bookings.filter(b => ['CHECKED_OUT','REJECTED','CANCELLED','EXPIRED'].includes(b.status) || (new Date(b.endTime) < now && b.status !== 'CHECKED_IN'));

  const handleCheckIn = async (booking: Booking) => {
    const facility = booking.facilitiesData?.[0];
    if (!facility) return;

    if (!facility.qrEnabled) {
      try {
        await checkInRequestApi.create({
          bookingId: booking._id,
          facilityId: facility._id,
          type: 'CHECK_IN'
        });
        toast({
          title: "Check-in Request Sent",
          description: "Admin will approve your check-in shortly.",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to send check-in request",
          variant: "destructive",
        });
      }
    }
  };

  const handleCheckOut = async (booking: Booking) => {
    const facility = booking.facilitiesData?.[0];
    if (!facility) return;

    if (!facility.qrEnabled) {
      setCurrentBooking(booking);
      setShowFeedback(true);
    }
  };

  const handleFeedbackSubmit = async (feedback: { rating: number; comment: string }) => {
    if (!currentBooking) return;
    
    const facility = currentBooking.facilitiesData?.[0];
    if (!facility) return;

    try {
      await checkInRequestApi.create({
        bookingId: currentBooking._id,
        facilityId: facility._id,
        type: 'CHECK_OUT',
        feedback
      });
      toast({
        title: "Check-out Request Sent",
        description: "Thank you for your feedback!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send check-out request",
        variant: "destructive",
      });
    }
  };

  const copyCheckInCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Check-in code copied to clipboard",
    });
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const statusConfig = getStatusConfig(booking.status);
    const StatusIcon = statusConfig.icon;
    const facility = booking.facilitiesData?.[0];
    
    if (!facility) return null;

    // Use facility image or fallback to default
    const facilityImage = facility.imageUrl || `https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=300&fit=crop`;

    return (
      <Card className="shadow-card hover:shadow-hover transition-all overflow-hidden">
        {/* Facility Image */}
        <div 
          className="relative h-48 w-full bg-muted cursor-pointer group"
          onClick={() => {
            setSelectedImage(facilityImage);
            setImageModalOpen(true);
          }}
        >
          <img 
            src={facilityImage} 
            alt={facility.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye className="h-8 w-8 text-white" />
          </div>
        </div>

        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg">{facility.name}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {facility.location}
              </div>
            </div>
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {booking.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(booking.startTime), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
              </span>
            </div>
          </div>

          {/* Check-in Code */}
          {booking.checkInCode && booking.status === 'APPROVED' && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Check-in Code</p>
                  <p className="text-lg font-mono font-bold">{booking.checkInCode}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyCheckInCode(booking.checkInCode!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* QR Code for enabled facilities */}
          {facility.qrEnabled && booking.status === 'APPROVED' && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Facility QR Code</p>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </div>
                  <div className="bg-white p-2 rounded-lg flex items-center justify-center">
                    {/* Prefer the data URL returned with the facility to avoid unauthenticated image requests */}
                    {(facility as any).qrCodeImageUrl ? (
                      <img src={(facility as any).qrCodeImageUrl} alt="Facility QR Code" className="w-32 h-32 object-contain" />
                    ) : (
                      /* If qrCodeImageUrl is not present, fetch the image with auth and render via blob URL to include token */
                      <FacilityQrImage facilityId={facility._id} />
                    )}
                  </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Scan this QR code at the facility to check in
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {booking.status === 'APPROVED' && !facility.qrEnabled && (
              <Button className="flex-1" onClick={() => handleCheckIn(booking)}>
                <LogIn className="h-4 w-4 mr-2" />
                Request Check-in
              </Button>
            )}
            {booking.status === 'CHECKED_IN' && !facility.qrEnabled && (
              <Button className="flex-1" onClick={() => handleCheckOut(booking)}>
                <LogOut className="h-4 w-4 mr-2" />
                Request Check-out
              </Button>
            )}
            {facility.qrEnabled && booking.status === 'APPROVED' && (
              <Button className="flex-1" variant="outline">
                <QrCode className="h-4 w-4 mr-2" />
                Use QR Code Above
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">My Bookings</h1>
        <p className="text-muted-foreground">
          Manage your facility bookings and check-in status.
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingBookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="grid gap-4 md:grid-cols-2">
            {activeBookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <div className="grid gap-4 md:grid-cols-2">
            {pendingBookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="past">
          <div className="grid gap-4 md:grid-cols-2">
            {pastBookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {currentBooking && (
        <FeedbackDialog
          open={showFeedback}
          onOpenChange={setShowFeedback}
          onSubmit={handleFeedbackSubmit}
          facilityName={currentBooking.facilitiesData?.[0]?.name || ""}
        />
      )}

      {/* Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setImageModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img 
              src={selectedImage} 
              alt="Facility" 
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
