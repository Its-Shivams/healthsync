'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  MapPin,
  Building2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Phone,
  Navigation,
  Key,
} from 'lucide-react';

export interface FacilityMarkerData {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  contactPhone?: string;
  contactEmail?: string;
  hasEmergencyUnit?: boolean;
  specialties?: string;
  availableServices?: string;
  distanceKm?: number;
  isPartner?: boolean;
  rating?: number;
  googlePlaceId?: string;
}

interface GoogleFacilityMapProps {
  facilities: FacilityMarkerData[];
  externalPlaces?: FacilityMarkerData[];
  center: [number, number];
  zoom?: number;
  onSelectFacility?: (facility: FacilityMarkerData) => void;
  searchedAddress?: string;
}

export default function GoogleFacilityMap({
  facilities,
  externalPlaces = [],
  center,
  zoom = 12,
  onSelectFacility,
}: GoogleFacilityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasValidKey = Boolean(apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' && apiKey.length > 10);

  // Initialize Google Maps JavaScript API
  useEffect(() => {
    if (!hasValidKey) return;

    let isMounted = true;
    try {
      setOptions({
        key: apiKey,
        v: 'weekly',
      });

      Promise.all([importLibrary('maps'), importLibrary('places')])
        .then(([mapsLib]: any[]) => {
          if (!isMounted || !mapContainerRef.current) return;

          const map = new mapsLib.Map(mapContainerRef.current, {
            center: { lat: center[0], lng: center[1] },
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });

          infoWindowRef.current = new google.maps.InfoWindow();
          mapInstanceRef.current = map;
          setMapsLoaded(true);
        })
        .catch((err) => {
          if (isMounted) {
            setLoadError(err.message || 'Google Maps failed to load. Please check API Key permissions.');
          }
        });
    } catch (err: any) {
      if (isMounted) setLoadError(err.message);
    }

    return () => {
      isMounted = false;
    };
  }, [hasValidKey]);

  // Center update
  useEffect(() => {
    if (mapInstanceRef.current && mapsLoaded) {
      mapInstanceRef.current.panTo({ lat: center[0], lng: center[1] });
    }
  }, [center, mapsLoaded]);

  // Render Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !mapsLoaded) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;

    // 1. User searched location marker
    const userMarker = new google.maps.Marker({
      position: { lat: center[0], lng: center[1] },
      map,
      title: 'Current Searched Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#2563EB',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2.5,
      },
    });
    markersRef.current.push(userMarker);

    // 2. HealthSync Partner Facility Markers
    facilities.forEach((fac) => {
      if (!fac.latitude || !fac.longitude) return;

      const marker = new google.maps.Marker({
        position: { lat: fac.latitude, lng: fac.longitude },
        map,
        title: fac.name,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: fac.hasEmergencyUnit ? '#DC2626' : '#0D9488',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 1.5,
          scale: 1.6,
          anchor: new google.maps.Point(12, 22),
        },
      });

      marker.addListener('click', () => {
        if (infoWindow) {
          infoWindow.setContent(`
            <div style="font-family: system-ui, sans-serif; padding: 6px; max-width: 260px;">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <span style="background: #E6FFFA; color: #0D9488; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid #99F6E4;">
                  ★ HealthSync Partner
                </span>
                ${
                  fac.hasEmergencyUnit
                    ? '<span style="background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">24/7 Trauma</span>'
                    : ''
                }
              </div>
              <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #0F172A;">${fac.name}</h4>
              <p style="margin: 4px 0 2px 0; font-size: 11px; color: #64748B;">${fac.address}</p>
              ${
                fac.distanceKm !== undefined
                  ? `<p style="margin: 2px 0; font-size: 10px; color: #0284C7; font-weight: 600;">Distance: ${fac.distanceKm} km</p>`
                  : ''
              }
              <div style="margin-top: 8px; border-top: 1px solid #E2E8F0; padding-top: 6px;">
                <a href="/patient/appointments?facilityId=${fac.id}" style="display: inline-block; background: #0D9488; color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 6px; text-decoration: none;">
                  Book Appointment
                </a>
              </div>
            </div>
          `);
          infoWindow.open(map, marker);
        }
        if (onSelectFacility) onSelectFacility(fac);
      });

      markersRef.current.push(marker);
    });

    // 3. External Google Places Markers
    externalPlaces.forEach((place) => {
      if (!place.latitude || !place.longitude) return;

      const marker = new google.maps.Marker({
        position: { lat: place.latitude, lng: place.longitude },
        map,
        title: place.name,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
          fillColor: '#64748B',
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 1.2,
          scale: 1.3,
          anchor: new google.maps.Point(12, 22),
        },
      });

      marker.addListener('click', () => {
        if (infoWindow) {
          infoWindow.setContent(`
            <div style="font-family: system-ui, sans-serif; padding: 6px; max-width: 250px;">
              <span style="background: #F1F5F9; color: #475569; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">
                Google Places Result
              </span>
              <h4 style="margin: 4px 0 2px 0; font-size: 13px; font-weight: 700; color: #0F172A;">${place.name}</h4>
              <p style="margin: 2px 0; font-size: 11px; color: #64748B;">${place.address}</p>
              ${
                place.rating
                  ? `<p style="margin: 2px 0; font-size: 10px; color: #D97706; font-weight: bold;">★ ${place.rating} / 5.0 Google Rating</p>`
                  : ''
              }
            </div>
          `);
          infoWindow.open(map, marker);
        }
      });

      markersRef.current.push(marker);
    });
  }, [facilities, externalPlaces, center, mapsLoaded, onSelectFacility]);

  // Fallback UI when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured
  if (!hasValidKey || loadError) {
    return (
      <div className="h-full w-full rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
            <Key className="w-4 h-4 shrink-0" />
            <span>Google Maps Platform Configuration</span>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1.5">
            <p className="font-bold">
              {loadError ? 'Google Maps API Error:' : 'Google Maps API Key Required for Live Cartography:'}
            </p>
            <p className="leading-relaxed text-[11px]">
              {loadError || (
                <>
                  To enable live interactive Google Maps rendering, geocoding, and Google Places auto-discovery, configure{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
                  in your <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">.env.local</code>.
                </>
              )}
            </p>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="font-semibold text-slate-800">Required Google Cloud Platform APIs:</div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 pl-1">
              <li><strong>Maps JavaScript API:</strong> Interactive map viewport & markers</li>
              <li><strong>Places API (New):</strong> Live hospital and clinic discovery queries</li>
              <li><strong>Geocoding API:</strong> Postcode and locality address resolution</li>
            </ul>
          </div>
        </div>

        {/* Schematic Hospital Locator fallback */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">HealthSync Hospital Locator (Schematic):</span>
            <span className="text-[10px] text-brand-700 font-bold bg-brand-50 px-2 py-0.5 rounded">
              {facilities.length} Facilities Mapped
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {facilities.slice(0, 4).map((f) => (
              <div
                key={f.id}
                onClick={() => onSelectFacility && onSelectFacility(f)}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-brand-500 cursor-pointer transition-all space-y-0.5"
              >
                <div className="font-bold text-slate-800 truncate">{f.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{f.city}</div>
                {f.hasEmergencyUnit && (
                  <span className="text-[9px] text-red-600 font-bold">24/7 Trauma Unit</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center">
          HealthSync never claims live Google Maps is active without valid credentials. The facility directory and appointment booking remain 100% functional.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
