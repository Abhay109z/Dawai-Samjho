import React, { useEffect, useState } from 'react';
import {
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Search,
} from 'lucide-react';
import type { JanAushadhiStore, Language } from '../types';
import { getText } from '../i18n';

interface StoresViewProps {
  lang: Language;
}

// Projects India lat/lng bounds (lat: 8..34, lng: 68..96) onto a crisp 420x460 SVG viewport
function projectIndia(lat: number, lng: number): { x: number; y: number } {
  const minLng = 68;
  const maxLng = 96;
  const minLat = 8;
  const maxLat = 34;
  const x = ((lng - minLng) / (maxLng - minLng)) * 360 + 30;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 400 + 30;
  return { x, y };
}

export function StoresView({ lang }: StoresViewProps) {
  const t = getText(lang);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [states, setStates] = useState<string[]>([]);
  const [stores, setStores] = useState<JanAushadhiStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (stateFilter !== 'all') params.set('state', stateFilter);
        if (coords) {
          params.set('lat', String(coords.lat));
          params.set('lng', String(coords.lng));
        }
        const resp = await fetch(`/api/stores?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await resp.json();
        setStores(data.stores ?? []);
        if (Array.isArray(data.states) && data.states.length > 0) {
          setStates(data.states);
        }
        if (data.stores?.length > 0) {
          setSelectedStoreId((prev) =>
            data.stores.some((s: JanAushadhiStore) => s.id === prev)
              ? prev
              : data.stores[0].id
          );
        }
      } catch {
        // Ignore aborts
      } finally {
        setLoading(false);
      }
    }, 140);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, stateFilter, coords]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocationMsg(t.stores.locationError);
      return;
    }
    setLocating(true);
    setLocationMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationMsg(t.stores.locationSorted);
        setLocating(false);
      },
      () => {
        setLocationMsg(t.stores.locationError);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const activeStore = stores.find((s) => s.id === selectedStoreId) ?? stores[0] ?? null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#DCE5D8] pb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#122119]">
              {t.stores.title}
            </h1>
            <p className="text-sm sm:text-base text-[#4A5D52]">{t.stores.subtitle}</p>
          </div>

          <button
            type="button"
            disabled={locating}
            onClick={handleUseLocation}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#15803D] text-white hover:bg-[#166534] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 self-start min-h-[42px]"
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {locating ? t.stores.locating : t.stores.useLocation}
          </button>
        </div>

        {/* Search & State Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-[#5A6E63] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.stores.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
            />
          </div>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            aria-label={t.stores.allStates}
            className="px-3.5 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg text-[#122119] focus:border-[#15803D] min-w-[200px]"
          >
            <option value="all">{t.stores.allStates}</option>
            {states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {locationMsg && <p className="text-xs font-semibold text-[#15803D]">{locationMsg}</p>}
      </div>

      {/* Interactive Network Map + Store Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive India Kendra Coordinate Map + Selected Kendra Detail */}
        <div className="lg:col-span-5 bg-white border border-[#DCE5D8] rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#122119]">{t.stores.mapOverview}</h2>
            <span className="text-xs font-mono tabular-nums text-[#5A6E63]">
              {stores.length} {lang === 'hi' ? 'केंद्र' : 'Kendras'}
            </span>
          </div>

          {/* Clean Geographic Plot */}
          <div className="bg-[#F7FAF5] border border-[#DCE5D8] rounded-lg p-3 relative overflow-hidden">
            <svg
              viewBox="0 0 420 460"
              className="w-full h-72 sm:h-80"
              role="img"
              aria-label="Jan Aushadhi Kendra locations across India"
            >
              {/* Subtle latitude/longitude grid */}
              {[90, 180, 270, 360].map((y) => (
                <line
                  key={`lat-${y}`}
                  x1={20}
                  y1={y}
                  x2={400}
                  y2={y}
                  stroke="#DCE5D8"
                  strokeDasharray="3 4"
                />
              ))}
              {[100, 200, 300].map((x) => (
                <line
                  key={`lng-${x}`}
                  x1={x}
                  y1={20}
                  x2={x}
                  y2={440}
                  stroke="#DCE5D8"
                  strokeDasharray="3 4"
                />
              ))}

              {/* Simplified clean geometric silhouette of India mainland */}
              <path
                d="M148,44 L182,56 L210,94 L250,120 L318,142 L352,162 L338,195 L302,190 L282,226 L246,262 L212,318 L184,386 L160,418 L142,380 L122,318 L92,262 L64,218 L86,184 L74,154 L112,118 L128,74 Z"
                fill="#FEFCE8"
                stroke="#B8CBB2"
                strokeWidth="1.5"
              />

              {/* User location marker if granted */}
              {coords && (() => {
                const u = projectIndia(coords.lat, coords.lng);
                return (
                  <g>
                    <circle cx={u.x} cy={u.y} r={10} fill="#15803D" fillOpacity={0.22} />
                    <circle cx={u.x} cy={u.y} r={4.5} fill="#15803D" />
                  </g>
                );
              })()}

              {/* Store Pins */}
              {stores.map((store) => {
                const { x, y } = projectIndia(store.lat, store.lng);
                const isSelected = activeStore?.id === store.id;
                return (
                  <g
                    key={store.id}
                    onClick={() => setSelectedStoreId(store.id)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle cx={x} cy={y} r={13} fill="#FACC15" fillOpacity={0.55} />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 6.5 : 4.5}
                      fill={isSelected ? '#14532D' : '#15803D'}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    {isSelected && (
                      <text
                        x={x + 10}
                        y={y + 4}
                        fontSize="11"
                        fontWeight="700"
                        fill="#122119"
                      >
                        {store.city}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Selected Kendra Quick Card */}
          {activeStore ? (
            <div className="pt-3 border-t border-[#DCE5D8] space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-mono text-[#15803D] font-semibold">
                  {activeStore.kendraCode} · {activeStore.city}, {activeStore.state}
                </p>
                <h3 className="text-base font-bold text-[#122119]">{activeStore.name}</h3>
                <p className="text-sm text-[#4A5D52]">{activeStore.address}</p>
                <p className="text-xs text-[#5A6E63] font-mono tabular-nums">
                  PIN: {activeStore.pincode}
                  {activeStore.distanceKm !== undefined
                    ? ` · ${activeStore.distanceKm} km`
                    : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#4A5D52]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#15803D]" />
                  {activeStore.hours} ({activeStore.openSunday ? t.stores.openSunday : t.stores.monSat})
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-[#15803D]" />
                  {activeStore.phone}
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${activeStore.lat},${activeStore.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#FACC15] text-[#122119] hover:bg-[#EAB308] transition-colors whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t.stores.directions}
                </a>
                <a
                  href={`tel:${activeStore.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-[#DCE5D8] bg-white text-[#122119] hover:bg-[#F7FAF5] transition-colors whitespace-nowrap shrink-0"
                >
                  <Phone className="w-3.5 h-3.5 text-[#15803D]" />
                  {t.stores.callStore}
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#5A6E63]">{t.stores.selectStoreHint}</p>
          )}
        </div>

        {/* Right: Store Directory List */}
        <div className="lg:col-span-7 bg-white border border-[#DCE5D8] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-[#5A6E63]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#15803D] mb-2" />
              {lang === 'hi' ? 'केंद्र लोड हो रहे हैं...' : 'Loading Jan Aushadhi Kendras...'}
            </div>
          ) : stores.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#5A6E63]">{t.stores.noStores}</div>
          ) : (
            <div className="divide-y divide-[#E4EBE0] max-h-[680px] overflow-y-auto">
              {stores.map((store) => {
                const isSelected = activeStore?.id === store.id;
                return (
                  <div
                    key={store.id}
                    onClick={() => setSelectedStoreId(store.id)}
                    className={`p-4 sm:px-5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#FEFCE8]' : 'hover:bg-[#F7FAF5]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A6E63]">
                          <span className="font-mono font-semibold text-[#15803D]">
                            {store.kendraCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {store.city}, {store.state}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{store.pincode}</span>
                        </div>
                        <p className="text-sm font-bold text-[#122119]">{store.name}</p>
                        <p className="text-xs text-[#4A5D52] flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#15803D] shrink-0 mt-0.5" />
                          <span>{store.address}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        {store.distanceKm !== undefined && (
                          <p className="text-sm font-bold font-mono tabular-nums text-[#15803D]">
                            {store.distanceKm} km
                          </p>
                        )}
                        <p className="text-xs text-[#5A6E63] whitespace-nowrap">{store.hours}</p>
                        <p className="text-[11px] font-medium text-[#854D0E]">
                          {store.openSunday ? t.stores.openSunday : t.stores.monSat}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
