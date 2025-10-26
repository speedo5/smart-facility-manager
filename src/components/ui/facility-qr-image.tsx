import { useEffect, useState } from 'react';

export default function FacilityQrImage({ facilityId }: { facilityId: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchImage = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const resp = await fetch(`/api/facilities/${facilityId}/qr-code`, {
          headers: token ? { Authorization: `Bearer ${token}`, Accept: 'image/png' } : { Accept: 'image/png' }
        });
        if (!resp.ok) throw new Error('Failed to download QR');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        if (mounted) setBlobUrl(url);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load QR');
      }
    };

    fetchImage();
    return () => {
      mounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [facilityId]);

  if (error) return <div className="text-sm text-destructive">Failed to load QR</div>;
  if (!blobUrl) return <div className="w-32 h-32 bg-muted animate-pulse" />;

  return <img src={blobUrl} alt="Facility QR Code" className="w-32 h-32 object-contain" />;
}
