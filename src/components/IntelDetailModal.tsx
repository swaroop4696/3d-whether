import React from 'react';
import {
  Flame,
  Activity,
  Plane,
  X,
  ExternalLink,
  MapPin,
  Building2,
  Route,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Clock,
  Gauge,
  Compass,
  AlertTriangle,
  Globe,
  Waves,
  Zap,
} from 'lucide-react';
import type { FireHotspot, EarthquakeData, LiveFlight, IntelligenceLayerType, MeshIntelMode } from '../types';

export interface SelectedIntelEntity {
  type: IntelligenceLayerType;
  fire?: FireHotspot;
  earthquake?: EarthquakeData;
  flight?: LiveFlight;
}

interface IntelDetailModalProps {
  entity: SelectedIntelEntity | null;
  onClose: () => void;
  onFlyTo3D: (lat: number, lon: number, name: string, mode?: MeshIntelMode) => void;
  onOpenRoadMap: (lat: number, lon: number) => void;
}

export const IntelDetailModal: React.FC<IntelDetailModalProps> = ({
  entity,
  onClose,
  onFlyTo3D,
  onOpenRoadMap,
}) => {
  if (!entity) return null;

  const { type, fire, earthquake, flight } = entity;

  const formatRelativeTime = (timeMs: number) => {
    const diff = Math.floor((Date.now() - timeMs) / 60000);
    if (diff < 1) return 'Just now (< 1 min ago)';
    if (diff < 60) return `${diff} minutes ago`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[#090d16] border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden text-white font-sans"
        style={{
          boxShadow:
            type === 'earthquakes'
              ? '0 0 50px rgba(245, 158, 11, 0.25), 0 25px 70px rgba(0,0,0,0.9)'
              : type === 'fires'
              ? '0 0 50px rgba(249, 115, 22, 0.25), 0 25px 70px rgba(0,0,0,0.9)'
              : '0 0 50px rgba(56, 189, 248, 0.25), 0 25px 70px rgba(0,0,0,0.9)',
        }}
      >
        {/* Real-time Telemetry Verification Ribbon */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-white/5 border-b border-white/10 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-bold tracking-wider uppercase">
              Real-Time Live Telemetry
            </span>
          </div>
          <span className="text-neutral-400">
            {type === 'earthquakes'
              ? 'USGS Seismic Hazards Network'
              : type === 'fires'
              ? 'NASA FIRMS Satellite Constellation'
              : 'OpenSky Network ADS-B Radar'}
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          title="Close Telemetry Card"
        >
          <X className="w-4 h-4" />
        </button>

        {/* EARTHQUAKE DETAILS */}
        {type === 'earthquakes' && earthquake && (
          <div className="p-6 space-y-5">
            {/* Header / Epicenter */}
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold font-mono shrink-0 shadow-lg border ${
                  earthquake.magnitude >= 6.0
                    ? 'bg-red-500/30 border-red-400 text-red-100 shadow-red-500/20'
                    : earthquake.magnitude >= 4.5
                    ? 'bg-amber-500/30 border-amber-400 text-amber-100 shadow-amber-500/20'
                    : 'bg-yellow-500/30 border-yellow-400 text-yellow-100'
                }`}
              >
                <span className="text-[10px] uppercase font-sans tracking-widest text-neutral-300">MAG</span>
                <span className="text-xl">M{typeof earthquake.magnitude === 'number' ? earthquake.magnitude.toFixed(1) : '3.6'}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold">
                    {earthquake.magnitude >= 6.0 ? 'Major Seismic Rupture' : 'Earthquake Epicenter'}
                  </span>
                </div>
                <h2 className="text-lg font-bold leading-tight text-white">{earthquake.place}</h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Origin: {new Date(earthquake.time).toUTCString()} ({formatRelativeTime(earthquake.time)})
                </p>
              </div>
            </div>

            {/* Scientific Seismic Fields Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-amber-400" /> Depth
                </span>
                <p className="text-sm font-bold font-mono text-white">{Math.round(earthquake.depth)} km</p>
                <span className="text-[10px] text-neutral-400">Subsurface hypocenter</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                  <Waves className="w-3 h-3 text-sky-400" /> Tsunami
                </span>
                <p
                  className={`text-xs font-bold font-mono ${
                    earthquake.tsunami ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {earthquake.tsunami ? 'WARNING ACTIVE' : 'NO THREAT'}
                </p>
                <span className="text-[10px] text-neutral-400">Ocean buoy telemetry</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-emerald-400" /> Coordinates
                </span>
                <p className="text-xs font-bold font-mono text-white">
                  {(earthquake.lat ?? 0).toFixed(3)}°, {(earthquake.lon ?? 0).toFixed(3)}°
                </p>
                <span className="text-[10px] text-neutral-400">GPS WGS84</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-400" /> Status
                </span>
                <p className="text-xs font-bold uppercase font-mono text-purple-200">
                  {earthquake.status || 'Reviewed'}
                </p>
                <span className="text-[10px] text-neutral-400">USGS seismologist</span>
              </div>
            </div>

            {/* Official USGS Link */}
            {earthquake.url && (
              <a
                href={earthquake.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-200 text-xs transition-all"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Radio className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>View Official USGS Earthquake Event Page (Real-Time Report)</span>
                </span>
                <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
              </a>
            )}

            {/* Action Buttons: 3D Earthquake Fault & 2D Road Map */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  onFlyTo3D(earthquake.lat, earthquake.lon, earthquake.place || 'Earthquake Epicenter', 'earthquakes');
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-lg cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                <span>Inspect 3D Earthquake Fault & Epicenter</span>
              </button>

              <button
                onClick={() => {
                  onOpenRoadMap(earthquake.lat, earthquake.lon);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer"
              >
                <Route className="w-4 h-4" />
                <span>2D Road Map</span>
              </button>
            </div>
          </div>
        )}

        {/* WILDFIRE DETAILS */}
        {type === 'fires' && fire && (
          <div className="p-6 space-y-5">
            {/* Header / Fire Name */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/30 border border-orange-400 text-orange-100 flex flex-col items-center justify-center font-bold font-mono shrink-0 shadow-lg shadow-orange-500/20">
                <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
                <span className="text-[9px] uppercase font-sans tracking-widest text-orange-200">FIRMS</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-orange-400 font-semibold">
                    Active Thermal Wildfire Anomaly
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-mono border border-orange-400/30">
                    {fire.confidence} confidence
                  </span>
                </div>
                <h2 className="text-lg font-bold leading-tight text-white">
                  {fire.locationName || 'Active Wildfire Hotspot'}
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Acquired: {fire.acqDate} at {fire.acqTime} by {fire.satellite}
                </p>
              </div>
            </div>

            {/* Scientific Wildfire Fields Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-orange-400" /> Radiative Power
                </span>
                <p className="text-base font-bold font-mono text-orange-300">{Math.round(fire.frp)} MW</p>
                <span className="text-[10px] text-neutral-400">Combustion output</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-400" /> Temperature
                </span>
                <p className="text-sm font-bold font-mono text-white">
                  {Math.round(fire.brightness)} K{' '}
                  <span className="text-[11px] text-neutral-400">
                    ({Math.round(fire.brightness - 273.15)}°C)
                  </span>
                </p>
                <span className="text-[10px] text-neutral-400">Sensor brightness</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-sky-400" /> Satellite
                </span>
                <p className="text-xs font-bold font-mono text-sky-200">{fire.satellite}</p>
                <span className="text-[10px] text-neutral-400">Earth observation</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" /> Coordinates
                </span>
                <p className="text-xs font-bold font-mono text-white">
                  {(fire.lat ?? 0).toFixed(3)}°, {(fire.lon ?? 0).toFixed(3)}°
                </p>
                <span className="text-[10px] text-neutral-400">{fire.country || 'Global Hotspot'}</span>
              </div>
            </div>

            {/* Action Buttons: 3D Wildfire Mesh & 2D Road Map */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  onFlyTo3D(fire.lat, fire.lon, fire.locationName || 'Active Wildfire Hotspot', 'fires');
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs transition-all shadow-lg cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>Inspect 3D Wildfire Mesh</span>
              </button>

              <button
                onClick={() => {
                  onOpenRoadMap(fire.lat, fire.lon);
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all border border-white/15 cursor-pointer"
              >
                <Route className="w-4 h-4 text-sky-400" />
                <span>Road Map</span>
              </button>
            </div>
          </div>
        )}

        {/* FLIGHT DETAILS */}
        {type === 'flights' && flight && (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/30 border border-sky-400 text-sky-100 flex flex-col items-center justify-center font-bold font-mono shrink-0 shadow-lg shadow-sky-500/20">
                <Plane className="w-6 h-6 text-sky-400" />
                <span className="text-[9px] uppercase font-sans tracking-widest text-sky-200">ADS-B</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold">
                    Live Commercial Flight
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono border border-sky-400/30">
                    ICAO: {flight.icao24}
                  </span>
                </div>
                <h2 className="text-xl font-bold leading-tight text-white">{flight.callsign}</h2>
                <p className="text-xs text-neutral-400 font-mono">Registered: {flight.originCountry}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Altitude</span>
                <p className="text-sm font-bold font-mono text-sky-300">
                  {Math.round(flight.altitude * 3.28084).toLocaleString()} ft
                </p>
                <span className="text-[10px] text-neutral-400">{Math.round(flight.altitude)}m AMSL</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Airspeed</span>
                <p className="text-sm font-bold font-mono text-white">
                  {Math.round(flight.velocity * 1.94384)} kts
                </p>
                <span className="text-[10px] text-neutral-400">{Math.round(flight.velocity * 3.6)} km/h</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Heading</span>
                <p className="text-sm font-bold font-mono text-white">{flight.heading}°</p>
                <span className="text-[10px] text-neutral-400">True Track</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Coordinates</span>
                <p className="text-xs font-bold font-mono text-white">
                  {(flight.lat ?? 0).toFixed(2)}°, {(flight.lon ?? 0).toFixed(2)}°
                </p>
                <span className="text-[10px] text-neutral-400">Live ADS-B</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  onFlyTo3D(flight.lat, flight.lon, `Flight ${flight.callsign}`, 'flights');
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs transition-all shadow-lg cursor-pointer"
              >
                <Plane className="w-4 h-4" />
                <span>Inspect 3D Aircraft Mesh</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
