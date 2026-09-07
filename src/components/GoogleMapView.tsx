// Source: Google Maps Platform Code Assist
// Attribution ID: gmp_mcp_codeassist_v1_aistudio
// Key security model adapted from: https://github.com/bilawalsidhu/gods-eye-view

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { darkMinimalistMapStyles } from '../constants/googleMapStyles';
import type { WeatherData, AqiData } from '../types';
import {
  RotateCcw,
  Crosshair,
  ZoomIn,
  ZoomOut,
  MapPin,
  ShieldCheck,
  Wind,
  Droplets,
  ShieldAlert,
  Layers,
  Route,
  Navigation,
  Check,
  Building2,
  ChevronDown,
  Activity,
  HeartPulse,
  Car,
  Eye,
  Train,
  Bike,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  loadGoogleMapsScript,
  getGoogleMapsApiKey,
} from '../services/googleMapsLoader';
import { KeyRestrictionsModal } from './KeyRestrictionsModal';
import { StreetViewPanoramaView } from './StreetViewPanoramaView';

interface GoogleMapViewProps {
  lat: number | null;
  lon: number | null;
  weather: WeatherData | null;
  aqi: AqiData | null;
  cityName: string;
  onLocationSelected: (lat: number, lon: number) => void;
  onReturnToOrbit: () => void;
  isVisible: boolean;
  isStreetViewOpen?: boolean;
  onToggleStreetView?: (open: boolean) => void;
}

export type TileLayerType = 'streets' | 'voyager' | 'hybrid' | 'daylight';

interface TileConfig {
  id: TileLayerType;
  name: string;
  badge: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
  description: string;
}

const TILE_CONFIGS: Record<TileLayerType, TileConfig> = {
  streets: {
    id: 'streets',
    name: 'Street Roads (OSM)',
    badge: 'Full Road Detail',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    description: 'Every street, avenue, alleyway, lane, and road label',
  },
  voyager: {
    id: 'voyager',
    name: 'Urban Street Roads',
    badge: 'High-Vis Vector',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 20,
    subdomains: 'abcd',
    description: 'Modern vibrant roads, expressways, and avenue labels',
  },
  hybrid: {
    id: 'hybrid',
    name: 'Satellite + Roads',
    badge: 'Aerial Hybrid',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    description: 'Photorealistic satellite aerial imagery overlaid with road network',
  },
  daylight: {
    id: 'daylight',
    name: 'Daylight High-Contrast Roads',
    badge: 'Pure Day',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 20,
    subdomains: 'abcd',
    description: 'Crisp daytime high-contrast road network and avenue labels',
  },
};

// Esri World Transportation dedicated road & street overlay tile service
const TRANSPORTATION_ROADS_OVERLAY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  lat,
  lon,
  weather,
  aqi,
  cityName,
  onLocationSelected,
  onReturnToOrbit,
  isVisible,
  isStreetViewOpen = false,
  onToggleStreetView,
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const leafletContainerRef = useRef<HTMLDivElement>(null);

  // Google Maps instances & Feature Layers
  const googleMapInstanceRef = useRef<google.maps.Map | null>(null);
  const googleTrafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const googleTransitLayerRef = useRef<google.maps.TransitLayer | null>(null);
  const googleBicyclingLayerRef = useRef<google.maps.BicyclingLayer | null>(null);
  const googleMarkerRef = useRef<google.maps.Marker | null>(null);

  // Leaflet instances
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletTileLayerRef = useRef<L.TileLayer | null>(null);
  const leafletRoadOverlayRef = useRef<L.TileLayer | null>(null);
  const leafletMarkerRef = useRef<L.Marker | null>(null);

  const [mapEngine, setMapEngine] = useState<'leaflet' | 'google'>('leaflet');
  // Default directly to 'streets' so street roads are front and center!
  const [activeLayer, setActiveLayer] = useState<TileLayerType>('streets');
  const [showRoadOverlay, setShowRoadOverlay] = useState<boolean>(true);
  const [showTraffic, setShowTraffic] = useState<boolean>(true);
  const [showTransit, setShowTransit] = useState<boolean>(false);
  const [showBicycling, setShowBicycling] = useState<boolean>(false);

  // Street View 360 State
  const [isStreetViewActive, setIsStreetViewActive] = useState<boolean>(isStreetViewOpen);
  const [isSplitView, setIsSplitView] = useState<boolean>(false);

  // Keep internal Street View state synchronized with external prop if provided
  useEffect(() => {
    setIsStreetViewActive(isStreetViewOpen);
  }, [isStreetViewOpen]);

  const handleToggleStreetView = (active: boolean) => {
    setIsStreetViewActive(active);
    onToggleStreetView?.(active);
  };

  const [isRestrictionsModalOpen, setIsRestrictionsModalOpen] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(16);

  const [showAqiMatrix, setShowAqiMatrix] = useState(false);

  const [hierarchy, setHierarchy] = useState<{
    road?: string;
    houseNumber?: string;
    district?: string;
    neighbourhood?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  } | null>(null);

  const targetLat = lat ?? 40.7128;
  const targetLon = lon ?? -74.006;

  // Stable callback reference
  const onLocationSelectedRef = useRef(onLocationSelected);
  useEffect(() => {
    onLocationSelectedRef.current = onLocationSelected;
  }, [onLocationSelected]);

  /**
   * Helper: Attach or detach the transportation road overlay
   */
  const updateRoadOverlay = useCallback(
    (map: L.Map, layerType: TileLayerType, enabled: boolean) => {
      // In hybrid or daylight mode, or whenever enabled, ensure transportation roads are sharp
      const shouldHaveOverlay =
        enabled && (layerType === 'hybrid' || layerType === 'daylight');

      if (leafletRoadOverlayRef.current) {
        map.removeLayer(leafletRoadOverlayRef.current);
        leafletRoadOverlayRef.current = null;
      }

      if (shouldHaveOverlay) {
        const roadLayer = L.tileLayer(TRANSPORTATION_ROADS_OVERLAY, {
          maxZoom: 19,
          opacity: 0.95,
        }).addTo(map);
        leafletRoadOverlayRef.current = roadLayer;
      }
    },
    []
  );

  /**
   * 1. Initialize Leaflet Precision Slippy Map Engine
   */
  const initLeafletMap = useCallback(() => {
    if (!leafletContainerRef.current) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(leafletContainerRef.current, {
      center: [targetLat, targetLon],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 20,
    });

    const tileConfig = TILE_CONFIGS[activeLayer];
    const tileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || 'abc',
    }).addTo(map);
    leafletTileLayerRef.current = tileLayer;

    // Attach road overlay if needed
    updateRoadOverlay(map, activeLayer, showRoadOverlay);

    // Sleek glassmorphic beacon pin with high-visibility target ring
    const pinHtml = `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
        <div style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background: rgba(56, 189, 248, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 9999px; background: rgba(14, 165, 233, 0.8); border: 2.5px solid #38bdf8; box-shadow: 0 0 16px #38bdf8;"></div>
        <div style="width: 8px; height: 8px; border-radius: 9999px; background: #ffffff; box-shadow: 0 0 8px #ffffff;"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: pinHtml,
      className: 'weather-gps-pin',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([targetLat, targetLon], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    // Draggable marker update
    marker.on('dragend', (e) => {
      const markerPos = e.target.getLatLng();
      const roundedLat = Math.round(markerPos.lat * 10000) / 10000;
      const roundedLon = Math.round(markerPos.lng * 10000) / 10000;
      onLocationSelectedRef.current(roundedLat, roundedLon);
    });

    leafletMarkerRef.current = marker;

    // Click anywhere on map to reposition and inspect street roads
    map.on('click', (e) => {
      const roundedLat = Math.round(e.latlng.lat * 10000) / 10000;
      const roundedLon = Math.round(e.latlng.lng * 10000) / 10000;
      marker.setLatLng([roundedLat, roundedLon]);
      onLocationSelectedRef.current(roundedLat, roundedLon);
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    leafletMapRef.current = map;
  }, [targetLat, targetLon, activeLayer, showRoadOverlay, updateRoadOverlay]);

  /**
   * 2. Initialize Google Maps JavaScript API (if key is configured)
   */
  const initGoogleMap = useCallback(async () => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      setMapEngine('leaflet');
      initLeafletMap();
      return;
    }

    const loaded = await loadGoogleMapsScript(apiKey);
    if (!loaded || !window.google?.maps || !mapElementRef.current) {
      setMapEngine('leaflet');
      initLeafletMap();
      return;
    }

    try {
      const map = new window.google.maps.Map(mapElementRef.current, {
        center: { lat: targetLat, lng: targetLon },
        zoom: 16,
        styles: darkMinimalistMapStyles,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        backgroundColor: '#090d16',
        gestureHandling: 'greedy',
        // Mandatory solution attribution ID per Google Maps Platform Code Assist
        internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
      });

      // Target Pin
      const marker = new window.google.maps.Marker({
        position: { lat: targetLat, lng: targetLon },
        map: map,
        title: cityName || 'Selected Location',
        draggable: true,
      });

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          const clickedLat = Math.round(pos.lat() * 10000) / 10000;
          const clickedLon = Math.round(pos.lng() * 10000) / 10000;
          onLocationSelectedRef.current(clickedLat, clickedLon);
        }
      });
      googleMarkerRef.current = marker;

      // Real-time Traffic Layer
      const trafficLayer = new window.google.maps.TrafficLayer();
      googleTrafficLayerRef.current = trafficLayer;
      if (showTraffic) {
        trafficLayer.setMap(map);
      }

      // Public Transit Layer
      const transitLayer = new window.google.maps.TransitLayer();
      googleTransitLayerRef.current = transitLayer;
      if (showTransit) {
        transitLayer.setMap(map);
      }

      // Bicycling Layer
      const bicyclingLayer = new window.google.maps.BicyclingLayer();
      googleBicyclingLayerRef.current = bicyclingLayer;
      if (showBicycling) {
        bicyclingLayer.setMap(map);
      }

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const clickedLat = Math.round(e.latLng.lat() * 10000) / 10000;
          const clickedLon = Math.round(e.latLng.lng() * 10000) / 10000;
          marker.setPosition(e.latLng);
          onLocationSelectedRef.current(clickedLat, clickedLon);
        }
      });

      map.addListener('zoom_changed', () => {
        setCurrentZoom(map.getZoom() ?? 16);
      });

      googleMapInstanceRef.current = map;
      setMapEngine('google');
    } catch {
      setMapEngine('leaflet');
      initLeafletMap();
    }
  }, [targetLat, targetLon, initLeafletMap, showTraffic, showTransit, showBicycling, cityName]);

  // Synchronize Google Traffic Layer state
  useEffect(() => {
    if (googleTrafficLayerRef.current) {
      googleTrafficLayerRef.current.setMap(
        showTraffic && mapEngine === 'google' ? googleMapInstanceRef.current : null
      );
    }
  }, [showTraffic, mapEngine]);

  // Synchronize Google Transit Layer state
  useEffect(() => {
    if (googleTransitLayerRef.current) {
      googleTransitLayerRef.current.setMap(
        showTransit && mapEngine === 'google' ? googleMapInstanceRef.current : null
      );
    }
  }, [showTransit, mapEngine]);

  // Synchronize Google Bicycling Layer state
  useEffect(() => {
    if (googleBicyclingLayerRef.current) {
      googleBicyclingLayerRef.current.setMap(
        showBicycling && mapEngine === 'google' ? googleMapInstanceRef.current : null
      );
    }
  }, [showBicycling, mapEngine]);

  // Initial setup
  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (apiKey) {
      initGoogleMap();
    } else {
      setMapEngine('leaflet');
      initLeafletMap();
    }
  }, [initGoogleMap, initLeafletMap]);

  // Handle center updates smoothly across both engines
  useEffect(() => {
    if (mapEngine === 'google' && googleMapInstanceRef.current && lat !== null && lon !== null) {
      googleMapInstanceRef.current.panTo({ lat, lng: lon });
    } else if (mapEngine === 'leaflet' && leafletMapRef.current && lat !== null && lon !== null) {
      leafletMapRef.current.flyTo([lat, lon], leafletMapRef.current.getZoom(), { duration: 0.8 });
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([lat, lon]);
      }
    }
  }, [lat, lon, mapEngine]);

  // Layer change handler
  const handleLayerChange = (layer: TileLayerType) => {
    setActiveLayer(layer);
    setIsLayerMenuOpen(false);

    if (mapEngine === 'leaflet' && leafletMapRef.current && leafletTileLayerRef.current) {
      leafletMapRef.current.removeLayer(leafletTileLayerRef.current);
      const config = TILE_CONFIGS[layer];
      const newLayer = L.tileLayer(config.url, {
        maxZoom: config.maxZoom,
        subdomains: config.subdomains || 'abc',
      }).addTo(leafletMapRef.current);
      leafletTileLayerRef.current = newLayer;

      updateRoadOverlay(leafletMapRef.current, layer, showRoadOverlay);
    } else if (mapEngine === 'google' && googleMapInstanceRef.current) {
      if (layer === 'hybrid') {
        googleMapInstanceRef.current.setMapTypeId(google.maps.MapTypeId.HYBRID);
      } else {
        googleMapInstanceRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      }
    }
  };

  // Toggle road overlay layer
  const toggleRoadOverlay = () => {
    const nextState = !showRoadOverlay;
    setShowRoadOverlay(nextState);

    if (mapEngine === 'leaflet' && leafletMapRef.current) {
      updateRoadOverlay(leafletMapRef.current, activeLayer, nextState);
    }
  };

  // Precise Reverse Geocoding focused on street roads (Zoom 18)
  useEffect(() => {
    if (lat === null || lon === null) return;
    let cancelled = false;

    async function fetchStreetHierarchy() {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'GeoAtmosphere-3D-StreetRoads/2.0' } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.address) return;

        const roadName =
          data.address.road ||
          data.address.pedestrian ||
          data.address.highway ||
          data.address.footway ||
          data.address.path ||
          data.address.street;

        const district =
          data.address.district ||
          data.address.suburb ||
          data.address.city_district ||
          data.address.neighbourhood ||
          data.address.quarter;

        setHierarchy({
          road: roadName,
          houseNumber: data.address.house_number,
          district: district,
          neighbourhood: data.address.neighbourhood || data.address.suburb,
          city: data.address.city || data.address.town || data.address.village || data.address.municipality,
          state: data.address.state || data.address.region,
          postcode: data.address.postcode,
          country: data.address.country,
        });
      } catch {
        // Fail quietly
      }
    }

    fetchStreetHierarchy();
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  // Quick Zoom to Street Level (17x)
  const handleZoomToStreetLevel = () => {
    if (mapEngine === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(17);
      googleMapInstanceRef.current.panTo({ lat: targetLat, lng: targetLon });
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.flyTo([targetLat, targetLon], 17, { duration: 0.8 });
    }
  };

  // Recenter
  const handleRecenter = () => {
    if (mapEngine === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.panTo({ lat: targetLat, lng: targetLon });
      googleMapInstanceRef.current.setZoom(16);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.flyTo([targetLat, targetLon], 16, { duration: 0.6 });
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([targetLat, targetLon]);
      }
    }
  };

  const handleZoomIn = () => {
    if (mapEngine === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom((googleMapInstanceRef.current.getZoom() ?? 16) + 1);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapEngine === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom((googleMapInstanceRef.current.getZoom() ?? 16) - 1);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  const activeRoadDisplay = hierarchy?.road
    ? `${hierarchy.road}${hierarchy.houseNumber ? ` #${hierarchy.houseNumber}` : ''}`
    : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#060913] select-none flex flex-col">
      {/* Map Viewport (Takes full height or top half when in Split View) */}
      <div
        className={`relative w-full transition-all duration-500 ease-out overflow-hidden ${
          isStreetViewActive && isSplitView ? 'h-1/2' : 'h-full'
        }`}
      >
        {/* 1. Google Maps Mount */}
        <div
          id="google-map-container"
          ref={mapElementRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
            mapEngine === 'google' ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none'
          }`}
        />

        {/* 2. Leaflet High-Precision Interactive Map Mount */}
        <div
          id="leaflet-map-container"
          ref={leafletContainerRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-300 cursor-crosshair ${
            mapEngine === 'leaflet' ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none'
          }`}
        />

        {/* 3. Floating Street Roads HUD Banner & Telemetry Card */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2 max-w-sm w-[90%]">
          {/* Dedicated Street Road Identifier Pill */}
          <div className="w-full flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full bg-[#0c1322]/95 border border-sky-400/40 shadow-xl backdrop-blur-2xl text-xs">
            <div className="flex items-center gap-2 truncate">
              <Route className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />
              <span className="font-semibold text-sky-200 truncate">
                {activeRoadDisplay || 'Scanning Street Road...'}
              </span>
            </div>

            <button
              onClick={handleZoomToStreetLevel}
              title="Zoom directly into street level road network (17x)"
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/25 hover:bg-sky-500/40 border border-sky-400/40 text-sky-300 text-[11px] font-medium transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              <Navigation className="w-3 h-3" />
              <span>Street Zoom</span>
            </button>
          </div>

          {/* Live Surface Weather & Road Environment Telemetry */}
          <div
            className="w-full weather-gpt-glass px-4 py-3 text-white shadow-2xl transition-all duration-300 border border-sky-400/35 bg-[#090e1a]/95 backdrop-blur-2xl rounded-2xl"
            style={{
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.85), 0 0 24px rgba(56, 189, 248, 0.25)',
            }}
          >
            {/* Location Details: Street, District, City */}
            <div className="border-b border-white/[0.08] pb-2 mb-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-xs font-semibold text-white truncate">
                    {hierarchy?.road || hierarchy?.district || hierarchy?.city || cityName || 'Target Location'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-sky-400 shrink-0">
                  {targetLat.toFixed(4)}°, {targetLon.toFixed(4)}°
                </span>
              </div>

              {/* District & City Breadcrumb */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                {hierarchy?.district && (
                  <span className="flex items-center gap-1 text-amber-300">
                    <Building2 className="w-3 h-3 text-amber-400" />
                    <span className="truncate">{hierarchy.district}</span>
                  </span>
                )}
                {hierarchy?.city && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 truncate">{hierarchy.city}</span>
                  </>
                )}
                {hierarchy?.country && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{hierarchy.country}</span>
                  </>
                )}
              </div>
            </div>

            {/* Temperature & Weather */}
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <div className="text-2xl font-light tracking-tight text-white font-['Plus_Jakarta_Sans']">
                {weather ? `${weather.temp.toFixed(1)}°C` : '--.-°'}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/20 font-light">
                {weather?.weather_main || 'Live Surface Weather'}
              </span>
            </div>

            {/* Primary Metrics: Humidity, Wind, US EPA AQI */}
            <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-300">
              <div className="flex items-center gap-1 p-1.5 rounded-lg bg-white/[0.04]">
                <Droplets className="w-3 h-3 text-sky-400 shrink-0" />
                <span>{weather ? `${weather.humidity}%` : '--'}</span>
              </div>
              <div className="flex items-center gap-1 p-1.5 rounded-lg bg-white/[0.04]">
                <Wind className="w-3 h-3 text-teal-400 shrink-0" />
                <span>{weather ? `${weather.wind_speed.toFixed(0)}km/h` : '--'}</span>
              </div>
              <div
                className="flex items-center gap-1 p-1.5 rounded-lg font-medium"
                style={{
                  backgroundColor: aqi ? `${aqi.color}20` : 'rgba(255,255,255,0.04)',
                  color: aqi ? aqi.color : '#38bdf8',
                }}
              >
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>AQI {aqi?.usAqi ?? aqi?.aqi ?? '--'}</span>
              </div>
            </div>

            {/* Roadside Traffic & Health Advisory Callout */}
            {aqi && (
              <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1" style={{ color: aqi.color }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: aqi.color }} />
                    <span className="font-semibold">{aqi.label}</span>
                  </div>
                  {aqi.dominantPollutant && (
                    <span className="text-[9px] font-mono text-slate-400">
                      Main: {aqi.dominantPollutant}
                    </span>
                  )}
                </div>

                {/* Roadside Traffic Impact */}
                {aqi.roadsideTrafficImpact && (
                  <div className="flex items-start gap-1 text-[10px] text-slate-300">
                    <Car className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                    <span className="leading-tight text-slate-400 truncate">{aqi.roadsideTrafficImpact}</span>
                  </div>
                )}

                {/* Toggle 7-Pollutant Matrix */}
                <button
                  onClick={() => setShowAqiMatrix(!showAqiMatrix)}
                  className="w-full flex items-center justify-between pt-1 text-[10px] text-sky-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-sky-400" />
                    <span>{showAqiMatrix ? 'Hide Pollutant Matrix' : 'Every Location Pollutant Matrix'}</span>
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAqiMatrix ? 'rotate-180' : ''}`} />
                </button>

                {/* Expandable Pollutants Grid */}
                {showAqiMatrix && (
                  <div className="grid grid-cols-4 gap-1 pt-1.5 text-center text-[9px]">
                    <div className="p-1 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-slate-400 font-mono block">PM₂.₅</span>
                      <span className="text-slate-100 font-semibold">{aqi.pm2_5?.toFixed(1) ?? '--'}</span>
                    </div>
                    <div className="p-1 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-slate-400 font-mono block">PM₁₀</span>
                      <span className="text-slate-100 font-semibold">{aqi.pm10?.toFixed(1) ?? '--'}</span>
                    </div>
                    <div className="p-1 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-slate-400 font-mono block">NO₂</span>
                      <span className="text-slate-100 font-semibold">{aqi.no2?.toFixed(1) ?? '--'}</span>
                    </div>
                    <div className="p-1 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-slate-400 font-mono block">O₃</span>
                      <span className="text-slate-100 font-semibold">{aqi.o3?.toFixed(1) ?? '--'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Top Floating Bar: Return to Orbit + Street View + Traffic + Layers */}
        <div className="absolute top-5 left-4 sm:left-6 z-30 flex flex-wrap items-center gap-2 pointer-events-none">
          <button
            id="btn-return-to-orbit"
            onClick={onReturnToOrbit}
            title="Return to 3D Orbital Earth View"
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full weather-gpt-pill text-white/95 hover:text-white hover:bg-white/10 text-xs font-medium tracking-wide transition-all shadow-xl active:scale-95 cursor-pointer border border-sky-400/35 bg-[#0c121e]/90 backdrop-blur-xl"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Return to Orbit</span>
          </button>

          {/* Street View 360° Ground Level Immersion Toggle */}
          <button
            id="btn-top-street-view"
            onClick={() => handleToggleStreetView(!isStreetViewActive)}
            title="Open Google Street View 360° Ground Level Panorama"
            className={`pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full weather-gpt-pill text-xs font-semibold transition-all shadow-xl active:scale-95 cursor-pointer border backdrop-blur-xl ${
              isStreetViewActive
                ? 'border-amber-400 bg-amber-500/25 text-amber-200 shadow-amber-500/30 ring-2 ring-amber-400/40'
                : 'border-amber-400/50 bg-[#0c121e]/90 text-amber-300 hover:text-white hover:bg-amber-500/20'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Street View 360°</span>
          </button>

          {/* Live Google Traffic Layer Toggle */}
          <button
            id="btn-top-traffic-layer"
            onClick={() => setShowTraffic(!showTraffic)}
            title="Toggle Real-Time Google Traffic Layer & Highway Flow"
            className={`pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full weather-gpt-pill text-xs font-medium transition-all shadow-lg active:scale-95 cursor-pointer border backdrop-blur-xl ${
              showTraffic
                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-emerald-500/20 ring-1 ring-emerald-400/30'
                : 'border-white/15 bg-[#0c121e]/90 text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-emerald-400" />
            <span>Traffic: {showTraffic ? 'ON' : 'OFF'}</span>
          </button>

          {/* Street Road Layer Selector */}
          <div className="relative pointer-events-auto">
            <button
              onClick={() => setIsLayerMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full weather-gpt-pill text-xs font-medium transition-all shadow-lg active:scale-95 cursor-pointer border border-sky-400/30 bg-[#0c121e]/90 backdrop-blur-xl text-sky-200 hover:text-white"
              title="Switch Road & Map Styles"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-medium">{TILE_CONFIGS[activeLayer].name}</span>
            </button>

            {isLayerMenuOpen && (
              <div className="absolute top-full mt-2 left-0 w-72 rounded-2xl bg-[#0b101c]/95 backdrop-blur-2xl border border-sky-400/35 shadow-2xl p-2.5 z-40 flex flex-col gap-1.5">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
                  Road & Map Styles
                </div>

                {(Object.keys(TILE_CONFIGS) as TileLayerType[]).map((layerKey) => {
                  const config = TILE_CONFIGS[layerKey];
                  const isActive = activeLayer === layerKey;
                  return (
                    <button
                      key={layerKey}
                      onClick={() => handleLayerChange(layerKey)}
                      className={`flex flex-col text-left w-full px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{config.name}</span>
                        {isActive && <Check className="w-3.5 h-3.5 text-sky-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {config.description}
                      </span>
                    </button>
                  );
                })}

                {/* Additional Google Overlays (Transit, Bike) */}
                <div className="mt-1 pt-2 border-t border-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Live Network Layers
                </div>

                <button
                  onClick={() => setShowTransit(!showTransit)}
                  className={`flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                    showTransit
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5 text-sky-400" />
                    <span>Public Transit Routes</span>
                  </span>
                  {showTransit && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>

                <button
                  onClick={() => setShowBicycling(!showBicycling)}
                  className={`flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                    showBicycling
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Bicycle Trails & Lanes</span>
                  </span>
                  {showBicycling && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Quick Road Overlay Toggle */}
          <button
            onClick={toggleRoadOverlay}
            title="Toggle High-Precision Street Road Vector Overlay"
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full weather-gpt-pill text-xs font-medium transition-all shadow-lg active:scale-95 cursor-pointer border backdrop-blur-xl ${
              showRoadOverlay
                ? 'border-sky-400/50 bg-sky-500/20 text-sky-200 shadow-sky-500/20'
                : 'border-white/15 bg-[#0c121e]/90 text-slate-400 hover:text-white'
            }`}
          >
            <Route className="w-3.5 h-3.5 text-sky-400" />
            <span>Roads: {showRoadOverlay ? 'ON' : 'OFF'}</span>
          </button>

          {/* Engine Switcher (Leaflet Precision vs Google Maps) */}
          <button
            onClick={() => setIsRestrictionsModalOpen(true)}
            title="Manage Google Maps API Key & Restrictions"
            className="pointer-events-auto hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-full weather-gpt-pill text-xs font-light tracking-wide transition-all shadow-lg active:scale-95 cursor-pointer border border-sky-400/25 bg-[#0c121e]/90 backdrop-blur-xl text-sky-300 hover:text-white"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            <span>{mapEngine === 'google' ? 'Google Maps Active' : 'Precision Engine'}</span>
          </button>
        </div>

        {/* 5. Navigation & Zoom Controls at Bottom Right */}
        <div className="absolute bottom-8 right-6 z-30 flex flex-col gap-2 pointer-events-auto">
          {/* Jump to 360 Street View */}
          <button
            onClick={() => handleToggleStreetView(!isStreetViewActive)}
            title="Launch 360° Street Level Ground View"
            className={`p-2.5 rounded-xl weather-gpt-pill transition-all shadow-lg active:scale-95 cursor-pointer backdrop-blur-xl flex items-center justify-center border ${
              isStreetViewActive
                ? 'bg-amber-500/40 text-white border-amber-300 shadow-amber-500/40'
                : 'bg-[#0c121e]/95 text-amber-300 hover:text-white hover:bg-amber-500/25 border-amber-400/40'
            }`}
          >
            <Eye className="w-4 h-4 text-amber-400 animate-pulse" />
          </button>

          <button
            onClick={handleZoomToStreetLevel}
            title="Zoom to Street Level (17x)"
            className="px-3 py-2 rounded-xl weather-gpt-pill text-sky-300 hover:text-white hover:bg-sky-500/20 transition-all shadow-lg active:scale-95 cursor-pointer bg-[#0c121e]/95 backdrop-blur-xl border border-sky-400/30 flex items-center gap-1.5 text-xs font-semibold"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <span>17x</span>
          </button>

          <button
            onClick={handleRecenter}
            title="Recenter to Target Pin"
            className="p-2.5 rounded-xl weather-gpt-pill text-white/80 hover:text-sky-400 hover:bg-white/10 transition-all shadow-lg active:scale-95 cursor-pointer bg-[#0c121e]/90 backdrop-blur-xl border border-white/10"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2.5 rounded-xl weather-gpt-pill text-white/80 hover:text-white hover:bg-white/10 transition-all shadow-lg active:scale-95 cursor-pointer bg-[#0c121e]/90 backdrop-blur-xl border border-white/10"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2.5 rounded-xl weather-gpt-pill text-white/80 hover:text-white hover:bg-white/10 transition-all shadow-lg active:scale-95 cursor-pointer bg-[#0c121e]/90 backdrop-blur-xl border border-white/10"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* 6. Real-Time Telemetry & Street Road Status Bar */}
        <div className="absolute bottom-6 left-6 z-30 flex flex-wrap items-center gap-2.5 px-4 py-2 rounded-full weather-gpt-pill text-[11px] text-white/90 font-mono bg-[#0c121e]/95 backdrop-blur-xl border border-sky-400/30 pointer-events-auto shadow-lg">
          <span className="flex items-center gap-1.5 text-sky-300 font-sans font-medium">
            <Route className="w-3.5 h-3.5 text-sky-400" />
            <span>{activeRoadDisplay || 'Active Street Network'}</span>
          </span>
          <span className="text-white/20">|</span>
          <span className="text-cyan-400">LAT: {targetLat.toFixed(4)}°</span>
          <span className="text-white/20">|</span>
          <span className="text-cyan-400">LON: {targetLon.toFixed(4)}°</span>
          <span className="text-white/20">|</span>
          <span className="text-slate-300">ZOOM: {currentZoom}x</span>
          {showTraffic && (
            <>
              <span className="text-white/20">|</span>
              <span className="text-emerald-400 font-sans text-[10px] flex items-center gap-1">
                <Car className="w-3 h-3 text-emerald-400" />
                <span>LIVE TRAFFIC ACTIVE</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* 7. Google Street View 360° Ground-Level Panorama Viewport */}
      <StreetViewPanoramaView
        lat={targetLat}
        lon={targetLon}
        streetName={hierarchy?.road}
        district={hierarchy?.district}
        cityName={hierarchy?.city || cityName}
        weather={weather}
        aqi={aqi}
        isOpen={isStreetViewActive}
        onClose={() => handleToggleStreetView(false)}
        onLocationChanged={(newLat, newLon) => {
          onLocationSelectedRef.current(newLat, newLon);
        }}
        isSplitView={isSplitView}
        onToggleSplitView={() => {
          setIsSplitView((prev) => {
            const next = !prev;
            setTimeout(() => {
              if (leafletMapRef.current) {
                leafletMapRef.current.invalidateSize();
              }
              if (googleMapInstanceRef.current && window.google?.maps) {
                window.google.maps.event.trigger(googleMapInstanceRef.current, 'resize');
              }
            }, 350);
            return next;
          });
        }}
      />

      {/* 8. Key Restrictions Modal */}
      <KeyRestrictionsModal
        isOpen={isRestrictionsModalOpen}
        onClose={() => setIsRestrictionsModalOpen(false)}
        onKeyUpdated={() => {
          initGoogleMap();
        }}
      />
    </div>
  );
};
