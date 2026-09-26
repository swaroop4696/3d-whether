import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  X,
  Droplets,
  Wind,
  Gauge,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CloudRain,
  Sun,
  Snowflake,
  Wind as WindIcon,
  Compass,
  MapPin,
  RotateCcw,
  Route,
  Building2,
  HeartPulse,
  Eye,
  Maximize2,
  Minimize2,
  TrendingUp,
  Activity,
  BarChart3,
} from 'lucide-react';
import gsap from 'gsap';
import type { WeatherData, AqiData, WeatherParticleType } from '../types';
import { AnimatedCounter } from './AnimatedCounter';
import { getWindCardinal } from '../services/weatherService';

interface WeatherGptCardProps {
  weather: WeatherData | null;
  aqi: AqiData | null;
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
  particleType: WeatherParticleType;
  onChangeParticleType: (type: WeatherParticleType) => void;
  onOpenStreetMap?: () => void;
  onOpenStreetView?: () => void;
  onResetView?: () => void;
  isStreetMapOpen?: boolean;
}

type SingleChartTab = 'temp_curve' | 'air_quality' | 'vitals';

export const WeatherGptCard: React.FC<WeatherGptCardProps> = ({
  weather,
  aqi,
  loading,
  isOpen,
  onClose,
  particleType,
  onChangeParticleType,
  onOpenStreetMap,
  onOpenStreetView,
  onResetView,
  isStreetMapOpen = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [chartTab, setChartTab] = useState<SingleChartTab>('temp_curve');
  
  // Mobile responsiveness: default to minimized on screens < 640px so users can see the globe/map
  const [isMinimized, setIsMinimized] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 640;
  });

  // GSAP Slide & Fade In Animation
  useEffect(() => {
    if (!cardRef.current || !isOpen) return;
    const el = cardRef.current;

    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      {
        opacity: 0,
        y: 20,
        scale: 0.98,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: 'power3.out',
      }
    );
  }, [isOpen, isMinimized]);

  if (!isOpen) {
    return null;
  }

  const hierarchy = weather?.locationHierarchy;
  const windCardinal = weather ? getWindCardinal(weather.wind_deg) : 'N';
  const currentTemp = weather ? Math.round(weather.temp) : 24;
  const minTemp = weather ? Math.round(weather.temp_min) : currentTemp - 4;
  const maxTemp = weather ? Math.round(weather.temp_max) : currentTemp + 4;
  const usAqiValue = aqi?.usAqi ?? (aqi ? aqi.aqi * 30 : 42);

  // Synthesize realistic 24-Hour Temperature Curve for the ONE chart box
  const tempCurvePoints = [
    { label: '03:00', temp: minTemp, hour: '3 AM' },
    { label: '07:00', temp: Math.round(minTemp + (maxTemp - minTemp) * 0.25), hour: '7 AM' },
    { label: '11:00', temp: Math.round(minTemp + (maxTemp - minTemp) * 0.8), hour: '11 AM' },
    { label: '15:00', temp: maxTemp, hour: '3 PM' },
    { label: '19:00', temp: Math.round(minTemp + (maxTemp - minTemp) * 0.65), hour: '7 PM' },
    { label: '23:00', temp: Math.round(minTemp + (maxTemp - minTemp) * 0.3), hour: '11 PM' },
  ];

  // SVG Chart path calculation
  const chartWidth = 340;
  const chartHeight = 90;
  const tempRange = Math.max(1, maxTemp - minTemp + 4);
  const getSvgY = (tempVal: number) => {
    const normalized = (tempVal - (minTemp - 2)) / tempRange;
    return chartHeight - normalized * (chartHeight - 24) - 12;
  };

  const svgPoints = tempCurvePoints.map((pt, idx) => {
    const x = 20 + idx * ((chartWidth - 40) / (tempCurvePoints.length - 1));
    const y = getSvgY(pt.temp);
    return { ...pt, x, y };
  });

  const svgPathD = svgPoints.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[idx - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp2x = cp1x;
    return `${acc} C ${cp1x},${prev.y} ${cp2x},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const areaPathD = `${svgPathD} L ${svgPoints[svgPoints.length - 1].x},${chartHeight} L ${svgPoints[0].x},${chartHeight} Z`;

  // Top Pollutants data for Mode 2
  const pollutants = [
    { name: 'PM2.5', val: aqi?.pm2_5 ?? 18.4, whoMax: 15, unit: 'μg/m³', desc: 'Fine respirable particulates' },
    { name: 'PM10', val: aqi?.pm10 ?? 32.1, whoMax: 45, unit: 'μg/m³', desc: 'Inhalable coarse dust' },
    { name: 'NO2', val: aqi?.no2 ?? 24.6, whoMax: 25, unit: 'μg/m³', desc: 'Vehicular traffic exhaust' },
    { name: 'O3', val: aqi?.o3 ?? 48.0, whoMax: 100, unit: 'μg/m³', desc: 'Ground photochemical ozone' },
    { name: 'CO', val: aqi?.co ?? 320, whoMax: 4000, unit: 'μg/m³', desc: 'Combustion carbon monoxide' },
  ];

  /* -------------------------------------------------------------
   * 1. MOBILE-FRIENDLY COMPACT / MINIMIZED CAPSULE MODE
   * Leaves 90% of screen free so mobile users can view the globe/map
   * ------------------------------------------------------------- */
  if (isMinimized) {
    return (
      <div
        ref={cardRef}
        id="weather-gpt-minimized-bar"
        className="fixed z-30 bottom-24 sm:bottom-6 right-3 sm:right-6 max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full pointer-events-auto select-none"
      >
        <div
          className="px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-white transition-all shadow-2xl"
          style={{
            background: 'rgba(11, 17, 30, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            boxShadow: '0 12px 36px -6px rgba(0, 0, 0, 0.85), 0 0 16px rgba(56, 189, 248, 0.15)',
          }}
        >
          {/* Location & Temp */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 font-bold text-xs shrink-0">
              {weather?.temp ? `${Math.round(weather.temp)}°` : '--°'}
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold text-white tracking-tight block truncate">
                {hierarchy?.road || hierarchy?.district || hierarchy?.city || weather?.city || 'Selected Location'}
              </span>
              <span className="text-[10px] text-slate-300 block truncate">
                {weather?.weather_desc || 'Atmospheric telemetry'}
              </span>
            </div>
          </div>

          {/* AQI Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
              style={{
                backgroundColor: aqi ? `${aqi.color}25` : '#10b98125',
                color: aqi ? aqi.color : '#34d399',
                border: `1px solid ${aqi ? aqi.color : '#34d399'}60`,
              }}
            >
              AQI {usAqiValue}
            </span>

            {/* Expand Report Button */}
            <button
              onClick={() => setIsMinimized(false)}
              className="px-2.5 py-1 rounded-xl bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/40 text-[11px] font-medium text-sky-200 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              title="Expand Full Weather Report"
            >
              <Maximize2 className="w-3 h-3 text-sky-300" />
              <span>Report</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
   * 2. EXPANDED FULL REPORT WITH EXACTLY ONE UNIFIED CHART BOX
   * ------------------------------------------------------------- */
  return (
    <div
      ref={cardRef}
      id="weather-gpt-panel"
      className="fixed z-30 bottom-4 sm:bottom-6 right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[440px] max-h-[82vh] overflow-y-auto pointer-events-auto p-4 sm:p-5 text-white select-none transition-all"
      style={{
        background: 'rgba(9, 14, 26, 0.95)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '24px',
        boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.9), 0 0 20px rgba(56, 189, 248, 0.12)',
      }}
    >
      {/* 1. Top Header: Location, Coordinates & Controls */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
        <div className="space-y-0.5 max-w-[75%] min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-300 tracking-wider">
            <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">
              {typeof weather?.lat === 'number' && typeof weather?.lon === 'number'
                ? `${weather.lat.toFixed(3)}°N, ${weather.lon.toFixed(3)}°E`
                : 'Triangulating Coordinates...'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Space_Grotesk'] leading-tight truncate">
            {loading
              ? 'Loading Telemetry...'
              : hierarchy?.road || hierarchy?.district || hierarchy?.city || weather?.city || 'Earth Location'}
          </h2>

          <p className="text-xs text-slate-200 font-medium truncate">
            {[
              hierarchy?.district && hierarchy?.district !== hierarchy?.city ? hierarchy.district : undefined,
              hierarchy?.city,
              hierarchy?.country || weather?.country,
            ]
              .filter(Boolean)
              .join(', ') || 'Global Observation Node'}
          </p>
        </div>

        {/* Action Controls: Minimize + Close */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMinimized(true)}
            id="btn-minimize-weather-card"
            aria-label="Minimize Report"
            title="Minimize to Compact Bar"
            className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            id="btn-close-weather-card"
            aria-label="Close Weather Card"
            className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Primary Atmospheric Snapshot */}
      <div className="py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-light tracking-tighter text-white font-['Plus_Jakarta_Sans']">
            {loading ? (
              <span className="text-slate-400 animate-pulse">--.-°</span>
            ) : (
              <AnimatedCounter value={weather?.temp} decimals={1} suffix="°C" />
            )}
          </span>
          <div className="text-xs text-slate-200 font-medium space-y-0.5">
            <span className="block text-slate-300">
              Feels: <strong className="text-white">{weather ? Math.round(weather.feels_like) : '--'}°C</strong>
            </span>
            <span className="block text-slate-300">
              H: <strong className="text-white">{maxTemp}°</strong> / L:{' '}
              <strong className="text-white">{minTemp}°</strong>
            </span>
          </div>
        </div>

        {/* Condition Badge & AQI pill */}
        <div className="text-right space-y-1">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/25 border border-sky-400/40 text-sky-200">
            {weather?.weather_main || 'Clear'}
          </span>
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[11px] font-mono text-slate-300">AQI</span>
            <span
              className="px-2 py-0.2 rounded text-[11px] font-mono font-bold"
              style={{
                backgroundColor: aqi ? `${aqi.color}25` : '#10b98125',
                color: aqi ? aqi.color : '#34d399',
                border: `1px solid ${aqi ? aqi.color : '#34d399'}60`,
              }}
            >
              {usAqiValue} • {aqi?.label || 'Moderate'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. THE ONE AND ONLY UNIFIED CHART BOX */}
      <div className="my-3 p-3.5 rounded-2xl bg-black/40 border border-sky-400/30 shadow-inner">
        {/* Chart Box Header with Clean Tab Pill Switcher */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300 font-mono">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Atmospheric Telemetry Chart</span>
          </div>

          {/* Mode Switcher inside the single box */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/10 border border-white/10">
            <button
              onClick={() => setChartTab('temp_curve')}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
                chartTab === 'temp_curve'
                  ? 'bg-sky-500/40 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              24h Temp
            </button>
            <button
              onClick={() => setChartTab('air_quality')}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
                chartTab === 'air_quality'
                  ? 'bg-sky-500/40 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Air & AQI
            </button>
            <button
              onClick={() => setChartTab('vitals')}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
                chartTab === 'vitals'
                  ? 'bg-sky-500/40 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Vitals
            </button>
          </div>
        </div>

        {/* TAB 1: 24h Temperature Curve SVG Chart */}
        {chartTab === 'temp_curve' && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1 font-mono">
              <span>Diurnal Curve (24h)</span>
              <span className="text-sky-300 font-semibold">Min: {minTemp}°C • Max: {maxTemp}°C</span>
            </div>

            {/* SVG Spline Curve Area */}
            <div className="relative w-full h-[95px] overflow-hidden">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="tempAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal grid lines */}
                <line x1="10" y1="20" x2="330" y2="20" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <line x1="10" y1="50" x2="330" y2="50" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <line x1="10" y1="80" x2="330" y2="80" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

                {/* Area under curve */}
                <path d={areaPathD} fill="url(#tempAreaGradient)" />

                {/* Smooth Curve Line */}
                <path d={svgPathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

                {/* Data Points & Temperature Tags */}
                {svgPoints.map((pt, idx) => (
                  <g key={idx}>
                    <circle cx={pt.x} cy={pt.y} r="3.5" fill="#0369a1" stroke="#bae6fd" strokeWidth="2" />
                    <text
                      x={pt.x}
                      y={pt.y - 7}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {pt.temp}°
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Time labels under chart */}
            <div className="flex justify-between text-[10px] font-mono text-slate-300 pt-1 border-t border-white/5 px-1">
              {tempCurvePoints.map((pt) => (
                <span key={pt.label}>{pt.hour}</span>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Air Quality Pollutants Matrix Bar Chart */}
        {chartTab === 'air_quality' && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
              <span>Pollutant Density vs WHO Limit</span>
              <span className="text-emerald-300 font-semibold">{aqi?.label || 'Moderate Quality'}</span>
            </div>

            {/* Single Unified Pollutants Bar Matrix */}
            <div className="space-y-1.5 pt-1">
              {pollutants.map((item) => {
                const ratio = Math.min(100, Math.round((item.val / (item.whoMax * 2)) * 100));
                const isOver = item.val > item.whoMax;
                return (
                  <div key={item.name} className="flex items-center gap-2 text-[11px]">
                    <span className="w-12 font-mono font-bold text-slate-200">{item.name}</span>
                    <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.max(8, ratio)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-white w-14 text-right">
                      {item.val.toFixed(1)} <span className="text-slate-400 text-[8px]">{item.unit.split('/')[0]}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Health Advisory snippet */}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-start gap-1.5 text-xs text-slate-200">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug">
                {aqi?.healthRecommendation || 'Atmospheric quality is suitable for everyday outdoor routines.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Atmospheric Vitals (Humidity, Pressure, Wind) */}
        {chartTab === 'vitals' && (
          <div className="pt-2 grid grid-cols-3 gap-2">
            {/* Humidity */}
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <Droplets className="w-4 h-4 text-sky-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-300 block font-mono">Humidity</span>
              <span className="text-base font-bold text-white font-mono">
                {weather?.humidity ?? 55}%
              </span>
              <span className="text-[9px] text-sky-300 block">
                {weather && weather.humidity > 65 ? 'Humid' : 'Comfortable'}
              </span>
            </div>

            {/* Pressure */}
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <Gauge className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-300 block font-mono">Pressure</span>
              <span className="text-base font-bold text-white font-mono">
                {weather?.pressure ?? 1013}
              </span>
              <span className="text-[9px] text-slate-300 block font-mono">hPa Barometer</span>
            </div>

            {/* Wind */}
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <Wind className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-300 block font-mono">Wind Flow</span>
              <span className="text-base font-bold text-white font-mono">
                {weather ? Math.round(weather.wind_speed) : 12}
              </span>
              <span className="text-[9px] text-emerald-300 block font-mono">
                {windCardinal} km/h
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Action Buttons (Street View, Inspect Roads, Orbit) */}
      <div className="mt-3 flex items-center justify-between gap-2">
        {onOpenStreetMap && (
          <button
            id="btn-card-inspect-street"
            onClick={onOpenStreetMap}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-sky-500/25 hover:bg-sky-500/35 text-sky-200 border border-sky-400/40 text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Route className="w-3.5 h-3.5 text-sky-400" />
            <span className="truncate">{isStreetMapOpen ? 'Viewing 2D' : 'Roads'}</span>
          </button>
        )}

        {onOpenStreetView && (
          <button
            id="btn-card-open-streetview"
            onClick={onOpenStreetView}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-400/40 text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate">Street View</span>
          </button>
        )}

        {onResetView && (
          <button
            id="btn-card-reset-orbit"
            onClick={onResetView}
            title="Reset to Planetary Orbit"
            className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/15 text-xs font-medium transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
            <span>Orbit</span>
          </button>
        )}
      </div>

      {/* 5. Compact Atmosphere Simulation Selector */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
        <span className="text-[11px] text-slate-300 font-light flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-sky-400" />
          Atmosphere Mode:
        </span>

        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-full border border-white/10">
          {[
            { id: 'clear', label: 'Clear', icon: Sun },
            { id: 'rain', label: 'Rain', icon: CloudRain },
            { id: 'snow', label: 'Snow', icon: Snowflake },
            { id: 'wind', label: 'Wind', icon: WindIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onChangeParticleType(id as WeatherParticleType)}
              title={label}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                particleType === id
                  ? 'bg-sky-500/30 text-sky-200 border border-sky-400/50 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
