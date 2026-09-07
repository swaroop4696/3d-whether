import React from 'react';
import {
  Wind,
  Droplets,
  Gauge,
  Eye,
  Compass,
  Activity,
  LogOut,
  RotateCw,
  Sparkles,
  CloudSun,
  ShieldCheck,
  Radio,
  Flame,
  CloudRain,
  Sun,
  Snowflake,
  Wind as WindIcon,
} from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { CitySearchBar } from './CitySearchBar';
import type { WeatherData, AqiData, AuthUser, CitySearchResult, WeatherParticleType } from '../types';

interface GlassBrickDashboardProps {
  user: AuthUser;
  weather: WeatherData | null;
  aqi: AqiData | null;
  loading: boolean;
  onLogout: () => void;
  onSelectCity: (city: CitySearchResult) => void;
  onDetectGps: () => void;
  isDetectingGps: boolean;
  particleType: WeatherParticleType;
  onChangeParticleType: (type: WeatherParticleType) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetView: () => void;
}

export const GlassBrickDashboard: React.FC<GlassBrickDashboardProps> = ({
  user,
  weather,
  aqi,
  loading,
  onLogout,
  onSelectCity,
  onDetectGps,
  isDetectingGps,
  particleType,
  onChangeParticleType,
  autoRotate,
  onToggleAutoRotate,
  onResetView,
}) => {
  return (
    <div
      id="dashboard-overlay"
      className="relative z-10 w-full min-h-screen p-3 sm:p-5 pointer-events-none flex flex-col justify-between overflow-y-auto"
    >
      <div className="brick-grid-layout max-w-[1680px] mx-auto w-full">
        {/* ================= AREA: HEADER ================= */}
        <header className="area-header brick-card rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Brand & Status */}
          <div className="flex items-center justify-between lg:justify-start gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400 shadow-inner">
                <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-['Space_Grotesk']">
                    GeoAtmosphere
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-400">Planetary 3D Telemetry Grid</p>
              </div>
            </div>

            {/* Mobile User logout trigger */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 transition-colors pointer-events-auto"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar & GPS Sync */}
          <div className="w-full lg:max-w-xl pointer-events-auto">
            <CitySearchBar
              onSelectCity={onSelectCity}
              onDetectGps={onDetectGps}
              isDetectingGps={isDetectingGps}
              currentCityName={weather?.city || ''}
            />
          </div>

          {/* User Profile & Global Controls */}
          <div className="hidden lg:flex items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                alt={user.displayName || 'Pilot'}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-sky-400/40"
              />
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">
                  {user.displayName || 'Explorer'}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                  {user.isAnonymous ? 'Guest Pilot' : user.email || 'Verified Auth'}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ================= AREA: MAIN WEATHER BRICK ================= */}
        <section className="area-main-weather brick-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          {/* Location & Coordinates Banner */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                <span>
                  {weather ? `${weather.lat.toFixed(2)}°N, ${weather.lon.toFixed(2)}°E` : 'Locating...'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 font-['Space_Grotesk']">
                {weather?.city || 'Scanning Region'}
              </h2>
              {weather?.country && (
                <p className="text-xs text-slate-400">{weather.country}</p>
              )}
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-medium flex items-center gap-1.5">
              <CloudSun className="w-4 h-4 text-sky-400" />
              <span>{weather?.weather_main || 'Atmospheric'}</span>
            </div>
          </div>

          {/* Core Temperature Brick with Counting Animation */}
          <div className="flex items-baseline gap-3 my-2">
            <div className="text-5xl sm:text-6xl font-extrabold text-white tracking-tighter">
              {weather ? (
                <AnimatedCounter
                  value={weather.temp}
                  decimals={1}
                  suffix="°C"
                  duration={900}
                />
              ) : (
                '--.-°C'
              )}
            </div>
            <div className="text-xs text-slate-400 space-y-0.5 font-medium">
              <p>
                Feels like{' '}
                <span className="text-slate-200 font-semibold">
                  {weather ? (
                    <AnimatedCounter value={weather.feels_like} decimals={1} suffix="°" />
                  ) : (
                    '--'
                  )}
                </span>
              </p>
              <p>
                H: {weather ? Math.round(weather.temp_max) : '--'}° L:{' '}
                {weather ? Math.round(weather.temp_min) : '--'}°
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 capitalize bg-white/5 rounded-lg px-3 py-1.5 border border-white/5">
            {weather?.weather_desc || 'Atmospheric conditions standard'}
          </p>

          {/* Sub-metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs border-t border-white/10">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5">
              <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400">Humidity</p>
                <p className="font-semibold text-slate-100">
                  {weather ? (
                    <AnimatedCounter value={weather.humidity} suffix="%" duration={600} />
                  ) : (
                    '--'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5">
              <Wind className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400">Wind Velocity</p>
                <p className="font-semibold text-slate-100">
                  {weather ? (
                    <AnimatedCounter value={weather.wind_speed} decimals={1} suffix=" km/h" duration={700} />
                  ) : (
                    '--'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5">
              <Gauge className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400">Pressure</p>
                <p className="font-semibold text-slate-100">
                  {weather ? (
                    <AnimatedCounter value={weather.pressure} suffix=" hPa" duration={800} />
                  ) : (
                    '--'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5">
              <Eye className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400">Visibility</p>
                <p className="font-semibold text-slate-100">
                  {weather ? (
                    <AnimatedCounter value={weather.visibility} suffix=" km" duration={500} />
                  ) : (
                    '--'
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= AREA: GLOBE CENTER (Transparent passthrough) ================= */}
        <div className="area-globe-center hidden xl:flex items-center justify-center p-4">
          <div className="text-center text-[11px] text-slate-500 uppercase tracking-widest font-mono select-none">
            [ Interactive 3D Orbit • Drag to Rotate • Click Globe to Fly ]
          </div>
        </div>

        {/* ================= AREA: AIR QUALITY (AQI) BRICK ================= */}
        <section className="area-aqi-card brick-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                ATMOSPHERE COMPOSITION
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-0.5 font-['Space_Grotesk']">
                Air Quality Index
              </h3>
            </div>

            {aqi && (
              <span
                style={{ backgroundColor: `${aqi.color}20`, borderColor: `${aqi.color}60`, color: aqi.color }}
                className="px-2.5 py-1 rounded-full text-xs font-bold border tracking-wide"
              >
                LEVEL {aqi.aqi} • {aqi.label.toUpperCase()}
              </span>
            )}
          </div>

          {/* AQI Score Indicator Meter */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Purity Rating</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {aqi ? `${(100 - (aqi.aqi - 1) * 22)}%` : '--'}
              </span>
            </div>

            {/* 5-step spectrum bar */}
            <div className="grid grid-cols-5 gap-1.5 h-2 w-full rounded-full overflow-hidden bg-black/40 p-0.5">
              {[1, 2, 3, 4, 5].map((level) => {
                const colors = ['#10b981', '#38bdf8', '#fbbf24', '#f97316', '#ef4444'];
                const active = aqi && aqi.aqi >= level;
                return (
                  <div
                    key={level}
                    style={{ backgroundColor: active ? colors[level - 1] : '#1e293b' }}
                    className="h-full rounded-sm transition-all duration-500"
                  />
                );
              })}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              {aqi?.description || 'Evaluating regional atmospheric aerosol dispersion.'}
            </p>
          </div>

          {/* Atmospheric Sensors timestamp */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Sensor Array Active
            </span>
            <span className="font-mono">WMO / EPA Calibrated</span>
          </div>
        </section>

        {/* ================= AREA: POLLUTANTS DENSITY BRICK ================= */}
        <section className="area-pollutants brick-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Pollutant Densities (μg/m³)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Real-Time Sync</span>
          </div>

          {/* 4 Requested Pollutants with Counting Animations (PM2.5, PM10, NO2, CO) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* PM2.5 */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-sky-400/30 transition-colors">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold text-sky-300">PM₂.₅</span>
                <span className="text-[10px] text-slate-500">&lt;15 Safe</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {aqi ? (
                  <AnimatedCounter value={aqi.pm2_5} decimals={1} duration={800} />
                ) : (
                  '--'
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Fine Particles</p>
            </div>

            {/* PM10 */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-sky-400/30 transition-colors">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold text-teal-300">PM₁₀</span>
                <span className="text-[10px] text-slate-500">&lt;45 Safe</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {aqi ? (
                  <AnimatedCounter value={aqi.pm10} decimals={1} duration={850} />
                ) : (
                  '--'
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Coarse Dust</p>
            </div>

            {/* NO2 */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-sky-400/30 transition-colors">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold text-amber-300">NO₂</span>
                <span className="text-[10px] text-slate-500">&lt;25 Safe</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {aqi ? (
                  <AnimatedCounter value={aqi.no2} decimals={1} duration={900} />
                ) : (
                  '--'
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Nitrogen Dioxide</p>
            </div>

            {/* CO */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-sky-400/30 transition-colors">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold text-rose-300">CO</span>
                <span className="text-[10px] text-slate-500">&lt;400 Safe</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {aqi ? (
                  <AnimatedCounter value={aqi.co} decimals={0} duration={1000} />
                ) : (
                  '--'
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Carbon Monoxide</p>
            </div>
          </div>
        </section>

        {/* ================= AREA: CONTROL BAR ================= */}
        <div className="area-control-bar brick-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          {/* Weather Particle Simulation Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              3D Particles:
            </span>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {[
                { id: 'clear', label: 'Clear', icon: Sun },
                { id: 'rain', label: 'Rain', icon: CloudRain },
                { id: 'snow', label: 'Snow', icon: Snowflake },
                { id: 'wind', label: 'Wind', icon: WindIcon },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onChangeParticleType(id as WeatherParticleType)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    particleType === id
                      ? 'bg-sky-500/30 text-sky-300 border border-sky-400/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Orbit Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleAutoRotate}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                autoRotate
                  ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin-slow' : ''}`} />
              <span>{autoRotate ? 'Auto-Rotate ON' : 'Auto-Rotate OFF'}</span>
            </button>

            <button
              onClick={onResetView}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
            >
              Reset Cam
            </button>
          </div>
        </div>

        {/* ================= AREA: HUD STATS ================= */}
        <div className="area-hud-stats brick-card rounded-2xl p-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-slate-300">Fresnel Shader Active</span>
          </div>
          <div className="font-mono text-[11px] text-sky-400">
            {weather ? `LAT ${weather.lat.toFixed(2)} / LON ${weather.lon.toFixed(2)}` : 'READY'}
          </div>
        </div>
      </div>
    </div>
  );
};
