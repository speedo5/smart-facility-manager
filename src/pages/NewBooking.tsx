import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Calendar, 
  Clock, 
  Building2, 
  Plus, 
  X, 
  MapPin, 
  Users, 
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Facility, BookingRequest } from "@/types";
import { facilityApi, bookingApi } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays } from "date-fns";

// available facilities will be loaded from the API

export default function NewBooking() {
  const [searchParams] = useSearchParams();
  const preselectedFacility = searchParams.get('facility');
  
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(
    preselectedFacility ? [preselectedFacility] : []
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isExternal, setIsExternal] = useState(false);
  const [externalOrg, setExternalOrg] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const selectedFacilitiesData = availableFacilities.filter(f => 
    selectedFacilities.includes(f._id)
  );

  const hasRestrictedFacilities = selectedFacilitiesData.some(f => f.isRestricted);

  // Load available facilities
  useEffect(() => {
    let mounted = true;
    const fetchFacilities = async () => {
      try {
        const resp = await facilityApi.getAll({ limit: 1000 });
        if (resp && resp.success && mounted) {
          setAvailableFacilities(resp.data || []);
        } else if (mounted) {
          setAvailableFacilities([]);
        }
      } catch (err) {
        if (mounted) setAvailableFacilities([]);
      }
    };

    fetchFacilities();
    return () => { mounted = false; };
  }, []);

  const handleFacilityToggle = (facilityId: string) => {
    console.log('Toggling facility:', facilityId, 'Current selected:', selectedFacilities);
    setSelectedFacilities(prev => {
      const newSelected = prev.includes(facilityId) 
        ? prev.filter(id => id !== facilityId)
        : [...prev, facilityId];
      console.log('New selected facilities:', newSelected);
      return newSelected;
    });
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2024-01-01T${startTime}`);
    const end = new Date(`2024-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60); // in minutes
  };

  const validateBooking = (): string[] => {
    const errors: string[] = [];
    
    if (selectedFacilities.length === 0) {
      errors.push("Please select at least one facility");
    }
    
    if (!startDate) {
      errors.push("Please select a start date");
    }
    
    if (hasRestrictedFacilities && !endDate) {
      errors.push("Please select an end date for restricted facilities");
    }
    
    if (!startTime || !endTime) {
      errors.push("Please select start and end times");
    }
    
    if (startTime && endTime && startTime >= endTime) {
      errors.push("End time must be after start time");
    }
    
    const duration = calculateDuration();
    selectedFacilitiesData.forEach(facility => {
      if (duration < facility.minBookingMinutes) {
        errors.push(`${facility.name} requires minimum ${facility.minBookingMinutes} minutes`);
      }
      if (duration > facility.maxBookingMinutes) {
        errors.push(`${facility.name} allows maximum ${facility.maxBookingMinutes} minutes`);
      }
    });
    
    if (isExternal && !externalOrg) {
      errors.push("Please specify organization for external booking");
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateBooking();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const actualEndDate = endDate || startDate;
      const bookingRequest: BookingRequest = {
        facilityIds: selectedFacilities,
        startTime: `${startDate}T${startTime}:00Z`,
        endTime: `${actualEndDate}T${endTime}:00Z`,
        isExternal,
        externalOrg: isExternal ? externalOrg : undefined,
      };
      
  // Call the bookings API
  const resp = await bookingApi.create(bookingRequest);
  console.log('Booking response:', resp);
      
      /*
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(bookingRequest)
      });
      
      const data = await response.json();
      if (data.success) {
        const booking = data.data;
        const willAutoApprove = booking.status === 'APPROVED';
      }
      */
      
      if (resp && resp.success) {
        const booking = resp.data;
        const willAutoApprove = booking.status === 'APPROVED';
        toast({
          title: willAutoApprove ? "Booking Approved!" : "Booking Submitted!",
          description: willAutoApprove
            ? "Your booking has been automatically approved. Check your email for details."
            : hasRestrictedFacilities
              ? "Your booking requires admin approval due to restricted facilities."
              : "Your booking is pending approval.",
        });
      } else {
        toast({
          title: "Booking Failed",
          description: resp?.message || 'Failed to create booking',
          variant: 'destructive'
        });
      }
      
      // Reset form
      setSelectedFacilities([]);
      setStartDate("");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setIsExternal(false);
      setExternalOrg("");
      setPurpose("");
      
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Failed to submit booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">New Booking</h1>
        <p className="text-muted-foreground">
          Book university facilities for your academic or administrative needs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Facility Selection */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Facilities
            </CardTitle>
            <CardDescription>
              Choose one or more facilities for your booking. You can book multiple facilities for the same time slot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableFacilities.map((facility) => (
                <div
                  key={facility._id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedFacilities.includes(facility._id)
                      ? 'border-primary bg-primary-soft'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleFacilityToggle(facility._id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{facility.name}</h4>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedFacilities.includes(facility._id)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background'
                    }`}>
                      {selectedFacilities.includes(facility._id) && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {facility.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Capacity: {facility.capacity}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(facility.minBookingMinutes)} - {formatDuration(facility.maxBookingMinutes)}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {facility.isRestricted && (
                      <Badge variant="outline" className="text-warning border-warning text-xs">
                        Restricted
                      </Badge>
                    )}
                    {facility.qrEnabled && (
                      <Badge variant="outline" className="text-accent border-accent text-xs">
                        QR
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Facilities Summary */}
        {selectedFacilities.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Selected Facilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedFacilitiesData.map((facility) => (
                  <div key={facility._id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-medium">{facility.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFacilityToggle(facility._id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {hasRestrictedFacilities && (
                <div className="mt-4 p-3 bg-warning-soft border border-warning/20 rounded-lg">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Admin Approval Required</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your booking includes restricted facilities and will require admin approval.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Date and Time */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  max={format(addDays(new Date(), 90), 'yyyy-MM-dd')}
                  required
                />
              </div>
              
              {hasRestrictedFacilities && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || format(new Date(), 'yyyy-MM-dd')}
                    max={format(addDays(new Date(), 90), 'yyyy-MM-dd')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for multi-day bookings of restricted facilities
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            
            {calculateDuration() > 0 && (
              <div className="text-sm text-muted-foreground">
                Duration: {formatDuration(calculateDuration())}
              </div>
            )}
          </CardContent>
        </Card>

        {/* External Booking */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Booking Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="external"
                checked={isExternal}
                onCheckedChange={(checked) => setIsExternal(checked === true)}
              />
              <Label htmlFor="external">External Organization Booking</Label>
            </div>
            
            {isExternal && (
              <div className="space-y-2">
                <Label htmlFor="externalOrg">Organization Name</Label>
                <Input
                  id="externalOrg"
                  value={externalOrg}
                  onChange={(e) => setExternalOrg(e.target.value)}
                  placeholder="Enter organization name"
                  required={isExternal}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose (Optional)</Label>
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Describe the purpose of this booking..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link to="/facilities">Cancel</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || selectedFacilities.length === 0}
            className="bg-gradient-primary"
          >
            {isSubmitting ? "Submitting..." : "Submit Booking"}
          </Button>
        </div>
      </form>
    </div>
  );
}