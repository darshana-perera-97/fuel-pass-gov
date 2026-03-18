import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FuelMap } from '@/components/FuelMap';
import { HelpButton } from '@/components/HelpButton';
import { Card } from '@/components/ui/card';
import { LogIn, User, MapPin, Shield } from 'lucide-react';
import { getPublicStations, type Station } from '@/lib/api';

export function LandingPage() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPublicStations()
      .then((list) => {
        if (!cancelled) setStations(list);
      })
      .catch(() => {
        // Keep empty if backend is down
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <HelpButton />
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <MapPin className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Sri Lanka National Fuel Quota System</h1>
                <p className="text-xs text-gray-500">ශ්‍රී ලංකා ජාතික ඉන්ධන කෝටා පද්ධතිය</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/customer/register')}>
                <User className="mr-2 h-4 w-4" />
                Register
              </Button>
              <Button onClick={() => navigate('/customer/login')}>
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative border-b border-gray-100 bg-white">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(900px 380px at 50% 0%, rgba(0,0,0,0.05), transparent 60%)',
          }}
        />
        <div className="container relative mx-auto px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-medium tracking-wide text-gray-500">
              National Fuel Quota System
            </p>
            <h2 className="mb-4 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              Track fuel availability. Get your quota QR in minutes.
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-gray-600">
              A minimal, real-time view of station status across Sri Lanka. Register your vehicle to receive your weekly quota QR code and use it at any participating station.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate('/customer/register')}>
                Register a vehicle
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/customer/login')}>
                Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6 text-center">
            <h3 className="text-xl font-semibold text-gray-900">Fuel station map</h3>
            <p className="mt-2 text-sm text-gray-500">Explore station availability across Sri Lanka.</p>
          </div>
          <Card className="overflow-hidden border-gray-100">
            <div className="h-[560px]">
              <FuelMap stations={stations} />
            </div>
          </Card>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gradient-to-b from-gray-50/60 to-white py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h3 className="text-xl font-semibold text-gray-900">How it works</h3>
            <p className="mt-2 text-sm text-gray-500">A simple flow designed for speed at the station.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="group border-gray-100 bg-gradient-to-b from-emerald-50/60 to-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
                  <User className="h-5 w-5 text-emerald-700" />
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Step 1</span>
              </div>
              <h4 className="mt-4 text-base font-semibold text-gray-900">Register your vehicle</h4>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Enter your NIC, confirm via OTP, and provide vehicle details to create your profile.
              </p>
            </Card>

            <Card className="group border-gray-100 bg-gradient-to-b from-indigo-50/60 to-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
                  <Shield className="h-5 w-5 text-indigo-700" />
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Step 2</span>
              </div>
              <h4 className="mt-4 text-base font-semibold text-gray-900">Get your quota QR</h4>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Receive a QR code linked to your weekly quota. Keep it on your phone for quick access.
              </p>
            </Card>

            <Card className="group border-gray-100 bg-gradient-to-b from-amber-50/60 to-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
                  <MapPin className="h-5 w-5 text-amber-700" />
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Step 3</span>
              </div>
              <h4 className="mt-4 text-base font-semibold text-gray-900">Scan & fill</h4>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Visit any station, scan your QR, and dispense fuel within your remaining quota.
              </p>
            </Card>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Real-time station status is shown on the map above.
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">© 2026 Government of Sri Lanka — Ministry of Energy</p>
          <p className="mt-1 text-xs text-gray-400">For support: 1919 | support@fuel.gov.lk</p>
        </div>
      </footer>
    </div>
  );
}
