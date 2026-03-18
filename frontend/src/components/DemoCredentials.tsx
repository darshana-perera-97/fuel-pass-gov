import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Building2, User, Fuel } from 'lucide-react';

export function DemoCredentials() {
  return (
    <Card className="border-gray-100 bg-gray-50/50 p-6">
      <h3 className="mb-2 text-base font-semibold text-gray-900">Demo access credentials</h3>
      <p className="mb-4 text-sm text-gray-500">Use these credentials to explore different user roles:</p>
      <div className="space-y-2">
        <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge className="bg-gray-800 text-white">Admin</Badge>
            </div>
            <p className="text-sm text-gray-700">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">admin</span>
              <span className="mx-1 text-gray-400">/</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">admin123</span>
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge className="bg-gray-700 text-white">Station Manager</Badge>
            </div>
            <p className="text-sm text-gray-700">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">FS001</span>
              <span className="mx-1 text-gray-400">/</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">station123</span>
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge className="bg-gray-600 text-white">Customer</Badge>
            </div>
            <p className="text-sm text-gray-700">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">199512345678</span>
              <span className="mx-1 text-gray-400">/</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">customer123</span>
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3">
          <Fuel className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge className="bg-gray-700 text-white">Pump Operator</Badge>
            </div>
            <p className="text-sm text-gray-700">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">OP001</span>
              <span className="mx-1 text-gray-400">/</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">operator123</span>
            </p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">You can also register as a new customer to see the full flow.</p>
    </Card>
  );
}
