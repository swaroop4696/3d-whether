import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  Route,
  ShieldAlert,
  Wind,
  Flame,
  Truck,
  Activity,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Share2,
  ChevronRight,
  Zap,
  Layers,
  Sparkles,
  Users,
} from 'lucide-react';
import type { EconomicCorridor } from '../types';
import { INDIAN_ECONOMIC_CORRIDORS } from '../services/corridorAndEmissionService';

interface EconomicCorridorFastHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlyToLocation?: (lat: number, lon: number, name: string) => void;
}

export const EconomicCorridorFastHubModal: React.FC<EconomicCorridorFastHubModalProps> = ({
  isOpen,
  onClose,
  onFlyToLocation,
}) => {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(
    INDIAN_ECONOMIC_CORRIDORS[0].id
  );
  const [copiedBrief, setCopiedBrief] = useState(false);

  if (!isOpen) return null;

  const currentCorridor =
    INDIAN_ECONOMIC_CORRIDORS.find((c) => c.id === selectedCorridorId) ||
    INDIAN_ECONOMIC_CORRIDORS[0];

  const getAqiColorClass = (aqi: number) => {
    if (aqi > 400) return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    if (aqi > 300) return 'text-rose-400 bg-rose-500/20 border-rose-500/30';
    if (aqi > 200) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
  };

  const handleCopyDirectiveBrief = () => {
    const briefText = `[CPCB FEDERATED CLIMATE ACTION DIRECTIVE]
Corridor: ${currentCorridor.name} (${currentCorridor.code})
Length: ${currentCorridor.lengthKm} km
Jurisdiction States: ${currentCorridor.statesCovered.join(', ')}
Current Baseline AQI: ${currentCorridor.currentAverageAqi}
Spike Forecast: 24h: ${currentCorridor.predictedAqi24h} | 48h: ${currentCorridor.predictedAqi48h} | 72h: ${currentCorridor.predictedAqi72h}
CPCB Classification: ${currentCorridor.grapStage}
Stubble Burning Risk: ${currentCorridor.stubbleBurnRisk}
Active GRAP Protocols:
${currentCorridor.activeInterventions.map((i, idx) => `  ${idx + 1}. ${i}`).join('\n')}

Federated Resource Deployment:
${currentCorridor.federatedNodes
  .map(
    (node) =>
      `  • ${node.state} (${node.leadAgency}): ${node.deployedSmogGuns} Anti-Smog Cannons | ${node.mechanizedSweepers} Sweepers | Status: ${node.interStateAlertStatus.toUpperCase()}`
  )
  .join('\n')}
Timestamp: ${new Date().toISOString()}
Generated via GeoAtmosphere Climate Action Platform`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(briefText).catch((err) => {
        console.warn('[Clipboard] Copy notice:', err);
      });
    }
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden border border-sky-400/30 shadow-2xl text-white font-sans"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 16, 28, 0.97) 0%, rgba(5, 8, 16, 0.99) 100%)',
        }}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-lg">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Indian Economic Corridor Forecast Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-sky-300 bg-sky-500/20 border border-sky-400/30">
                  Fast Action Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cross-state predictive AQI curves, satellite stubble burn tracking & CPCB GRAP federation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Corridor Selector Tabs */}
          <div className="md:col-span-4 border-r border-white/10 p-3 overflow-y-auto space-y-2 bg-black/20">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block px-2 mb-1">
              Active Economic Arteries
            </span>

            {INDIAN_ECONOMIC_CORRIDORS.map((corridor) => {
              const isSelected = corridor.id === selectedCorridorId;
              return (
                <button
                  key={corridor.id}
                  onClick={() => setSelectedCorridorId(corridor.id)}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400/50 shadow-lg'
                      : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-white font-mono">
                      {corridor.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getAqiColorClass(
                        corridor.currentAverageAqi
                      )}`}
                    >
                      AQI {corridor.currentAverageAqi}
                    </span>
                  </div>

                  <h4 className="text-xs font-medium text-slate-200 line-clamp-1 mb-1.5">
                    {corridor.name}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{corridor.lengthKm} km</span>
                    <span className="text-amber-300 font-mono text-[10px]">
                      {corridor.stubbleBurnRisk} Fire Risk
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Corridor Telemetry & Action Center */}
          <div className="md:col-span-8 p-6 overflow-y-auto max-h-[75vh] space-y-5">
            {/* Header with Title & Fly Button */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-400/20">
                    {currentCorridor.code} • {currentCorridor.lengthKm} Kilometers
                  </span>
                  <span className="text-xs text-slate-400">
                    States: {currentCorridor.statesCovered.join(', ')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {currentCorridor.name}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {currentCorridor.description}
                </p>
              </div>

              {onFlyToLocation && (
                <button
                  onClick={() => {
                    const midpoint = currentCorridor.keyCities[Math.floor(currentCorridor.keyCities.length / 2)];
                    onFlyToLocation(midpoint.lat, midpoint.lon, currentCorridor.name);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-xs transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Inspect Corridor</span>
                </button>
              )}
            </div>

            {/* Core Metrics Bento Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">
                  Current Avg AQI
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black font-mono ${getAqiColorClass(currentCorridor.currentAverageAqi).split(' ')[0]}`}>
                    {currentCorridor.currentAverageAqi}
                  </span>
                  <span className="text-[10px] text-slate-400">CPCB</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">
                  GRAP Protocol
                </span>
                <span className="text-xs font-bold text-rose-400 block truncate">
                  {currentCorridor.grapStage}
                </span>
                <span className="text-[10px] text-slate-400">Emergency Status</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">
                  Stubble Fire Risk
                </span>
                <span className={`text-xs font-bold block ${
                  currentCorridor.stubbleBurnRisk === 'Extreme' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {currentCorridor.stubbleBurnRisk}
                </span>
                <span className="text-[10px] text-slate-400">NASA VIIRS Anomaly</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">
                  Dominant Pollutant
                </span>
                <span className="text-xs font-semibold text-sky-300 block truncate">
                  PM2.5 (Organic)
                </span>
                <span className="text-[10px] text-slate-400">Biomass Combustion</span>
              </div>
            </div>

            {/* Predictive Air Quality Spike Curves (24h, 48h, 72h) */}
            <div className="p-4 rounded-2xl bg-black/40 border border-sky-400/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-300 font-mono">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <span>72-Hour Atmospheric Spike Forecast (Downwind Trajectory Model)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Updated 15 mins ago
                </span>
              </div>

              {/* Graphical Timeline Curve */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">Current</span>
                  <span className="text-lg font-bold font-mono text-amber-400">
                    {currentCorridor.currentAverageAqi}
                  </span>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${Math.min(100, (currentCorridor.currentAverageAqi / 500) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">+24 Hours</span>
                  <span className="text-lg font-bold font-mono text-rose-400">
                    {currentCorridor.predictedAqi24h}
                  </span>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full"
                      style={{ width: `${Math.min(100, (currentCorridor.predictedAqi24h / 500) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">+48 Hours (Peak)</span>
                  <span className="text-lg font-bold font-mono text-purple-400">
                    {currentCorridor.predictedAqi48h}
                  </span>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, (currentCorridor.predictedAqi48h / 500) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">+72 Hours</span>
                  <span className="text-lg font-bold font-mono text-rose-400">
                    {currentCorridor.predictedAqi72h}
                  </span>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full"
                      style={{ width: `${Math.min(100, (currentCorridor.predictedAqi72h / 500) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Key Highway Cities Nodes along Corridor */}
            <div>
              <span className="text-xs font-semibold text-slate-300 font-mono mb-2 block">
                Key Highway Junctions & Monitored CAAQMS Stations:
              </span>
              <div className="flex flex-wrap gap-2">
                {currentCorridor.keyCities.map((city) => (
                  <div
                    key={city.name}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs"
                  >
                    <span className="text-slate-200">{city.name}</span>
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${getAqiColorClass(
                        city.aqi
                      )}`}
                    >
                      {city.aqi}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Federated Inter-State Resource Coordination */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 font-mono">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Federated Inter-State Resource Sharing Network</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Real-Time Joint Operations
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentCorridor.federatedNodes.map((node) => (
                  <div
                    key={node.state}
                    className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{node.state}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{node.leadAgency}</span>
                    </div>

                    <div className="text-right text-[11px] font-mono">
                      <span className="text-sky-300 block">{node.deployedSmogGuns} Smog Cannons</span>
                      <span className="text-amber-300">{node.mechanizedSweepers} Sweepers</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active GRAP Mandates & Official Action Brief Generator */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white font-mono">
                  Mandatory Rapid Interventions in Effect ({currentCorridor.grapStage})
                </span>

                <button
                  onClick={handleCopyDirectiveBrief}
                  className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-xs text-sky-200 font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {copiedBrief ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Directive Copied!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Action Brief</span>
                    </>
                  )}
                </button>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-300">
                {currentCorridor.activeInterventions.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
