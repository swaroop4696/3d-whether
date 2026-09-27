import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Navigation,
  X,
  Loader2,
  Globe,
  RotateCw,
  Map,
  ShieldAlert,
  Building2,
  Route,
  Plane,
  Flame,
  Layers,
  Landmark,
  MapPin,
  Settings,
  Bot,
  Sparkles,
} from 'lucide-react';
import { searchLocations } from '../services/weatherService';
import type { CitySearchResult, PlaceCategory, ViewModeType } from '../types';

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
  onOpenCitizenReports?: () => void;
  onOpenCorridorHub?: () => void;
  citizenReportCount?: number;
  onOpenGeminiAssistant?: () => void;
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
  onOpenCitizenReports,
  onOpenCorridorHub,
  citizenReportCount = 0,
  onOpenGeminiAssistant,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
        const found = await searchLocations(query);
        setResults(found);
        setIsDropdownOpen(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

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

  const renderTypeIcon = (type?: PlaceCategory) => {
    switch (type) {
      case 'street':
        return <Route className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'district':
        return <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'landmark':
        return <Landmark className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
  };

  const renderTypeBadge = (type?: PlaceCategory) => {
    switch (type) {
      case 'street':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-400/30 shrink-0">
            STREET
          </span>
        );
      case 'district':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0">
            DISTRICT
          </span>
        );
      case 'landmark':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-400/30 shrink-0">
            LANDMARK
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
            CITY
          </span>
        );
    }
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
              onChange={(e) => {
                setQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                if (results.length > 0) setIsDropdownOpen(true);
              }}
              placeholder="Search global city, street, or coordinates..."
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
                      ? 'bg-sky-500/30 text-sky-200 font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="3D Tactical View: Real-Time Wildfires & Earthquakes"
                >
                  <Layers className="w-3 h-3 text-sky-400" />
                  <span className="hidden md:inline">3D</span>
                </button>

                <button
                  onClick={() => onSelectViewMode('roadmap')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all cursor-pointer ${
                    viewMode === 'roadmap'
                      ? 'bg-emerald-500/30 text-emerald-200 font-semibold border border-emerald-400/40'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="2D Map, Street Cartography & Traffic Flow"
                >
                  <Map className="w-3 h-3 text-emerald-400" />
                  <span className="font-medium">Map</span>
                </button>
              </div>
            )}

            {/* Indian Economic Corridor Fast Hub */}
            {onOpenCorridorHub && (
              <button
                onClick={onOpenCorridorHub}
                title="Indian Economic Corridor Forecast Hub (NH-44, DMIC, Delhi-NCR)"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 active:scale-95 mr-1"
              >
                <Route className="w-3 h-3 text-sky-400" />
                <span className="hidden sm:inline">Corridors</span>
              </button>
            )}

            {/* Citizen Emission Reporting Module */}
            {onOpenCitizenReports && (
              <button
                onClick={onOpenCitizenReports}
                title="Citizen Climate Watch: Report & Monitor Hyper-Local Emissions"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 active:scale-95 mr-1"
              >
                <Flame className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Citizen Watch</span>
                {citizenReportCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-amber-500 text-black font-bold">
                    {citizenReportCount}
                  </span>
                )}
              </button>
            )}

            {/* Gemini Planetary Copilot: Chatbot & Autonomous Earth Navigation */}
            {onOpenGeminiAssistant && (
              <button
                onClick={onOpenGeminiAssistant}
                title="Open Gemini Planetary Copilot (AI Intelligence & Chat)"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer bg-gradient-to-r from-sky-500/20 to-purple-500/20 hover:from-sky-500/30 hover:to-purple-500/30 border border-sky-400/40 text-sky-200 active:scale-95 shadow-sm shadow-sky-500/20 mr-1"
              >
                <Sparkles className="w-3 h-3 text-sky-300 animate-pulse" />
                <span className="hidden sm:inline">Gemini AI</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-sky-500/25 text-sky-300">
                  Chat
                </span>
              </button>
            )}

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
          </div>
        </div>

        {/* Autocomplete Search Dropdown */}
        {isDropdownOpen && (query.trim().length >= 2 || results.length > 0) && (
          <div
            className="absolute left-0 right-0 top-full mt-2 overflow-hidden shadow-2xl z-30 divide-y divide-white/5 max-h-[380px] flex flex-col"
            style={{
              background: 'rgba(12, 18, 30, 0.94)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '20px',
              boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.1)',
            }}
          >
            <div className="overflow-y-auto divide-y divide-white/5">
              <div className="px-4 py-2 text-[10px] uppercase font-semibold tracking-wider text-sky-400/80 bg-sky-950/40 flex items-center justify-between">
                <span>Matching Locations</span>
                {isSearching && (
                  <span className="flex items-center gap-1 text-[10px] text-sky-300 font-normal">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Searching...
                  </span>
                )}
              </div>

              {results.length > 0 ? (
                results.map((item, idx) => (
                  <button
                    key={`${item.lat}-${item.lon}-${idx}`}
                    onClick={() => handleSelect(item)}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-sky-500/10 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {renderTypeIcon(item.type)}
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-100 group-hover:text-sky-200">
                            {item.name}
                          </span>
                          {renderTypeBadge(item.type)}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {[item.road, item.district, item.admin1, item.country].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-sky-400/80 shrink-0">
                      {(item.lat ?? 0).toFixed(2)}°, {(item.lon ?? 0).toFixed(2)}°
                    </span>
                  </button>
                ))
              ) : !isSearching ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching street or city found. Try typing a street name, avenue, or city.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </header>

      {/* Floating Bottom Center Interaction Hint */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-[11px] font-light text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
        <span>Click anywhere on the 3D globe to zoom in and inspect real-time atmosphere</span>
      </div>

      {/* Quick Location Pills at Top - Exclusively in Globe View and constrained to avoid IntelligenceDock overlap */}
      {viewMode === 'globe' && !isStreetMapOpen && (
        <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-10 pointer-events-auto hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/5 max-w-[calc(100vw-420px)] overflow-x-auto no-scrollbar">
          {[
            { name: 'New Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
            { name: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074 },
            { name: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173 },
            { name: 'Brasília', country: 'Brazil', lat: -15.7975, lon: -47.8919 },
            { name: 'Pretoria', country: 'South Africa', lat: -25.7479, lon: 28.2293 },
            { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357 },
            { name: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lon: 54.3773 },
            { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lon: 46.6753 },
            { name: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.3890 },
          ].map((loc) => (
            <button
              key={loc.name}
              onClick={() => onSelectCity(loc)}
              className={`px-3 py-1 rounded-full text-[11px] font-light transition-all cursor-pointer backdrop-blur-md border shrink-0 ${
                currentCityName === loc.name
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                  : 'bg-black/35 hover:bg-black/50 text-slate-400 hover:text-slate-200 border-white/5'
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
};
