/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Source: Google Maps Platform Code Assist
// Attribution ID: gmp_mcp_codeassist_v1_aistudio

import React, { useState, useRef, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import { ThreeGlobe, type GlobeHandle } from './components/ThreeGlobe';
import { GoogleMapView } from './components/GoogleMapView';
import { GodsEye3DView } from './components/GodsEye3DView';
import { SpatialCopilotBar } from './components/SpatialCopilotBar';
import { WeatherGptCard } from './components/WeatherGptCard';
import { FloatingNavbar } from './components/FloatingNavbar';
import { IntelligenceDock } from './components/IntelligenceDock';
import {
  fetchWeatherData,
  fetchAqiData,
  getCurrentCoordinates,
  getParticleTypeFromWeather,
} from './services/weatherService';
import {
  fetchUSGSEarthquakes,
  fetchNASAFIRMSActiveFires,
  fetchLiveFlights,
} from './services/intelligenceService';
import type {
  WeatherData,
  AqiData,
  CitySearchResult,
  WeatherParticleType,
  FireHotspot,
  EarthquakeData,
  LiveFlight,
  IntelligenceLayerType,
  ViewModeType,
  SpatialCopilotAction,
} from './types';
import { RotateCcw } from 'lucide-react';

export default function App() {
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [cityName, setCityName] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [aqi, setAqi] = useState<AqiData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isCardOpen, setIsCardOpen] = useState<boolean>(false);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [particleType, setParticleType] = useState<WeatherParticleType>('clear');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isGoogleMapView, setIsGoogleMapView] = useState<boolean>(false);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewModeType>('globe');

  // Spatial Intelligence Feeds State
  const [fires, setFires] = useState<FireHotspot[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeData[]>([]);
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [activeLayers, setActiveLayers] = useState<Record<IntelligenceLayerType, boolean>>({
    fires: true,
    earthquakes: true,
    flights: true,
  });
  const [selectedIntelId, setSelectedIntelId] = useState<string | null>(null);

  const globeRef = useRef<GlobeHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const googleMapLayerRef = useRef<HTMLDivElement>(null);

  // Load Real-Time Spatial Intelligence Feeds
  useEffect(() => {
    let mounted = true;
    const loadIntel = async () => {
      try {
        const [quakesData, firesData, flightsData] = await Promise.all([
          fetchUSGSEarthquakes(2.5),
          fetchNASAFIRMSActiveFires(),
          fetchLiveFlights(),
        ]);
        if (mounted) {
          setEarthquakes(quakesData);
          setFires(firesData);
          setFlights(flightsData);
        }
      } catch (err) {
        console.warn('[App] Intel feeds load error:', err);
      }
    };
    loadIntel();
    const interval = setInterval(loadIntel, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleToggleLayer = useCallback((layer: IntelligenceLayerType) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  /**
   * Smooth GSAP Hand-off: Crossfades from 3D Three.js canvas to 2D Google Map
   */
  const crossfadeToGoogleMaps = useCallback((lat: number, lon: number) => {
    setIsGoogleMapView(true);

    if (canvasContainerRef.current && googleMapLayerRef.current) {
      gsap.killTweensOf(canvasContainerRef.current);
      gsap.killTweensOf(googleMapLayerRef.current);

      // Fade Three.js canvas opacity to 0 and set pointer-events: none
      gsap.to(canvasContainerRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          if (canvasContainerRef.current) {
            canvasContainerRef.current.style.pointerEvents = 'none';
          }
        },
      });

      // Render Google Map at exact clicked coordinates with zoom level 14
      googleMapLayerRef.current.style.pointerEvents = 'auto';
      gsap.to(googleMapLayerRef.current, {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
      });
    }
  }, []);

  /**
   * Seamless Reset (Back to Orbit):
   * Reverse sequence: fade out Google Map, fade in Three.js canvas,
   * and animate the 3D camera pulling back out to full Earth orbital view.
   */
  const handleReturnToOrbit = useCallback(() => {
    setViewMode('globe');
    setIsGoogleMapView(false);
    setIsStreetViewOpen(false);

    if (canvasContainerRef.current && googleMapLayerRef.current) {
      gsap.killTweensOf(canvasContainerRef.current);
      gsap.killTweensOf(googleMapLayerRef.current);

      // Fade out Google Map
      gsap.to(googleMapLayerRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          if (googleMapLayerRef.current) {
            googleMapLayerRef.current.style.pointerEvents = 'none';
          }
        },
      });

      // Fade in Three.js canvas and restore pointer-events
      canvasContainerRef.current.style.pointerEvents = 'auto';
      gsap.to(canvasContainerRef.current, {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.inOut',
      });
    }

    // Animate 3D camera pulling back out to full Earth view
    if (globeRef.current) {
      globeRef.current.resetView();
    }
  }, []);

  const handleSelectViewMode = useCallback(
    (mode: ViewModeType) => {
      setViewMode(mode);
      if (mode === 'godseye3d') {
        setIsGoogleMapView(false);
        setIsStreetViewOpen(false);
      } else if (mode === 'roadmap') {
        if (currentLat !== null && currentLon !== null) {
          crossfadeToGoogleMaps(currentLat, currentLon);
        } else {
          crossfadeToGoogleMaps(37.7749, -122.4194);
        }
        setIsStreetViewOpen(false);
      } else if (mode === 'streetview') {
        if (currentLat !== null && currentLon !== null) {
          crossfadeToGoogleMaps(currentLat, currentLon);
        } else {
          crossfadeToGoogleMaps(37.7749, -122.4194);
        }
        setIsStreetViewOpen(true);
      } else {
        handleReturnToOrbit();
      }
    },
    [currentLat, currentLon, crossfadeToGoogleMaps, handleReturnToOrbit]
  );

  /**
   * Directly launches Street View 360° Ground Level Panorama
   */
  const handleOpenStreetView = useCallback(() => {
    if (currentLat !== null && currentLon !== null) {
      if (!isGoogleMapView) {
        crossfadeToGoogleMaps(currentLat, currentLon);
      }
      setIsStreetViewOpen(true);
    }
  }, [currentLat, currentLon, isGoogleMapView, crossfadeToGoogleMaps]);

  /**
   * Fetches weather, AQI, and deep reverse geocoded hierarchy for specified coordinates,
   * animates camera, and displays the Weather GPT glassmorphic card.
   */
  const loadLocationData = useCallback(
    async (lat: number, lon: number, name?: string, triggerFlyAnimation = false) => {
      setLoading(true);
      setCurrentLat(lat);
      setCurrentLon(lon);
      setIsCardOpen(true);

      if (triggerFlyAnimation && globeRef.current && !isGoogleMapView) {
        // Smooth camera flight into coordinates on 3D globe
        globeRef.current.zoomToLocation(lat, lon, 6.2);
      }

      try {
        const [weatherResult, aqiResult] = await Promise.all([
          fetchWeatherData(lat, lon, name),
          fetchAqiData(lat, lon),
        ]);

        setWeather(weatherResult);
        setAqi(aqiResult);
        setCityName(weatherResult.city);

        // Derive dynamic 3D weather particles from condition
        const matchedParticles = getParticleTypeFromWeather(weatherResult.weather_main);
        setParticleType(matchedParticles);
      } catch (err) {
        console.error('[App] Failed to load telemetry data:', err);
      } finally {
        setLoading(false);
      }
    },
    [crossfadeToGoogleMaps, isGoogleMapView]
  );

  /**
   * Executes AI Spatial Copilot actions from natural language
   */
  const handleExecuteCopilotAction = useCallback(
    (action: SpatialCopilotAction) => {
      // 1. Toggle requested layer
      if (action.layerToggle) {
        setActiveLayers((prev) => ({
          ...prev,
          [action.layerToggle!.layer]: action.layerToggle!.enabled,
        }));
      }

      // 2. Set view mode if specified
      if (action.mode) {
        handleSelectViewMode(action.mode);
      }

      // 3. Navigate / fly to target location
      if (action.targetLocation) {
        const { lat, lon, name, zoom } = action.targetLocation;
        loadLocationData(lat, lon, name, true);
        if (viewMode === 'globe' || !action.mode || action.mode === 'globe') {
          globeRef.current?.zoomToLocation(lat, lon, zoom ? Math.min(8.0, zoom / 2) : 6.2);
        }
      }
    },
    [handleSelectViewMode, loadLocationData, viewMode]
  );

  /**
   * Distance Threshold Hand-off: Triggered when 3D camera crosses the near-surface distance threshold
   */
  const handleZoomThresholdCrossed = useCallback(
    (lat: number, lon: number) => {
      crossfadeToGoogleMaps(lat, lon);
    },
    [crossfadeToGoogleMaps]
  );

  /**
   * Directly clicking on any point of the 3D Earth sphere (Raycasting)
   */
  const handleGlobeClick = useCallback(
    (lat: number, lon: number) => {
      loadLocationData(lat, lon, undefined, false);
    },
    [loadLocationData]
  );

  /**
   * Clicking anywhere on the Google Map to inspect a new street/district
   */
  const handleGoogleMapLocationSelected = useCallback(
    (lat: number, lon: number) => {
      loadLocationData(lat, lon, undefined, false);
    },
    [loadLocationData]
  );

  /**
   * Live GPS detection: zooms globe and fetches current atmospheric telemetry
   */
  const handleDetectGps = useCallback(async () => {
    setIsDetectingGps(true);
    try {
      const coords = await getCurrentCoordinates();
      await loadLocationData(coords.lat, coords.lon, 'Your Location', true);
    } catch (err) {
      console.warn('[App] Geolocation error:', err);
    } finally {
      setIsDetectingGps(false);
    }
  }, [loadLocationData]);

  /**
   * Selecting a city from search bar or quick chips
   */
  const handleSelectCity = useCallback(
    (city: CitySearchResult) => {
      loadLocationData(city.lat, city.lon, city.name, true);
    },
    [loadLocationData]
  );

  /**
   * Selecting a live spatial intelligence event (Fire, Earthquake, Flight)
   */
  const handleSelectIntelEvent = useCallback(
    (lat: number, lon: number, title: string, category: IntelligenceLayerType) => {
      setSelectedIntelId(`${category}-${lat}-${lon}`);
      loadLocationData(lat, lon, title, true);
    },
    [loadLocationData]
  );

  /**
   * Close the Weather GPT Card
   */
  const handleCloseCard = useCallback(() => {
    setIsCardOpen(false);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020408]">
      {/* 1. Google Maps Integration & Layering:
          Full-screen #google-map-container positioned absolutely behind Three.js #canvas-container */}
      <div
        id="google-map-layer"
        ref={googleMapLayerRef}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        style={{ opacity: 0 }}
      >
        <GoogleMapView
          lat={currentLat}
          lon={currentLon}
          weather={weather}
          aqi={aqi}
          cityName={cityName}
          onLocationSelected={handleGoogleMapLocationSelected}
          onReturnToOrbit={handleReturnToOrbit}
          isVisible={isGoogleMapView}
          isStreetViewOpen={isStreetViewOpen}
          onToggleStreetView={setIsStreetViewOpen}
        />
      </div>

      {/* 2. Central Hero 3D Earth Globe Canvas (Positioned on top with z-10 for raycasting and orbiting) */}
      <div
        id="canvas-container"
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full z-10 pointer-events-auto"
        style={{ opacity: 1 }}
      >
        <ThreeGlobe
          ref={globeRef}
          currentLat={currentLat}
          currentLon={currentLon}
          particleType={particleType}
          onLocationSelected={handleGlobeClick}
          onZoomThresholdCrossed={handleZoomThresholdCrossed}
          autoRotateGlobe={autoRotate}
          onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
          onOpenStreetMap={() => {
            if (currentLat !== null && currentLon !== null) {
              crossfadeToGoogleMaps(currentLat, currentLon);
            }
          }}
          fires={fires}
          earthquakes={earthquakes}
          flights={flights}
          activeLayers={activeLayers}
          onSelectIntelEvent={handleSelectIntelEvent}
        />
      </div>

      {/* 2b. Spatial Intelligence Overlay Dock (NASA FIRMS, USGS Earthquakes, OpenSky Flights) */}
      {!isGoogleMapView && viewMode !== 'godseye3d' && (
        <IntelligenceDock
          fires={fires}
          earthquakes={earthquakes}
          flights={flights}
          activeLayers={activeLayers}
          onToggleLayer={handleToggleLayer}
          onSelectEvent={handleSelectIntelEvent}
          selectedEventId={selectedIntelId}
        />
      )}

      {/* 2c. God's Eye 3D Photorealistic Tiles View (CesiumJS 3D Buildings & Roads) */}
      {viewMode === 'godseye3d' && (
        <div className="absolute inset-0 w-full h-full z-15 pointer-events-auto">
          <GodsEye3DView
            lat={currentLat || 37.7915}
            lon={currentLon || -122.3995}
            locationName={cityName || '3D Urban Sector'}
            onReturnToGlobe={handleReturnToOrbit}
            onOpenRoadMap={() => handleSelectViewMode('roadmap')}
          />
        </div>
      )}

      {/* 3. Floating Minimalist "Return to Orbit" Pill Button (Visible when in Street Map view) */}
      {isGoogleMapView && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 animate-fade-in pointer-events-auto">
          <button
            id="btn-floating-return-to-orbit"
            onClick={handleReturnToOrbit}
            title="Return to 3D Planetary Orbit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full weather-gpt-pill text-white/95 hover:text-white hover:bg-white/10 text-xs font-medium tracking-wide transition-all shadow-2xl active:scale-95 cursor-pointer border border-sky-400/40 bg-[#0c121e]/85 backdrop-blur-2xl"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
            <span>Return to Orbit</span>
          </button>
        </div>
      )}

      {/* 4. Floating Minimalist Navigation Island */}
      <FloatingNavbar
        onSelectCity={handleSelectCity}
        onDetectGps={handleDetectGps}
        isDetectingGps={isDetectingGps}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
        onResetView={handleReturnToOrbit}
        currentCityName={cityName}
        isStreetMapOpen={isGoogleMapView}
        onToggleStreetMap={() => {
          if (isGoogleMapView) {
            handleReturnToOrbit();
          } else if (currentLat !== null && currentLon !== null) {
            crossfadeToGoogleMaps(currentLat, currentLon);
          }
        }}
        hasLocationSelected={currentLat !== null && currentLon !== null}
        viewMode={viewMode}
        onSelectViewMode={handleSelectViewMode}
      />

      {/* 5. Weather GPT Floating Minimalist Glass Card */}
      <WeatherGptCard
        weather={weather}
        aqi={aqi}
        loading={loading}
        isOpen={isCardOpen}
        onClose={handleCloseCard}
        particleType={particleType}
        onChangeParticleType={setParticleType}
        onOpenStreetMap={() => {
          if (currentLat !== null && currentLon !== null) {
            crossfadeToGoogleMaps(currentLat, currentLon);
          }
        }}
        onOpenStreetView={handleOpenStreetView}
        onResetView={handleReturnToOrbit}
        isStreetMapOpen={isGoogleMapView}
      />

      {/* 6. Gemini AI Spatial Intelligence Copilot Bar */}
      <SpatialCopilotBar
        currentLat={currentLat}
        currentLon={currentLon}
        currentLocationName={cityName}
        currentMode={viewMode}
        onExecuteAction={handleExecuteCopilotAction}
      />
    </main>
  );
}
