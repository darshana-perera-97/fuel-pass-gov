import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Shield, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/api';

export function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await login({ role: 'admin', username, password });
      toast.success('Logged in');
      navigate('/admin/dashboard');
    } catch (e: any) {
      toast.error(e?.message || 'Login failed');
    } finally {
      setLoading(false);
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
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <Shield className="h-5 w-5 text-gray-600" />
          </div>
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">Admin login</h1>
          <p className="text-sm text-gray-500">System administrator access</p>
        </div>

        <Card className="border-gray-100 p-6 shadow-soft">
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700">Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
            </div>
            <div>
              <Label className="text-gray-700">Password</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
            </div>
            <Button className="w-full" onClick={onSubmit} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

