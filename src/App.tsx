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
import { IntelDetailModal, type SelectedIntelEntity } from './components/IntelDetailModal';
import { CitizenEmissionReportModal } from './components/CitizenEmissionReportModal';
import { EconomicCorridorFastHubModal } from './components/EconomicCorridorFastHubModal';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import { getStoredCitizenReports, fetchServerDbReports } from './services/corridorAndEmissionService';
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
  CitizenEmissionReport,
  MeshIntelMode,
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

  // Citizen Reporting & Economic Corridor Hub State
  const [citizenReports, setCitizenReports] = useState<CitizenEmissionReport[]>(() =>
    getStoredCitizenReports()
  );
  const [isCitizenReportOpen, setIsCitizenReportOpen] = useState<boolean>(false);
  const [isCorridorHubOpen, setIsCorridorHubOpen] = useState<boolean>(false);
  const [isGeminiAssistantOpen, setIsGeminiAssistantOpen] = useState<boolean>(false);

  // Spatial Intelligence Feeds State
  const [fires, setFires] = useState<FireHotspot[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeData[]>([]);
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [activeLayers, setActiveLayers] = useState<Record<IntelligenceLayerType, boolean>>({
    fires: true,
    earthquakes: true,
    flights: false,
  });
  const [selectedIntelId, setSelectedIntelId] = useState<string | null>(null);
  const [selectedIntelEntity, setSelectedIntelEntity] = useState<SelectedIntelEntity | null>(null);
  const [meshIntelMode, setMeshIntelMode] = useState<MeshIntelMode>('fires');

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
    fetchServerDbReports().then((data) => {
      if (mounted && Array.isArray(data) && data.length > 0) {
        setCitizenReports(data);
      }
    });
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
   * Seamless Reset (Back to Orbit):
   * Reverse sequence: fade out Google Map, fade in Three.js canvas,
   * and animate the 3D camera pulling back out to full Earth orbital view.
   */
  const handleReturnToOrbit = useCallback(() => {
    setViewMode('globe');
    setIsGoogleMapView(false);
    setIsStreetViewOpen(false);

    if (canvasContainerRef.current) {
      canvasContainerRef.current.style.visibility = 'visible';
      canvasContainerRef.current.style.pointerEvents = 'auto';
      gsap.killTweensOf(canvasContainerRef.current);
      gsap.to(canvasContainerRef.current, {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.inOut',
      });
    }

    if (googleMapLayerRef.current) {
      gsap.killTweensOf(googleMapLayerRef.current);
      gsap.to(googleMapLayerRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          if (googleMapLayerRef.current) {
            googleMapLayerRef.current.style.pointerEvents = 'none';
            googleMapLayerRef.current.style.visibility = 'hidden';
          }
        },
      });
    }

    // Animate 3D camera pulling back out to full Earth view
    if (globeRef.current) {
      globeRef.current.resetView();
    }
  }, []);

  /**
   * Fetches weather, AQI, and deep reverse geocoded hierarchy for specified coordinates,
   * animates camera, and displays the Weather GPT glassmorphic card.
   */
  const loadLocationData = useCallback(
    async (lat: number, lon: number, name?: string, triggerFlyAnimation = false, openCard = true) => {
      setLoading(true);
      setCurrentLat(lat);
      setCurrentLon(lon);
      if (openCard && viewMode !== 'godseye3d') {
        setIsCardOpen(true);
      }

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
    [viewMode, isGoogleMapView]
  );

  /**
   * Smooth GSAP Hand-off: Crossfades from 3D Three.js canvas to 2D Google Map
   * Sets exact coordinates where user zoomed in, loads location telemetry silently,
   * and prevents black-screen flashes during transition.
   */
  const crossfadeToGoogleMaps = useCallback(
    (lat: number, lon: number) => {
      setCurrentLat(lat);
      setCurrentLon(lon);
      setIsGoogleMapView(true);
      setViewMode('roadmap');

      if (canvasContainerRef.current && googleMapLayerRef.current) {
        gsap.killTweensOf(canvasContainerRef.current);
        gsap.killTweensOf(googleMapLayerRef.current);

        canvasContainerRef.current.style.pointerEvents = 'none';
        gsap.to(canvasContainerRef.current, {
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            if (canvasContainerRef.current) {
              canvasContainerRef.current.style.visibility = 'hidden';
            }
          },
        });

        googleMapLayerRef.current.style.visibility = 'visible';
        googleMapLayerRef.current.style.pointerEvents = 'auto';
        gsap.to(googleMapLayerRef.current, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        });
      }

      // Fetch location details without popping up the obstructive card
      loadLocationData(lat, lon, undefined, false, false);
    },
    [loadLocationData]
  );

  const handleSelectViewMode = useCallback(
    (mode: ViewModeType) => {
      setViewMode(mode);
      if (mode === 'godseye3d') {
        setIsCardOpen(false);
        setIsGoogleMapView(false);
        setIsStreetViewOpen(false);
        if (canvasContainerRef.current) {
          canvasContainerRef.current.style.opacity = '0';
          canvasContainerRef.current.style.visibility = 'hidden';
          canvasContainerRef.current.style.pointerEvents = 'none';
        }
        if (googleMapLayerRef.current) {
          googleMapLayerRef.current.style.opacity = '0';
          googleMapLayerRef.current.style.pointerEvents = 'none';
        }
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
   * Dedicated location update for 3D View (does NOT trigger Weather Card)
   */
  const handle3DLocationSelected = useCallback((newLat: number, newLon: number, newName: string) => {
    setCurrentLat((prev) => (prev === newLat ? prev : newLat));
    setCurrentLon((prev) => (prev === newLon ? prev : newLon));
    setCityName((prev) => (prev === newName ? prev : newName));
  }, []);

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

      if (category === 'earthquakes') {
        const matched =
          earthquakes.find(
            (e) => Math.abs(e.lat - lat) < 0.15 && Math.abs(e.lon - lon) < 0.15
          ) || earthquakes[0];
        if (matched && viewMode !== 'godseye3d') {
          setSelectedIntelEntity({ type: 'earthquakes', earthquake: matched });
        }
      } else if (category === 'fires') {
        setMeshIntelMode('fires');
        const matched =
          fires.find(
            (f) => Math.abs(f.lat - lat) < 0.15 && Math.abs(f.lon - lon) < 0.15
          ) || fires[0];
        if (matched && viewMode !== 'godseye3d') {
          setSelectedIntelEntity({ type: 'fires', fire: matched });
        }
      } else if (category === 'flights') {
        setMeshIntelMode('flights');
        const matched =
          flights.find(
            (fl) => Math.abs(fl.lat - lat) < 0.5 && Math.abs(fl.lon - lon) < 0.5
          ) || flights[0];
        if (matched && viewMode !== 'godseye3d') {
          setSelectedIntelEntity({ type: 'flights', flight: matched });
        }
      }
    },
    [earthquakes, fires, flights, loadLocationData, viewMode]
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
          Full-screen #google-map-layer dynamically promoted to z-10 when active */}
      <div
        id="google-map-layer"
        ref={googleMapLayerRef}
        className={`absolute inset-0 w-full h-full ${
          isGoogleMapView ? 'z-10 pointer-events-auto' : 'z-0 pointer-events-none'
        }`}
        style={{
          opacity: isGoogleMapView ? 1 : 0,
          visibility: isGoogleMapView ? 'visible' : 'hidden',
        }}
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

      {/* 2. Central Hero 3D Earth Globe Canvas (Positioned on top with z-10 only when in 3D orbit) */}
      <div
        id="canvas-container"
        ref={canvasContainerRef}
        className={`absolute inset-0 w-full h-full ${
          !isGoogleMapView && viewMode === 'globe'
            ? 'z-10 pointer-events-auto'
            : 'z-0 pointer-events-none'
        }`}
        style={{
          opacity: !isGoogleMapView && viewMode === 'globe' ? 1 : 0,
          visibility: !isGoogleMapView && viewMode === 'globe' ? 'visible' : 'hidden',
        }}
      >
        <ThreeGlobe
          ref={globeRef}
          currentLat={currentLat}
          currentLon={currentLon}
          particleType={particleType}
          onLocationSelected={handleGlobeClick}
          onZoomThresholdCrossed={handleZoomThresholdCrossed}
          autoRotateGlobe={autoRotate}
          isMapViewActive={isGoogleMapView || viewMode !== 'globe'}
          onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
          onOpenStreetMap={() => {
            const targetLat = currentLat ?? 37.7749;
            const targetLon = currentLon ?? -122.4194;
            crossfadeToGoogleMaps(targetLat, targetLon);
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

      {/* 2c. God's Eye 3D Mesh (Dedicated Live Aircraft, Wildfires & Earthquakes) */}
      {viewMode === 'godseye3d' && (
        <div className="absolute inset-0 w-full h-full z-20 pointer-events-auto">
          <GodsEye3DView
            lat={currentLat || 48.8566}
            lon={currentLon || 2.3522}
            locationName={cityName || 'Paris, France'}
            onReturnToGlobe={handleReturnToOrbit}
            onOpenRoadMap={() => handleSelectViewMode('roadmap')}
            onSelectLocation={handle3DLocationSelected}
            fires={fires}
            earthquakes={earthquakes}
            flights={flights}
            onSelectIntelEvent={handleSelectIntelEvent}
            initialMode={meshIntelMode}
          />
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
        onOpenCitizenReports={() => setIsCitizenReportOpen(true)}
        onOpenCorridorHub={() => setIsCorridorHubOpen(true)}
        citizenReportCount={citizenReports.length}
        onOpenGeminiAssistant={() => setIsGeminiAssistantOpen(true)}
      />

      {/* 5. Weather GPT Floating Minimalist Glass Card - Hidden in 3D Mode */}
      {viewMode !== 'godseye3d' && isCardOpen && (
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
      )}

      {/* 6. Gemini AI Spatial Intelligence Copilot Bar (Hidden in 3D God's Eye view to not obstruct the screen) */}
      {viewMode !== 'godseye3d' && (
        <SpatialCopilotBar
          currentLat={currentLat}
          currentLon={currentLon}
          currentLocationName={cityName}
          currentMode={viewMode}
          onExecuteAction={handleExecuteCopilotAction}
          onOpenChatOrVoice={() => setIsGeminiAssistantOpen(true)}
        />
      )}

      {/* 7. Real-Time Spatial Intelligence Field Telemetry Modal (Earthquakes, Fires, Flights) */}
      <IntelDetailModal
        entity={selectedIntelEntity}
        onClose={() => setSelectedIntelEntity(null)}
        onFlyTo3D={(targetLat, targetLon, targetName, mode) => {
          if (mode) {
            setMeshIntelMode(mode);
          }
          setSelectedIntelEntity(null);
          setIsCardOpen(false);
          setCurrentLat(targetLat);
          setCurrentLon(targetLon);
          if (targetName) setCityName(targetName);
          handleSelectViewMode('godseye3d');
        }}
        onOpenRoadMap={(targetLat, targetLon) => {
          crossfadeToGoogleMaps(targetLat, targetLon);
        }}
      />

      {/* 8. Citizen Emission Reporting Module ("Citizen Climate Watch") */}
      <CitizenEmissionReportModal
        isOpen={isCitizenReportOpen}
        onClose={() => setIsCitizenReportOpen(false)}
        reports={citizenReports}
        onReportsUpdated={(updated) => setCitizenReports(updated)}
        currentLat={currentLat}
        currentLon={currentLon}
        currentLocationName={cityName}
        onFlyToLocation={(tLat, tLon, tName) => {
          loadLocationData(tLat, tLon, tName, true, true);
        }}
      />

      {/* 9. Indian Economic Corridor Fast Hub Modal */}
      <EconomicCorridorFastHubModal
        isOpen={isCorridorHubOpen}
        onClose={() => setIsCorridorHubOpen(false)}
        onFlyToLocation={(tLat, tLon, tName) => {
          loadLocationData(tLat, tLon, tName, true, true);
        }}
      />

      {/* 10. Gemini Planetary Copilot: Multi-Turn Chatbot & gemini-3.8-live Voice Modal */}
      <GeminiAssistantModal
        isOpen={isGeminiAssistantOpen}
        onClose={() => setIsGeminiAssistantOpen(false)}
        currentLat={currentLat}
        currentLon={currentLon}
        currentLocationName={cityName || 'Orbital Vantage'}
        currentMode={viewMode}
        onExecuteAction={(action) => {
          if (action.action === 'flyTo' && action.targetLocation) {
            if (action.targetLocation.lat && action.targetLocation.lon) {
              loadLocationData(action.targetLocation.lat, action.targetLocation.lon, action.targetLocation.name, true, true);
            } else if (action.targetLocation.name) {
              handleSelectCity(action.targetLocation.name);
            }
          } else if (action.action === 'toggleLayer' && action.layer) {
            handleToggleLayer(action.layer);
          } else if (action.action === 'setMode' && action.mode) {
            handleSelectViewMode(action.mode);
          }
        }}
      />
    </main>
  );
}
