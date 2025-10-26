import { useState, useEffect } from "react";
import { Bell, Check, Clock, AlertTriangle, Info, X, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'READ';
type NotificationType = 'BOOKING_CONFIRMED' | 'BOOKING_APPROVED' | 'BOOKING_REJECTED' | 'REMINDER_START' | 'REMINDER_END' | 'OVERDUE' | 'CHECK_IN_REMINDER' | 'FEEDBACK_REQUEST' | 'ADMIN_DIGEST';

interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  read: boolean;
  createdAt: string;
  bookingId?: string;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    _id: "1",
    type: "BOOKING_CONFIRMED",
    title: "Booking Confirmed",
    message: "Your booking for Conference Room A has been confirmed for today at 2:00 PM.",
    status: "SENT",
    read: false,
    createdAt: "2024-01-20T10:00:00Z",
    bookingId: "booking1"
  },
  {
    _id: "2", 
    type: "REMINDER_START",
    title: "Booking Reminder",
    message: "Your booking starts in 30 minutes. Please arrive on time.",
    status: "SENT",
    read: true,
    createdAt: "2024-01-20T13:30:00Z",
    bookingId: "booking1"
  },
  {
    _id: "3",
    type: "BOOKING_APPROVED",
    title: "Booking Approved",
    message: "Your booking request for University Bus #1 has been approved by admin.",
    status: "SENT",
    read: false,
    createdAt: "2024-01-19T15:20:00Z",
    bookingId: "booking2"
  }
];

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

export function NotificationModal({ open, onOpenChange, userId }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (open && userId) {
      loadNotifications();
    }
  }, [open, userId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data);
          setUnreadCount(data.data.filter((n: any) => !n.read).length);
        }
      } else {
        // Fallback to mock data
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Fallback to mock data
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // TODO(INTEGRATION:API): Replace with actual API call
      /*
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      */
      
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, status: 'READ' as NotificationStatus } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // TODO(INTEGRATION:API): Replace with actual API call
      /*
      await fetch(`/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ userId })
      });
      */
      
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, status: 'READ' as NotificationStatus }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_APPROVED':
        return <Check className="h-4 w-4 text-accent" />;
      case 'BOOKING_REJECTED':
        return <X className="h-4 w-4 text-destructive" />;
      case 'REMINDER_START':
      case 'REMINDER_END':
      case 'CHECK_IN_REMINDER':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'OVERDUE':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'FEEDBACK_REQUEST':
      case 'ADMIN_DIGEST':
        return <Info className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_APPROVED':
        return 'border-l-accent';
      case 'BOOKING_REJECTED':
      case 'OVERDUE':
        return 'border-l-destructive';
      case 'REMINDER_START':
      case 'REMINDER_END':
      case 'CHECK_IN_REMINDER':
        return 'border-l-warning';
      default:
        return 'border-l-primary';
    }
  };

  const totalUnread = notifications.filter(n => !n.read).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {totalUnread}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification, index) => (
                <div key={notification._id}>
                  <div
                    className={`p-3 rounded-lg border-l-4 cursor-pointer transition-colors ${
                      getNotificationColor(notification.type)
                    } ${
                      notification.status === 'READ'
                        ? 'bg-muted/30'
                        : 'bg-background hover:bg-muted/50'
                    }`}
                    onClick={() => markAsRead(notification._id)}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${
                            notification.status === 'READ' ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {notification.title}
                          </h4>
                          {notification.status !== 'READ' && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                        <p className={`text-xs ${
                          notification.status === 'READ' ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < notifications.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}