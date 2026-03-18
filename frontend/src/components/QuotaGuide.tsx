import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { vehicleQuotas } from '@/data/mockData';

export function QuotaGuide() {
  return (
    <Card className="border-gray-100 p-6">
      <h3 className="mb-2 text-base font-semibold text-gray-900">Fuel quota by vehicle type</h3>
      <p className="mb-4 text-sm text-gray-500">Weekly allocation for registered vehicles</p>
      <div className="space-y-2">
        {vehicleQuotas.slice(0, 8).map((quota) => (
          <div key={quota.vehicleType} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
            <p className="text-sm font-medium text-gray-900">{quota.vehicleType}</p>
            <div className="flex gap-2">
              {quota.petrolQuota > 0 && <Badge className="bg-gray-100 text-gray-700">Petrol {quota.petrolQuota}L</Badge>}
              {quota.dieselQuota > 0 && <Badge className="bg-gray-100 text-gray-700">Diesel {quota.dieselQuota}L</Badge>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
        <p className="text-xs text-gray-600">Special vehicles may receive higher quotas based on documentation.</p>
      </div>
    </Card>
  );
}
