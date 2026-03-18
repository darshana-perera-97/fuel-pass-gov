import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, LogOut, UserPlus, Fuel, Droplet, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { createStationOperator, getStation, getStationDeliveries, getStationOperators, getStationTransactions, type Delivery, type StationOperator, type StationTransaction } from '@/lib/api';
import type { Station } from '@/lib/api';

const defaultStation = (id: string): Station => ({
  id,
  name: `Station ${id}`,
  petrolStock: 0,
  dieselStock: 0,
  petrolCapacity: 30000,
  dieselCapacity: 40000,
  status: 'empty',
  province: '',
  address: '',
  phone: '',
});

export function StationDashboard() {
  const navigate = useNavigate();
  const stationId = useMemo(
    () => String(JSON.parse(localStorage.getItem('auth_user') || '{}')?.stationId || JSON.parse(localStorage.getItem('auth_user') || '{}')?.username || 'FS001'),
    []
  );

  const [station, setStation] = useState<Station>(() => defaultStation(stationId));
  const [stationLoading, setStationLoading] = useState(true);
  const [transactions, setTransactions] = useState<StationTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const [operators, setOperators] = useState<StationOperator[]>([]);
  const [opLoading, setOpLoading] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [newOperator, setNewOperator] = useState({ name: '', phone: '', shift: '' });
  const [createdOperatorLogin, setCreatedOperatorLogin] = useState<{ operatorId: string; password: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStationLoading(true);
    getStation(stationId)
      .then((s) => {
        if (!cancelled && s) setStation(s);
      })
      .catch(() => {
        if (!cancelled) setStation(defaultStation(stationId));
      })
      .finally(() => {
        if (!cancelled) setStationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  useEffect(() => {
    let cancelled = false;
    setTxLoading(true);
    getStationTransactions(stationId)
      .then((tx) => {
        if (!cancelled) setTransactions(tx);
      })
      .catch(() => {
        // Silent fallback: dashboard can still render without transactions.
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  useEffect(() => {
    let cancelled = false;
    setOpLoading(true);
    getStationOperators(stationId)
      .then((ops) => {
        if (!cancelled) setOperators(ops);
      })
      .catch(() => {
        // Silent fallback: station can still function without operators list.
      })
      .finally(() => {
        if (!cancelled) setOpLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  useEffect(() => {
    let cancelled = false;
    setDeliveriesLoading(true);
    getStationDeliveries(stationId)
      .then((list) => {
        if (!cancelled) setDeliveries(list);
      })
      .catch(() => {
        if (!cancelled) setDeliveries([]);
      })
      .finally(() => {
        if (!cancelled) setDeliveriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  const handleAddOperator = async () => {
    if (!newOperator.name) {
      toast.error('Please enter operator name');
      return;
    }
    try {
      const res = await createStationOperator({
        stationId,
        name: newOperator.name,
        phone: newOperator.phone || undefined,
      });
      setCreatedOperatorLogin({ operatorId: res.credentials.operatorId, password: res.credentials.password });
      toast.success(`Operator ${res.credentials.operatorId} added successfully`);
      setNewOperator({ name: '', phone: '', shift: '' });
      const ops = await getStationOperators(stationId);
      setOperators(ops);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add operator');
    }
  };

  const petrolPercentage = station.petrolCapacity > 0 ? (station.petrolStock / station.petrolCapacity) * 100 : 0;
  const dieselPercentage = station.dieselCapacity > 0 ? (station.dieselStock / station.dieselCapacity) * 100 : 0;

  const todayStats = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayTx = transactions.filter((t) => {
      const ms = Date.parse(t.createdAt);
      return Number.isFinite(ms) && ms >= start;
    });
    const liters = todayTx.reduce((sum, t) => sum + (Number(t.liters) || 0), 0);
    const vehicles = new Set(todayTx.map((t) => String(t.vehicleNumber).toUpperCase()));
    const customersServed = vehicles.size;
    const avgPerVehicle = customersServed > 0 ? liters / customersServed : 0;
    return { liters, customersServed, avgPerVehicle };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Station manager dashboard</h1>
                <p className="text-sm text-gray-500">{station.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/station/login')}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-gray-100 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Fuel className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">Petrol stock</h3>
                  <p className="text-xs text-gray-500">Current inventory (live from backend)</p>
                </div>
              </div>
              {stationLoading ? (
                <span className="text-sm text-gray-500">Loading…</span>
              ) : (
                <Badge className={petrolPercentage < 20 ? 'bg-red-100 text-red-700' : petrolPercentage < 50 ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'}>{petrolPercentage.toFixed(0)}%</Badge>
              )}
            </div>
            {stationLoading ? (
              <p className="text-sm text-gray-500">Loading stock…</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Progress value={petrolPercentage} className="h-2 [&>div]:bg-gray-700" />
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900">{station.petrolStock.toLocaleString()}L</span>
                    <span className="text-gray-500">of {station.petrolCapacity.toLocaleString()}L</span>
                  </div>
                </div>
                {petrolPercentage < 20 && (
                  <div className="mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
                    <p className="text-xs text-red-700">Low stock — order required</p>
                  </div>
                )}
              </>
            )}
          </Card>
          <Card className="border-gray-100 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Droplet className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">Diesel stock</h3>
                  <p className="text-xs text-gray-500">Current inventory (live from backend)</p>
                </div>
              </div>
              {stationLoading ? (
                <span className="text-sm text-gray-500">Loading…</span>
              ) : (
                <Badge className={dieselPercentage < 20 ? 'bg-red-100 text-red-700' : dieselPercentage < 50 ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'}>{dieselPercentage.toFixed(0)}%</Badge>
              )}
            </div>
            {stationLoading ? (
              <p className="text-sm text-gray-500">Loading stock…</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Progress value={dieselPercentage} className="h-2 [&>div]:bg-gray-700" />
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900">{station.dieselStock.toLocaleString()}L</span>
                    <span className="text-gray-500">of {station.dieselCapacity.toLocaleString()}L</span>
                  </div>
                </div>
                {dieselPercentage < 20 && (
                  <div className="mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
                    <p className="text-xs text-red-700">Low stock — order required</p>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Today's sales</p>
                <p className="text-xl font-semibold text-gray-900">{todayStats.liters.toLocaleString()}L</p>
              </div>
            </div>
          </Card>
          <Card className="border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Customers served</p>
                <p className="text-xl font-semibold text-gray-900">{todayStats.customersServed.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <Fuel className="h-6 w-6 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Avg. per vehicle</p>
                <p className="text-xl font-semibold text-gray-900">{todayStats.avgPerVehicle.toFixed(1)}L</p>
              </div>
            </div>
          </Card>
          <Card className="border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Active operators</p>
                <p className="text-xl font-semibold text-gray-900">{operators.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mb-8 border-gray-100 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Pump operators</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Operator
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Pump Operator</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input placeholder="Kamal Silva" value={newOperator.name} onChange={(e) => setNewOperator({ ...newOperator, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input placeholder="0771234567" value={newOperator.phone} onChange={(e) => setNewOperator({ ...newOperator, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Shift</Label>
                    <Input placeholder="Morning / Evening / Night" value={newOperator.shift} onChange={(e) => setNewOperator({ ...newOperator, shift: e.target.value })} />
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                    <p className="text-xs text-gray-600">Password will be auto-generated and shown after you add the operator.</p>
                  </div>
                  <Button className="w-full" onClick={handleAddOperator}>Add operator</Button>

                  {createdOperatorLogin && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
                      <p className="text-sm font-semibold text-gray-900">Pump operator login details</p>
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-gray-600">Operator ID</span>
                          <code className="rounded bg-white px-2 py-1 text-sm">{createdOperatorLogin.operatorId}</code>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-gray-600">Password</span>
                          <code className="rounded bg-white px-2 py-1 text-sm">{createdOperatorLogin.password}</code>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(`Operator ID: ${createdOperatorLogin.operatorId}\nPassword: ${createdOperatorLogin.password}`);
                              toast.success('Copied login details');
                            } catch {
                              toast.error('Copy failed');
                            }
                          }}
                        >
                          Copy details
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operator ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-500">Loading…</TableCell>
                </TableRow>
              ) : operators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-500">No operators yet</TableCell>
                </TableRow>
              ) : (
                operators.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">{op.username}</TableCell>
                    <TableCell>{op.displayName ?? '—'}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <Badge className="bg-gray-200 text-gray-700">active</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">View Details</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="mb-8 border-gray-100 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Vehicles served (this station)</h2>
            <Button variant="outline" size="sm" onClick={() => {
              setTxLoading(true);
              getStationTransactions(station.id)
                .then((tx) => setTransactions(tx))
                .catch((e: any) => toast.error(e?.message || 'Failed to refresh'))
                .finally(() => setTxLoading(false));
            }}>
              Refresh
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle number</TableHead>
                <TableHead>Fuel type</TableHead>
                <TableHead>Liters taken</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-500">Loading…</TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-500">No vehicles served yet</TableCell>
                </TableRow>
              ) : (
                transactions.slice(0, 20).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.vehicleNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{t.fuelType}</Badge>
                    </TableCell>
                    <TableCell>{t.liters} L</TableCell>
                    <TableCell>{t.operatorId ?? '—'}</TableCell>
                    <TableCell className="text-gray-600">{new Date(t.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-gray-500">Shows latest transactions recorded by pump operators for this filling station.</p>
        </Card>

        <Card className="border-gray-100 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Stock to be received</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeliveriesLoading(true);
                getStationDeliveries(stationId)
                  .then(setDeliveries)
                  .catch(() => setDeliveries([]))
                  .finally(() => setDeliveriesLoading(false));
              }}
            >
              Refresh
            </Button>
          </div>
          {deliveriesLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : deliveries.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 text-center text-sm text-gray-600">
              No deliveries scheduled or in transit for this station.
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/80 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{d.fuelType} delivery</p>
                    <p className="text-xs text-gray-500">
                      {d.status === 'in-transit' ? 'In transit' : 'Scheduled'} · {new Date(d.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">{d.liters.toLocaleString()}L</p>
                    <Badge className={d.status === 'in-transit' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'}>
                      {d.status === 'in-transit' ? 'In transit' : d.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
