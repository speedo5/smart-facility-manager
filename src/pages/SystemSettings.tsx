import { useState } from "react";
import { 
  Settings, 
  Clock, 
  Bell, 
  Mail, 
  Shield, 
  Calendar,
  Users,
  Building2,
  Save,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemSettings, FacilityType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { systemSettingsApi } from "@/utils/api";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { hasRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const resp = await systemSettingsApi.get();
        if (resp && resp.success && mounted) {
          setSettings(resp.data);
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Failed to load settings', variant: 'destructive' });
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Redirect if not admin
  if (!hasRole('ADMIN')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">
            You need administrator privileges to access system settings.
          </p>
        </div>
      </div>
    );
  }

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...(prev || {}), [key]: value } as SystemSettings));
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);

    try {
      const resp = await systemSettingsApi.update(settings);
      if (resp && resp.success) {
        toast({ title: 'Settings Saved', description: 'System settings have been updated successfully.' });
        setSettings(resp.data);
      } else {
        throw new Error(resp?.message || 'Failed to save settings');
      }
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message || 'Failed to save settings. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and policies for the facility booking system.
          </p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving} className="bg-gradient-primary">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
          <TabsTrigger value="external">External Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Auto Approval Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Auto Approval
              </CardTitle>
              <CardDescription>
                Configure automatic approval for facility bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="autoApproval">Enable Auto Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve bookings for unrestricted facilities when no conflicts exist
                  </p>
                </div>
                <Switch
                  id="autoApproval"
                  checked={!!settings?.autoApprovalEnabled}
                  onCheckedChange={(checked) => handleSettingChange('autoApprovalEnabled', checked)}
                />
              </div>
              
              {!settings?.autoApprovalEnabled && (
                <div className="p-3 bg-warning-soft border border-warning/20 rounded-lg">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Manual Approval Only</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    All bookings will require manual admin approval
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time & Duration Settings
              </CardTitle>
              <CardDescription>
                Configure time-related policies and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="overdueGrace">Overdue Grace Period (minutes)</Label>
                <Input
                  id="overdueGrace"
                  type="number"
                  min="0"
                  max="60"
                  value={settings?.overdueGraceMinutes ?? 0}
                  onChange={(e) => handleSettingChange('overdueGraceMinutes', parseInt(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">
                  How long after the booking end time before marking as overdue
                </p>
              </div>
            </CardContent>
          </Card>

          {/* User Limits */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Limits
              </CardTitle>
              <CardDescription>
                Set limits on user booking behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dailyLimit">Daily Booking Limit per User</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  min="1"
                  max="20"
                  value={settings?.dailyBookingLimitPerUser ?? ""}
                  onChange={(e) => handleSettingChange('dailyBookingLimitPerUser', parseInt(e.target.value) || undefined)}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of bookings a user can make per day (leave empty for no limit)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* Notification Timing */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Timing
              </CardTitle>
              <CardDescription>
                Configure when to send booking reminders and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reminderStart">Reminder Before Start (minutes)</Label>
                  <Select 
                    value={(settings?.reminderBeforeStartMinutes ?? 15).toString()} 
                      onValueChange={(value) => handleSettingChange('reminderBeforeStartMinutes', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="1440">1 day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reminderEnd">Reminder Before End (minutes)</Label>
                  <Select 
                    value={(settings?.reminderBeforeEndMinutes ?? 5).toString()} 
                      onValueChange={(value) => handleSettingChange('reminderBeforeEndMinutes', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communication Channels */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Communication Channels
              </CardTitle>
              <CardDescription>
                Configure available notification methods (requires integration setup)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications via SMS (requires SMS integration)</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Email and SMS integrations need to be configured in the backend 
                  for notifications to be sent. Current settings are for display purposes only.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restrictions" className="space-y-6">
          {/* Restricted Facility Types */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Restricted Facility Types
              </CardTitle>
              <CardDescription>
                Facility types that always require admin approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {(['PROJECTOR', 'LAB', 'CONFERENCE_ROOM', 'CLASSROOM', 'HALL', 'BUS', 'HOSTEL'] as FacilityType[]).map((type) => (
                  <div key={type} className="flex items-center justify-between">
                    <Label className="capitalize">{type.replace('_', ' ').toLowerCase()}</Label>
                    <Switch
                      checked={(settings?.restrictedTypes || []).includes(type)}
                      onCheckedChange={(checked) => {
                        const current = settings?.restrictedTypes || [];
                        if (checked) {
                          handleSettingChange('restrictedTypes', [...current, type]);
                        } else {
                          handleSettingChange('restrictedTypes', current.filter((t: string) => t !== type));
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
              
              <div className="p-3 bg-primary-soft rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Individual facilities can also be marked as restricted 
                  regardless of their type in the Facility Management section.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="space-y-6">
          {/* External Booking Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                External Booking Policy
              </CardTitle>
              <CardDescription>
                Configure policies for external organization bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="externalEnabled">Enable External Bookings</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow external organizations to submit booking requests
                  </p>
                </div>
                <Switch
                  id="externalEnabled"
                  checked={!!settings?.externalBookingsEnabled}
                  onCheckedChange={(checked) => handleSettingChange('externalBookingsEnabled', checked)}
                />
              </div>
              
              {settings?.externalBookingsEnabled && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="externalWindow">Booking Window (days in advance)</Label>
                    <Input
                      id="externalWindow"
                      type="number"
                      min="7"
                      max="365"
                      value={settings?.allowedExternalWindowDays ?? 180}
                      onChange={(e) => handleSettingChange('allowedExternalWindowDays', parseInt(e.target.value) || 180)}
                    />
                    <p className="text-sm text-muted-foreground">
                      How far in advance external organizations can book facilities
                    </p>
                  </div>
                </div>
              )}
              
              {!settings?.externalBookingsEnabled && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    External booking form will be disabled when this setting is turned off.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* External Booking Requirements */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>External Booking Requirements</CardTitle>
              <CardDescription>
                Requirements and policies for external organizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Require Admin Approval</Label>
                  <Switch defaultChecked disabled />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Require KYC Documentation</Label>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Advance Booking Required (minimum 7 days)</Label>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <div className="p-3 bg-accent-soft rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Security Note:</strong> All external bookings always require admin approval 
                  for security and verification purposes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}