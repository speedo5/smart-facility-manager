import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bookingApi, feedbackApi } from "@/utils/api";

export default function Feedback() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [booking, setBooking] = useState<any | null>(null);
  const [loadingBooking, setLoadingBooking] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const fetchBooking = async () => {
      if (!bookingId) return;
      setLoadingBooking(true);
      try {
        const resp = await bookingApi.getById(bookingId as string);
        if (resp && resp.success && mounted) {
          setBooking(resp.data);
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Failed to load booking', variant: 'destructive' });
      } finally {
        if (mounted) setLoadingBooking(false);
      }
    };

    fetchBooking();
    return () => { mounted = false; };
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide a rating before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (!bookingId) {
      toast({ title: 'Error', description: 'Invalid booking reference', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      await feedbackApi.create({
        bookingId,
        rating,
        comment
      });

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It helps us improve our services.",
      });

      navigate("/bookings");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = () => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHoveredRating(star)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => setRating(star)}
          className="p-1 transition-colors hover:scale-110"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              star <= (hoveredRating || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/bookings")}
          className="mb-4 -ml-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Bookings
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Provide Feedback</h1>
        <p className="text-muted-foreground">
          Help us improve by sharing your experience with the facilities.
        </p>
      </div>

      {/* Booking Details */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>
            Your recent booking that has been completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loadingBooking ? (
              <div className="text-muted-foreground">Loading booking...</div>
            ) : booking ? (
              <>
                <div>
                  <span className="font-medium">Facilities: </span>
                  <span className="text-muted-foreground">{(booking.facilities || []).map((f: any) => f.name || f).join(', ')}</span>
                </div>
                <div>
                  <span className="font-medium">Duration: </span>
                  <span className="text-muted-foreground">
                    {booking.startTime ? new Date(booking.startTime).toLocaleString() : 'N/A'} - {booking.endTime ? new Date(booking.endTime).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Status: </span>
                  <span className="text-muted-foreground">{booking.status || 'Unknown'}</span>
                </div>
              </>
            ) : (
              <div className="text-destructive">Booking not found or you do not have permission to view it.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Your Feedback
          </CardTitle>
          <CardDescription>
            Rate your experience and share any comments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">
                How would you rate your overall experience?
              </Label>
              <div className="flex items-center gap-4">
                <StarRating />
                {rating > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Very Good"}
                    {rating === 5 && "Excellent"}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="comment" className="text-base font-medium">
                Additional Comments (Optional)
              </Label>
              <Textarea
                id="comment"
                placeholder="Share your experience, suggestions for improvement, or any issues you encountered..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || rating === 0 || loadingBooking || !booking || booking.status !== 'CHECKED_OUT'}
                className="bg-gradient-primary"
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/bookings")}
              >
                Skip
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}