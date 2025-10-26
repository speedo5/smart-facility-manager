import { useState, useEffect } from "react";
import { 
  Building2, 
  Calendar, 
  Clock, 
  User, 
  MapPin,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { bookingApi, facilityApi } from "@/utils/api";


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BookingRequest, ExternalBookingDetails } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

export default function ExternalBooking() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        setIsLoadingFacilities(true);
        const response = await facilityApi.getAll({ 
          active: true,
          externalBookingEnabled: true,
          maintenanceMode: false,
          availableNow: true
        });
        if (response.success) {
          setFacilities(response.data.filter((f: any) => {
            const now = new Date();
            const startAvailable = !f.availabilityStart || new Date(f.availabilityStart) <= now;
            const endAvailable = !f.availabilityEnd || new Date(f.availabilityEnd) >= now;
            return startAvailable && endAvailable;
          }));
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to load facilities",
          variant: "destructive"
        });
      } finally {
        setIsLoadingFacilities(false);
      }
    };

    fetchFacilities();
  }, []);
  const [formData, setFormData] = useState({
    // Organization Details
    organizationName: "",
    contactPerson: "",
    email: "",
    phone: "",
    organizationType: "",
    
    // Booking Details
    facilityId: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    eventType: "",
    eventDescription: "",
    expectedAttendees: "",
    
    // Additional Information
    cateringRequired: false,
    equipmentNeeded: "",
    specialRequirements: "",
    
    // KYC-lite Information
    organizationAddress: "",
    contactIdNumber: "",
    emergencyContact: "",
    previousBookings: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Required fields validation
    if (!formData.organizationName) errors.push("Organization name is required");
    if (!formData.contactPerson) errors.push("Contact person is required");
    if (!formData.email) errors.push("Email is required");
    if (!formData.phone) errors.push("Phone number is required");
    if (!formData.facilityId) errors.push("Please select a facility");
    if (!formData.startDate) errors.push("Start date is required");
    if (!formData.startTime) errors.push("Start time is required");
    if (!formData.endTime) errors.push("End time is required");
    if (!formData.eventDescription) errors.push("Event description is required");
    if (!formData.organizationAddress) errors.push("Organization address is required");
    if (!formData.contactIdNumber) errors.push("Contact ID number is required");
    
    // Time validation
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errors.push("End time must be after start time");
    }
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push("Please enter a valid email address");
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
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
      const actualEndDate = formData.endDate || formData.startDate;
      const bookingRequest: BookingRequest = {
        facilityIds: [formData.facilityId],
        startTime: `${formData.startDate}T${formData.startTime}:00Z`,
        endTime: `${actualEndDate}T${formData.endTime}:00Z`,
        isExternal: true,
        externalOrg: formData.organizationName,
        // Include additional external booking details
        externalDetails: {
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          organizationType: formData.organizationType,
          organizationAddress: formData.organizationAddress,
          contactIdNumber: formData.contactIdNumber,
          emergencyContact: formData.emergencyContact,
          eventType: formData.eventType,
          eventDescription: formData.eventDescription,
          expectedAttendees: formData.expectedAttendees,
          cateringRequired: formData.cateringRequired,
          equipmentNeeded: formData.equipmentNeeded,
          specialRequirements: formData.specialRequirements,
          previousBookings: formData.previousBookings
        }
      };
      
      const response = await bookingApi.create(bookingRequest);
      
      if (response.success) {
        toast({
          title: "Booking Submitted!",
          description: "Your external booking request has been submitted for admin approval. You will be contacted within 24-48 hours.",
        });
      
        // Reset form
        setFormData({
          organizationName: "",
          contactPerson: "",
          email: "",
          phone: "",
          organizationType: "",
          facilityId: "",
          startDate: "",
          endDate: "",
          startTime: "",
          endTime: "",
          eventType: "",
          eventDescription: "",
          expectedAttendees: "",
          cateringRequired: false,
          equipmentNeeded: "",
          specialRequirements: "",
          organizationAddress: "",
          contactIdNumber: "",
          emergencyContact: "",
          previousBookings: false
        });
      }
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit booking request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFacility = facilities.find(f => f._id === formData.facilityId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">External Booking</h1>
        <p className="text-muted-foreground">
          Submit a facility booking request for external organizations and community groups.
        </p>
      </div>

      {/* Important Notice */}
      <Card className="shadow-card border-warning/20 bg-warning-soft">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-warning">Important Notice</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All external bookings require admin approval</li>
                <li>• Processing time: 24-48 hours for standard requests</li>
                <li>• Advance booking required (minimum 7 days)</li>
                <li>• Additional fees may apply for external organizations</li>
                <li>• Valid identification and documentation required</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Information */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Information
            </CardTitle>
            <CardDescription>
              Provide details about your organization or group
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name *</Label>
                <Input
                  id="orgName"
                  value={formData.organizationName}
                  onChange={(e) => handleInputChange('organizationName', e.target.value)}
                  placeholder="Enter organization name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orgType">Organization Type</Label>
                <Select value={formData.organizationType} onValueChange={(value) => handleInputChange('organizationType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nonprofit">Non-Profit</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="community">Community Group</SelectItem>
                    <SelectItem value="research">Research Organization</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="orgAddress">Organization Address *</Label>
              <Textarea
                id="orgAddress"
                value={formData.organizationAddress}
                onChange={(e) => handleInputChange('organizationAddress', e.target.value)}
                placeholder="Enter complete organization address"
                rows={2}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Primary contact person for this booking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  placeholder="Full name of contact person"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactId">Contact ID Number *</Label>
                <Input
                  id="contactId"
                  value={formData.contactIdNumber}
                  onChange={(e) => handleInputChange('contactIdNumber', e.target.value)}
                  placeholder="Driver's license, passport, or national ID"
                  required
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contact@organization.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input
                id="emergencyContact"
                value={formData.emergencyContact}
                onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                placeholder="Name and phone number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Facility & Schedule */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Facility & Schedule
            </CardTitle>
            <CardDescription>
              Select the facility and time for your event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facility">Facility *</Label>
              <Select value={formData.facilityId} onValueChange={(value) => handleInputChange('facilityId', value)}>
                <SelectTrigger disabled={isLoadingFacilities}>
                  <SelectValue placeholder={isLoadingFacilities ? "Loading facilities..." : "Select a facility"} />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((facility) => (
                    <SelectItem key={facility._id} value={facility._id}>
                      {facility.name} - {facility.type.replace('_', ' ')} - Capacity {facility.capacity} - {facility.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoadingFacilities && (
                <p className="text-xs text-muted-foreground mt-1">Loading available facilities...</p>
              )}
              {!isLoadingFacilities && facilities.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No facilities available for external booking</p>
              )}
            </div>
            
            {selectedFacility && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedFacility.name}</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    {selectedFacility.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Capacity: {selectedFacility.capacity}
                  </div>
                  {selectedFacility.hourlyRate > 0 && (
                    <div className="text-sm font-medium text-foreground">
                      Hourly Rate: ${selectedFacility.hourlyRate}
                    </div>
                  )}
                  <p>{selectedFacility.description}</p>
                  {selectedFacility.features?.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium mb-1">Features:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedFacility.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedFacility.equipment?.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium mb-1">Available Equipment:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedFacility.equipment.map((item, index) => (
                          <li key={index}>
                            {item.name} (Qty: {item.quantity}) - {item.condition.replace('_', ' ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2 text-xs">
                    <p>Minimum booking duration: {selectedFacility.minBookingMinutes} minutes</p>
                    <p>Maximum booking duration: {selectedFacility.maxBookingMinutes} minutes</p>
                    {selectedFacility.bufferMinutesBetween > 0 && (
                      <p>Buffer time between bookings: {selectedFacility.bufferMinutesBetween} minutes</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  min={format(addDays(new Date(), 7), 'yyyy-MM-dd')} // Minimum 7 days advance
                  max={format(addDays(new Date(), 180), 'yyyy-MM-dd')} // Maximum 6 months ahead
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  min={formData.startDate || format(addDays(new Date(), 7), 'yyyy-MM-dd')}
                  max={format(addDays(new Date(), 180), 'yyyy-MM-dd')}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for single-day booking
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Event Details
            </CardTitle>
            <CardDescription>
              Provide information about your event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={formData.eventType} onValueChange={(value) => handleInputChange('eventType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="exhibition">Exhibition</SelectItem>
                    <SelectItem value="social">Social Event</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attendees">Expected Attendees</Label>
                <Input
                  id="attendees"
                  type="number"
                  min="1"
                  value={formData.expectedAttendees}
                  onChange={(e) => handleInputChange('expectedAttendees', e.target.value)}
                  placeholder="Number of attendees"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventDescription">Event Description *</Label>
              <Textarea
                id="eventDescription"
                value={formData.eventDescription}
                onChange={(e) => handleInputChange('eventDescription', e.target.value)}
                placeholder="Provide a detailed description of your event, including purpose, agenda, and any special requirements..."
                rows={4}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment Needed</Label>
              <Textarea
                id="equipment"
                value={formData.equipmentNeeded}
                onChange={(e) => handleInputChange('equipmentNeeded', e.target.value)}
                placeholder="List any audio/visual or other equipment you need (projector, microphones, etc.)"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialReq">Special Requirements</Label>
              <Textarea
                id="specialReq"
                value={formData.specialRequirements}
                onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                placeholder="Any accessibility needs, setup requirements, or other special considerations"
                rows={2}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="catering"
                checked={formData.cateringRequired}
                onCheckedChange={(checked) => handleInputChange('cateringRequired', checked === true)}
              />
              <Label htmlFor="catering">Catering services required</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="previous"
                checked={formData.previousBookings}
                onCheckedChange={(checked) => handleInputChange('previousBookings', checked === true)}
              />
              <Label htmlFor="previous">We have made bookings with this university before</Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-gradient-primary"
          >
            {isSubmitting ? "Submitting..." : "Submit Booking Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}