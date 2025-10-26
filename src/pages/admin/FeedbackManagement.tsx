import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Star, 
  Search, 
  Filter, 
  Calendar,
  User,
  Building2,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { feedbackApi } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";

// Feedback state (loaded from API)
const initialFeedback: any[] = [];

export default function FeedbackManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [feedbackList, setFeedbackList] = useState<any[]>(initialFeedback);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [responseMessage, setResponseMessage] = useState<string>("");
  const [isResponding, setIsResponding] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        const resp = await feedbackApi.getAll({ page: 1, limit: 50 });
        if (resp && resp.success && mounted) {
          setFeedbackList(resp.data);
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Failed to load feedback', variant: 'destructive' });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchFeedback();
    return () => { mounted = false; };
  }, []);

  const filteredFeedback = feedbackList.filter(feedback => {
    const userName = (feedback.user && feedback.user.fullName) || (feedback.userId && feedback.userId.fullName) || '';
    const commentText = (feedback.comment || '').toString();
    const facilitiesArr: string[] = Array.isArray(feedback.facilities) ? feedback.facilities : [];

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      userName.toLowerCase().includes(q) ||
      commentText.toLowerCase().includes(q) ||
      facilitiesArr.some(f => (f || '').toLowerCase().includes(q));

    const matchesRating = ratingFilter === "all" || (feedback.rating !== undefined && feedback.rating.toString() === ratingFilter);
    const matchesFacility = facilityFilter === "all" || facilitiesArr.some(f => (f || '').includes(facilityFilter));

    return matchesSearch && matchesRating && matchesFacility;
  });

  const avgRating = feedbackList.length > 0 ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length) : 0;
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => 
    feedbackList.filter(f => f.rating === rating).length
  );

  const StarDisplay = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "bg-green-100 text-green-800";
    if (rating >= 3) return "bg-yellow-100 text-yellow-800";
    if (rating >= 2) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Feedback Management</h1>
        <p className="text-muted-foreground">
          Monitor user feedback and facility ratings to improve services.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{feedbackList.length}</p>
                <p className="text-sm text-muted-foreground">Total Feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Average Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {feedbackList.length > 0 ? Math.round((ratingDistribution[3] + ratingDistribution[4]) / feedbackList.length * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Positive (4-5★)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {feedbackList.length > 0 ? Math.round((ratingDistribution[0] + ratingDistribution[1]) / feedbackList.length * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, facility, or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>

            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                <SelectItem value="Conference">Conference Rooms</SelectItem>
                <SelectItem value="Lab">Laboratories</SelectItem>
                <SelectItem value="Bus">Buses</SelectItem>
                <SelectItem value="Projector">Projectors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="shadow-card">
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Loading feedback...</h3>
              <p className="text-muted-foreground">Please wait while feedback is fetched from the server.</p>
            </CardContent>
          </Card>
        ) : filteredFeedback.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No feedback found</h3>
              <p className="text-muted-foreground">
                No feedback matches your current search criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFeedback.map((feedback) => (
            <Card key={feedback._id} className="shadow-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{(feedback.user && feedback.user.fullName) || (feedback.userId && feedback.userId.fullName) || 'Unknown User'}</span>
                          <Badge variant="outline" className="text-xs">
                            {(feedback.user && feedback.user.role) || (feedback.userId && feedback.userId.role) || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>{Array.isArray(feedback.facilities) ? feedback.facilities.join(", ") : ''}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(feedback.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StarDisplay rating={feedback.rating} />
                      <Badge className={getRatingColor(feedback.rating)}>
                        {feedback.rating}/5
                      </Badge>
                    </div>
                  </div>

                  {/* Comment */}
                  {feedback.comment && (
                    <div className="border-l-4 border-primary/20 pl-4">
                      <p className="text-muted-foreground italic">
                        "{feedback.comment}"
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`/bookings/${feedback.bookingId}`, '_blank')}>
                      View Booking
                    </Button>
                    {feedback.rating <= 2 && (
                      <Button size="sm" className="bg-gradient-primary" onClick={() => { setSelectedFeedback(feedback); setResponseMessage(''); }}>
                        Follow Up
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Respond Dialog */}
      {selectedFeedback && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-overlay absolute inset-0" onClick={() => setSelectedFeedback(null)} />
          <div className="bg-panel rounded-lg p-6 shadow-lg z-10 w-full max-w-xl">
            <h3 className="text-lg font-medium mb-2">Respond to Feedback</h3>
            <p className="text-sm text-muted-foreground mb-4">Responding to: {(selectedFeedback.user && selectedFeedback.user.fullName) || (selectedFeedback.userId && selectedFeedback.userId.fullName) || 'Unknown'} — {Array.isArray(selectedFeedback.facilities) ? selectedFeedback.facilities.join(', ') : ''}</p>
            <Textarea value={responseMessage} onChange={(e) => setResponseMessage(e.target.value)} rows={4} />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setSelectedFeedback(null)}>Cancel</Button>
              <Button className="bg-gradient-primary" onClick={async () => {
                if (!responseMessage.trim()) {
                  toast({ title: 'Validation', description: 'Please enter a response message', variant: 'destructive' });
                  return;
                }
                setIsResponding(true);
                try {
                  await feedbackApi.respond(selectedFeedback._id, responseMessage.trim());
                  toast({ title: 'Success', description: 'Response sent to user' });
                  // refresh list
                  const resp = await feedbackApi.getAll({ page: 1, limit: 50 });
                  if (resp && resp.success) setFeedbackList(resp.data);
                  setSelectedFeedback(null);
                } catch (err: any) {
                  toast({ title: 'Error', description: err.message || 'Failed to send response', variant: 'destructive' });
                } finally {
                  setIsResponding(false);
                }
              }}>{isResponding ? 'Sending...' : 'Send Response'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}