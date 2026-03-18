import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, ArrowRight, Check, Phone } from 'lucide-react';
import { provinces, vehicleQuotas } from '@/data/mockData';
import { toast } from 'sonner';
import { registerCustomer, sendCustomerOtp, verifyCustomerOtp } from '@/lib/api';

export function CustomerRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nic: '', phone: '', otp: '', name: '', address: '',
    vehicleNumberPrefix: '', vehicleNumberSuffix: '', vehicleType: '', province: '', chassisNumber: '', fuelType: '',
  });
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    if (!formData.nic || !formData.phone) {
      toast.error('Please enter NIC and phone number');
      return;
    }
    const nicRegex = /^([0-9]{9}[VXvx]|[0-9]{12})$/;
    if (!nicRegex.test(formData.nic)) {
      toast.error('Invalid NIC format');
      return;
    }
    const phoneRegex = /^07[0-9]{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Mobile number must be in 07XXXXXXXX format');
      return;
    }
    try {
      const res = await sendCustomerOtp({ nic: formData.nic, phone: formData.phone });
      setOtpSent(true);
      if (res.devOtp) toast.success(`OTP sent (demo): ${res.devOtp}`);
      else toast.success('OTP sent');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    if (formData.otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    try {
      await verifyCustomerOtp({ nic: formData.nic, phone: formData.phone, otp: formData.otp });
      toast.success('OTP verified successfully');
      setStep(2);
    } catch (e: any) {
      toast.error(e?.message || 'Invalid OTP');
    }
  };

  const handleStep2 = () => {
    if (!formData.name || !formData.address) {
      toast.error('Please fill all fields');
      return;
    }
    setStep(3);
  };

  const handleStep3 = async () => {
    const prefix = formData.vehicleNumberPrefix.trim().toUpperCase();
    const suffix = formData.vehicleNumberSuffix.trim();
    if (!prefix || !suffix || !formData.vehicleType || !formData.province || !formData.chassisNumber || !formData.fuelType) {
      toast.error('Please fill all fields');
      return;
    }
    if (!/^[A-Z0-9]{2,3}$/.test(prefix)) {
      toast.error('Vehicle number prefix must be 2–3 letters or numbers (e.g. WP or ABC)');
      return;
    }
    if (!/^[0-9]{4}$/.test(suffix)) {
      toast.error('Vehicle number must be 4 digits (e.g. 1234)');
      return;
    }
    try {
      const customer = await registerCustomer({
        nic: formData.nic,
        phone: formData.phone,
        name: formData.name,
        address: formData.address,
        vehicleNumberPrefix: prefix,
        vehicleNumberSuffix: suffix,
        vehicleType: formData.vehicleType,
        province: formData.province,
        chassisNumber: formData.chassisNumber,
        fuelType: formData.fuelType === 'diesel' ? 'diesel' : 'petrol',
      });
      localStorage.setItem('customer_last', JSON.stringify(customer));
      toast.success('Registration complete!');
      navigate('/customer/dashboard');
    } catch (e: any) {
      toast.error(e?.message || 'Registration failed');
    }
  };

  const stepIndicator = (stepNum: number) => (
    <div className={`flex flex-1 items-center ${stepNum < 3 ? '' : ''}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${step >= stepNum ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
        {step > stepNum ? <Check className="h-4 w-4" /> : stepNum}
      </div>
      {stepNum < 3 && <div className={`mx-2 h-0.5 flex-1 rounded ${step > stepNum ? 'bg-gray-900' : 'bg-gray-100'}`} />}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 text-gray-600 hover:bg-gray-100">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </Button>
        <Card className="border-gray-100 p-8 shadow-soft">
          <h1 className="mb-1 text-xl font-semibold text-gray-900">Customer registration</h1>
          <p className="mb-6 text-sm text-gray-500">Register to get your fuel quota QR code</p>
          <div className="mb-8 flex items-center">
            {stepIndicator(1)}
            {stepIndicator(2)}
            {stepIndicator(3)}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-base font-medium text-gray-900">Step 1: Verify your identity</h2>
              <div>
                <Label>NIC Number</Label>
                <Input placeholder="199512345678 or 951234567V" value={formData.nic} onChange={(e) => setFormData({ ...formData, nic: e.target.value.toUpperCase() })} />
                <p className="mt-1 text-xs text-gray-500">Enter your National Identity Card number</p>
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input placeholder="0771234567" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\\D/g, '').slice(0, 10) })} />
                <p className="mt-1 text-xs text-gray-500">OTP will be sent to this number</p>
              </div>
              {!otpSent ? (
                <Button className="w-full" onClick={handleSendOTP}>
                  <Phone className="mr-2 h-4 w-4" />
                  Send OTP
                </Button>
              ) : (
                <>
                  <div>
                    <Label>Enter OTP</Label>
                    <div className="mt-2 flex justify-center">
                      <InputOTP maxLength={6} value={formData.otp} onChange={(value) => setFormData({ ...formData, otp: value })}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot key={i} index={i} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-500">Check your WhatsApp/SMS</p>
                  </div>
                  <Button className="w-full" onClick={handleVerifyOTP}>
                    Verify & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleSendOTP}>Resend OTP</Button>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-base font-medium text-gray-900">Step 2: Personal details</h2>
              <div>
                <Label>Full Name</Label>
                <Input placeholder="Nimal Perera" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <Label>Residential Address</Label>
                <Input placeholder="No. 45, Galle Road, Colombo 03" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={handleStep2}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-base font-medium text-gray-900">Step 3: Vehicle information</h2>
              <div>
                <Label>Vehicle number</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    placeholder="WP"
                    value={formData.vehicleNumberPrefix}
                    onChange={(e) => setFormData({ ...formData, vehicleNumberPrefix: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) })}
                    className="w-20 text-center font-medium uppercase"
                    maxLength={3}
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    placeholder="1234"
                    value={formData.vehicleNumberSuffix}
                    onChange={(e) => setFormData({ ...formData, vehicleNumberSuffix: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="w-24 text-center font-medium"
                    maxLength={4}
                    inputMode="numeric"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">First 3 characters (e.g. WP, ABC) and 4 digits (e.g. 1234)</p>
              </div>
              <div>
                <Label>Vehicle type</Label>
                <Select onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleQuotas.map((q) => (
                      <SelectItem key={q.vehicleType} value={q.vehicleType}>{q.vehicleType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Province of registration</Label>
                <Select onValueChange={(value) => setFormData({ ...formData, province: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chassis number</Label>
                <Input placeholder="JHM1234567890" value={formData.chassisNumber} onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>Fuel type</Label>
                <Select onValueChange={(value) => setFormData({ ...formData, fuelType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={handleStep3}>
                  <Check className="mr-2 h-4 w-4" />
                  Complete Registration
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
