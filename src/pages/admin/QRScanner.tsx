import { useState, useRef, useEffect } from "react";
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Building2,
  AlertTriangle,
  Scan,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { checkInRequestApi, qrScannerApi, bookingApi } from "@/utils/api";
import { DamageReportDialog } from "@/components/ui/damage-report-dialog";

// Mock booking data for QR scanning
const mockQRBookings = [
  {
    id: "1",
    user: "John Doe",
    facility: "Main Conference Room",
    startTime: "2024-01-18T10:00:00Z",
    endTime: "2024-01-18T12:00:00Z",
    checkInCode: "ABC123",
    status: "APPROVED"
  },
  {
    id: "2", 
    user: "Jane Smith",
    facility: "Computer Lab 1",
    startTime: "2024-01-18T14:00:00Z",
    endTime: "2024-01-18T16:00:00Z",
    checkInCode: "XYZ789",
    status: "CHECKED_IN"
  }
];

export default function QRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDamageDialog, setShowDamageDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const [barcodeSupported, setBarcodeSupported] = useState<boolean | null>(null);
  const lastScanRef = useRef<{ code?: string; at?: number }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingRequests();
    fetchScanHistory();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await checkInRequestApi.getAll({ status: 'PENDING' });
      if (response.success) {
        setPendingRequests(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
      }
      // Setup barcode detector if available
      if ((window as any).BarcodeDetector) {
        try {
          // Some browsers require explicit options
          detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          setBarcodeSupported(true);
        } catch (err) {
          // If construction fails, treat as unsupported
          console.warn('BarcodeDetector construction failed', err);
          detectorRef.current = null;
          setBarcodeSupported(false);
        }
      } else {
        setBarcodeSupported(false);
      }

      // Create an offscreen canvas used for detection
      if (!canvasRef.current) {
        const c = document.createElement('canvas');
        canvasRef.current = c;
      }

      // Start the detection loop
      startDetectionLoop();
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const startDetectionLoop = () => {
    // detection loop using BarcodeDetector if available
    const detect = async () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const detector = detectorRef.current;
        if (!video || !canvas) return;

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        if (vw === 0 || vh === 0) {
          // video metadata not ready yet
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        // size the canvas to video
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, vw, vh);

        if (detector) {
          try {
            const barcodes = await detector.detect(canvas as any);
            if (barcodes && barcodes.length > 0) {
              const raw = barcodes[0]?.rawValue;
              if (raw) {
                const normalized = String(raw).trim();
                // debounce duplicate scans
                const now = Date.now();
                if (lastScanRef.current.code !== normalized || (now - (lastScanRef.current.at || 0)) > 2000) {
                  lastScanRef.current = { code: normalized, at: now };
                  // process detected QR code
                  processCheckIn(normalized, raw);
                  // provide short vibration feedback on supported devices
                  try { navigator.vibrate && navigator.vibrate(100); } catch (e) {}
                }
              }
            }
          } catch (detErr) {
            console.warn('Barcode detection error', detErr);
          }
        }
      } catch (err) {
        console.error('Detection loop error', err);
      }
      rafRef.current = requestAnimationFrame(detect);
    };

    // kick off
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(detect);
  };

  const handleStopScan = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
    // stop detection loop
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // release detector
    detectorRef.current = null;
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(t => t.stop());
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      detectorRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  const processCheckIn = async (code: string, qrData?: string) => {
    try {
      const response = await qrScannerApi.scan(code);
      
      if (response.success) {
        const result = {
          success: true,
          action: response.data.action,
          booking: {
            user: response.data.booking.user,
            facility: response.data.booking.facilities.join(', '),
            startTime: response.data.booking.startTime,
            endTime: response.data.booking.endTime,
            status: response.data.booking.status
          },
          timestamp: response.data.timestamp
        };
        
  setScanResult(result);
  // optimistic add to UI
  setScanHistory(prev => [result, ...prev]);
  // refresh from server to ensure canonical history
  fetchScanHistory();
        
        toast({
          title: response.data.action === 'checkin' ? "Check-in Successful" : "Check-out Successful",
          description: `${response.data.booking.user} ${response.data.action === 'checkin' ? 'checked into' : 'checked out of'} ${response.data.booking.facilities.join(', ')}`,
        });
      }
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message || 'Network error or server unavailable',
        code,
        timestamp: new Date().toISOString()
      };
      setScanResult(result);
      setScanHistory(prev => [result, ...prev]);
      
      toast({
        title: "Scan Failed",
        description: error.message || "Unable to process scan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchScanHistory = async () => {
    try {
      // Fetch recent checked-in and checked-out bookings (admin view)
      const [inResp, outResp] = await Promise.all([
        bookingApi.getAll({ status: 'CHECKED_IN', all: 'true', limit: 20 }),
        bookingApi.getAll({ status: 'CHECKED_OUT', all: 'true', limit: 20 })
      ]);

      const items: any[] = [];

      if (inResp && inResp.success) {
        inResp.data.forEach((b: any) => {
          if (b.checkInAt) {
            items.push({
              success: true,
              action: 'checkin',
              booking: {
                user: b.userId?.fullName || (b.userId ?? 'Unknown'),
                facility: (b.facilities || []).map((f: any) => f.name).join(', '),
                startTime: b.startTime,
                endTime: b.endTime,
                status: b.status
              },
              timestamp: b.checkInAt
            });
          }
        });
      }

      if (outResp && outResp.success) {
        outResp.data.forEach((b: any) => {
          if (b.checkOutAt) {
            items.push({
              success: true,
              action: 'checkout',
              booking: {
                user: b.userId?.fullName || (b.userId ?? 'Unknown'),
                facility: (b.facilities || []).map((f: any) => f.name).join(', '),
                startTime: b.startTime,
                endTime: b.endTime,
                status: b.status
              },
              timestamp: b.checkOutAt
            });
          }
        });
      }

      // Sort by timestamp desc and limit to 50
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setScanHistory(items.slice(0, 50));
    } catch (error) {
      console.error('Failed to load scan history:', error);
    }
  };

  const handleApproveRequest = async (requestId: string, damageReport?: any) => {
    try {
      const response = await checkInRequestApi.approve(requestId, damageReport);
      if (response.success) {
        toast({
          title: "Request Approved",
          description: response.message,
        });
        fetchPendingRequests();
        setSelectedRequest(null);
        setShowDamageDialog(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await checkInRequestApi.reject(requestId);
      if (response.success) {
        toast({
          title: "Request Rejected",
          description: response.message,
        });
        fetchPendingRequests();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    }
  };

  const handleManualCheckIn = () => {
    if (manualCode.trim()) {
      processCheckIn(manualCode.trim().toUpperCase());
      setManualCode("");
    }
  };

  // Mock QR scan result (in real implementation, this would come from QR scanner)
  const simulateQRScan = () => {
    const mockQRData = JSON.stringify({
      bookingId: "1",
      checkInCode: "ABC123",
      facilities: ["facility1", "facility2"],
      type: "FACILITY_ACCESS"
    });
    processCheckIn("ABC123", mockQRData);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">QR Scanner</h1>
        <p className="text-muted-foreground">
          Scan QR codes or enter check-in codes manually for facility access.
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pending Requests
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-warning text-warning-foreground">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="history">Scan History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pending Check-in/Check-out Requests
                  </CardTitle>
                  <CardDescription>
                    Approve or reject user check-in and check-out requests
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchPendingRequests} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading requests...</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request._id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={request.type === 'CHECK_IN' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                              {request.type === 'CHECK_IN' ? 'Check-in Request' : 'Check-out Request'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(request.createdAt), 'PPp')}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{request.userId?.fullName || 'Unknown User'}</span>
                              <span className="text-muted-foreground">({request.userId?.email})</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{request.facilityId?.name}</span>
                              <span className="text-muted-foreground">- {request.facilityId?.location}</span>
                            </div>
                            {request.bookingId && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {format(new Date(request.bookingId.startTime), 'PPp')} - {format(new Date(request.bookingId.endTime), 'p')}
                              </div>
                            )}
                            {request.feedback && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <p className="font-medium">User Feedback:</p>
                                <p>Rating: {request.feedback.rating}/5</p>
                                {request.feedback.comment && <p className="mt-1">{request.feedback.comment}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {request.type === 'CHECK_OUT' ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDamageDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Process
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(request._id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRequest(request._id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scanner" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Scanner
              </CardTitle>
              <CardDescription>
                Point your camera at a QR code to check users in or out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full max-w-md mx-auto rounded-lg bg-muted"
                  autoPlay
                  playsInline
                  style={{ display: isScanning ? 'block' : 'none' }}
                />
                
                {!isScanning && (
                  <div className="w-full max-w-md mx-auto h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-center">
                {!isScanning ? (
                  <>
                    <Button onClick={handleStartScan} className="bg-gradient-primary">
                      <Camera className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                    <Button onClick={simulateQRScan} variant="outline">
                      <Scan className="h-4 w-4 mr-2" />
                      Simulate Scan
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleStopScan} variant="outline">
                    Stop Camera
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Manual Code Entry</CardTitle>
              <CardDescription>
                Enter the check-in code manually if QR scanning is not available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manualCode">Check-in Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="manualCode"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code (e.g., ABC123)"
                    maxLength={6}
                    className="font-mono"
                  />
                  <Button onClick={handleManualCheckIn} disabled={manualCode.length < 3}>
                    Process
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Demo Codes:</h4>
                <div className="space-y-1 text-sm">
                  <p><code className="bg-background px-2 py-1 rounded">ABC123</code> - John Doe, Main Conference Room</p>
                  <p><code className="bg-background px-2 py-1 rounded">XYZ789</code> - Jane Smith, Computer Lab 1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>History of check-in and check-out scans</CardDescription>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <div className="text-center py-8">
                  <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No scans yet</p>
                  <p className="text-sm text-muted-foreground">Scan a QR code or enter a code manually to see history</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scanHistory.map((scan, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      scan.success ? 'border-accent/20 bg-accent-soft' : 'border-destructive/20 bg-destructive/5'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {scan.success ? (
                              <CheckCircle className="h-4 w-4 text-accent" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="font-medium">
                              {scan.success 
                                ? `${scan.action === 'checkin' ? 'Check-in' : 'Check-out'} Successful`
                                : 'Scan Failed'
                              }
                            </span>
                          </div>
                          
                          {scan.success && scan.booking && (
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                {scan.booking.user}
                              </div>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                {scan.booking.facility}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {format(new Date(scan.booking.startTime), 'HH:mm')} - {format(new Date(scan.booking.endTime), 'HH:mm')}
                              </div>
                            </div>
                          )}
                          
                          {!scan.success && (
                            <div className="text-sm text-muted-foreground">
                              Code: {scan.code} - {scan.error}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right text-sm text-muted-foreground">
                          {format(new Date(scan.timestamp), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Current Scan Result */}
      {scanResult && (
        <Card className={`shadow-card ${
          scanResult.success ? 'border-accent' : 'border-destructive'
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scanResult.success ? (
                <CheckCircle className="h-5 w-5 text-accent" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              Latest Scan Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanResult.success ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Action:</span>
                  <Badge className={scanResult.action === 'checkin' ? 'bg-accent' : 'bg-blue-100 text-blue-800'}>
                    {scanResult.action === 'checkin' ? 'Check-in' : 'Check-out'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">User:</span>
                  <span>{scanResult.booking.user}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Facility:</span>
                  <span>{scanResult.booking.facility}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Time:</span>
                  <span>{format(new Date(scanResult.timestamp), 'HH:mm:ss')}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-destructive">
                <p className="font-medium">{scanResult.error}</p>
                <p className="text-sm mt-1">Code: {scanResult.code}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedRequest && (
        <DamageReportDialog
          open={showDamageDialog}
          onOpenChange={setShowDamageDialog}
          onSubmit={(report) => handleApproveRequest(selectedRequest._id, report)}
          facilityName={selectedRequest.facilityId?.name || 'Unknown Facility'}
          userName={selectedRequest.userId?.fullName || 'Unknown User'}
        />
      )}
    </div>
  );
}