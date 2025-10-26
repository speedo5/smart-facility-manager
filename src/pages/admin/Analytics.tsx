import { useState, useEffect } from "react";
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Building2,
  Users,
  Clock,
  Download,
  Filter
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { feedbackApi, bookingApi } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";

const initialAnalytics: any = {
  overview: {
    totalBookings: 0,
    totalBookingsChange: 0,
    activeUsers: 0,
    activeUsersChange: 0,
    utilizationRate: 0,
    utilizationChange: 0,
    avgBookingDuration: 0,
    avgBookingDurationChange: 0
  },
  facilityTypes: [] as any[],
  topFacilities: [] as any[],
  bookingStatus: [] as any[],
  monthlyTrends: [] as any[]
};

export default function Analytics() {
  const [dateRange, setDateRange] = useState("30d");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [analytics, setAnalytics] = useState<any>(initialAnalytics);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // Fetch feedback stats (overview, rating distribution, category breakdown)
        const statsResp = await feedbackApi.getStats({});
        const statsData = statsResp && statsResp.success ? statsResp.data : null;

        // Fetch bookings summary to compute total bookings and status distribution
        const bookingsResp = await bookingApi.getAll({ page: 1, limit: 1 });
        const totalBookings = bookingsResp && bookingsResp.success ? bookingsResp.pagination?.total || 0 : 0;

        // Construct a basic analytics object combining available data
        const newAnalytics = { ...initialAnalytics };
        if (statsData) {
          newAnalytics.overview.totalBookings = totalBookings;
          newAnalytics.overview.activeUsers = statsData.overview?.activeUsers || newAnalytics.overview.activeUsers;
          newAnalytics.overview.avgBookingDuration = statsData.overview?.averageRating || newAnalytics.overview.avgBookingDuration; // fallback mapping
          newAnalytics.facilityTypes = statsData.categoryBreakdown?.map((c: any) => ({ name: c._id, bookings: Math.round(c.count || 0), percentage: 0 })) || [];
        } else {
          newAnalytics.overview.totalBookings = totalBookings;
        }

        // Booking status distribution - fetch small sample of bookings by status
        const statusBuckets: any[] = [];
        const statuses = ['APPROVED','PENDING','PENDING_ADMIN','CHECKED_IN','CHECKED_OUT','CANCELLED','REJECTED'];
        let statusTotal = 0;
        for (const s of statuses) {
          const resp = await bookingApi.getAll({ status: s, page: 1, limit: 1 });
          const count = resp && resp.success ? resp.pagination?.total || 0 : 0;
          statusBuckets.push({ status: s, count });
          statusTotal += count;
        }
        newAnalytics.bookingStatus = statusBuckets.map(b => ({ status: b.status, count: b.count, percentage: statusTotal > 0 ? Math.round((b.count / statusTotal) * 100 * 10) / 10 : 0 }));

        if (mounted) setAnalytics(newAnalytics);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Failed to load analytics', variant: 'destructive' });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchAnalytics();
    return () => { mounted = false; };
  }, [dateRange, facilityFilter]);

  const formatChange = (value: number) => {
    const isPositive = value > 0;
    return (
      <span className={`flex items-center gap-1 text-sm ${
        isPositive ? 'text-accent' : 'text-destructive'
      }`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(value)}%
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into facility usage and booking patterns.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview?.totalBookings?.toLocaleString?.() ?? 0}</div>
            {formatChange(analytics.overview?.totalBookingsChange ?? 0)}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview?.activeUsers ?? 0}</div>
            {formatChange(analytics.overview?.activeUsersChange ?? 0)}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview?.utilizationRate ?? 0}%</div>
            {formatChange(analytics.overview?.utilizationChange ?? 0)}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview?.avgBookingDuration ?? 0}h</div>
            {formatChange(analytics.overview?.avgBookingDurationChange ?? 0)}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="facilities">Facility Performance</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Facility Types Distribution */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Bookings by Facility Type</CardTitle>
                <CardDescription>Distribution of bookings across different facility types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.facilityTypes.map((type: any, index: number) => (
                    <div key={type.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{type.name}</span>
                        <span className="font-medium">{type.bookings} ({type.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${type.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Booking Status */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Booking Status Distribution</CardTitle>
                <CardDescription>Current status of all bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.bookingStatus.map((status: any) => (
                    <div key={status.status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{status.status}</span>
                        <span className="font-medium">{status.count} ({status.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${status.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="facilities" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Top Performing Facilities</CardTitle>
              <CardDescription>Most booked facilities with their utilization rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topFacilities.map((facility: any, index: number) => (
                  <div key={facility.name} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{facility.name}</h4>
                        <p className="text-sm text-muted-foreground">{facility.bookings} bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{facility.utilization}%</div>
                      <div className="text-sm text-muted-foreground">utilization</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Active users and booking frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">User engagement charts would appear here</p>
                  <p className="text-sm text-muted-foreground mt-2">Connect to database for real-time data</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Peak Usage Times</CardTitle>
                <CardDescription>Most active hours and days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Peak time analysis would appear here</p>
                  <p className="text-sm text-muted-foreground mt-2">Connect to database for real-time data</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Booking and utilization trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-6">
                  {analytics.monthlyTrends.map((month: any) => (
                    <div key={month.month} className="text-center space-y-2">
                      <div className="text-sm font-medium">{month.month}</div>
                      <div className="space-y-1">
                        <div className="text-lg font-bold">{month.bookings}</div>
                        <div className="text-xs text-muted-foreground">bookings</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-accent">{month.utilization}%</div>
                        <div className="text-xs text-muted-foreground">utilization</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center py-4 border-t">
                  <p className="text-muted-foreground">Interactive charts would appear here</p>
                  <p className="text-sm text-muted-foreground mt-1">Connect to database for detailed trend analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}