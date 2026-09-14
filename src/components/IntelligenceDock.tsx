import React, { useState } from 'react';
import { Flame, Activity, Plane, Eye, EyeOff, ChevronDown, ChevronUp, MapPin, Radio, ShieldAlert } from 'lucide-react';
import type { FireHotspot, EarthquakeData, LiveFlight, IntelligenceLayerType } from '../types';

interface IntelligenceDockProps {
  fires: FireHotspot[];
  earthquakes: EarthquakeData[];
  flights: LiveFlight[];
  activeLayers: Record<IntelligenceLayerType, boolean>;
  onToggleLayer: (layer: IntelligenceLayerType) => void;
  onSelectEvent: (lat: number, lon: number, title: string, category: IntelligenceLayerType) => void;
  selectedEventId?: string | null;
}

export const IntelligenceDock: React.FC<IntelligenceDockProps> = ({
  fires,
  earthquakes,
  flights,
  activeLayers,
  onToggleLayer,
  onSelectEvent,
  selectedEventId,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<IntelligenceLayerType>('fires');

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    return `${hours}h ago`;
  };

  return (
    <aside
      id="spatial-intelligence-dock"
      aria-label="Live Spatial Intelligence Panel"
      className="absolute top-20 right-6 z-20 pointer-events-auto transition-all duration-300 select-none"
    >
      <div className="flex flex-col items-end gap-2">
        {/* Top Summary Bar / Toggle Button */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl weather-gpt-pill bg-[#0c121e]/85 border border-white/10 shadow-2xl backdrop-blur-2xl">
          {/* Active Fires Quick Toggle */}
          <button
            id="toggle-layer-fires"
            onClick={() => onToggleLayer('fires')}
            title="Toggle NASA FIRMS Active Wildfires"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeLayers.fires
                ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${activeLayers.fires ? 'text-orange-400 animate-pulse' : 'text-neutral-500'}`} />
            <span>Fires</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-200 font-mono">
              {fires.length}
            </span>
          </button>

          {/* Earthquakes Quick Toggle */}
          <button
            id="toggle-layer-earthquakes"
            onClick={() => onToggleLayer('earthquakes')}
            title="Toggle USGS Real-Time Earthquakes"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeLayers.earthquakes
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${activeLayers.earthquakes ? 'text-amber-400' : 'text-neutral-500'}`} />
            <span>Quakes</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-200 font-mono">
              {earthquakes.length}
            </span>
          </button>

          {/* Expand/Collapse List Button */}
          <button
            id="btn-expand-intel-feed"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title={isExpanded ? 'Collapse Feed' : 'Explore Global Intelligence Feed'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Intelligence Drawer */}
        {isExpanded && (
          <div
            id="intel-feed-drawer"
            className="w-84 max-h-[60vh] flex flex-col rounded-2xl weather-gpt-pill bg-[#0c121e]/90 border border-white/15 shadow-2xl backdrop-blur-2xl overflow-hidden animate-fade-in"
          >
            {/* Header with Live Status & Tab Switcher */}
            <div className="p-3 border-b border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-white tracking-wide">Live Spatial Feeds</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">NASA • USGS</span>
              </div>

              {/* Feed Tabs */}
              <div className="flex p-0.5 rounded-lg bg-black/40 border border-white/5">
                <button
                  onClick={() => setActiveTab('fires')}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'fires'
                      ? 'bg-orange-500/30 text-orange-200 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span>Fires ({fires.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('earthquakes')}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'earthquakes'
                      ? 'bg-amber-500/30 text-amber-200 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Activity className="w-3 h-3 text-amber-400" />
                  <span>Quakes ({earthquakes.length})</span>
                </button>
              </div>
            </div>

            {/* Scrollable Event List */}
            <div className="overflow-y-auto p-2 flex flex-col gap-1.5 max-h-72 custom-scrollbar">
              {activeTab === 'fires' && (
                <>
                  {fires.map((fire) => (
                    <button
                      key={fire.id}
                      onClick={() => onSelectEvent(fire.lat, fire.lon, fire.locationName || 'Wildfire Hotspot', 'fires')}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        selectedEventId === fire.id
                          ? 'bg-orange-500/30 border-orange-400 text-white'
                          : 'bg-white/5 hover:bg-orange-500/15 border-white/5 hover:border-orange-500/30 text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="text-xs font-semibold truncate max-w-[170px] text-orange-100">
                            {fire.locationName || 'Active Wildfire'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/30 text-orange-300">
                          {Math.round(fire.frp)} MW
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                        <span>{fire.country || `${(fire.lat ?? 0).toFixed(2)}°, ${(fire.lon ?? 0).toFixed(2)}°`}</span>
                        <span>{fire.satellite}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {activeTab === 'earthquakes' && (
                <>
                  {earthquakes.map((eq) => {
                    const isHigh = eq.magnitude >= 5.0;
                    return (
                      <button
                        key={eq.id}
                        onClick={() => onSelectEvent(eq.lat, eq.lon, eq.place, 'earthquakes')}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                          selectedEventId === eq.id
                            ? 'bg-amber-500/30 border-amber-400 text-white'
                            : 'bg-white/5 hover:bg-amber-500/15 border-white/5 hover:border-amber-500/30 text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Activity className={`w-3.5 h-3.5 ${isHigh ? 'text-red-400 animate-pulse' : 'text-amber-400'} shrink-0`} />
                            <span className="text-xs font-semibold truncate max-w-[170px] text-amber-100">
                              {eq.place}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isHigh ? 'bg-red-500/40 text-red-200' : 'bg-amber-500/30 text-amber-300'
                            }`}
                          >
                            M {eq.magnitude}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                          <span>Depth: {Math.round(eq.depth)} km</span>
                          <span>{formatTimeAgo(eq.time)}</span>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer with Hint */}
            <div className="p-2 border-t border-white/10 text-center text-[10px] text-neutral-400 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>Click any event to orbit directly to its coordinates</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
