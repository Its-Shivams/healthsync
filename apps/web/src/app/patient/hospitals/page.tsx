'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import GoogleFacilityMap, { FacilityMarkerData } from '@/components/map/google-facility-map';
import {
  MapPin,
  Search,
  Phone,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Building2,
  Navigation,
  ExternalLink,
  Compass,
  RefreshCw,
  Filter,
  CheckCircle2,
} from 'lucide-react';

export default function HospitalsPage() {
  const [facilities, setFacilities] = useState<FacilityMarkerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addressSearch, setAddressSearch] = useState('');
  const [radiusKm, setRadiusKm] = useState(50);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // Map center coordinates (default New Delhi center)
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.5672, 77.2100]);
  const [searchedLocationName, setSearchedLocationName] = useState('New Delhi Central');
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Detect GPS Location
  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Acquiring precise GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMapCenter(coords);
        setSearchedLocationName('Your GPS Location');
        setLocationStatus('GPS location acquired.');
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationStatus(`GPS: ${err.message}. Showing Delhi NCR facilities.`);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  // Address Geocoding using Google Maps Geocoder if loaded, or City coordinate dictionary fallback
  const handleAddressGeocode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressSearch.trim()) return;

    setIsGeocoding(true);
    setLocationStatus(`Searching location: ${addressSearch}...`);

    try {
      // 1. If google.maps.Geocoder is available on window
      if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ address: addressSearch }, (results: any, status: any) => {
          setIsGeocoding(false);
          if (status === 'OK' && results?.[0]) {
            const lat = results[0].geometry.location.lat();
            const lng = results[0].geometry.location.lng();
            setMapCenter([lat, lng]);
            setSearchedLocationName(results[0].formatted_address);
            setLocationStatus(`Location found: ${results[0].formatted_address}`);
          } else {
            fallbackLocalGeocode(addressSearch);
          }
        });
      } else {
        fallbackLocalGeocode(addressSearch);
      }
    } catch {
      fallbackLocalGeocode(addressSearch);
    }
  };

  // Local fallback dictionary for popular NCR localities & cities
  const fallbackLocalGeocode = (query: string) => {
    setIsGeocoding(false);
    const q = query.toLowerCase();

    const localPoints: Record<string, [number, number]> = {
      saket: [28.5284, 77.2119],
      'lajpat nagar': [28.5677, 77.2433],
      'green park': [28.5588, 77.2028],
      aiims: [28.5672, 77.2100],
      gurugram: [28.4595, 77.0266],
      gurgaon: [28.4595, 77.0266],
      noida: [28.5708, 77.3260],
      'connaught place': [28.6315, 77.2167],
      'delhi cantt': [28.5900, 77.1300],
      okhla: [28.5603, 77.2801],
      '110075': [28.5921, 77.0460],
      '110024': [28.5677, 77.2433],
      '110029': [28.5672, 77.2100],
      '110017': [28.5284, 77.2119],
      '122002': [28.4678, 77.0825],
      '201301': [28.5708, 77.3260],
    };

    for (const [key, coords] of Object.entries(localPoints)) {
      if (q.includes(key)) {
        setMapCenter(coords);
        setSearchedLocationName(query);
        setLocationStatus(`Centered on: ${query}`);
        return;
      }
    }

    setLocationStatus(`Searching facilities matching: "${query}"`);
    loadFacilities();
  };

  // Load facilities from backend API and calculate distance
  const loadFacilities = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        latitude: mapCenter[0].toString(),
        longitude: mapCenter[1].toString(),
        radiusKm: radiusKm.toString(),
      });
      if (addressSearch) params.append('q', addressSearch);
      if (selectedSpecialty) params.append('specialty', selectedSpecialty);

      const res = await apiClient(`/api/facilities/search?${params.toString()}`);
      if (res.data) {
        let list = res.data.map((f: any) => ({
          ...f,
          isPartner: true, // Facilities from HealthSync database are verified partners
        }));

        if (emergencyOnly) {
          list = list.filter((f: any) => f.hasEmergencyUnit);
        }
        setFacilities(list);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, [mapCenter, radiusKm, selectedSpecialty, emergencyOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Find Hospitals & Medical Centres
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Interactive hospital discovery with address geocoding, Google Maps integration, and appointment booking
          </p>
        </div>

        <button
          onClick={handleDetectLocation}
          disabled={isLocating}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          {isLocating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Compass className="w-3.5 h-3.5" />
          )}
          <span>{isLocating ? 'Acquiring GPS...' : 'Use My GPS Location'}</span>
        </button>
      </div>

      {locationStatus && (
        <div className="p-3 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
            <span>{locationStatus}</span>
          </div>
          <button onClick={() => setLocationStatus(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Geocoding Search & Filters Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleAddressGeocode} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Enter city, locality, address or postcode (e.g. Saket, Lajpat Nagar, 110024, Gurugram)..."
              value={addressSearch}
              onChange={(e) => setAddressSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="sm:w-56">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="">All Clinical Specialties</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Pathology">Pathology & Diagnostics</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isGeocoding}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {isGeocoding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            <span>{isGeocoding ? 'Geocoding...' : 'Search Location'}</span>
          </button>
        </form>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">Radius:</span>
            <div className="flex items-center gap-1.5">
              {[5, 10, 25, 50, 100].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    radiusKm === r
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={emergencyOnly}
              onChange={(e) => setEmergencyOnly(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
            />
            <span className="font-semibold text-rose-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>24/7 Emergency & Trauma Units Only</span>
            </span>
          </label>
        </div>
      </div>

      {/* Main Split Layout: Map & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Interactive Google Map */}
        <div className="lg:col-span-7 h-[450px] lg:h-full min-h-[450px]">
          <GoogleFacilityMap
            facilities={facilities}
            center={mapCenter}
            zoom={12}
            searchedAddress={searchedLocationName}
          />
        </div>

        {/* Right Column: Search Results List */}
        <div className="lg:col-span-5 flex flex-col space-y-3 h-[580px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-900">
              Found {facilities.length} Healthcare Facilities
            </span>
            <span className="text-[11px] text-slate-400">
              Within {radiusKm} km of {searchedLocationName}
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading facilities...</div>
          ) : facilities.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No healthcare facilities found</p>
              <p className="text-[11px] text-slate-500">
                Try expanding your search distance to 50 km or 100 km, or unchecking the emergency filter.
              </p>
            </div>
          ) : (
            facilities.map((fac) => (
              <div
                key={fac.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{fac.name}</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200 shrink-0">
                      ★ HealthSync Partner
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {fac.type?.replace('_', ' ')}
                    </span>
                    {fac.hasEmergencyUnit ? (
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>24/7 Emergency & Trauma</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 font-medium">
                        Outpatient OPD
                      </span>
                    )}
                    {fac.distanceKm !== undefined && (
                      <span className="text-sky-700 font-bold">
                        {fac.distanceKm} km away
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex items-start gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{fac.address}, {fac.city} {fac.postalCode}</span>
                  </p>

                  {fac.specialties && (
                    <p className="text-[11px] text-slate-600 line-clamp-1">
                      <span className="font-semibold text-slate-700">Specialties: </span>
                      {fac.specialties}
                    </p>
                  )}

                  {fac.availableServices && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      <span className="font-semibold text-slate-700">Services: </span>
                      {fac.availableServices}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{fac.contactPhone || 'Available'}</span>
                  </div>

                  <Link
                    href={`/patient/appointments?facilityId=${fac.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Book Appointment</span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
