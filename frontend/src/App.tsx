import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { AdminLogin } from './pages/AdminLogin';
import { StationLogin } from './pages/StationLogin';
import { OperatorLogin } from './pages/OperatorLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { CustomerRegistration } from './pages/CustomerRegistration';
import { CustomerLogin } from './pages/CustomerLogin';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { StationDashboard } from './pages/StationDashboard';
import { PumpOperator } from './pages/PumpOperator';

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/station/login" element={<StationLogin />} />
          <Route path="/operator/login" element={<OperatorLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/customer/register" element={<CustomerRegistration />} />
          <Route path="/customer/login" element={<CustomerLogin />} />
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/station/dashboard" element={<StationDashboard />} />
          <Route path="/operator/dashboard" element={<PumpOperator />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="light" position="top-right" />
    </>
  );
}
