import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Droplets,
  Wind,
  Gauge,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  CloudRain,
  Sun,
  Snowflake,
  Wind as WindIcon,
  Compass,
  MapPin,
  RotateCcw,
  Activity,
  Route,
  Building2,
  Landmark,
  ShieldAlert,
  AlertTriangle,
  HeartPulse,
  Car,
  CheckCircle2,
  Eye,
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
  const [showDetailedAqi, setShowDetailedAqi] = useState(false);
  const [showFullHierarchy, setShowFullHierarchy] = useState(false);

  // GSAP Slide & Fade In Animation
  useEffect(() => {
    if (!cardRef.current || !isOpen) return;
    const el = cardRef.current;

    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      {
        opacity: 0,
        y: 30,
        scale: 0.97,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        ease: 'power3.out',
      }
    );
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const hierarchy = weather?.locationHierarchy;
  const windCardinal = weather ? getWindCardinal(weather.wind_deg) : 'N';

  // Pressure evaluation
  const getPressureStatus = (pressure: number) => {
    if (pressure > 1018) return { label: 'High Barometric', color: 'text-sky-400' };
    if (pressure < 1008) return { label: 'Low Barometric', color: 'text-amber-400' };
    return { label: 'Stable Pressure', color: 'text-emerald-400' };
  };

  // Humidity evaluation
  const getHumidityStatus = (humidity: number) => {
    if (humidity > 70) return { label: 'High Humidity', color: 'text-blue-400' };
    if (humidity < 35) return { label: 'Arid Atmosphere', color: 'text-amber-300' };
    return { label: 'Optimal Comfort', color: 'text-emerald-400' };
  };

  // US EPA AQI percent progress (0 to 500 scale)
  const usAqiValue = aqi?.usAqi ?? (aqi ? aqi.aqi * 30 : 0);
  const aqiProgressPercent = Math.min(100, Math.max(5, (usAqiValue / 300) * 100));

  return (
    <div
      ref={cardRef}
      id="weather-gpt-panel"
      className="fixed z-30 bottom-6 sm:bottom-8 right-4 sm:right-8 w-[calc(100vw-2rem)] sm:w-[460px] max-h-[88vh] overflow-y-auto pointer-events-auto weather-gpt-glass p-5 sm:p-6 text-white select-none transition-shadow"
      style={{
        background: 'rgba(11, 15, 24, 0.88)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '24px',
        boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* 1. Top Header: GPS Coordinates + Close */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="space-y-1 max-w-[85%]">
          {/* Coordinates & Place Type */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-sky-400 tracking-wider">
            <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              {typeof weather?.lat === 'number' && typeof weather?.lon === 'number'
                ? `${weather.lat.toFixed(4)}°N, ${weather.lon.toFixed(4)}°E`
                : 'Triangulating Earth Coordinates...'}
            </span>
            {hierarchy?.placeType && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-medium uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                {hierarchy.placeType === 'street'
                  ? 'Real Street'
                  : hierarchy.placeType === 'district'
                  ? 'Real District'
                  : 'Real Municipality'}
              </span>
            )}
          </div>

          {/* Primary Street / District / City Name */}
          <h2 className="text-xl sm:text-2xl font-normal tracking-tight text-white font-['Space_Grotesk'] leading-tight truncate">
            {loading
              ? 'Querying Earth Telemetry...'
              : hierarchy?.road || hierarchy?.district || hierarchy?.city || weather?.city || 'Earth Location'}
          </h2>

          {/* Subline: District, City, Country */}
          <div className="text-xs text-slate-300 font-light truncate">
            {[
              hierarchy?.district && hierarchy?.district !== hierarchy?.city ? hierarchy.district : undefined,
              hierarchy?.city,
              hierarchy?.state && hierarchy?.state !== hierarchy?.city ? hierarchy.state : undefined,
              hierarchy?.country || weather?.country,
            ]
              .filter(Boolean)
              .join(', ') || 'Global Observation Node'}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          id="btn-close-weather-card"
          aria-label="Close Weather Card"
          className="p-1.5 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Real Earth Address Hierarchy (Street, District, City, State, Postcode) */}
      {hierarchy && (
        <div className="py-2.5 border-b border-white/[0.07]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            {/* Real Street / Road */}
            {hierarchy.road && (
              <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono">Street / Road</span>
                  <span className="text-sky-200 font-medium truncate block">{hierarchy.road}</span>
                </div>
              </div>
            )}

            {/* Real District / Suburb */}
            {(hierarchy.district || hierarchy.suburb) && (
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono">District / Suburb</span>
                  <span className="text-amber-200 font-medium truncate block">
                    {hierarchy.district || hierarchy.suburb}
                  </span>
                </div>
              </div>
            )}

            {/* Real City / Municipality */}
            {hierarchy.city && (
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono">City / Town</span>
                  <span className="text-emerald-200 font-medium truncate block">{hierarchy.city}</span>
                </div>
              </div>
            )}

            {/* Postal Code */}
            {hierarchy.postcode && (
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-400/20 flex items-center gap-1.5">
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono">Postal Code</span>
                  <span className="text-purple-200 font-mono font-medium truncate block">
                    {hierarchy.postcode}
                  </span>
                </div>
              </div>
            )}

            {/* Region / State */}
            {hierarchy.state && (
              <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5">
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono">State / Region</span>
                  <span className="text-slate-300 font-medium truncate block">{hierarchy.state}</span>
                </div>
              </div>
            )}

            {/* Country */}
            {hierarchy.country && (
              <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5">
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono">Country</span>
                  <span className="text-slate-300 font-medium truncate block">
                    {hierarchy.country} {hierarchy.countryCode ? `(${hierarchy.countryCode})` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Full Reverse Geocoded Address expander */}
          {hierarchy.fullHierarchy && (
            <div className="mt-1.5 pt-1 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="truncate pr-2 font-mono text-[10px] text-slate-400">
                {showFullHierarchy ? hierarchy.fullHierarchy : hierarchy.fullHierarchy.slice(0, 70) + '...'}
              </span>
              <button
                onClick={() => setShowFullHierarchy(!showFullHierarchy)}
                className="text-sky-400 hover:text-sky-300 text-[10px] font-medium shrink-0 cursor-pointer"
              >
                {showFullHierarchy ? 'Less' : 'Full Address'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Temperature & Weather Conditions */}
      <div className="py-3 border-b border-white/[0.07]">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-5xl sm:text-6xl font-extralight tracking-tighter text-white leading-none font-['Plus_Jakarta_Sans'] flex items-baseline">
            {loading ? (
              <span className="text-slate-500 animate-pulse">--.-°</span>
            ) : (
              <AnimatedCounter value={weather?.temp} decimals={1} suffix="°C" className="font-extralight" />
            )}
          </div>

          {/* Condition Icon / Label */}
          <div className="text-right space-y-1">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-sky-500/20 border border-sky-400/30 text-sky-200">
              {weather?.weather_main || 'Atmospheric'}
            </span>
            <p className="text-xs text-slate-400 capitalize">{weather?.weather_desc || 'Standard telemetry'}</p>
          </div>
        </div>

        {/* Feels Like & High/Low */}
        <div className="flex items-center gap-3 text-xs text-slate-400 pt-2 font-light">
          <span>
            Feels like{' '}
            <strong className="text-slate-200 font-normal">
              {weather ? <AnimatedCounter value={weather.feels_like} decimals={1} suffix="°" /> : '--'}
            </strong>
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span>
            H: {weather ? Math.round(weather.temp_max) : '--'}° / L:{' '}
            {weather ? Math.round(weather.temp_min) : '--'}°
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span>
            Wind: {windCardinal} {typeof weather?.wind_speed === 'number' ? weather.wind_speed.toFixed(0) : '--'} km/h
          </span>
        </div>
      </div>

      {/* 4. "EVERY LOCATION AQI" Comprehensive Air Quality Engine */}
      <div className="py-3 border-b border-white/[0.07] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white tracking-wide uppercase font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Every Location AQI & Health</span>
          </div>

          {/* Real-Time EPA AQI Index Score */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">US EPA:</span>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-wider shadow-sm"
              style={{
                backgroundColor: aqi ? `${aqi.color}25` : '#10b98125',
                color: aqi ? aqi.color : '#10b981',
                border: `1px solid ${aqi ? aqi.color : '#10b981'}50`,
              }}
            >
              AQI {usAqiValue}
            </span>
          </div>
        </div>

        {/* EPA Level Card with Spectrum Bar */}
        <div
          className="p-3 rounded-xl border transition-all"
          style={{
            backgroundColor: aqi ? `${aqi.color}10` : 'rgba(255,255,255,0.03)',
            borderColor: aqi ? `${aqi.color}35` : 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full animate-pulse shadow-sm"
                style={{ backgroundColor: aqi ? aqi.color : '#10b981' }}
              />
              <span
                className="text-sm font-semibold tracking-tight"
                style={{ color: aqi ? aqi.color : '#10b981' }}
              >
                {aqi?.label || 'Air Quality Calibrating'}
              </span>
            </div>
            {aqi?.dominantPollutant && (
              <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                Primary: {aqi.dominantPollutant}
              </span>
            )}
          </div>

          {/* Color Spectrum Progress Bar (Good -> Moderate -> Unhealthy -> Hazardous) */}
          <div className="space-y-1 mt-2">
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden flex">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${aqiProgressPercent}%`,
                  backgroundColor: aqi ? aqi.color : '#10b981',
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-0.5">
              <span>0 Good</span>
              <span>50 Mod</span>
              <span>100 Sensitive</span>
              <span>150 Unhealthy</span>
              <span>300+ Haz</span>
            </div>
          </div>

          {/* Actionable Health & Outdoor Activity Advisory */}
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1 text-xs">
            <div className="flex items-start gap-1.5 text-slate-200">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-snug">
                {aqi?.healthRecommendation ||
                  'Air quality is satisfactory. Safe for all outdoor running, cycling, and travel.'}
              </p>
            </div>

            {/* Roadside Traffic & Vehicle Emissions Impact */}
            <div className="flex items-start gap-1.5 text-slate-300 pt-0.5">
              <Car className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <p className="leading-snug text-[11px] text-slate-400">
                {aqi?.roadsideTrafficImpact || 'Low roadside vehicular exhaust emissions along street corridors.'}
              </p>
            </div>
          </div>
        </div>

        {/* 7-Pollutant Breakdown Toggle */}
        <div>
          <button
            onClick={() => setShowDetailedAqi(!showDetailedAqi)}
            id="btn-toggle-pollutant-breakdown"
            className="w-full flex items-center justify-between py-1 px-1 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              7-Pollutant Matrix (PM₂.₅, PM₁₀, NO₂, CO, O₃, SO₂, NH₃)
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                showDetailedAqi ? 'rotate-180 text-sky-400' : ''
              }`}
            />
          </button>

          {showDetailedAqi && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-white/[0.06] text-center">
              {/* PM2.5 Fine Dust */}
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>PM₂.₅</span>
                  <span className="text-[9px] text-slate-500">WHO: 15</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-1">
                  <AnimatedCounter value={aqi?.pm2_5} decimals={1} suffix=" μg" />
                </p>
                <span className="text-[9px] text-slate-400 block mt-0.5">Fine Particles</span>
              </div>

              {/* PM10 Coarse Dust */}
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>PM₁₀</span>
                  <span className="text-[9px] text-slate-500">WHO: 45</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-1">
                  <AnimatedCounter value={aqi?.pm10} decimals={1} suffix=" μg" />
                </p>
                <span className="text-[9px] text-slate-400 block mt-0.5">Coarse Dust</span>
              </div>

              {/* NO2 Traffic Nitrogen */}
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>NO₂</span>
                  <span className="text-[9px] text-slate-500">Traffic</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-1">
                  <AnimatedCounter value={aqi?.no2} decimals={1} suffix=" μg" />
                </p>
                <span className="text-[9px] text-slate-400 block mt-0.5">Vehicle Exhaust</span>
              </div>

              {/* CO Carbon Monoxide */}
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>CO</span>
                  <span className="text-[9px] text-slate-500">Vehicle</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-1">
                  <AnimatedCounter value={aqi?.co} decimals={0} suffix=" μg" />
                </p>
                <span className="text-[9px] text-slate-400 block mt-0.5">Carbon Monoxide</span>
              </div>

              {/* O3 Ozone */}
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>O₃</span>
                  <span className="text-[9px] text-slate-500">Smog</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-1">
                  <AnimatedCounter value={aqi?.o3} decimals={1} suffix=" μg" />
                </p>
                <span className="text-[9px] text-slate-400 block mt-0.5">Ground Ozone</span>
              </div>

              {/* SO2 Sulfur Dioxide */}
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>SO₂</span>
                  <span className="text-[9px] text-slate-500">Industry</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-1">
                  <AnimatedCounter value={aqi?.so2} decimals={1} suffix=" μg" />
                </p>
                <span className="text-[9px] text-slate-400 block mt-0.5">Sulfur Dioxide</span>
              </div>

              {/* NH3 Ammonia */}
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>NH₃</span>
                  <span className="text-[9px] text-slate-500">Trace</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-1">
                  <AnimatedCounter value={aqi?.nh3} decimals={1} suffix=" μg" />
                </p>
                <span className="text-[9px] text-slate-400 block mt-0.5">Ammonia</span>
              </div>

              {/* European AQI Index */}
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>EU AQI</span>
                  <span className="text-[9px] text-slate-500">1 - 5</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-1">
                  Grade {aqi?.aqi ?? 1}
                </p>
                <span className="text-[9px] text-slate-400 block mt-0.5">European Standard</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Meteorological Atmospheric Metrics (Humidity, Pressure) */}
      <div className="grid grid-cols-2 gap-2 py-2.5 border-b border-white/[0.07]">
        {/* Humidity (%) */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>Humidity</span>
            </div>
            <span className={`text-[10px] ${weather ? getHumidityStatus(weather.humidity).color : 'text-slate-500'}`}>
              {weather ? getHumidityStatus(weather.humidity).label : ''}
            </span>
          </div>
          <div className="text-lg font-light text-slate-100">
            <AnimatedCounter value={weather?.humidity} decimals={0} suffix="%" className="font-light" />
          </div>
        </div>

        {/* Air Pressure (hPa) */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>Pressure</span>
            </div>
            <span className={`text-[10px] ${weather ? getPressureStatus(weather.pressure).color : 'text-slate-500'}`}>
              {weather ? getPressureStatus(weather.pressure).label : ''}
            </span>
          </div>
          <div className="text-lg font-light text-slate-100">
            <AnimatedCounter value={weather?.pressure} decimals={0} suffix=" hPa" className="font-light" />
          </div>
        </div>
      </div>

      {/* 6. Street Roads, Street View 360 & Orbit Navigation Buttons */}
      <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {onOpenStreetMap && (
          <button
            id="btn-card-inspect-street"
            onClick={onOpenStreetMap}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-500/25 hover:bg-sky-500/35 text-sky-200 border border-sky-400/40 text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Route className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>{isStreetMapOpen ? 'Viewing Street Roads' : 'Inspect Roads'}</span>
          </button>
        )}

        {onOpenStreetView && (
          <button
            id="btn-card-open-streetview"
            onClick={onOpenStreetView}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-400/40 text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Street View 360°</span>
          </button>
        )}

        {onResetView && (
          <button
            id="btn-card-reset-orbit"
            onClick={onResetView}
            title="Reset to 3D Planetary Orbit"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Orbit</span>
          </button>
        )}
      </div>

      {/* 7. Weather Particle Engine Simulation Selector */}
      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-light flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-sky-400" />
          Atmosphere Sim:
        </span>

        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/[0.06]">
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
                  ? 'bg-sky-500/25 text-sky-300 border border-sky-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
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
