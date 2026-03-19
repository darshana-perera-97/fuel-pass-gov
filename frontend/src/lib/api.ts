import { API_BASE_URL } from '@/config';

export type LoginRole = 'admin' | 'station' | 'operator';

export interface LoginRequest {
  role: LoginRole;
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    role: LoginRole;
    username: string;
    displayName?: string;
    stationId?: string;
    operatorId?: string;
  };
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Login failed');
  }
  return res.json();
}

export interface ApiUser {
  id: string;
  role: LoginRole;
  username: string;
  displayName?: string;
  stationId?: string;
  operatorId?: string;
}

export async function getAdminUsers(): Promise<ApiUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users`);
  if (!res.ok) throw new Error('Failed to load users');
  const data = await res.json();
  return data.users ?? [];
}

export interface StationOperator extends ApiUser {
  role: 'operator';
  stationId: string;
  operatorId?: string;
  phone?: string;
  createdAt?: string;
}

export async function getStationOperators(stationId: string): Promise<StationOperator[]> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${encodeURIComponent(stationId)}/operators`);
  if (!res.ok) throw new Error('Failed to load operators');
  const data = await res.json();
  return data.operators ?? [];
}

export async function createStationOperator(params: {
  stationId: string;
  name: string;
  phone?: string;
  password?: string;
}): Promise<{ operator: StationOperator; credentials: { operatorId: string; password: string } }> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${encodeURIComponent(params.stationId)}/operators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: params.name, phone: params.phone, password: params.password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to add operator');
  }
  const data = await res.json();
  return { operator: data.operator, credentials: data.credentials };
}

export interface FuelQuota {
  vehicleType: string;
  petrolQuota: number;
  dieselQuota: number;
  period: string;
}

export async function getFuelQuotas(): Promise<FuelQuota[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/fuel-quotas`);
  if (!res.ok) throw new Error('Failed to load fuel quotas');
  const data = await res.json();
  return data.quotas ?? [];
}

export async function saveFuelQuotas(quotas: FuelQuota[]): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/admin/fuel-quotas`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quotas }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to save fuel quotas');
  }
}

export type FuelType = 'petrol' | 'diesel';

export interface StationTransaction {
  id: string;
  stationId: string;
  vehicleNumber: string;
  liters: number;
  fuelType: FuelType;
  operatorId?: string;
  createdAt: string;
}

export interface VehicleTransaction extends StationTransaction {
  stationName?: string;
}

export async function getStationTransactions(stationId: string): Promise<StationTransaction[]> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${encodeURIComponent(stationId)}/transactions`);
  if (!res.ok) throw new Error('Failed to load transactions');
  const data = await res.json();
  return data.transactions ?? [];
}

export async function getVehicleTransactions(vehicleNumber: string, limit = 10): Promise<VehicleTransaction[]> {
  const vn = String(vehicleNumber || '').trim();
  if (!vn) return [];
  const url = new URL(`${API_BASE_URL}/api/transactions`);
  url.searchParams.set('vehicleNumber', vn);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load transactions');
  const data = await res.json();
  return data.transactions ?? [];
}

export async function createStationTransaction(params: {
  stationId: string;
  vehicleNumber: string;
  liters: number;
  fuelType: FuelType;
  operatorId?: string;
}): Promise<StationTransaction> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${encodeURIComponent(params.stationId)}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicleNumber: params.vehicleNumber,
      liters: params.liters,
      fuelType: params.fuelType,
      operatorId: params.operatorId,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to create transaction');
  }
  const data = await res.json();
  return data.transaction;
}

export type DeliveryStatus = 'pending' | 'in-transit' | 'delivered' | 'cancelled';

export interface Delivery {
  id: string;
  stationId: string;
  fuelType: FuelType;
  liters: number;
  status: DeliveryStatus;
  createdAt: string;
}

export async function getStationDeliveries(stationId: string): Promise<Delivery[]> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${encodeURIComponent(stationId)}/deliveries`);
  if (!res.ok) throw new Error('Failed to load deliveries');
  const data = await res.json();
  return data.deliveries ?? [];
}

export async function getAdminDeliveries(): Promise<Delivery[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/deliveries`);
  if (!res.ok) throw new Error('Failed to load deliveries');
  const data = await res.json();
  return data.deliveries ?? [];
}

export async function createDelivery(params: {
  stationId: string;
  fuelType: FuelType;
  liters: number;
}): Promise<Delivery> {
  const res = await fetch(`${API_BASE_URL}/api/admin/deliveries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to create delivery');
  }
  const data = await res.json();
  return data.delivery;
}

export async function updateDeliveryStatus(deliveryId: string, status: DeliveryStatus): Promise<Delivery> {
  const res = await fetch(`${API_BASE_URL}/api/admin/deliveries/${encodeURIComponent(deliveryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to update delivery');
  }
  const data = await res.json();
  return data.delivery;
}

export interface SpecialVehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  fuelQuota: number;
  createdAt: string;
}

export async function getSpecialVehicles(): Promise<SpecialVehicle[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/special-vehicles`);
  if (!res.ok) throw new Error('Failed to load special vehicles');
  const data = await res.json();
  return data.specialVehicles ?? [];
}

export async function createSpecialVehicle(params: {
  vehicleNumber: string;
  vehicleType: string;
  fuelQuota: number;
}): Promise<SpecialVehicle> {
  const res = await fetch(`${API_BASE_URL}/api/admin/special-vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to add special vehicle');
  }
  const data = await res.json();
  return data.specialVehicle;
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  petrolStock: number;
  dieselStock: number;
  petrolCapacity: number;
  dieselCapacity: number;
  status: 'available' | 'in-transit' | 'empty' | 'dispensing';
  province: string;
  address: string;
  phone: string;
  /** Bowser in transit: total petrol liters on the way (from deliveries). */
  inTransitPetrol?: number;
  /** Bowser in transit: total diesel liters on the way (from deliveries). */
  inTransitDiesel?: number;
}

export async function getStations(): Promise<Station[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/stations`);
  if (!res.ok) throw new Error('Failed to load stations');
  const data = await res.json();
  return data.stations ?? [];
}

export async function getPublicStations(): Promise<Station[]> {
  const res = await fetch(`${API_BASE_URL}/api/stations`);
  if (!res.ok) throw new Error('Failed to load stations');
  const data = await res.json();
  return data.stations ?? [];
}

export async function getStation(stationId: string): Promise<Station | null> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${encodeURIComponent(stationId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load station');
  const data = await res.json();
  return data.station ?? null;
}

export async function createStation(params: {
  name: string;
  lat: number;
  lng: number;
  province: string;
  address: string;
  phone: string;
  petrolCapacity: number;
  dieselCapacity: number;
}): Promise<{ station: Station; credentials?: { username: string; password?: string } }> {
  const res = await fetch(`${API_BASE_URL}/api/admin/stations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to add station');
  }
  const data = await res.json();
  return { station: data.station, credentials: data.credentials };
}

export async function sendCustomerOtp(params: { nic: string; phone: string }): Promise<{ devOtp?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/customers/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to send OTP');
  }
  return res.json();
}

export async function verifyCustomerOtp(params: { nic: string; phone: string; otp: string }): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/customers/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to verify OTP');
  }
}

export interface CustomerRegistrationPayload {
  nic: string;
  phone: string;
  name: string;
  address: string;
  vehicleNumberPrefix: string;
  vehicleNumberSuffix: string;
  vehicleType: string;
  province: string;
  chassisNumber: string;
  fuelType: 'petrol' | 'diesel';
}

export interface CustomerRecord extends CustomerRegistrationPayload {
  id: string;
  vehicleNumber: string;
  qrCode: string;
  createdAt: string;
  petrolRemaining?: number;
  dieselRemaining?: number;
}

export async function getCustomer(id: string): Promise<CustomerRecord | null> {
  const res = await fetch(`${API_BASE_URL}/api/customers/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load customer');
  const data = await res.json();
  return data.customer ?? null;
}

/** Login with NIC + phone after OTP verified. Returns customer or throws (e.g. not found). */
export async function customerLogin(nic: string, phone: string): Promise<CustomerRecord> {
  const res = await fetch(`${API_BASE_URL}/api/customers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nic: nic.trim(), phone: phone.trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 404) throw new Error(data?.error || 'No account found for this NIC and contact number. Please register first.');
  if (res.status === 401) throw new Error(data?.error || 'OTP not verified or expired.');
  if (!res.ok) throw new Error(data?.error || 'Login failed');
  return data.customer;
}

export async function sendCustomerQrToWhatsApp(customerId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/customers/${encodeURIComponent(customerId)}/qr/whatsapp`, {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to send QR to WhatsApp');
  }
}

export async function registerCustomer(payload: CustomerRegistrationPayload): Promise<CustomerRecord> {
  const res = await fetch(`${API_BASE_URL}/api/customers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Registration failed');
  }
  const data = await res.json();
  return data.customer;
}

