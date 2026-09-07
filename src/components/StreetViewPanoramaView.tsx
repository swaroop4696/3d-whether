import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Compass,
  Maximize2,
  Minimize2,
  MapPin,
  HeartPulse,
  Car,
  RotateCcw,
  Sparkles,
  Navigation,
  Eye,
  Route,
  ShieldCheck,
} from 'lucide-react';
import type { WeatherData, AqiData } from '../types';
import { AnimatedCounter } from './AnimatedCounter';
import { getGoogleMapsApiKey } from '../services/googleMapsLoader';

interface StreetViewPanoramaViewProps {
  lat: number;
  lon: number;
  streetName?: string;
  district?: string;
  cityName?: string;
  weather: WeatherData | null;
  aqi: AqiData | null;
  isOpen: boolean;
  onClose: () => void;
  onLocationChanged?: (newLat: number, newLon: number) => void;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
}

export const StreetViewPanoramaView: React.FC<StreetViewPanoramaViewProps> = ({
  lat,
  lon,
  streetName,
  district,
  cityName,
  weather,
  aqi,
  isOpen,
  onClose,
  onLocationChanged,
  isSplitView = false,
  onToggleSplitView,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  const [heading, setHeading] = useState<number>(180);
  const [pitch, setPitch] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [isNativePanoActive, setIsNativePanoActive] = useState<boolean>(false);
  const [hasPanoError, setHasPanoError] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);

  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLon = Math.round(lon * 10000) / 10000;

  // Initialize official google.maps.StreetViewPanorama if API key & window.google.maps are present
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const apiKey = getGoogleMapsApiKey();
    const hasGoogleMaps = Boolean(window.google?.maps?.StreetViewPanorama);

    if (apiKey && hasGoogleMaps) {
      try {
        setHasPanoError(false);
        const streetViewService = new window.google.maps.StreetViewService();

        streetViewService.getPanorama(
          {
            location: { lat, lng: lon },
            radius: 100,
            // Mandatory attribution from Google Maps Platform Skill
            // @ts-expect-error internal tracking property
            internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
          },
          (data, status) => {
            if (status === window.google.maps.StreetViewStatus.OK && data?.location?.latLng) {
              if (!containerRef.current) return;

              const pano = new window.google.maps.StreetViewPanorama(containerRef.current, {
                position: data.location.latLng,
                pov: { heading: 165, pitch: 0 },
                zoom: 1,
                addressControl: false,
                fullscreenControl: false,
                linksControl: true,
                panControl: true,
                enableCloseButton: false,
                motionTracking: false,
                // Mandatory solution attribution ID
                // @ts-expect-error internal tracking property
                internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
              });

              pano.addListener('pov_changed', () => {
                const currentPov = pano.getPov();
                if (currentPov) {
                  setHeading(Math.round(currentPov.heading));
                  setPitch(Math.round(currentPov.pitch));
                }
              });

              pano.addListener('position_changed', () => {
                const pos = pano.getPosition();
                if (pos && onLocationChanged) {
                  const newLat = Math.round(pos.lat() * 10000) / 10000;
                  const newLon = Math.round(pos.lng() * 10000) / 10000;
                  onLocationChanged(newLat, newLon);
                }
              });

              panoramaRef.current = pano;
              setIsNativePanoActive(true);
            } else {
              // Fallback to Google Street View embed iframe
              setIsNativePanoActive(false);
            }
          }
        );
      } catch (err) {
        console.warn('Native Street View initialization note:', err);
        setIsNativePanoActive(false);
      }
    } else {
      setIsNativePanoActive(false);
    }

    return () => {
      if (panoramaRef.current) {
        panoramaRef.current.setVisible(false);
        panoramaRef.current = null;
      }
    };
  }, [isOpen, lat, lon, onLocationChanged]);

  // Smooth 360 auto-pan rotation
  useEffect(() => {
    let animId: number;
    if (isRotating) {
      const step = () => {
        setHeading((prev) => {
          const next = (prev + 0.35) % 360;
          if (panoramaRef.current) {
            panoramaRef.current.setPov({ heading: next, pitch });
          }
          return next;
        });
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isRotating, pitch]);

  if (!isOpen) return null;

  // Google Street View 360° interactive URL (fallback or direct embed)
  const streetViewEmbedUrl = `https://maps.google.com/maps?layer=c&cbll=${lat},${lon}&cbp=12,${heading},0,${pitch},0&output=svembed`;

  return (
    <div
      id="google-street-view-container"
      className={`transition-all duration-500 ease-out z-40 bg-black overflow-hidden flex flex-col ${
        isSplitView
          ? 'h-1/2 w-full border-t-2 border-sky-400/40 shadow-2xl relative'
          : 'fixed inset-0 w-full h-full'
      }`}
    >
      {/* 360 Panorama Viewport */}
      <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
        {/* If native JS StreetView initialized */}
        <div
          ref={containerRef}
          id="native-street-view-pano"
          className={`w-full h-full absolute inset-0 ${isNativePanoActive ? 'block' : 'hidden'}`}
        />

        {/* Universal Google Street View Interactive 360 Viewport */}
        {!isNativePanoActive && !hasPanoError && (
          <iframe
            title="Google Street View 360 Panorama"
            src={streetViewEmbedUrl}
            className="w-full h-full border-0 absolute inset-0 select-none pointer-events-auto"
            allowFullScreen
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}

        {/* 1. Top HUD Bar: Street Address & Status */}
        <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-xl z-20 pointer-events-auto flex items-start gap-2.5">
          <div
            className="p-3.5 rounded-2xl weather-gpt-glass text-white border border-sky-400/40 shadow-2xl space-y-1.5 backdrop-blur-2xl"
            style={{ background: 'rgba(9, 14, 26, 0.92)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-sky-300 text-xs font-semibold uppercase tracking-wider font-mono">
                <Eye className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Google Street View 360° Ground Level</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
                {roundedLat}°, {roundedLon}°
              </span>
            </div>

            {/* Street / District Display */}
            <h3 className="text-base sm:text-lg font-medium text-white tracking-tight leading-snug truncate">
              {streetName || district || cityName || 'Earth Street Corridor'}
            </h3>

            <div className="flex items-center gap-2 text-xs text-slate-300 font-light truncate">
              {district && <span className="text-amber-300">{district}</span>}
              {district && cityName && <span>•</span>}
              {cityName && <span>{cityName}</span>}
              <span>•</span>
              <span className="text-sky-300 font-mono">Heading {Math.round(heading)}° N</span>
            </div>
          </div>
        </div>

        {/* 2. Top Right Control Panel: Split-View, Auto-Pan, Close */}
        <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center gap-2">
          {/* 360 Auto-Pan Toggle */}
          <button
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? 'Pause 360 Rotation' : 'Auto-Pan 360°'}
            className={`p-2.5 rounded-full weather-gpt-pill text-xs font-medium transition-all shadow-xl active:scale-95 cursor-pointer border ${
              isRotating
                ? 'bg-sky-500 text-white border-sky-300 shadow-sky-500/50'
                : 'bg-[#090e1a]/90 text-sky-300 border-sky-400/30 hover:bg-white/10'
            }`}
          >
            <RotateCcw className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} />
          </button>

          {/* Toggle Split Screen (Map + Street View) */}
          {onToggleSplitView && (
            <button
              onClick={onToggleSplitView}
              title={isSplitView ? 'Maximize Street View' : 'Split View with Map'}
              className="p-2.5 rounded-full weather-gpt-pill text-xs font-medium transition-all shadow-xl active:scale-95 cursor-pointer bg-[#090e1a]/90 text-white hover:bg-white/10 border border-white/15"
            >
              {isSplitView ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Close Street View */}
          <button
            onClick={onClose}
            title="Exit Street View"
            className="p-2.5 rounded-full weather-gpt-pill text-xs font-medium transition-all shadow-xl active:scale-95 cursor-pointer bg-[#090e1a]/90 text-rose-300 hover:text-white hover:bg-rose-600/80 border border-rose-500/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Floating Street Atmospheric Telemetry (Live Weather & AQI directly on the street) */}
        <div className="absolute bottom-6 left-4 sm:left-6 z-20 pointer-events-auto max-w-sm">
          <div
            className="p-3 sm:p-4 rounded-2xl weather-gpt-glass text-white border border-sky-400/30 shadow-2xl backdrop-blur-2xl space-y-2"
            style={{ background: 'rgba(9, 14, 26, 0.90)' }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-1.5">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Live Street Atmosphere
              </span>
              <span className="text-xs text-sky-300 font-medium">
                {weather ? `${weather.weather_main}` : 'Telemetric'}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <div className="text-3xl font-light text-white font-['Plus_Jakarta_Sans']">
                {weather ? (
                  <AnimatedCounter value={weather.temp} decimals={1} suffix="°C" />
                ) : (
                  '--.-°'
                )}
              </div>

              {/* Air Quality Badge */}
              <div
                className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 border shadow-sm"
                style={{
                  backgroundColor: aqi ? `${aqi.color}25` : '#10b98125',
                  color: aqi ? aqi.color : '#10b981',
                  borderColor: aqi ? `${aqi.color}50` : '#10b98150',
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>AQI {aqi?.usAqi ?? aqi?.aqi ?? '--'}</span>
                <span className="text-[10px] font-sans font-medium uppercase opacity-90">
                  {aqi?.label || 'Calibrated'}
                </span>
              </div>
            </div>

            {/* Roadside Traffic & Breathability */}
            {aqi?.roadsideTrafficImpact && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300 pt-1 border-t border-white/[0.06]">
                <Car className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{aqi.roadsideTrafficImpact}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Bottom Right Compass & Orientation Dial */}
        <div className="absolute bottom-6 right-4 sm:right-6 z-20 pointer-events-auto flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-2xl weather-gpt-glass bg-[#090e1a]/90 text-white border border-sky-400/30 flex items-center gap-2 text-xs font-mono backdrop-blur-xl shadow-xl">
            <Compass
              className="w-4 h-4 text-sky-400 transition-transform"
              style={{ transform: `rotate(${heading}deg)` }}
            />
            <span className="text-sky-200">{Math.round(heading)}°</span>
            <span className="text-white/20">|</span>
            <span className="text-slate-400">PITCH {Math.round(pitch)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};
