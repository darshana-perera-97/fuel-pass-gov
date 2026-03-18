import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 z-50 size-12 rounded-full border border-gray-200 bg-white shadow-soft hover:bg-gray-50"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-5 w-5 text-gray-600" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-gray-100">
          <DialogHeader>
            <DialogTitle className="text-gray-900">System help</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">Need help?</h4>
              <p className="text-sm text-gray-500">
                This is a demo of the Sri Lanka National Fuel Quota System. You can explore all features using the demo credentials on the landing page.
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">Quick guide</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-500">
                <li>Use the Login button to access different roles</li>
                <li>Register as a new customer to see the full flow</li>
                <li>Check the map for real-time station status</li>
                <li>Download QR codes from customer dashboard</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">Support</h4>
              <p className="text-sm text-gray-500">
                📞 Hotline: 1919<br />
                📧 Email: support@fuel.gov.lk
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
