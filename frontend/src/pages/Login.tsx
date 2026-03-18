import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Building2, User, Fuel, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { login } from '@/lib/api';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (role: string) => {
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    try {
      if (role === 'admin' || role === 'station' || role === 'operator') {
        await login({ role, username, password });
      }
      toast.success(`Logged in as ${role}`);
      switch (role) {
        case 'admin': navigate('/admin/dashboard'); break;
        case 'station': navigate('/station/dashboard'); break;
        case 'customer': navigate('/customer/dashboard'); break;
        case 'operator': navigate('/operator/dashboard'); break;
      }
    } catch (e: any) {
      toast.error(e?.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 text-gray-600 hover:bg-gray-100">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Button>
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">Login</h1>
          <p className="text-sm text-gray-500">Select your login type</p>
        </div>
        <Card className="border-gray-100 p-6 shadow-soft">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="mb-6 grid grid-cols-4 bg-gray-100/80">
              <TabsTrigger value="admin" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Shield className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="station" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Building2 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="customer" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <User className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="operator" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Fuel className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            <TabsContent value="admin">
              <div className="space-y-4">
                <div className="mb-4 flex items-center gap-3">
                  <Shield className="h-7 w-7 text-gray-500" />
                  <div>
                    <h3 className="font-medium text-gray-900">Admin login</h3>
                    <p className="text-xs text-gray-500">System administrator</p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700">Username</Label>
                  <Input placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                  <Label className="text-gray-700">Password</Label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => handleLogin('admin')}>Login as admin</Button>
              </div>
            </TabsContent>
            <TabsContent value="station">
              <div className="space-y-4">
                <div className="mb-4 flex items-center gap-3">
                  <Building2 className="h-7 w-7 text-gray-500" />
                  <div>
                    <h3 className="font-medium text-gray-900">Station manager login</h3>
                    <p className="text-xs text-gray-500">Filling station management</p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700">Station ID</Label>
                  <Input placeholder="FS001" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                  <Label className="text-gray-700">Password</Label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => handleLogin('station')}>Login as station manager</Button>
              </div>
            </TabsContent>
            <TabsContent value="customer">
              <div className="space-y-4">
                <div className="mb-4 flex items-center gap-3">
                  <User className="h-7 w-7 text-gray-500" />
                  <div>
                    <h3 className="font-medium text-gray-900">Customer login</h3>
                    <p className="text-xs text-gray-500">View your quota & QR code</p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700">NIC number</Label>
                  <Input placeholder="199512345678" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                  <Label className="text-gray-700">Password</Label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => handleLogin('customer')}>Login as customer</Button>
                <div className="text-center">
                  <Button variant="link" className="text-sm text-gray-600" onClick={() => navigate('/customer/register')}>Don't have an account? Register here</Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="operator">
              <div className="space-y-4">
                <div className="mb-4 flex items-center gap-3">
                  <Fuel className="h-7 w-7 text-gray-500" />
                  <div>
                    <h3 className="font-medium text-gray-900">Pump operator login</h3>
                    <p className="text-xs text-gray-500">Scan & dispense fuel</p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700">Operator ID</Label>
                  <Input placeholder="OP001" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                  <Label className="text-gray-700">Password</Label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => handleLogin('operator')}>Login as pump operator</Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
