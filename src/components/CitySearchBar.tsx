import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Navigation,
  X,
  Loader2,
  Route,
  Building2,
  Landmark,
  Compass,
} from 'lucide-react';
import { searchLocations } from '../services/weatherService';
import type { CitySearchResult, PlaceCategory } from '../types';

interface CitySearchBarProps {
  onSelectCity: (city: CitySearchResult) => void;
  onDetectGps: () => void;
  isDetectingGps: boolean;
  currentCityName: string;
}

// Curated Real Earth Streets, Districts, and Cities Presets
const FAMOUS_STREETS: CitySearchResult[] = [
  { name: 'Broadway', country: 'United States', admin1: 'New York', district: 'Manhattan', road: 'Broadway', type: 'street', lat: 40.7580, lon: -73.9855 },
  { name: 'Champs-Élysées', country: 'France', admin1: 'Île-de-France', district: '8th Arrondissement', road: 'Avenue des Champs-Élysées', type: 'street', lat: 48.8698, lon: 2.3075 },
  { name: 'Abbey Road', country: 'United Kingdom', admin1: 'Greater London', district: 'Westminster', road: 'Abbey Road', type: 'street', lat: 51.5320, lon: -0.1774 },
  { name: 'Shibuya Dogenzaka', country: 'Japan', admin1: 'Tokyo', district: 'Shibuya', road: 'Dogenzaka', type: 'street', lat: 35.6595, lon: 139.6985 },
  { name: 'Lombard Street', country: 'United States', admin1: 'California', district: 'Russian Hill', road: 'Lombard Street', type: 'street', lat: 37.8021, lon: -122.4187 },
  { name: 'Sheikh Zayed Road', country: 'UAE', admin1: 'Dubai', district: 'Downtown', road: 'Sheikh Zayed Rd', type: 'street', lat: 25.2167, lon: 55.2744 },
  { name: 'Gran Vía', country: 'Spain', admin1: 'Madrid', district: 'Centro', road: 'Gran Vía', type: 'street', lat: 40.4203, lon: -3.7058 },
  { name: 'Las Vegas Strip', country: 'United States', admin1: 'Nevada', district: 'Paradise', road: 'Las Vegas Blvd', type: 'street', lat: 36.1147, lon: -115.1728 },
];

const FAMOUS_DISTRICTS: CitySearchResult[] = [
  { name: 'Manhattan', country: 'United States', admin1: 'New York', district: 'New York County', type: 'district', lat: 40.7831, lon: -73.9712 },
  { name: 'Montmartre', country: 'France', admin1: 'Île-de-France', district: '18th Arrondissement', type: 'district', lat: 48.8867, lon: 2.3431 },
  { name: 'Westminster', country: 'United Kingdom', admin1: 'Greater London', district: 'City of Westminster', type: 'district', lat: 51.4975, lon: -0.1357 },
  { name: 'Shinjuku', country: 'Japan', admin1: 'Tokyo', district: 'Shinjuku Ward', type: 'district', lat: 35.6938, lon: 139.7034 },
  { name: 'Beverly Hills', country: 'United States', admin1: 'California', district: 'Los Angeles County', type: 'district', lat: 34.0736, lon: -118.4004 },
  { name: 'Marina Bay', country: 'Singapore', district: 'Central Area', type: 'district', lat: 1.2847, lon: 103.8610 },
];

const FAMOUS_CITIES: CitySearchResult[] = [
  { name: 'Tokyo', country: 'Japan', admin1: 'Tokyo', type: 'city', lat: 35.6762, lon: 139.6503 },
  { name: 'New York', country: 'United States', admin1: 'NY', type: 'city', lat: 40.7128, lon: -74.006 },
  { name: 'London', country: 'United Kingdom', admin1: 'England', type: 'city', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', country: 'France', admin1: 'Île-de-France', type: 'city', lat: 48.8566, lon: 2.3522 },
  { name: 'Dubai', country: 'UAE', type: 'city', lat: 25.2048, lon: 55.2708 },
  { name: 'Sydney', country: 'Australia', admin1: 'NSW', type: 'city', lat: -33.8688, lon: 151.2093 },
  { name: 'Reykjavik', country: 'Iceland', type: 'city', lat: 64.1466, lon: -21.9426 },
  { name: 'Rio de Janeiro', country: 'Brazil', type: 'city', lat: -22.9068, lon: -43.1729 },
];

export const CitySearchBar: React.FC<CitySearchBarProps> = ({
  onSelectCity,
  onDetectGps,
  isDetectingGps,
  currentCityName,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'streets' | 'districts' | 'cities'>('streets');
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
        setIsOpen(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: CitySearchResult) => {
    onSelectCity(item);
    setQuery('');
    setIsOpen(false);
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
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-400/30">
            STREET ROAD
          </span>
        );
      case 'district':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-400/30">
            DISTRICT
          </span>
        );
      case 'landmark':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-400/30">
            LANDMARK
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            CITY
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="city-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder="Search any real street, road, district, or city on Earth..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#0b1226]/85 border border-white/15 hover:border-white/25 focus:border-sky-400 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none shadow-lg backdrop-blur-md transition-all"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* GPS Live Geolocation Button */}
        <button
          id="btn-detect-gps"
          onClick={onDetectGps}
          disabled={isDetectingGps}
          title="Detect Current GPS Street Coordinates"
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 hover:border-sky-400/50 text-sky-300 text-xs font-medium backdrop-blur-md shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isDetectingGps ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          ) : (
            <Navigation className="w-4 h-4 text-sky-400 animate-pulse" />
          )}
          <span className="hidden sm:inline">GPS Sync</span>
        </button>
      </div>

      {/* Autocomplete Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-xl bg-[#090e1f]/98 border border-white/20 shadow-2xl backdrop-blur-2xl z-50 divide-y divide-white/5">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-5 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Scanning real streets, roads, and districts across Earth...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((r, idx) => (
              <button
                key={`${r.name}-${r.lat}-${r.lon}-${idx}`}
                onClick={() => handleSelect(r)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-sky-500/15 transition-colors cursor-pointer text-xs group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  {renderTypeIcon(r.type)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100 group-hover:text-sky-300 transition-colors truncate">
                        {r.road || r.name}
                      </span>
                      {renderTypeBadge(r.type)}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {[
                        r.road && r.road !== r.name ? r.name : undefined,
                        r.district,
                        r.admin1,
                        r.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-sky-300/80 shrink-0 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-sky-400/60" />
                  <span>
                    {r.lat.toFixed(3)}°, {r.lon.toFixed(3)}°
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="py-5 text-center text-xs text-slate-400">
              No matching street or district found. Try typing a street name, avenue, or city.
            </div>
          )}
        </div>
      )}

      {/* Preset Category Switcher & Real Location Chips */}
      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={() => setActiveCategory('streets')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
              activeCategory === 'streets'
                ? 'bg-sky-500/25 text-sky-300 border border-sky-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🛣️ Real Streets & Roads
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => setActiveCategory('districts')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
              activeCategory === 'districts'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🏙️ Real Districts
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => setActiveCategory('cities')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
              activeCategory === 'cities'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🏛️ Metropolises
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs no-scrollbar">
          {(activeCategory === 'streets'
            ? FAMOUS_STREETS
            : activeCategory === 'districts'
            ? FAMOUS_DISTRICTS
            : FAMOUS_CITIES
          ).map((preset) => {
            const isActive =
              currentCityName.toLowerCase().includes(preset.name.toLowerCase()) ||
              (preset.road && currentCityName.toLowerCase().includes(preset.road.toLowerCase()));
            return (
              <button
                key={`${preset.name}-${preset.lat}`}
                onClick={() => onSelectCity(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-500/30 border-sky-400 text-sky-200 shadow-sm shadow-sky-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300 hover:text-white'
                }`}
              >
                {renderTypeIcon(preset.type)}
                <span>{preset.road || preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
