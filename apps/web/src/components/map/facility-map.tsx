'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon asset paths in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface FacilityMapProps {
  facilities: any[];
  center: [number, number];
  zoom?: number;
}

function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function FacilityMap({ facilities, center, zoom = 12 }: FacilityMapProps) {
  return (
    <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeMapView center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {facilities.map((f) => (
          <Marker
            key={f.id}
            position={[f.latitude, f.longitude]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="p-1 space-y-1 text-xs">
                <div className="font-bold text-slate-900">{f.name}</div>
                <div className="text-[11px] text-brand-600 font-semibold">{f.type}</div>
                <div className="text-slate-600">{f.address}</div>
                <div className="text-[11px] text-slate-500 font-medium">📞 {f.contactPhone}</div>
                {f.hasEmergencyUnit && (
                  <div className="text-[10px] text-red-600 font-bold">🚨 24/7 Emergency & Trauma</div>
                )}
                {f.distanceKm !== undefined && (
                  <div className="text-[10px] text-slate-400">Distance: {f.distanceKm} km away</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
