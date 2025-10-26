import { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  User,
  Eye,
  Trash2,
  Globe
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Booking, BookingStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { bookingApi } from "@/utils/api";

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-accent text-accent-foreground';
    case 'PENDING':
    case 'PENDING_ADMIN':
      return 'bg-warning text-warning-foreground';
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-destructive text-destructive-foreground';
    case 'CHECKED_IN':
      return 'bg-blue-100 text-blue-800';
    case 'CHECKED_OUT':
      return 'bg-green-100 text-green-800';
    case 'EXPIRED':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export default function ManageBookings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; booking: Booking | null; action: string }>({
    open: false,
    booking: null,
    action: ''
  });
  const [actionNotes, setActionNotes] = useState("");
  
  const { toast } = useToast();

  // Bookings state and loading/error flags
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bookings on mount
  useEffect(() => {
    let mounted = true;
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        // Admin gets all bookings with the all=true parameter
        const resp = await bookingApi.getAll({ all: 'true' });
        if (resp && resp.success && mounted) {
          // normalize server booking shape to UI shape
          const normalizeBooking = (b: any): Booking => ({
            ...b,
            user: b.userId || b.user || null,
            facilitiesData: b.facilities || b.facilitiesData || [],
          });

          setBookings(resp.data.map((b: any) => normalizeBooking(b)));
        } else if (mounted) {
          setError('Failed to fetch bookings');
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to fetch bookings');
          toast({ title: 'Error', description: err.message || 'Failed to fetch bookings', variant: 'destructive' });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchBookings();
    return () => { mounted = false; };
  }, []);

  const filteredBookings = bookings.filter(booking => {
    const facilityNames = (booking.facilitiesData || []).map(f => (f?.name || '').toLowerCase()).join(' ');
    const matchesSearch = booking.user?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         facilityNames.includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || booking.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Refresh bookings after an action
  const refreshBookings = async () => {
    setIsLoading(true);
    try {
      // Admin gets all bookings with the all=true parameter
      const response = await bookingApi.getAll({ all: 'true' });
      if (response && response.success) {
        const normalizeBooking = (b: any): Booking => ({
          ...b,
          user: b.userId || b.user || null,
          facilitiesData: b.facilities || b.facilitiesData || [],
        });
        setBookings(response.data.map((b: any) => normalizeBooking(b)));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh bookings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmBookingAction = async () => {
    if (!actionDialog.booking) return;
    
    try {
      switch (actionDialog.action) {
        case 'Approve':
          await bookingApi.approve(actionDialog.booking._id, actionNotes);
          break;
        case 'Reject':
          await bookingApi.reject(actionDialog.booking._id, actionNotes);
          break;
        case 'Cancel':
          await bookingApi.cancel(actionDialog.booking._id, actionNotes);
          break;
        case 'Delete':
          await bookingApi.delete(actionDialog.booking._id);
          break;
      }
      
      toast({
        title: "Success",
        description: `Booking has been ${actionDialog.action.toLowerCase()}d.`,
      });
      
      refreshBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${actionDialog.action.toLowerCase()} booking`,
        variant: "destructive",
      });
    }
    
    setActionDialog({ open: false, booking: null, action: '' });
    setActionNotes("");
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'PENDING' || b.status === 'PENDING_ADMIN').length,
    approved: bookings.filter(b => b.status === 'APPROVED').length,
    active: bookings.filter(b => b.status === 'CHECKED_IN').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Manage Bookings</h1>
          <p className="text-muted-foreground">
            Monitor and manage all facility bookings across the system.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user or facility..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Status" />
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
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Booking Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                      <p className="text-muted-foreground">Loading bookings...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => {
                return (
                <TableRow key={booking._id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{booking.user?.fullName}</div>
                      <div className="text-sm text-muted-foreground">{booking.user?.email}</div>
                      <Badge variant="outline" className="text-xs">
                        {booking.user?.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      {(booking.facilitiesData || []).map((f: any, idx: number) => (
                        <div key={f?._id || idx} className="p-2 bg-muted/50 rounded-md">
                          <div className="font-medium">{f?.name || 'Unknown Facility'}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{f?.location || 'No location'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{f?.capacity ?? 'N/A'} capacity</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {format(new Date(booking.startTime), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {booking.isExternal ? (
                        <>
                          <Badge variant="outline" className="w-fit bg-orange-50 text-orange-700 border-orange-200">
                            <Globe className="h-3 w-3 mr-1" />
                            External
                          </Badge>
                          {booking.externalOrg && (
                            <span className="text-xs text-muted-foreground">{booking.externalOrg}</span>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline">
                          {booking.approval?.type || 'Manual'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Booking Details</DialogTitle>
                          </DialogHeader>
                          {selectedBooking && (
                            <div className="space-y-4">
                              {selectedBooking.isExternal && (
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Globe className="h-4 w-4 text-orange-700" />
                                    <h4 className="font-medium text-orange-700">External Booking</h4>
                                  </div>
                                  {selectedBooking.externalOrg && (
                                    <p className="text-sm text-orange-700">Organization: {selectedBooking.externalOrg}</p>
                                  )}
                                </div>
                              )}
                              <div>
                                <h4 className="font-medium">User Information</h4>
                                <p className="text-sm text-muted-foreground">{selectedBooking.user?.fullName}</p>
                                <p className="text-sm text-muted-foreground">{selectedBooking.user?.email}</p>
                                <p className="text-sm text-muted-foreground">{selectedBooking.user?.phone}</p>
                              </div>
                              <div>
                                <h4 className="font-medium">Facility</h4>
                                <p className="text-sm text-muted-foreground">{selectedBooking.facilitiesData?.[0]?.name}</p>
                                <p className="text-sm text-muted-foreground">{selectedBooking.facilitiesData?.[0]?.location}</p>
                                <p className="text-sm text-muted-foreground">Capacity: {selectedBooking.facilitiesData?.[0]?.capacity}</p>
                              </div>
                              <div>
                                <h4 className="font-medium">Booking Time</h4>
                                <p className="text-sm text-muted-foreground">
                                  Start: {format(new Date(selectedBooking.startTime), 'PPP p')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  End: {format(new Date(selectedBooking.endTime), 'PPP p')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Duration: {Math.round((new Date(selectedBooking.endTime).getTime() - new Date(selectedBooking.startTime).getTime()) / (1000 * 60 * 60))} hours
                                </p>
                              </div>
                              {selectedBooking.checkInCode && (
                                <div>
                                  <h4 className="font-medium">Check-in Code</h4>
                                  <p className="text-sm font-mono bg-muted p-2 rounded">{selectedBooking.checkInCode}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(booking.status === 'PENDING_ADMIN' || booking.status === 'PENDING') && (
                            <>
                              <DropdownMenuItem onClick={() => setActionDialog({ open: true, booking, action: 'Approve' })}>
                                <CheckCircle className="h-4 w-4 mr-2 text-accent" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActionDialog({ open: true, booking, action: 'Reject' })}>
                                <XCircle className="h-4 w-4 mr-2 text-destructive" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {(booking.status === 'APPROVED' || booking.status === 'PENDING') && (
                            <DropdownMenuItem onClick={() => setActionDialog({ open: true, booking, action: 'Cancel' })}>
                              <XCircle className="h-4 w-4 mr-2 text-warning" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => setActionDialog({ open: true, booking, action: 'Delete' })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
                );
            })
          )}
              </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setActionDialog({ open: false, booking: null, action: '' });
          setActionNotes("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.action} Booking</DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'Delete' 
                ? 'This action cannot be undone. This will permanently delete the booking.'
                : `Are you sure you want to ${actionDialog.action.toLowerCase()} this booking?`
              }
            </DialogDescription>
          </DialogHeader>
          {actionDialog.booking && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">User:</span>
                  <span>{actionDialog.booking.user?.fullName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Facility:</span>
                  <span>{actionDialog.booking.facilitiesData?.[0]?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Date:</span>
                  <span>{format(new Date(actionDialog.booking.startTime), 'PPP')}</span>
                </div>
                {actionDialog.booking.isExternal && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-3 w-3 text-orange-700" />
                    <span className="text-orange-700 font-medium">External Booking</span>
                  </div>
                )}
              </div>
              
              {actionDialog.action !== 'Delete' && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder={`Add notes about this ${actionDialog.action.toLowerCase()}...`}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionDialog({ open: false, booking: null, action: '' });
              setActionNotes("");
            }}>
              Cancel
            </Button>
            <Button 
              variant={actionDialog.action === 'Approve' ? 'default' : 'destructive'}
              onClick={confirmBookingAction}
            >
              {actionDialog.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}