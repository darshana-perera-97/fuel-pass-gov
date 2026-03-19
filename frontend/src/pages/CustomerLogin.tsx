import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, LogIn, CheckCircle2, User, Fuel, Droplet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { customerLogin, getFuelQuotas, getVehicleTransactions, sendCustomerOtp, verifyCustomerOtp, type CustomerRecord, type VehicleTransaction } from '@/lib/api';

export function CustomerLogin() {
  const navigate = useNavigate();
  const [nic, setNic] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<VehicleTransaction[]>([]);
  const [quotas, setQuotas] = useState<Awaited<ReturnType<typeof getFuelQuotas>>>([]);

  const handleSendOTP = async () => {
    if (!nic.trim() || !phone.trim()) {
      toast.error('Please enter NIC and contact number');
      return;
    }
    const nicRegex = /^([0-9]{9}[VXvx]|[0-9]{12})$/;
    if (!nicRegex.test(nic.trim())) {
      toast.error('Invalid NIC format (e.g. 972060909V or 12 digits)');
      return;
    }
    const phoneRegex = /^07[0-9]{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast.error('Contact number must be 07XXXXXXXX');
      return;
    }
    setLoading(true);
    setLoginError(null);
    try {
      const res = await sendCustomerOtp({ nic: nic.trim(), phone: phone.trim() });
      setOtpSent(true);
      if (res.devOtp) toast.success(`OTP sent (demo): ${res.devOtp}`);
      else toast.success('OTP sent to your number');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndLogin = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    setLoading(true);
    setLoginError(null);
    try {
      await verifyCustomerOtp({ nic: nic.trim(), phone: phone.trim(), otp });
      toast.success('OTP verified');
      const c = await customerLogin(nic.trim(), phone.trim());
      setCustomer(c);
      localStorage.setItem('customer_last', JSON.stringify(c));
      toast.success('Login successful');
    } catch (e: any) {
      setLoginError(e?.message || 'Verification or login failed');
      toast.error(e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/customer/dashboard');
  };

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    Promise.all([
      getVehicleTransactions(customer.vehicleNumber, 20),
      getFuelQuotas(),
    ]).then(([tx, q]) => {
      if (!cancelled) {
        setTransactions(tx);
        setQuotas(q);
      }
    }).catch(() => {
      if (!cancelled) setTransactions([]);
    });
    return () => { cancelled = true; };
  }, [customer?.id, customer?.vehicleNumber]);

  const quotaRow = customer ? quotas.find((q) => q.vehicleType === customer.vehicleType) : null;
  const weeklyQuota = customer?.fuelType === 'diesel'
    ? (quotaRow?.dieselQuota ?? 0)
    : (quotaRow?.petrolQuota ?? 0);
  const remaining = customer?.fuelType === 'diesel'
    ? (customer.dieselRemaining ?? quotaRow?.dieselQuota ?? 0)
    : (customer?.petrolRemaining ?? quotaRow?.petrolQuota ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 text-gray-600 hover:bg-gray-100">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </Button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
            <LogIn className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Customer login</h1>
            <p className="text-sm text-gray-500">View your fuel quota QR code</p>
          </div>
        </div>

        {!customer ? (
          <Card className="border-gray-100 p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700">NIC</Label>
                <Input
                  placeholder="e.g. 972060909V"
                  value={nic}
                  onChange={(e) => setNic(e.target.value.toUpperCase())}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700">Contact number</Label>
                <Input
                  placeholder="07XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="mt-1"
                />
              </div>
              <Button className="w-full" onClick={handleSendOTP} disabled={loading}>
                {loading ? 'Sending…' : 'Send OTP'}
              </Button>
              {otpSent && (
                <p className="text-center text-sm text-gray-500">OTP sent. Enter it below and click Verify & login.</p>
              )}
            </div>

            {otpSent && (
              <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">
                <div>
                  <Label className="text-gray-700">Enter OTP</Label>
                  <div className="mt-2 flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <Button className="w-full" onClick={handleVerifyAndLogin} disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify OTP & login'}
                </Button>
                {loginError && (
                  <div className="rounded-lg border border-red-100 bg-red-50/80 p-3 text-sm text-red-800">
                    {loginError}
                    {loginError.includes('register') && (
                      <Button variant="link" className="mt-2 h-auto p-0 text-red-800 underline" onClick={() => navigate('/customer/register')}>
                        Register now
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-gray-100 p-6">
              <div className="flex items-center gap-2 text-emerald-700 mb-4">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Logged in</span>
              </div>
              <p className="mb-4 text-sm text-gray-600">Your fuel quota QR code</p>
              <div className="flex flex-col items-center">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <QRCodeSVG value={customer.qrCode} size={220} level="H" includeMargin />
                </div>
                <p className="mt-4 text-lg font-semibold text-gray-900">{customer.vehicleNumber}</p>
                <p className="text-sm text-gray-500">{customer.name}</p>
                <p className="text-xs text-gray-400 capitalize">{customer.fuelType} vehicle</p>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <Button className="w-full" onClick={handleGoToDashboard}>
                  <User className="mr-2 h-4 w-4" />
                  Go to dashboard
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                  Back to home
                </Button>
              </div>
            </Card>

            <Card className="border-gray-100 p-6">
              <h3 className="mb-3 text-base font-semibold text-gray-900">Remaining quota</h3>
              <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
                {customer.fuelType === 'diesel' ? (
                  <Droplet className="h-8 w-8 text-blue-600" />
                ) : (
                  <Fuel className="h-8 w-8 text-emerald-600" />
                )}
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{remaining}L <span className="text-sm font-normal text-gray-500">remaining</span></p>
                  <p className="text-sm text-gray-500">of {weeklyQuota}L weekly quota</p>
                </div>
              </div>
            </Card>

            <Card className="border-gray-100 p-6">
              <h3 className="mb-3 text-base font-semibold text-gray-900">Usage</h3>
              <p className="mb-3 text-sm text-gray-500">Recent fuel dispensed for {customer.vehicleNumber}</p>
              {transactions.length === 0 ? (
                <p className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 text-center text-sm text-gray-500">No usage yet</p>
              ) : (
                <ul className="space-y-2">
                  {transactions.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{t.stationName || t.stationId}</p>
                        <p className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="font-semibold text-red-600">-{t.liters}L</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
