import React, { useState, useEffect, useRef } from 'react';
import { Search, Navigation, X, Loader2, Key, Globe, RotateCw, Map, RotateCcw, ShieldAlert, Building2, Route } from 'lucide-react';
import { searchCities, getCustomOwmKey, setCustomOwmKey } from '../services/weatherService';
import type { CitySearchResult, ViewModeType } from '../types';
import { KeyRestrictionsModal } from './KeyRestrictionsModal';

interface FloatingNavbarProps {
  onSelectCity: (city: CitySearchResult) => void;
  onDetectGps: () => void;
  isDetectingGps: boolean;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetView: () => void;
  currentCityName: string;
  isStreetMapOpen?: boolean;
  onToggleStreetMap?: () => void;
  hasLocationSelected?: boolean;
  viewMode?: ViewModeType;
  onSelectViewMode?: (mode: ViewModeType) => void;
}

export const FloatingNavbar: React.FC<FloatingNavbarProps> = ({
  onSelectCity,
  onDetectGps,
  isDetectingGps,
  autoRotate,
  onToggleAutoRotate,
  onResetView,
  currentCityName,
  isStreetMapOpen = false,
  onToggleStreetMap,
  hasLocationSelected = false,
  viewMode = 'globe',
  onSelectViewMode,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isKeyRestrictionsOpen, setIsKeyRestrictionsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getCustomOwmKey());

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const found = await searchCities(query);
        setResults(found);
        setIsDropdownOpen(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: CitySearchResult) => {
    onSelectCity(item);
    setQuery('');
    setIsDropdownOpen(false);
  };

  const handleSaveApiKey = () => {
    setCustomOwmKey(apiKeyInput);
    setIsKeyModalOpen(false);
  };

  return (
    <>
      <header
        ref={containerRef}
        id="floating-nav"
        className="fixed top-5 inset-x-0 mx-auto w-[calc(100vw-2rem)] max-w-2xl z-20 pointer-events-auto"
      >
        <div
          className="weather-gpt-pill px-3.5 py-2 flex items-center justify-between gap-3 text-white transition-all"
          style={{
            background: 'rgba(20, 20, 20, 0.65)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Brand mark */}
          <button
            onClick={onResetView}
            title="Reset to Orbital View"
            className="flex items-center gap-2 pl-1 pr-2 text-slate-300 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline text-xs font-medium tracking-tight font-['Space_Grotesk'] text-slate-200">
              Weather GPT
            </span>
          </button>

          {/* Minimalist Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setIsDropdownOpen(true);
              }}
              placeholder="Search global city or coordinates..."
              className="w-full pl-8 pr-7 py-1.5 rounded-full bg-transparent text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            {isSearching ? (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-400 animate-spin" />
            ) : query ? (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setIsDropdownOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* View Mode Selectors */}
            {onSelectViewMode && (
              <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-white/5 border border-white/10 mr-1">
                <button
                  onClick={() => onSelectViewMode('globe')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] transition-all cursor-pointer ${
                    viewMode === 'globe'
                      ? 'bg-sky-500/30 text-sky-200 font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Orbital Daylight Globe"
                >
                  <Globe className="w-3 h-3" />
                  <span className="hidden md:inline">Globe</span>
                </button>

                <button
                  onClick={() => onSelectViewMode('godseye3d')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] transition-all cursor-pointer ${
                    viewMode === 'godseye3d'
                      ? 'bg-amber-500/30 text-amber-200 font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="God's Eye 3D Photorealistic Tiles"
                >
                  <Building2 className="w-3 h-3" />
                  <span className="hidden md:inline">3D Mesh</span>
                </button>

                <button
                  onClick={() => onSelectViewMode('roadmap')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] transition-all cursor-pointer ${
                    viewMode === 'roadmap'
                      ? 'bg-emerald-500/30 text-emerald-200 font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="2D Road Map & Traffic Flow"
                >
                  <Route className="w-3 h-3" />
                  <span className="hidden md:inline">Roads</span>
                </button>
              </div>
            )}

            {/* Reset to Orbit Vantage Button */}
            <button
              onClick={onResetView}
              id="btn-nav-reset-view"
              title="Reset View to Orbit"
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* GPS Live Geolocation Button */}
            <button
              onClick={onDetectGps}
              disabled={isDetectingGps}
              title="Detect GPS Location"
              className="p-1.5 rounded-full text-slate-400 hover:text-sky-300 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* Orbit Auto-Rotate Toggle */}
            <button
              onClick={onToggleAutoRotate}
              title={autoRotate ? 'Pause Globe Rotation' : 'Resume Globe Rotation'}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                autoRotate ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* API Key Modal Trigger */}
            <button
              onClick={() => setIsKeyModalOpen(true)}
              title="OpenWeatherMap API Key (Optional)"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
            </button>

            {/* Google Maps Key Restrictions Trigger (gods-eye-view model) */}
            <button
              onClick={() => setIsKeyRestrictionsOpen(true)}
              title="Google Maps Key Restrictions & Security (gods-eye-view model)"
              className="p-1.5 rounded-full text-sky-400/80 hover:text-sky-300 hover:bg-sky-500/10 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Autocomplete Search Dropdown */}
        {isDropdownOpen && results.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-2 weather-gpt-glass overflow-hidden shadow-2xl z-30 divide-y divide-white/5"
            style={{
              background: 'rgba(20, 20, 20, 0.75)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
            }}
          >
            {results.map((item, idx) => (
              <button
                key={`${item.lat}-${item.lon}-${idx}`}
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-medium text-slate-100">{item.name}</span>
                  {item.admin1 && <span className="text-slate-400 ml-1.5 font-light">{item.admin1}</span>}
                  {item.country && <span className="text-slate-500 ml-1.5 font-light">• {item.country}</span>}
                </div>
                <span className="text-[10px] font-mono text-sky-400/80">
                  {item.lat.toFixed(1)}°, {item.lon.toFixed(1)}°
                </span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Floating Bottom Center Interaction Hint */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-[11px] font-light text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
        <span>Click anywhere on the 3D globe to zoom in and inspect real-time atmosphere</span>
      </div>

      {/* Quick Location Pills at Top */}
      <div className="fixed top-20 inset-x-0 mx-auto w-max max-w-[95vw] z-10 pointer-events-auto hidden md:flex items-center gap-2 overflow-x-auto py-1 px-3">
        {[
          { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
          { name: 'New York', lat: 40.7128, lon: -74.006 },
          { name: 'London', lat: 51.5074, lon: -0.1278 },
          { name: 'Paris', lat: 48.8566, lon: 2.3522 },
          { name: 'Reykjavik', lat: 64.1466, lon: -21.9426 },
          { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
          { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
        ].map((loc) => (
          <button
            key={loc.name}
            onClick={() => onSelectCity(loc)}
            className={`px-3 py-1 rounded-full text-[11px] font-light transition-all cursor-pointer backdrop-blur-md border ${
              currentCityName === loc.name
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                : 'bg-black/35 hover:bg-black/50 text-slate-400 hover:text-slate-200 border-white/5'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Optional Custom API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto">
          <div
            className="weather-gpt-glass max-w-md w-full p-6 text-white space-y-4"
            style={{
              background: 'rgba(20, 20, 20, 0.85)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-sky-400" />
                <h3 className="text-base font-light text-white">OpenWeatherMap API Key</h3>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-light leading-relaxed">
              The application connects out-of-the-box using the Open-Meteo real-time global feed.
              If you have an OpenWeatherMap key, paste it here to query the OpenWeatherMap
              telemetry API directly.
            </p>

            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1.5">
                OPENWEATHER API KEY
              </label>
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="e.g. 3a7f82b..."
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 rounded-xl bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/40 text-xs text-sky-300 font-medium transition-colors cursor-pointer"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Key Restrictions & Security Modal (gods-eye-view model) */}
      <KeyRestrictionsModal
        isOpen={isKeyRestrictionsOpen}
        onClose={() => setIsKeyRestrictionsOpen(false)}
      />
    </>
  );
};
