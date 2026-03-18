import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Fuel, LogOut, ScanLine, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { createStationTransaction, getCustomer, getFuelQuotas, getStation, type FuelQuota } from '@/lib/api';

export function PumpOperator() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<{
    vehicleNumber: string;
    customerName: string;
    fuelType: string;
    weeklyQuota: number;
    remaining: number;
    nic: string;
  } | null>(null);
  const [fuelAmount, setFuelAmount] = useState('');

  const stationId = ((): string => {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null');
      return String(u?.stationId || 'FS001');
    } catch {
      return 'FS001';
    }
  })();

  const operator = ((): { id: string; name: string } => {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null');
      return { id: String(u?.operatorId || 'OP001'), name: String(u?.displayName || 'Pump operator') };
    } catch {
      return { id: 'OP001', name: 'Pump operator' };
    }
  })();

  const [station, setStation] = useState<{ id: string; name: string; petrolStock: number; dieselStock: number }>({
    id: stationId,
    name: `Station ${stationId}`,
    petrolStock: 0,
    dieselStock: 0,
  });
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const QR_READER_ID = 'pump-qr-reader';

  useEffect(() => {
    getStation(stationId).then((s) => s && setStation({ id: s.id, name: s.name, petrolStock: s.petrolStock, dieselStock: s.dieselStock })).catch(() => {});
  }, [stationId]);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    const startCamera = () => {
      const el = document.getElementById(QR_READER_ID);
      if (!el || cancelled) return;
      const scanner = new Html5Qrcode(QR_READER_ID);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (cancelled || !scannerRef.current) return;
            scannerRef.current.stop().catch(() => {}).finally(() => { scannerRef.current = null; });
            setScanning(false);
            const parts = decodedText.trim().split('-');
            const customerId = parts[0];
            if (!customerId || !customerId.startsWith('CUST')) {
              toast.error('Invalid customer QR code');
              return;
            }
            const vehicleNumber = parts.length > 1 ? parts.slice(1).join('-') : '';
            try {
              const [customer, quotas] = await Promise.all([getCustomer(customerId), getFuelQuotas()]);
              if (!customer) {
                toast.error('Customer not found');
                return;
              }
              const quotaRow: FuelQuota | undefined = quotas.find((q) => q.vehicleType === customer.vehicleType);
              const weeklyQuota =
                customer.fuelType === 'diesel'
                  ? (quotaRow?.dieselQuota ?? 0)
                  : (quotaRow?.petrolQuota ?? 0);
              const remaining =
                customer.fuelType === 'diesel'
                  ? (customer.dieselRemaining ?? quotaRow?.dieselQuota ?? 0)
                  : (customer.petrolRemaining ?? quotaRow?.petrolQuota ?? 0);
              setScannedData({
                vehicleNumber: customer.vehicleNumber || vehicleNumber,
                customerName: customer.name,
                fuelType: customer.fuelType,
                weeklyQuota,
                remaining,
                nic: customer.nic,
              });
              toast.success('QR Code scanned successfully');
            } catch (e: any) {
              toast.error(e?.message || 'Failed to load customer');
            }
          },
          () => {}
        )
        .catch((err: Error) => {
          if (!cancelled) {
            setScanning(false);
            toast.error(err?.message || 'Could not open camera');
          }
        });
    };
    const t = setTimeout(startCamera, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => { scannerRef.current = null; });
      }
    };
  }, [scanning]);

  const handleScanQR = () => setScanning(true);
  const handleCloseScanner = () => {
    setScanning(false);
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {}).finally(() => { scannerRef.current = null; });
    }
  };

  const handleDispenseFuel = async () => {
    if (!scannedData) return;
    if (!fuelAmount || parseFloat(fuelAmount) <= 0) {
      toast.error('Please enter a valid fuel amount');
      return;
    }
    const amount = parseFloat(fuelAmount);
    if (amount > scannedData.remaining) {
      toast.error(`Customer quota exceeded! Maximum: ${scannedData.remaining}L`);
      return;
    }

    try {
      await createStationTransaction({
        stationId,
        vehicleNumber: scannedData.vehicleNumber,
        liters: amount,
        fuelType: scannedData.fuelType === 'diesel' ? 'diesel' : 'petrol',
        operatorId: operator.id,
      });
      toast.success(`${amount}L ${scannedData.fuelType} dispensed successfully`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record transaction');
      return;
    }

    setScannedData(null);
    setFuelAmount('');
  };

  const handleCancelTransaction = () => {
    setScannedData(null);
    setFuelAmount('');
    toast.info('Transaction cancelled');
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Petrol</p>
                  <p className="font-semibold text-gray-900">{station.petrolStock.toLocaleString()}L</p>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Diesel</p>
                  <p className="font-semibold text-gray-900">{station.dieselStock.toLocaleString()}L</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">Pump operator</h1>
          <p className="text-sm text-gray-500">{operator.name} ({operator.id})</p>
          <p className="text-xs text-gray-400">{station.name}</p>
        </div>

        {!scannedData ? (
          <>
            <Card className="border-gray-100 p-8 shadow-soft">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gray-100">
                  <ScanLine className="h-14 w-14 text-gray-500" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-gray-900">Scan customer QR code</h2>
                <p className="mb-6 text-sm text-gray-500">Click the button below to open the camera and scan the customer’s quota QR</p>
                <Button size="lg" className="h-auto px-10 py-5 text-base" onClick={handleScanQR}>
                  <ScanLine className="mr-2 h-5 w-5" />
                  Start scanning
                </Button>
                <div className="mt-6 rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">Your camera will open. Point it at the customer’s QR code.</p>
                </div>
              </div>
            </Card>

            <Dialog open={scanning} onOpenChange={(open) => !open && handleCloseScanner()}>
            <DialogContent className="max-w-sm border-gray-200 p-4 sm:max-w-md" onPointerDownOutside={handleCloseScanner}>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between pr-6">
                  Scan QR code
                  <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={handleCloseScanner}>
                    <X className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-black">
                <div id={QR_READER_ID} className="min-h-[240px] w-full" />
              </div>
              <p className="mt-2 text-center text-xs text-gray-500">Position the customer’s QR code in the frame</p>
            </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="space-y-6">
            <Card className="border-gray-100 p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{scannedData.vehicleNumber}</h2>
                  <p className="text-sm text-gray-500">{scannedData.customerName}</p>
                  <p className="text-xs text-gray-400">NIC: {scannedData.nic}</p>
                </div>
                <Badge className="bg-gray-200 text-gray-700">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Verified
                </Badge>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-600">Fuel Type</p>
                  <p className="text-xl font-bold capitalize">{scannedData.fuelType}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-600">Weekly Quota</p>
                  <p className="text-xl font-bold">{scannedData.weeklyQuota}L</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
                <p className="mb-2 text-xs font-medium text-gray-500">Remaining quota</p>
                <p className="text-4xl font-semibold text-gray-900">
                  {scannedData.remaining}L
                </p>
                <p className="mt-1 text-sm text-gray-500">of {scannedData.weeklyQuota}L weekly quota</p>
              </div>
            </Card>

            <Card className="border-gray-100 p-6">
              <h3 className="mb-4 text-base font-semibold text-gray-900">Dispense fuel</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Enter Fuel Amount (Liters)</Label>
                  <div className="relative mt-2">
                    <Input
                      type="number"
                      placeholder="0"
                      value={fuelAmount}
                      onChange={(e) => setFuelAmount(e.target.value)}
                      className="h-16 pr-12 text-2xl"
                      max={scannedData.remaining}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">L</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Maximum: {scannedData.remaining}L</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      onClick={() => setFuelAmount(String(Math.min(amount, scannedData.remaining)))}
                      disabled={amount > scannedData.remaining}
                      className="h-12"
                    >
                      {amount}L
                    </Button>
                  ))}
                </div>
                <div className="mt-6 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleCancelTransaction}>
                    Cancel
                  </Button>
                  <Button className="h-12 flex-1" onClick={handleDispenseFuel}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Dispense fuel
                  </Button>
                </div>
              </div>
            </Card>

            {scannedData.remaining < 5 && (
              <Card className="border-amber-100 bg-amber-50/50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Low quota</p>
                    <p className="text-xs text-amber-800">Customer has less than 5L remaining this week.</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
