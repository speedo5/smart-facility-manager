import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Bell
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { userApi } from "@/utils/api";
import { format } from "date-fns";
import { NotificationModal } from "@/components/ui/notification-modal";
import { ChangePasswordModal } from "@/components/ui/change-password-modal";

export default function Profile() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    department: user?.department || "",
    studentId: user?.studentId || "",
    staffId: user?.staffId || ""
  });

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?._id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await userApi.getById(user._id);
        if (response.success && response.data) {
          const userData = response.data;
          setFormData({
            fullName: userData.fullName || "",
            email: userData.email || "",
            phone: userData.phone || "",
            bio: userData.bio || "",
            department: userData.department || "",
            studentId: userData.studentId || "",
            staffId: userData.staffId || ""
          });
          // Update the user context with the latest data
          setUser(userData);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [user?._id, setUser]);

  const handleSave = async () => {
    if (!user?._id) return;
    
    try {
      setIsLoading(true);
      // Strip out empty studentId/staffId values
      const updateData = { ...formData };
      if (!updateData.studentId) delete updateData.studentId;
      if (!updateData.staffId) delete updateData.staffId;
      
      const response = await userApi.update(user._id, updateData);
      
      if (response.success) {
        // Re-fetch the user to ensure context matches DB
        try {
          const refreshed = await userApi.getById(user._id);
          if (refreshed.success && refreshed.data) {
            setUser(refreshed.data);
            // Update form data from refreshed user
            setFormData({
              fullName: refreshed.data.fullName || "",
              email: refreshed.data.email || "",
              phone: refreshed.data.phone || "",
              bio: refreshed.data.bio || "",
              department: refreshed.data.department || "",
              studentId: refreshed.data.studentId || "",
              staffId: refreshed.data.staffId || ""
            });
          } else {
            // Fall back to server response if getById didn't return data
            setUser({ ...user, ...response.data });
          }

          setIsEditing(false);
          toast({
            title: "Profile Updated",
            description: "Your profile has been updated successfully.",
          });
        } catch (err2: any) {
          // If refresh fails, still use response data
          setUser({ ...user, ...response.data });
          setIsEditing(false);
          toast({
            title: "Profile Updated",
            description: "Your profile has been updated (could not refresh).",
          });
        }
      }
    } catch (error: any) {
      let errorMessage = "Failed to update profile";
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.detail || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!user) return;
    
    // Reset to the current user data
    setFormData({
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      bio: user.bio || "",
      department: user.department || "",
      studentId: user.studentId || "",
      staffId: user.staffId || ""
    });
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences.
          </p>
        </div>
        {isLoading && (
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading...
          </div>
        )}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowNotifications(true)}
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </Button>
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)} 
              className="bg-gradient-primary"
              disabled={isLoading}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                className="bg-gradient-primary"
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your basic account information and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">
                  {user.fullName.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{user.fullName}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.email}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>

              {isEditing && (
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Details
            </CardTitle>
            <CardDescription>
              Your account status and additional information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <Label>Role</Label>
                <Badge variant="outline" className="capitalize">
                  {user.role.toLowerCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <Label>Account Status</Label>
                <Badge className={user.status === 'ACTIVE' ? 'bg-accent text-accent-foreground' : 'bg-destructive text-destructive-foreground'}>
                  {user.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <Label>Verification Status</Label>
                <Badge className={user.isVerified ? 'bg-accent text-accent-foreground' : 'bg-warning text-warning-foreground'}>
                  {user.isVerified ? 'Verified' : 'Pending Verification'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <Label>Member Since</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="space-y-3 pt-4 border-t">
                {user.role === 'STUDENT' && (
                  <div>
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      value={formData.studentId || ""}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        studentId: e.target.value || null // Convert empty string to null
                      }))}
                      placeholder="Enter student ID (optional)"
                    />
                  </div>
                )}

                {user.role === 'STAFF' && (
                  <div>
                    <Label htmlFor="staffId">Staff ID</Label>
                    <Input
                      id="staffId"
                      value={formData.staffId || ""}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        staffId: e.target.value || null // Convert empty string to null
                      }))}
                      placeholder="Enter staff ID (optional)"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Enter department"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Manage your account security and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Password</h4>
                <p className="text-sm text-muted-foreground">Last updated 30 days ago</p>
              </div>
              <Button 
                variant="outline"
                onClick={() => setShowChangePassword(true)}
              >
                Change Password
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" disabled>
                Enable 2FA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <NotificationModal 
        open={showNotifications}
        onOpenChange={setShowNotifications}
        userId={user._id}
      />
      
      <ChangePasswordModal
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        userId={user._id}
      />
    </div>
  );
}