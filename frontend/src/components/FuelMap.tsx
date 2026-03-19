import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import type { Station } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Fuel, Droplet } from 'lucide-react';

type StationWithTransit = Station;

interface FuelMapProps {
  stations: StationWithTransit[];
  center?: [number, number];
  zoom?: number;
}

const createIcon = (color: string) =>
  new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26c0-8.8-7.2-16-16-16z" fill="${color}"/>
        <circle cx="16" cy="16" r="8" fill="white"/>
      </svg>
    `)}`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });

const greenIcon = createIcon('#059669');
const yellowIcon = createIcon('#F59E0B');
const redIcon = createIcon('#DC2626');

export function FuelMap({ stations, center = [7.8731, 80.7718], zoom = 7 }: FuelMapProps) {
  // Rough bounding box for Sri Lanka (keeps the map focused on the country)
  const sriLankaBounds = new LatLngBounds(
    [5.85, 79.55], // south-west
    [9.95, 81.95], // north-east
  );

  const getIcon = (status: string) => {
    switch (status) {
      case 'available': return greenIcon;
      case 'dispensing': return greenIcon;
      case 'in-transit': return yellowIcon;
      case 'empty': return redIcon;
      default: return greenIcon;
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-emerald-100 text-emerald-800">Available</Badge>;
      case 'dispensing': return <Badge className="bg-emerald-100 text-emerald-800">Dispensing</Badge>;
      case 'in-transit': return <Badge className="bg-amber-100 text-amber-800">In transit</Badge>;
      case 'empty': return <Badge className="bg-red-100 text-red-700">Out of stock</Badge>;
      default: return null;
    }
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={7}
      maxZoom={13}
      maxBounds={sriLankaBounds}
      maxBoundsViscosity={1.0}
      style={{ height: '100%', width: '100%', borderRadius: '8px' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        noWrap
      />
      {stations.map((station) => (
        <Marker key={station.id} position={[station.lat, station.lng]} icon={getIcon(station.status)}>
          <Popup>
            <div className="min-w-[250px] p-2">
              <h3 className="mb-2 text-base font-semibold">{station.name}</h3>
              <div className="mb-2">{getStatusBadge(station.status)}</div>
              <p className="mb-2 text-sm text-gray-600">{station.address}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">Petrol:</span>
                  </div>
                  <span className={`text-sm font-semibold ${station.petrolStock === 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {station.petrolStock.toLocaleString()}L
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Diesel:</span>
                  </div>
                  <span className={`text-sm font-semibold ${station.dieselStock === 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {station.dieselStock.toLocaleString()}L
                  </span>
                </div>
                {station.status === 'in-transit' && ((station.inTransitPetrol ?? 0) > 0 || (station.inTransitDiesel ?? 0) > 0) && (
                  <div className="mt-3 border-t border-gray-200 pt-2">
                    <p className="mb-1.5 text-xs font-medium text-amber-700">Bowser in transit</p>
                    <div className="space-y-1 text-sm text-gray-700">
                      {(station.inTransitPetrol ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Petrol:</span>
                          <span className="font-semibold text-amber-700">+{(station.inTransitPetrol ?? 0).toLocaleString()}L</span>
                        </div>
                      )}
                      {(station.inTransitDiesel ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Diesel:</span>
                          <span className="font-semibold text-amber-700">+{(station.inTransitDiesel ?? 0).toLocaleString()}L</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
