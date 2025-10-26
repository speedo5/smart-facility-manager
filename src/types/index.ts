export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN' | 'EXTERNAL';

export type BookingStatus = 
  | 'PENDING' 
  | 'PENDING_ADMIN' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CANCELLED' 
  | 'CHECKED_IN' 
  | 'CHECKED_OUT' 
  | 'EXPIRED';

export type FacilityType = 
  | 'PROJECTOR' 
  | 'LAB' 
  | 'BUS' 
  | 'HOSTEL' 
  | 'HALL' 
  | 'CLASSROOM' 
  | 'CONFERENCE_ROOM';

export interface User {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  bio?: string;
  department?: string;
  studentId?: string;
  staffId?: string;
  lastPasswordChange?: string;
}

export interface Facility {
  _id: string;
  name: string;
  type: FacilityType;
  location: string;
  capacity: number;
  description: string;
  isRestricted: boolean;
  qrEnabled: boolean;
  minBookingMinutes: number;
  maxBookingMinutes: number;
  bufferMinutesBetween: number;
  active: boolean;
  imageUrl?: string;
  qrCodeImageUrl?: string;
  externalBookingEnabled?: boolean;
  availabilityStart?: string;
  availabilityEnd?: string;
  hourlyRate?: number;
  features?: string[];
  equipment?: Array<{ name: string; quantity: number; condition: string }>;
  contactPerson?: { name?: string; phone?: string; email?: string };
  maintenanceMode?: boolean;
  facilityCode?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  _id: string;
  userId: string;
  user?: User;
  facilities: string[];
  facilitiesData?: Facility[];
  startTime: string;
  endTime: string;
  status: BookingStatus;
  approval?: {
    type: 'AUTO' | 'MANUAL';
    by?: string;
    at?: string;
    notes?: string;
  };
  isExternal: boolean;
  externalOrg?: string;
  checkInCode?: string;
  qrCodeUrl?: string;
  checkInAt?: string;
  checkOutAt?: string;
  notifications: Array<{
    type: 'REMINDER_START' | 'REMINDER_END' | 'OVERDUE' | 'ADMIN_DIGEST';
    sentAt: string;
    channel: 'EMAIL' | 'SMS';
    success: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
  audit: Array<{
    action: string;
    by: string;
    at: string;
  }>;
}

export interface Feedback {
  _id: string;
  bookingId: string;
  userId: string;
  facilities: string[];
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SystemSettings {
  _id: string;
  autoApprovalEnabled: boolean;
  reminderBeforeStartMinutes: number;
  reminderBeforeEndMinutes: number;
  overdueGraceMinutes: number;
  externalBookingsEnabled: boolean;
  restrictedTypes: FacilityType[];
  dailyBookingLimitPerUser?: number;
  allowedExternalWindowDays?: number;
}

export interface ExternalBookingDetails {
  contactPerson: string;
  email: string;
  phone: string;
  organizationType: string;
  organizationAddress: string;
  contactIdNumber: string;
  emergencyContact?: string;
  eventType?: string;
  eventDescription: string;
  expectedAttendees?: string;
  cateringRequired: boolean;
  equipmentNeeded?: string;
  specialRequirements?: string;
  previousBookings: boolean;
}

export interface BookingRequest {
  facilityIds: string[];
  startTime: string;
  endTime: string;
  isExternal?: boolean;
  externalOrg?: string;
  externalDetails?: ExternalBookingDetails;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}