import { useState, useEffect } from "react";
import { 
  Building2, 
  MapPin, 
  Users, 
  Clock, 
  QrCode, 
  Shield, 
  Filter,
  Search,
  Eye
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Facility, FacilityType } from "@/types";
import { facilityApi } from "@/utils/api";
import { Link } from "react-router-dom";

// Facilities state will be fetched from the API

const facilityTypeColors: Record<FacilityType, string> = {
  PROJECTOR: "bg-blue-100 text-blue-800",
  LAB: "bg-purple-100 text-purple-800",
  BUS: "bg-orange-100 text-orange-800",
  HOSTEL: "bg-green-100 text-green-800",
  HALL: "bg-indigo-100 text-indigo-800",
  CLASSROOM: "bg-gray-100 text-gray-800",
  CONFERENCE_ROOM: "bg-emerald-100 text-emerald-800"
};

export default function Facilities() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchFacilities = async () => {
      setIsLoading(true);
      try {
        const resp = await facilityApi.getAll({ limit: 1000 });
        if (resp && resp.success && mounted) {
          setFacilities(resp.data || []);
        } else if (mounted) {
          setError('Failed to load facilities');
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load facilities');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchFacilities();
    return () => { mounted = false; };
  }, []);

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         facility.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || facility.type === selectedType;
    const matchesAvailability = !showAvailableOnly || facility.active;
    
    return matchesSearch && matchesType && matchesAvailability;
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Facilities</h1>
        <p className="text-muted-foreground">
          Browse and book university facilities for your needs.
        </p>
      </div>

      {/* Filters */}
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

            <Button
              variant={showAvailableOnly ? "default" : "outline"}
              onClick={() => setShowAvailableOnly(!showAvailableOnly)}
              className="whitespace-nowrap"
            >
              Available Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {filteredFacilities.length} facilities found
        </p>
        <Button asChild>
          <Link to="/booking/new">New Booking</Link>
        </Button>
      </div>

      {/* Facilities Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFacilities.map((facility) => {
          const facilityImage = facility.imageUrl || `https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=300&fit=crop`;
          
          return (
            <Card key={facility._id} className="shadow-card hover:shadow-hover transition-all group overflow-hidden">
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
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {facility.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {facility.location}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
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
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <CardDescription>{facility.description}</CardDescription>
              
              {/* Facility Details */}
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
                    Min/Max Duration
                  </span>
                  <span className="font-medium">
                    {formatDuration(facility.minBookingMinutes)} - {formatDuration(facility.maxBookingMinutes)}
                  </span>
                </div>

                {facility.qrEnabled && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <QrCode className="h-4 w-4" />
                      QR Check-in
                    </span>
                    <Badge variant="outline" className="bg-accent-soft text-accent">
                      Enabled
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1 bg-gradient-primary" 
                  asChild
                >
                  <Link to={`/booking/new?facility=${facility._id}`}>
                    Book Now
                  </Link>
                </Button>
                <Button variant="outline" size="icon" title="View Details">
                  <Building2 className="h-4 w-4" />
                </Button>
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
              setShowAvailableOnly(false);
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}