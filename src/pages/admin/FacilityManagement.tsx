import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { facilityApi } from "@/utils/api";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  MapPin,
  Users,
  Clock,
  QrCode,
  Shield,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  Download,
  Eye
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Facility, FacilityType } from "@/types";
import { useToast } from "@/hooks/use-toast";

const mockFacilities: Facility[] = []; // kept placeholder empty array in case referenced elsewhere
const facilityTypeColors: Record<FacilityType, string> = {
  PROJECTOR: "bg-blue-100 text-blue-800",
  LAB: "bg-purple-100 text-purple-800",
  BUS: "bg-orange-100 text-orange-800",
  HOSTEL: "bg-green-100 text-green-800",
  HALL: "bg-indigo-100 text-indigo-800",
  CLASSROOM: "bg-gray-100 text-gray-800",
  CONFERENCE_ROOM: "bg-emerald-100 text-emerald-800"
};

export default function FacilityManagement() {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [newFacility, setNewFacility] = useState<any>({
    name: "",
    type: "CLASSROOM" as FacilityType,
    location: "",
    capacity: 1,
    description: "",
    isRestricted: false,
    qrEnabled: true,
    minBookingMinutes: 60,
    maxBookingMinutes: 480,
    bufferMinutesBetween: 15,
    imageUrl: ""
  });

  // Helper to produce a short unique facility code to avoid duplicate-null index errors
  const generateFacilityCode = (name: string) => {
    const base = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'facility';
    const suffix = Date.now().toString(36).slice(-6);
    return `${base}-${suffix}`;
  };

  const { toast } = useToast();

  // Auth & fetch
  useEffect(() => {
    if (!user || !hasRole('ADMIN')) {
      // redirect non-admins away
      navigate('/');
      return;
    }

    const fetchFacilities = async () => {
      try {
        setIsLoading(true);
        const response = await facilityApi.getAll();
        if (response && response.success) {
          setFacilities(response.data || []);
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to fetch facilities',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacilities();
  }, [user, hasRole, navigate]);

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         facility.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || facility.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewFacility(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddFacility = async () => {
    try {
      // If image uploading is supported by backend, handle that separately. For now send JSON data.
      const facilityData = { ...newFacility };

      let response;
      if (editingFacility) {
        // Avoid unintentionally sending null/undefined facilityCode on updates
        if (facilityData.facilityCode === null) delete facilityData.facilityCode;
        response = await facilityApi.update(editingFacility._id, facilityData);
        if (response && response.success) {
          setFacilities(prev => prev.map(f => f._id === editingFacility._id ? response.data : f));
        }
      } else {
        // Ensure we send a unique facilityCode to avoid server-side unique index collisions on null
        if (!facilityData.facilityCode) {
          facilityData.facilityCode = generateFacilityCode(facilityData.name);
        }
        response = await facilityApi.create(facilityData);
        if (response && response.success) {
          setFacilities(prev => [...prev, response.data]);
        }
      }

      if (response && response.success) {
        toast({
          title: editingFacility ? 'Facility Updated' : 'Facility Added',
          description: `${newFacility.name} has been ${editingFacility ? 'updated' : 'added'} successfully.`,
        });

        setNewFacility({
          name: "",
          type: "CLASSROOM",
          location: "",
          capacity: 1,
          description: "",
          isRestricted: false,
          qrEnabled: true,
          minBookingMinutes: 60,
          maxBookingMinutes: 480,
          bufferMinutesBetween: 15,
          imageUrl: ""
        });
        setImageFile(null);
        setEditingFacility(null);
        setShowAddFacility(false);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to save facility', variant: 'destructive' });
    }
  };

  const handleToggleFeature = async (facilityId: string, feature: 'qrEnabled' | 'isRestricted' | 'active') => {
    try {
      const facility = facilities.find(f => f._id === facilityId);
      if (!facility) return;

      const updatedData: any = { [feature]: !facility[feature] };
      const response = await facilityApi.update(facilityId, updatedData);
      if (response && response.success) {
        setFacilities(prev => prev.map(f => f._id === facilityId ? { ...f, [feature]: !f[feature] } : f));
        toast({ title: 'Facility Updated', description: `Facility ${feature} has been toggled.` });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || `Failed to update facility ${feature}`, variant: 'destructive' });
    }
  };

  const handleEditFacility = (facility: Facility) => {
    setNewFacility({
      name: facility.name,
      type: facility.type,
      location: facility.location,
      capacity: facility.capacity,
      description: facility.description,
      isRestricted: facility.isRestricted,
      qrEnabled: facility.qrEnabled,
      minBookingMinutes: facility.minBookingMinutes,
      maxBookingMinutes: facility.maxBookingMinutes,
      bufferMinutesBetween: facility.bufferMinutesBetween,
      imageUrl: ""
    });
    setEditingFacility(facility);
    setShowAddFacility(true);
  };

  const handleDeleteFacility = async (facilityId: string, facilityName: string) => {
    try {
      const response = await facilityApi.delete(facilityId);
      if (response && response.success) {
        setFacilities(prev => prev.filter(f => f._id !== facilityId));
        toast({ title: 'Facility Deleted', description: `${facilityName} has been deleted.` });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete facility', variant: 'destructive' });
    }
  };

  const handleDownloadQR = async (facility: Facility) => {
    try {
      let blob: Blob | null = null;

      // If the server already returned a data URL for the facility QR, use it directly
      if ((facility as any).qrCodeImageUrl) {
        // fetch the data URL to convert to a blob
        const dataUrl = (facility as any).qrCodeImageUrl as string;
        const resp = await fetch(dataUrl);
        if (!resp.ok) throw new Error('Failed to read QR data URL');
        blob = await resp.blob();
      } else {
        // Fall back to authenticated endpoint (include token header)
        const token = sessionStorage.getItem('token');
        const resp = await fetch(`/api/facilities/${facility._id}/qr-code`, {
          headers: token ? { Authorization: `Bearer ${token}`, Accept: 'image/png' } : { Accept: 'image/png' }
        });
        if (!resp.ok) throw new Error('Failed to download QR');
        blob = await resp.blob();
      }

      if (!blob) throw new Error('No QR image available');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${facility.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'QR Code Downloaded', description: `QR code for ${facility.name} downloaded.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to download QR', variant: 'destructive' });
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Facility Management</h1>
          <p className="text-muted-foreground">
            Manage university facilities, settings, and availability.
          </p>
        </div>
        <Dialog open={showAddFacility} onOpenChange={setShowAddFacility}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Facility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFacility ? 'Edit Facility' : 'Add New Facility'}</DialogTitle>
              <DialogDescription>
                {editingFacility ? 'Update facility information.' : 'Create a new facility in the system.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Facility Image</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  {newFacility.imageUrl && (
                    <img 
                      src={newFacility.imageUrl} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Facility Name</Label>
                <Input
                  id="name"
                  value={newFacility.name}
                  onChange={(e) => setNewFacility(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter facility name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={newFacility.type} onValueChange={(value: FacilityType) => setNewFacility(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLASSROOM">Classroom</SelectItem>
                      <SelectItem value="CONFERENCE_ROOM">Conference Room</SelectItem>
                      <SelectItem value="LAB">Laboratory</SelectItem>
                      <SelectItem value="PROJECTOR">Projector</SelectItem>
                      <SelectItem value="HALL">Hall</SelectItem>
                      <SelectItem value="BUS">Bus</SelectItem>
                      <SelectItem value="HOSTEL">Hostel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={newFacility.capacity}
                    onChange={(e) => setNewFacility(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newFacility.location}
                  onChange={(e) => setNewFacility(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Building, floor, room number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newFacility.description}
                  onChange={(e) => setNewFacility(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the facility..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minDuration">Min Duration (minutes)</Label>
                  <Input
                    id="minDuration"
                    type="number"
                    min="15"
                    value={newFacility.minBookingMinutes}
                    onChange={(e) => setNewFacility(prev => ({ ...prev, minBookingMinutes: parseInt(e.target.value) || 60 }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxDuration">Max Duration (minutes)</Label>
                  <Input
                    id="maxDuration"
                    type="number"
                    min="30"
                    value={newFacility.maxBookingMinutes}
                    onChange={(e) => setNewFacility(prev => ({ ...prev, maxBookingMinutes: parseInt(e.target.value) || 480 }))}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="restricted">Restricted Facility</Label>
                  <Switch
                    id="restricted"
                    checked={newFacility.isRestricted}
                    onCheckedChange={(checked) => setNewFacility(prev => ({ ...prev, isRestricted: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="qr">QR Check-in Enabled</Label>
                    <p className="text-xs text-muted-foreground">Generates PNG QR code</p>
                  </div>
                  <Switch
                    id="qr"
                    checked={newFacility.qrEnabled}
                    onCheckedChange={(checked) => setNewFacility(prev => ({ ...prev, qrEnabled: checked }))}
                  />
                </div>
              </div>
              
              <Button onClick={handleAddFacility} className="w-full">
                {editingFacility ? 'Update Facility' : 'Add Facility'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Facilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search facilities or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PROJECTOR">Projectors</SelectItem>
                <SelectItem value="LAB">Laboratories</SelectItem>
                <SelectItem value="CONFERENCE_ROOM">Conference Rooms</SelectItem>
                <SelectItem value="CLASSROOM">Classrooms</SelectItem>
                <SelectItem value="HALL">Halls</SelectItem>
                <SelectItem value="BUS">Buses</SelectItem>
                <SelectItem value="HOSTEL">Hostels</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFacilities.map((facility) => {
          const facilityImage = facility.imageUrl; // only use actual imageUrl; no default fallback
          
          return (
            <Card key={facility._id} className="shadow-card hover:shadow-hover transition-all overflow-hidden">
              {/* Facility Image */}
              {facilityImage ? (
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
              ) : (
                <div className="relative h-48 w-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
              )}

              <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-lg">{facility.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {facility.location}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditFacility(facility)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Facility
                    </DropdownMenuItem>
                    {facility.qrEnabled && (
                      <DropdownMenuItem onClick={() => handleDownloadQR(facility)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download QR Code
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => handleDeleteFacility(facility._id, facility.name)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Facility
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex gap-2 mt-2">
                <Badge className={facilityTypeColors[facility.type]}>
                  {facility.type.replace('_', ' ')}
                </Badge>
                {facility.isRestricted && (
                  <Badge variant="outline" className="text-warning border-warning">
                    <Shield className="h-3 w-3 mr-1" />
                    Restricted
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <CardDescription>{facility.description}</CardDescription>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Capacity
                  </span>
                  <span className="font-medium">{facility.capacity}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Duration Range
                  </span>
                  <span className="font-medium">
                    {formatDuration(facility.minBookingMinutes)} - {formatDuration(facility.maxBookingMinutes)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFeature(facility._id, 'active')}
                    className="p-0 h-auto"
                  >
                    {facility.active ? (
                      <ToggleRight className="h-5 w-5 text-accent" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">QR Check-in</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFeature(facility._id, 'qrEnabled')}
                    className="p-0 h-auto"
                  >
                    {facility.qrEnabled ? (
                      <ToggleRight className="h-5 w-5 text-accent" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Restricted</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFeature(facility._id, 'isRestricted')}
                    className="p-0 h-auto"
                  >
                    {facility.isRestricted ? (
                      <ToggleRight className="h-5 w-5 text-warning" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl p-0">
          <div className="relative">
            <img 
              src={selectedImage} 
              alt="Facility" 
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {filteredFacilities.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No facilities found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria.
            </p>
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedType("all");
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
