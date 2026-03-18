import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, LogOut, Building2, Car, FileText, MapPin, Users, Fuel } from 'lucide-react';
import { vehicleQuotas, provinces } from '@/data/mockData';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { createDelivery, createStation, createSpecialVehicle, getAdminDeliveries, getAdminUsers, getFuelQuotas, getSpecialVehicles, getStations, saveFuelQuotas, updateDeliveryStatus, type ApiUser, type Delivery, type FuelQuota, type SpecialVehicle } from '@/lib/api';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [quotas, setQuotas] = useState<FuelQuota[]>(vehicleQuotas);
  const [editingQuota, setEditingQuota] = useState<string | null>(null);
  const [specialVehicle, setSpecialVehicle] = useState({
    vehicleNumberPrefix: '',
    vehicleNumberSuffix: '',
    vehicleType: '',
    fuelQuota: '',
    evidence: null as File | null,
  });
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [specialVehicles, setSpecialVehicles] = useState<SpecialVehicle[]>([]);
  const [selectedSpecialId, setSelectedSpecialId] = useState<string | null>(null);
  const [specialOpen, setSpecialOpen] = useState(false);
  const [specialLoading, setSpecialLoading] = useState(false);
  const [credentialsUsers, setCredentialsUsers] = useState<ApiUser[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);

  const [stations, setStations] = useState<Awaited<ReturnType<typeof getStations>>>([]);
  const [addStationOpen, setAddStationOpen] = useState(false);
  const [createdStationCreds, setCreatedStationCreds] = useState<{ stationId: string; password?: string } | null>(null);
  const [newStation, setNewStation] = useState({
    name: '',
    lat: '',
    lng: '',
    province: '',
    address: '',
    phone: '',
    petrolCapacity: '',
    dieselCapacity: '',
  });

  type BowserFuelType = 'petrol' | 'diesel';
  const [dispatches, setDispatches] = useState<Delivery[]>([]);
  const [bowserOpen, setBowserOpen] = useState(false);
  const [bowserSending, setBowserSending] = useState(false);
  const [bowserForm, setBowserForm] = useState<{ stationId: string; fuelType: BowserFuelType; liters: string }>({
    stationId: '',
    fuelType: 'petrol',
    liters: '',
  });
  const [updateDispatchOpen, setUpdateDispatchOpen] = useState(false);
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);

  const availableCount = stations.filter((s) => s.status === 'available' || s.status === 'dispensing').length;
  const inTransitCount = stations.filter((s) => s.status === 'in-transit').length;
  const outOfStockCount = stations.filter((s) => s.status === 'empty').length;

  useEffect(() => {
    let cancelled = false;
    getStations()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setStations(list);
      })
      .catch(() => {
        if (!cancelled) setStations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCredentialsLoading(true);
    setCredentialsError(null);
    getAdminUsers()
      .then((users) => {
        if (!cancelled) setCredentialsUsers(users);
      })
      .catch((e) => {
        if (!cancelled) setCredentialsError(e instanceof Error ? e.message : 'Failed to load users');
      })
      .finally(() => {
        if (!cancelled) setCredentialsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const stationCredentialsUsers = credentialsUsers.filter((u) => u.role === 'station' || u.role === 'operator');

  useEffect(() => {
    let cancelled = false;
    getFuelQuotas()
      .then((q) => {
        if (!cancelled && Array.isArray(q) && q.length > 0) setQuotas(q);
      })
      .catch(() => {
        // Keep defaults from mockData if backend not available yet.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSpecialVehicles()
      .then((list) => {
        if (!cancelled) setSpecialVehicles(list);
      })
      .catch(() => {
        // Keep empty state if backend not available.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAdminDeliveries()
      .then((list) => {
        if (!cancelled) setDispatches(list);
      })
      .catch(() => {
        if (!cancelled) setDispatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdateQuota = async (vehicleType: string, field: 'petrolQuota' | 'dieselQuota', value: number) => {
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Invalid quota value');
      return;
    }

    const prev = quotas;
    const next = quotas.map((q) => (q.vehicleType === vehicleType ? { ...q, [field]: value } : q));
    setQuotas(next);

    try {
      await saveFuelQuotas(next);
      toast.success('Quota saved');
    } catch (e) {
      setQuotas(prev);
      toast.error(e instanceof Error ? e.message : 'Failed to save quota');
    }
  };

  const handleAddSpecialVehicle = async () => {
    const prefix = specialVehicle.vehicleNumberPrefix.trim().toUpperCase();
    const suffix = specialVehicle.vehicleNumberSuffix.trim();
    if (!prefix || !suffix || !specialVehicle.vehicleType || !specialVehicle.fuelQuota) {
      toast.error('Please fill all fields');
      return;
    }
    if (!/^[A-Z0-9]{2,3}$/.test(prefix)) {
      toast.error('Vehicle number prefix must be 2–3 letters/numbers (e.g. 300 or WP)');
      return;
    }
    if (!/^[0-9]{4}$/.test(suffix)) {
      toast.error('Vehicle number must end with 4 digits (e.g. 1111)');
      return;
    }

    const fuelQuotaNum = Number(specialVehicle.fuelQuota);
    if (!Number.isFinite(fuelQuotaNum) || fuelQuotaNum <= 0) {
      toast.error('Fuel quota must be a positive number');
      return;
    }

    try {
      setSpecialLoading(true);
      const created = await createSpecialVehicle({
        vehicleNumber: `${prefix}-${suffix}`,
        vehicleType: specialVehicle.vehicleType,
        fuelQuota: fuelQuotaNum,
      });
      setSpecialVehicles((prev) => [created, ...prev]);
      setSelectedSpecialId(created.id);
      setGeneratedQR(`SPECIAL-${created.vehicleNumber}-${created.vehicleType}-${created.fuelQuota}L`);
      setSpecialVehicle({ vehicleNumberPrefix: '', vehicleNumberSuffix: '', vehicleType: '', fuelQuota: '', evidence: null });
      setSpecialOpen(false);
      toast.success('Special vehicle saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSpecialLoading(false);
    }
  };

  const selectedSpecial = selectedSpecialId ? specialVehicles.find((sv) => sv.id === selectedSpecialId) : null;
  const specialQrPayload = selectedSpecial
    ? `SPECIAL-${selectedSpecial.vehicleNumber}-${selectedSpecial.vehicleType}-${selectedSpecial.fuelQuota}L`
    : generatedQR;

  const downloadSpecialQr = async () => {
    const svg = document.getElementById('special-qr')?.querySelector('svg') as SVGElement | null;
    if (!svg) {
      toast.error('QR not ready');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        toast.error('Download failed');
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      canvas.toBlob((blob) => {
        if (!blob) {
          URL.revokeObjectURL(url);
          toast.error('Download failed');
          return;
        }
        const a = document.createElement('a');
        const safeName = (selectedSpecial?.vehicleNumber || 'special-vehicle').replace(/[^a-z0-9_-]/gi, '_');
        a.href = URL.createObjectURL(blob);
        a.download = `${safeName}-qr.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error('Download failed');
    };
    img.src = url;
  };

  const handleCreateStation = async () => {
    const name = newStation.name.trim();
    const lat = Number(newStation.lat);
    const lng = Number(newStation.lng);
    const petrolCapacity = Number(newStation.petrolCapacity);
    const dieselCapacity = Number(newStation.dieselCapacity);

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || !newStation.province || !newStation.address.trim() || !newStation.phone.trim()) {
      toast.error('Please fill all station fields');
      return;
    }
    if (!Number.isFinite(petrolCapacity) || petrolCapacity <= 0 || !Number.isFinite(dieselCapacity) || dieselCapacity <= 0) {
      toast.error('Capacities must be valid numbers');
      return;
    }

    try {
      const res = await createStation({
        name,
        lat,
        lng,
        province: newStation.province,
        address: newStation.address.trim(),
        phone: newStation.phone.trim(),
        petrolCapacity,
        dieselCapacity,
      });
      setStations((prev) => [...prev, res.station]);
      setCreatedStationCreds({ stationId: res.station.id, password: res.credentials?.password });
      toast.success('Filling station saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save station');
      return;
    }

    setNewStation({ name: '', lat: '', lng: '', province: '', address: '', phone: '', petrolCapacity: '', dieselCapacity: '' });
  };

  const handleOpenSendBowser = (stationId: string) => {
    setBowserForm({ stationId, fuelType: 'petrol', liters: '' });
    setBowserOpen(true);
  };

  const openSendBowserDialog = () => {
    setBowserForm({ stationId: '', fuelType: 'petrol', liters: '' });
    setBowserOpen(true);
  };

  const handleSendBowser = async () => {
    const liters = Number(bowserForm.liters);
    if (!bowserForm.stationId || !String(bowserForm.stationId).trim()) {
      toast.error('Please select a station');
      return;
    }
    if (!Number.isFinite(liters) || liters <= 0) {
      toast.error('Enter a valid number of liters (e.g. 10000)');
      return;
    }
    if (stations.length === 0) {
      toast.error('No stations loaded. Refresh the page and try again.');
      return;
    }
    setBowserSending(true);
    try {
      const delivery = await createDelivery({
        stationId: String(bowserForm.stationId).trim(),
        fuelType: bowserForm.fuelType,
        liters,
      });
      setDispatches((d) => [delivery, ...d]);
      setStations((prev) => prev.map((s) => (String(s.id).toUpperCase() === String(delivery.stationId).toUpperCase() ? { ...s, status: 'in-transit' as const } : s)));
      setBowserForm({ stationId: '', fuelType: 'petrol', liters: '' });
      setBowserOpen(false);
      toast.success('Fuel bowser sent');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send bowser');
    } finally {
      setBowserSending(false);
    }
  };

  const openUpdateDispatch = (dispatchId: string) => {
    setActiveDispatchId(dispatchId);
    setUpdateDispatchOpen(true);
  };

  const activeDispatch = activeDispatchId ? dispatches.find((d) => d.id === activeDispatchId) : null;

  const updateDispatchStatus = async (status: Delivery['status']) => {
    if (!activeDispatch) return;
    try {
      await updateDeliveryStatus(activeDispatch.id, status);
      setDispatches((prev) => prev.map((d) => (d.id === activeDispatch.id ? { ...d, status } : d)));
      if (status === 'delivered' || status === 'cancelled') {
        const list = await getStations();
        setStations(list);
      }
      if (status === 'delivered') toast.success('Dispatch marked delivered and stock updated');
      else if (status === 'cancelled') toast.success('Dispatch cancelled');
      else toast.success('Dispatch updated');
      setUpdateDispatchOpen(false);
      setActiveDispatchId(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update dispatch');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Dialog open={specialOpen} onOpenChange={setSpecialOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add special vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle Number</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  placeholder="300"
                  value={specialVehicle.vehicleNumberPrefix}
                  onChange={(e) =>
                    setSpecialVehicle({
                      ...specialVehicle,
                      vehicleNumberPrefix: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3),
                    })
                  }
                  className="w-24 text-center font-medium uppercase"
                  maxLength={3}
                />
                <span className="text-gray-400">-</span>
                <Input
                  placeholder="1111"
                  value={specialVehicle.vehicleNumberSuffix}
                  onChange={(e) =>
                    setSpecialVehicle({
                      ...specialVehicle,
                      vehicleNumberSuffix: e.target.value.replace(/\D/g, '').slice(0, 4),
                    })
                  }
                  className="w-28 text-center font-medium"
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Enter as 2 parts (e.g. 300-1111)</p>
            </div>
            <div>
              <Label>Vehicle Type</Label>
              <Select value={specialVehicle.vehicleType} onValueChange={(value) => setSpecialVehicle({ ...specialVehicle, vehicleType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambulance">Ambulance</SelectItem>
                  <SelectItem value="fire-truck">Fire Truck</SelectItem>
                  <SelectItem value="police">Police Vehicle</SelectItem>
                  <SelectItem value="generator">Generator</SelectItem>
                  <SelectItem value="agriculture">Agricultural Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Special Fuel Quota (Liters/Week)</Label>
              <Input
                placeholder="100"
                type="number"
                value={specialVehicle.fuelQuota}
                onChange={(e) => setSpecialVehicle({ ...specialVehicle, fuelQuota: e.target.value })}
              />
            </div>
            <div>
              <Label>Evidence Document</Label>
              <Input type="file" accept=".pdf,.jpg,.png" onChange={(e) => setSpecialVehicle({ ...specialVehicle, evidence: e.target.files?.[0] || null })} />
              <p className="mt-1 text-xs text-gray-500">Upload is not stored in this demo.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpecialOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSpecialVehicle} disabled={specialLoading}>
              {specialLoading ? 'Saving…' : 'Save special vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addStationOpen} onOpenChange={setAddStationOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add new filling station</DialogTitle>
          </DialogHeader>
          {createdStationCreds && (
            <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
              <p className="text-sm font-semibold text-gray-900">Station login details</p>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-600">Station ID (username)</span>
                  <code className="rounded bg-white px-2 py-1">{createdStationCreds.stationId}</code>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-600">Password</span>
                  <code className="rounded bg-white px-2 py-1">{createdStationCreds.password ?? 'Already exists'}</code>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Station Name</Label>
              <Input
                placeholder="Ceylon Petroleum - Location"
                value={newStation.name}
                onChange={(e) => setNewStation((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Latitude</Label>
              <Input
                placeholder="7.8731"
                type="number"
                step="0.0001"
                value={newStation.lat}
                onChange={(e) => setNewStation((s) => ({ ...s, lat: e.target.value }))}
              />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input
                placeholder="80.7718"
                type="number"
                step="0.0001"
                value={newStation.lng}
                onChange={(e) => setNewStation((s) => ({ ...s, lng: e.target.value }))}
              />
            </div>
            <div>
              <Label>Province</Label>
              <Select value={newStation.province} onValueChange={(value) => setNewStation((s) => ({ ...s, province: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="+94112345678"
                value={newStation.phone}
                onChange={(e) => setNewStation((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input
                placeholder="Full address"
                value={newStation.address}
                onChange={(e) => setNewStation((s) => ({ ...s, address: e.target.value }))}
              />
            </div>
            <div>
              <Label>Petrol Capacity (L)</Label>
              <Input
                placeholder="30000"
                type="number"
                value={newStation.petrolCapacity}
                onChange={(e) => setNewStation((s) => ({ ...s, petrolCapacity: e.target.value }))}
              />
            </div>
            <div>
              <Label>Diesel Capacity (L)</Label>
              <Input
                placeholder="40000"
                type="number"
                value={newStation.dieselCapacity}
                onChange={(e) => setNewStation((s) => ({ ...s, dieselCapacity: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddStationOpen(false);
                setCreatedStationCreds(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateStation}>Add station</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bowserOpen} onOpenChange={setBowserOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send fuel bowser</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Station</Label>
              <Select value={bowserForm.stationId} onValueChange={(value) => setBowserForm((s) => ({ ...s, stationId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.id} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Fuel type</Label>
                <Select value={bowserForm.fuelType} onValueChange={(value) => setBowserForm((s) => ({ ...s, fuelType: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Liters</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={bowserForm.liters}
                  onChange={(e) => setBowserForm((s) => ({ ...s, liters: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBowserOpen(false)} disabled={bowserSending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSendBowser} disabled={bowserSending}>
              {bowserSending ? 'Sending…' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={updateDispatchOpen} onOpenChange={setUpdateDispatchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update bowser dispatch</DialogTitle>
          </DialogHeader>
          {!activeDispatch ? (
            <p className="text-sm text-gray-600">No dispatch selected.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-gray-50/50 p-3 text-sm text-gray-700">
                <p className="font-medium">
                  {activeDispatch.stationId} — {stations.find((s) => s.id === activeDispatch.stationId)?.name ?? 'Station'}
                </p>
                <p>
                  {activeDispatch.fuelType.toUpperCase()} • {activeDispatch.liters}L
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={activeDispatch.status} onValueChange={(value) => updateDispatchStatus(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-transit">In transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500">When marked Delivered, the station stock will be increased by the dispatched liters.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDispatchOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <Shield className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Admin dashboard</h1>
                <p className="text-sm text-gray-500">System administration</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin/login')}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-gray-900">Live fuel station status</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-xs text-gray-500">Available</p>
                  <p className="text-xl font-semibold text-gray-900">{availableCount}</p>
                </div>
              </div>
            </Card>
            <Card className="border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <div>
                  <p className="text-xs text-gray-500">Stock in transit</p>
                  <p className="text-xl font-semibold text-gray-900">{inTransitCount}</p>
                </div>
              </div>
            </Card>
            <Card className="border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <div>
                  <p className="text-xs text-gray-500">Out of stock</p>
                  <p className="text-xl font-semibold text-gray-900">{outOfStockCount}</p>
                </div>
              </div>
            </Card>
            <Card className="border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                  <Building2 className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total stations</p>
                  <p className="text-xl font-semibold text-gray-900">{stations.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="quotas" className="space-y-6">
          <TabsList className="h-12 bg-gray-100 border border-gray-200/80 p-1.5 gap-1 rounded-xl shadow-sm">
            <TabsTrigger value="quotas" className="text-base font-semibold px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-gray-900">
              <Car className="mr-2.5 h-5 w-5" />
              Fuel Quotas
            </TabsTrigger>
            <TabsTrigger value="stations" className="text-base font-semibold px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-gray-900">
              <Building2 className="mr-2.5 h-5 w-5" />
              Filling Stations
            </TabsTrigger>
            <TabsTrigger value="special" className="text-base font-semibold px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-gray-900">
              <FileText className="mr-2.5 h-5 w-5" />
              Special Vehicles
            </TabsTrigger>
            <TabsTrigger value="credentials" className="text-base font-semibold px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-gray-900">
              <Users className="mr-2.5 h-5 w-5" />
              Station Credentials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotas">
            <Card className="border-gray-100 p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Manage fuel quotas by vehicle type</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Petrol Quota (L)</TableHead>
                    <TableHead>Diesel Quota (L)</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotas.map((quota) => (
                    <TableRow key={quota.vehicleType}>
                      <TableCell className="font-medium">{quota.vehicleType}</TableCell>
                      <TableCell>
                        {editingQuota === quota.vehicleType ? (
                          <Input type="number" defaultValue={quota.petrolQuota} onBlur={(e) => handleUpdateQuota(quota.vehicleType, 'petrolQuota', Number(e.target.value))} className="w-24" />
                        ) : (
                          <span>{quota.petrolQuota} L</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingQuota === quota.vehicleType ? (
                          <Input type="number" defaultValue={quota.dieselQuota} onBlur={(e) => handleUpdateQuota(quota.vehicleType, 'dieselQuota', Number(e.target.value))} className="w-24" />
                        ) : (
                          <span>{quota.dieselQuota} L</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{quota.period}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setEditingQuota(editingQuota === quota.vehicleType ? null : quota.vehicleType)}>
                          {editingQuota === quota.vehicleType ? 'Done' : 'Edit'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="stations">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-gray-100 p-6">
                <h2 className="mb-2 text-base font-semibold text-gray-900">Filling station actions</h2>
                <p className="mb-4 text-sm text-gray-600">Add stations and manage fuel bowser dispatches using popups.</p>
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => setAddStationOpen(true)}>
                    <MapPin className="mr-2 h-4 w-4" />
                    Add new filling station
                  </Button>
                  <Button className="w-full" variant="outline" onClick={openSendBowserDialog}>
                    <Fuel className="mr-2 h-4 w-4" />
                    Send fuel bowser to station
                  </Button>
                </div>
              </Card>

              <Card className="border-gray-100 p-6">
                <h2 className="mb-4 text-base font-semibold text-gray-900">Existing filling stations</h2>
                <div className="max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Province</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Petrol</TableHead>
                        <TableHead>Diesel</TableHead>
                        <TableHead>Bowser</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stations.map((station) => {
                        const latest = dispatches.find((d) => d.stationId === station.id);
                        const latestBadge =
                          latest?.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : latest?.status === 'cancelled'
                              ? 'bg-gray-200 text-gray-700'
                              : latest?.status === 'pending'
                                ? 'bg-gray-100 text-gray-800'
                                : latest?.status === 'in-transit'
                                  ? 'bg-amber-100 text-amber-800'
                                  : null;

                        return (
                          <TableRow key={station.id}>
                            <TableCell className="font-medium">{station.id}</TableCell>
                            <TableCell className="min-w-[220px]">
                              <div className="font-medium text-gray-900">{station.name}</div>
                              <div className="text-xs text-gray-500">{station.address}</div>
                            </TableCell>
                            <TableCell>{station.province}</TableCell>
                            <TableCell>
                              <Badge className={station.status === 'available' ? 'bg-gray-200 text-gray-700' : station.status === 'dispensing' ? 'bg-emerald-100 text-emerald-800' : station.status === 'in-transit' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}>
                                {station.status === 'dispensing' ? 'Dispensing' : station.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-gray-700">
                              {station.petrolStock.toLocaleString()} / {station.petrolCapacity.toLocaleString()}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-gray-700">
                              {station.dieselStock.toLocaleString()} / {station.dieselCapacity.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {latest ? (
                                <Badge className={latestBadge ?? 'bg-gray-200 text-gray-700'}>Bowser: {latest.status}</Badge>
                              ) : (
                                <span className="text-sm text-gray-500">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleOpenSendBowser(station.id)}>
                                  Send bowser
                                </Button>
                                {latest && latest.status !== 'delivered' && latest.status !== 'cancelled' && (
                                  <Button size="sm" variant="outline" onClick={() => openUpdateDispatch(latest.id)}>
                                    Update
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <Card className="border-gray-100 p-6">
                <h2 className="mb-4 text-base font-semibold text-gray-900">Bowser sends</h2>
                <p className="mb-4 text-sm text-gray-500">Recent fuel deliveries (in-transit, delivered, or cancelled).</p>
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Station</TableHead>
                        <TableHead>Fuel</TableHead>
                        <TableHead>Liters</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent at</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispatches.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-gray-500">No bowser sends yet</TableCell>
                        </TableRow>
                      ) : (
                        dispatches.map((d) => {
                          const stationName = stations.find((s) => String(s.id).toUpperCase() === String(d.stationId).toUpperCase())?.name ?? d.stationId;
                          const statusBadge =
                            d.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status === 'cancelled'
                                ? 'bg-gray-200 text-gray-700'
                                : d.status === 'in-transit'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-800';
                          return (
                            <TableRow key={d.id}>
                              <TableCell className="font-mono text-sm">{d.id}</TableCell>
                              <TableCell>
                                <span className="font-medium">{d.stationId}</span>
                                <span className="ml-1 text-xs text-gray-500">— {stationName}</span>
                              </TableCell>
                              <TableCell className="capitalize">{d.fuelType}</TableCell>
                              <TableCell className="font-medium">{d.liters.toLocaleString()}L</TableCell>
                              <TableCell>
                                <Badge className={statusBadge}>{d.status}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">{new Date(d.createdAt).toLocaleString()}</TableCell>
                              <TableCell className="text-right">
                                {d.status !== 'delivered' && d.status !== 'cancelled' && (
                                  <Button size="sm" variant="outline" onClick={() => openUpdateDispatch(d.id)}>
                                    Update
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="special">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-gray-100 p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Special vehicles</h2>
                    <p className="mt-1 text-sm text-gray-600">Saved in backend `special.json`.</p>
                  </div>
                  <Button onClick={() => setSpecialOpen(true)}>Add special vehicle</Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quota (L/week)</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specialVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-gray-500">No special vehicles yet</TableCell>
                      </TableRow>
                    ) : (
                      specialVehicles.slice(0, 50).map((sv) => (
                        <TableRow
                          key={sv.id}
                          className={selectedSpecialId === sv.id ? 'bg-gray-50' : 'cursor-pointer hover:bg-gray-50/70'}
                          onClick={() => setSelectedSpecialId(sv.id)}
                        >
                          <TableCell className="font-medium">{sv.vehicleNumber}</TableCell>
                          <TableCell className="capitalize">{sv.vehicleType}</TableCell>
                          <TableCell>{sv.fuelQuota}</TableCell>
                          <TableCell className="text-gray-600">{new Date(sv.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              <Card className="border-gray-100 p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">QR code</h2>
                    <p className="mt-1 text-sm text-gray-600">{selectedSpecial ? `Selected: ${selectedSpecial.vehicleNumber}` : 'Select a saved vehicle to preview.'}</p>
                  </div>
                  <Button variant="outline" onClick={downloadSpecialQr} disabled={!specialQrPayload}>
                    Download
                  </Button>
                </div>
                {!specialQrPayload ? (
                  <p className="text-sm text-gray-600">Add a special vehicle or select one from the list to view the QR code.</p>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div id="special-qr" className="rounded-xl border border-gray-200 bg-white p-6">
                      <QRCodeSVG value={specialQrPayload} size={256} level="H" includeMargin />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">QR payload</p>
                      <p className="mt-1 max-w-[24rem] break-words font-mono text-xs text-gray-700">{specialQrPayload}</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="credentials">
            <Card className="border-gray-100 p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Filling station login credentials</h2>
              <p className="mb-4 text-sm text-gray-600">Login accounts from backend (users.json). Passwords are managed securely.</p>
              {credentialsLoading && <p className="text-sm text-gray-500">Loading…</p>}
              {credentialsError && <p className="text-sm text-red-600">{credentialsError}</p>}
              {!credentialsLoading && !credentialsError && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Username (login)</TableHead>
                      <TableHead>Display name</TableHead>
                      <TableHead>Station ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stationCredentialsUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">No station or operator users in users.json</TableCell>
                      </TableRow>
                    ) : (
                      stationCredentialsUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">{u.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-gray-100 px-2 py-1">{u.username}</code>
                          </TableCell>
                          <TableCell>{u.displayName ?? '—'}</TableCell>
                          <TableCell>{u.stationId ?? '—'}</TableCell>
                          <TableCell>
                            <Badge className="bg-gray-200 text-gray-700">Active</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
