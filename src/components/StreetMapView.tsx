import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Globe, Compass, Crosshair, MapPin, ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react';
import type { LocationHierarchy } from '../types';

interface StreetMapViewProps {
  lat: number;
  lon: number;
  hierarchy?: LocationHierarchy;
  cityName?: string;
  onLocationSelected: (lat: number, lon: number) => void;
  onClose: () => void;
  isOverlay?: boolean;
}

type TileStyle = 'streets' | 'voyager';

export const StreetMapView: React.FC<StreetMapViewProps> = ({
  lat,
  lon,
  hierarchy,
  cityName,
  onLocationSelected,
  onClose,
  isOverlay = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeTileStyle, setActiveTileStyle] = useState<TileStyle>('streets');
  const [zoomLevel, setZoomLevel] = useState<number>(16);

  const tileUrls: Record<TileStyle, { url: string; attribution: string }> = {
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    voyager: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      const layer = L.tileLayer(tileUrls[activeTileStyle].url, {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      tileLayerRef.current = layer;

      // Custom pulsing glowing radar beacon marker
      const radarIcon = L.divIcon({
        className: 'street-radar-beacon',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(56, 189, 248, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(56, 189, 248, 0.8); background: rgba(14, 165, 233, 0.25);"></div>
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 12px #38bdf8; border: 2px solid #ffffff;"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lon], { icon: radarIcon }).addTo(map);
      markerRef.current = marker;

      // Click on street map to pinpoint coordinates & re-fetch
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = Math.round(e.latlng.lat * 10000) / 10000;
        const clickedLon = Math.round(e.latlng.lng * 10000) / 10000;
        marker.setLatLng([clickedLat, clickedLon]);
        onLocationSelected(clickedLat, clickedLon);
      });

      map.on('zoomend', () => {
        setZoomLevel(map.getZoom());
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Update center & marker when lat/lon changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], mapInstanceRef.current.getZoom() || 16, {
        duration: 1.2,
      });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
    }
  }, [lat, lon]);

  // Update tile style
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      tileLayerRef.current.setUrl(tileUrls[activeTileStyle].url);
    }
  }, [activeTileStyle]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    mapInstanceRef.current?.flyTo([lat, lon], 17, { duration: 0.8 });
  };

  return (
    <div
      id="street-map-overlay"
      className={`relative w-full h-full overflow-hidden transition-opacity duration-500 ${
        isOverlay ? 'rounded-2xl border border-white/10 shadow-2xl' : ''
      }`}
    >
      {/* Leaflet DOM viewport */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#0a0f18]" />

      {/* Top Floating Info & Control Strip */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Back to Orbital Globe Button */}
        <button
          id="btn-back-to-orbit"
          onClick={onClose}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full weather-gpt-pill text-white/90 hover:text-white hover:bg-white/10 text-xs font-medium tracking-wide transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>Exit to 3D Orbit</span>
        </button>

        {/* Street & Location Breadcrumb Banner */}
        <div className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full weather-gpt-pill text-xs text-white/80 max-w-xl truncate shadow-lg">
          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-semibold text-white truncate">
            {hierarchy?.road || hierarchy?.neighbourhood || cityName || 'Street Level'}
          </span>
          {hierarchy?.city && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-white/70 truncate">{hierarchy.city}</span>
            </>
          )}
          {hierarchy?.country && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-white/50 truncate">{hierarchy.country}</span>
            </>
          )}
        </div>

        {/* Tile Style Selector (Day Street Maps) */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-full weather-gpt-pill text-xs">
          <button
            id="tile-style-streets"
            onClick={() => setActiveTileStyle('streets')}
            className={`px-3 py-1 rounded-full transition-all text-xs font-medium cursor-pointer ${
              activeTileStyle === 'streets'
                ? 'bg-sky-500/30 text-sky-300 border border-sky-400/30'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Day Streets
          </button>
          <button
            id="tile-style-voyager"
            onClick={() => setActiveTileStyle('voyager')}
            className={`px-3 py-1 rounded-full transition-all text-xs font-medium cursor-pointer ${
              activeTileStyle === 'voyager'
                ? 'bg-sky-500/30 text-sky-300 border border-sky-400/30'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Day Voyager
          </button>
        </div>
      </div>

      {/* Floating Bottom-Right Zoom & Recenter Controls */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
        <button
          id="btn-map-recenter"
          onClick={handleRecenter}
          title="Recenter at exact coordinates"
          className="p-2.5 rounded-xl weather-gpt-pill text-white/80 hover:text-sky-400 hover:bg-white/10 transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          id="btn-map-zoomin"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2.5 rounded-xl weather-gpt-pill text-white/80 hover:text-white hover:bg-white/10 transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          id="btn-map-zoomout"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2.5 rounded-xl weather-gpt-pill text-white/80 hover:text-white hover:bg-white/10 transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left Telemetry Badge */}
      <div className="absolute bottom-6 left-6 z-[1000] flex items-center gap-3 px-3 py-1.5 rounded-full weather-gpt-pill text-[11px] text-white/60 font-mono">
        <span>LAT: {lat.toFixed(4)}°</span>
        <span className="text-white/20">|</span>
        <span>LON: {lon.toFixed(4)}°</span>
        <span className="text-white/20">|</span>
        <span>ZOOM: {zoomLevel}x</span>
      </div>
    </div>
  );
};
