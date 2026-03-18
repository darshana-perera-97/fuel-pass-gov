export interface FillingStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  petrolStock: number;
  dieselStock: number;
  petrolCapacity: number;
  dieselCapacity: number;
  status: 'available' | 'in-transit' | 'empty';
  province: string;
  address: string;
  phone: string;
}

export interface VehicleQuota {
  vehicleType: string;
  petrolQuota: number;
  dieselQuota: number;
  period: string;
}

export interface Customer {
  id: string;
  nic: string;
  name: string;
  phone: string;
  address: string;
  vehicleNumber: string;
  province: string;
  chassisNumber: string;
  fuelType: 'petrol' | 'diesel';
  qrCode: string;
  petrolRemaining: number;
  dieselRemaining: number;
}

export const fillingStations: FillingStation[] = [
  { id: 'FS001', name: 'Ceylon Petroleum - Colombo Fort', lat: 6.9344, lng: 79.8428, petrolStock: 15000, dieselStock: 20000, petrolCapacity: 30000, dieselCapacity: 40000, status: 'available', province: 'Western', address: 'Fort, Colombo 01', phone: '011-2345678' },
  { id: 'FS002', name: 'Lanka IOC - Kandy City', lat: 7.2906, lng: 80.6337, petrolStock: 0, dieselStock: 0, petrolCapacity: 25000, dieselCapacity: 35000, status: 'empty', province: 'Central', address: 'Kandy City Centre', phone: '081-2234567' },
  { id: 'FS003', name: 'Laugfs - Galle Junction', lat: 6.0535, lng: 80.2210, petrolStock: 8000, dieselStock: 12000, petrolCapacity: 20000, dieselCapacity: 30000, status: 'in-transit', province: 'Southern', address: 'Galle Road, Galle', phone: '091-2223344' },
  { id: 'FS004', name: 'Ceylon Petroleum - Jaffna Main', lat: 9.6615, lng: 80.0255, petrolStock: 18000, dieselStock: 22000, petrolCapacity: 30000, dieselCapacity: 40000, status: 'available', province: 'Northern', address: 'Hospital Road, Jaffna', phone: '021-2223344' },
  { id: 'FS005', name: 'Indian Oil - Trincomalee', lat: 8.5874, lng: 81.2152, petrolStock: 12000, dieselStock: 16000, petrolCapacity: 25000, dieselCapacity: 35000, status: 'available', province: 'Eastern', address: 'Main Street, Trincomalee', phone: '026-2223344' },
  { id: 'FS006', name: 'Laugfs - Negombo', lat: 7.2084, lng: 79.8358, petrolStock: 5000, dieselStock: 7000, petrolCapacity: 20000, dieselCapacity: 30000, status: 'in-transit', province: 'Western', address: 'Negombo Road', phone: '031-2223344' },
  { id: 'FS007', name: 'Ceylon Petroleum - Anuradhapura', lat: 8.3114, lng: 80.4037, petrolStock: 10000, dieselStock: 14000, petrolCapacity: 25000, dieselCapacity: 35000, status: 'available', province: 'North Central', address: 'Main Street, Anuradhapura', phone: '025-2223344' },
  { id: 'FS008', name: 'Indian Oil - Batticaloa', lat: 7.7310, lng: 81.6747, petrolStock: 0, dieselStock: 0, petrolCapacity: 20000, dieselCapacity: 30000, status: 'empty', province: 'Eastern', address: 'Bar Road, Batticaloa', phone: '065-2223344' },
  { id: 'FS009', name: 'Laugfs - Ratnapura', lat: 6.7056, lng: 80.3847, petrolStock: 13000, dieselStock: 17000, petrolCapacity: 25000, dieselCapacity: 35000, status: 'available', province: 'Sabaragamuwa', address: 'Main Street, Ratnapura', phone: '045-2223344' },
  { id: 'FS010', name: 'Ceylon Petroleum - Kurunegala', lat: 7.4867, lng: 80.3647, petrolStock: 16000, dieselStock: 20000, petrolCapacity: 30000, dieselCapacity: 40000, status: 'available', province: 'North Western', address: 'Colombo Road, Kurunegala', phone: '037-2223344' },
];

export const vehicleQuotas: VehicleQuota[] = [
  { vehicleType: 'Motorcycle', petrolQuota: 4, dieselQuota: 0, period: 'Weekly' },
  { vehicleType: 'Three-Wheeler', petrolQuota: 6, dieselQuota: 0, period: 'Weekly' },
  { vehicleType: 'Car (Petrol)', petrolQuota: 20, dieselQuota: 0, period: 'Weekly' },
  { vehicleType: 'Car (Diesel)', petrolQuota: 0, dieselQuota: 25, period: 'Weekly' },
  { vehicleType: 'Van (Petrol)', petrolQuota: 30, dieselQuota: 0, period: 'Weekly' },
  { vehicleType: 'Van (Diesel)', petrolQuota: 0, dieselQuota: 40, period: 'Weekly' },
  { vehicleType: 'Bus', petrolQuota: 0, dieselQuota: 100, period: 'Weekly' },
  { vehicleType: 'Lorry', petrolQuota: 0, dieselQuota: 120, period: 'Weekly' },
];

export const mockCustomers: Customer[] = [
  { id: 'CUST001', nic: '199512345678', name: 'Nimal Perera', phone: '+94771234567', address: 'No. 45, Galle Road, Colombo 03', vehicleNumber: 'WP-CAR-1234', province: 'Western', chassisNumber: 'JHM1234567890', fuelType: 'petrol', qrCode: 'CUST001-WP-CAR-1234', petrolRemaining: 15, dieselRemaining: 0 },
];

export const provinces = [
  'Western', 'Central', 'Southern', 'Northern', 'Eastern',
  'North Western', 'North Central', 'Uva', 'Sabaragamuwa',
];
