import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { User, LogOut, Download, Share2, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { FuelMap } from '@/components/FuelMap';
import { getCustomer, getFuelQuotas, getPublicStations, getVehicleTransactions, sendCustomerQrToWhatsApp, type CustomerRecord, type FuelQuota, type Station, type VehicleTransaction } from '@/lib/api';
import { toast } from 'sonner';

export function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [quotas, setQuotas] = useState<FuelQuota[]>([]);
  const [transactions, setTransactions] = useState<VehicleTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('customer_last');
    const parsed = stored ? (JSON.parse(stored) as CustomerRecord) : null;
    if (!parsed?.id) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [freshCustomer, stationsList, quotasList, recentTx] = await Promise.all([
          getCustomer(parsed.id),
          getPublicStations(),
          getFuelQuotas(),
          getVehicleTransactions(parsed.vehicleNumber, 10),
        ]);
        if (cancelled) return;
        setCustomer(freshCustomer ?? parsed);
        if (freshCustomer) localStorage.setItem('customer_last', JSON.stringify(freshCustomer));
        setStations(stationsList);
        setQuotas(quotasList);
        setTransactions(recentTx);
      } catch {
        setCustomer(parsed);
        setStations([]);
        setQuotas([]);
        setTransactions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const quotaRow = customer ? quotas.find((q) => q.vehicleType === customer.vehicleType) : null;
  const weeklyQuota = customer?.fuelType === 'diesel'
    ? (quotaRow?.dieselQuota ?? 0)
    : (quotaRow?.petrolQuota ?? 0);
  const remaining = customer?.fuelType === 'diesel'
    ? (customer.dieselRemaining ?? quotaRow?.dieselQuota ?? 0)
    : (customer?.petrolRemaining ?? quotaRow?.petrolQuota ?? 0);
  const quotaPercentage = weeklyQuota > 0 ? (remaining / weeklyQuota) * 100 : 0;

  const handleDownloadQR = () => toast.success('QR Code downloaded');
  const handleShareWhatsApp = async () => {
    if (!customer?.id) return;
    try {
      await sendCustomerQrToWhatsApp(customer.id);
      toast.success('Sent QR to your WhatsApp number');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send QR to WhatsApp');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <p className="text-gray-500">Loading your dashboard…</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">My dashboard</h1>
              <Button variant="outline" onClick={() => navigate('/')}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4 text-gray-600">No customer profile found. Register to get your fuel quota and QR code.</p>
          <Button onClick={() => navigate('/customer/register')}>Register as customer</Button>
        </div>
      </div>
    );
  }

  const fuelTypeLabel = customer.fuelType === 'diesel' ? 'Diesel' : 'Petrol';

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">My dashboard</h1>
                <p className="text-sm text-gray-500">Welcome, {customer.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="border-gray-100 p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Your fuel quota QR code</h2>
              <div className="flex flex-col items-center">
                <div className="mb-4 rounded-xl border border-gray-200 bg-white p-6">
                  <QRCodeSVG value={customer.qrCode} size={260} level="H" includeMargin />
                </div>
                <div className="mb-6 w-full text-center">
                  <p className="text-xl font-semibold text-gray-900">{customer.vehicleNumber}</p>
                  <p className="text-sm text-gray-500">{fuelTypeLabel} vehicle</p>
                  <p className="mt-1 text-xs text-gray-400">NIC: {customer.nic}</p>
                </div>
                <div className="w-full space-y-2">
                  <Button className="w-full" onClick={handleDownloadQR}>
                    <Download className="mr-2 h-4 w-4" />
                    Download QR code
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleShareWhatsApp}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Send to WhatsApp
                  </Button>
                </div>
              </div>
            </Card>
            <Card className="border-gray-100 p-6">
              <h3 className="mb-4 text-base font-semibold text-gray-900">Weekly quota status</h3>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between">
                    <span className="text-sm text-gray-600">Remaining fuel</span>
                    <span className="text-sm font-medium text-gray-900">{remaining}L / {weeklyQuota}L</span>
                  </div>
                  <Progress value={quotaPercentage} className="h-2 [&>div]:bg-gray-800" />
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs text-gray-500">Total quota</p>
                    <p className="text-lg font-semibold text-gray-900">{weeklyQuota}L</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Used this week</p>
                    <p className="text-lg font-semibold text-gray-900">{weeklyQuota - remaining}L</p>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">Quota resets every Sunday at 12:00 AM</p>
                </div>
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="border-gray-100 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                <MapPin className="h-4 w-4 text-gray-500" />
                Nearby filling stations
              </h2>
              <div className="h-[500px] overflow-hidden rounded-lg">
                <FuelMap stations={stations} zoom={8} />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-emerald-600" />
                  <span>Available - Fuel in stock</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span>In Transit - Stock arriving soon</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-red-600" />
                  <span>Out of Stock - No fuel available</span>
                </div>
              </div>
            </Card>
            <Card className="border-gray-100 p-6">
              <h3 className="mb-4 text-base font-semibold text-gray-900">Recent transactions</h3>
              {transactions.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  No transactions yet for {customer.vehicleNumber}.
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((t, idx) => {
                    const dt = new Date(t.createdAt);
                    const when = Number.isFinite(dt.getTime()) ? dt.toLocaleString() : t.createdAt;
                    const isLast = idx === transactions.length - 1;
                    return (
                      <div key={t.id} className={`flex items-center justify-between ${isLast ? '' : 'border-b pb-3'}`}>
                        <div>
                          <p className="font-medium">{t.stationName || t.stationId}</p>
                          <p className="text-sm text-gray-600">{when}</p>
                        </div>
                        <p className="font-semibold text-red-600">-{t.liters}L</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
