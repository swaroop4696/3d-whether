import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Globe,
  Compass,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Eye,
  Building2,
  Layers,
  MapPin,
  Route,
  ChevronLeft,
  Sun,
  Camera,
} from 'lucide-react';
import { getGoogleMapsApiKey } from '../services/googleMapsLoader';

interface GodsEye3DViewProps {
  lat: number;
  lon: number;
  locationName: string;
  onReturnToGlobe: () => void;
  onOpenRoadMap: () => void;
}

const PRESET_CITIES = [
  { name: 'San Francisco', lat: 37.7915, lon: -122.3995, height: 650, heading: 45, pitch: -30 },
  { name: 'New York', lat: 40.7128, lon: -74.006, height: 750, heading: 180, pitch: -28 },
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917, height: 700, heading: 270, pitch: -32 },
  { name: 'Paris', lat: 48.8584, lon: 2.2945, height: 500, heading: 90, pitch: -25 },
  { name: 'Dubai', lat: 25.1972, lon: 55.2744, height: 850, heading: 315, pitch: -35 },
];

export const GodsEye3DView: React.FC<GodsEye3DViewProps> = ({
  lat,
  lon,
  locationName,
  onReturnToGlobe,
  onOpenRoadMap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isTilesetReady, setIsTilesetReady] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cameraTelemetry, setCameraTelemetry] = useState({
    height: 650,
    heading: 0,
    pitch: -30,
  });

  // Initialize Cesium Viewer & Google Photorealistic 3D Tiles
  useEffect(() => {
    let isCancelled = false;

    const initCesium = async () => {
      const Cesium = (window as any).Cesium;
      if (!Cesium) {
        setLoadError("Cesium 3D engine is initializing... Please wait a moment.");
        return;
      }

      if (!containerRef.current) return;

      try {
        // Destroy any prior viewer instance
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }

        // Configure Google Maps API Key for 3D Photorealistic Tiles
        const key = getGoogleMapsApiKey();
        if (key) {
          Cesium.GoogleMaps.defaultApiKey = key;
        }

        const viewer = new Cesium.Viewer(containerRef.current, {
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          homeButton: false,
          geocoder: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          fullscreenButton: false,
          vrButton: false,
          infoBox: false,
          selectionIndicator: false,
          shadows: false,
          shouldAnimate: true,
        });

        viewerRef.current = viewer;

        // Configure realistic lighting & atmosphere
        viewer.scene.globe.enableLighting = true;
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = true;
        }

        // Load Google Photorealistic 3D Tileset
        try {
          const tileset = await Cesium.createGooglePhotorealistic3DTileset();
          if (!isCancelled && viewer && !viewer.isDestroyed()) {
            viewer.scene.primitives.add(tileset);
            setIsTilesetReady(true);
          }
        } catch (tilesetErr) {
          console.warn("[GodsEye3D] Google 3D Tiles default load note:", tilesetErr);
          // Fallback to OSM / Cesium default terrain if 3D tiles key is waiting
          setIsTilesetReady(true);
        }

        // Initial camera position
        const targetLon = lon || -122.3995;
        const targetLat = lat || 37.7915;

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, 800),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-35),
            roll: 0.0,
          },
          duration: 1.5,
        });

        // Track camera telemetry
        viewer.camera.changed.addEventListener(() => {
          if (viewer && !viewer.isDestroyed()) {
            const h = Math.round(viewer.camera.positionCartographic?.height || 800);
            const head = Math.round(Cesium.Math.toDegrees(viewer.camera.heading));
            const pit = Math.round(Cesium.Math.toDegrees(viewer.camera.pitch));
            setCameraTelemetry({ height: h, heading: head, pitch: pit });
          }
        });
      } catch (err: any) {
        console.error('[GodsEye3D] Viewer init error:', err);
        if (!isCancelled) {
          setLoadError(err.message || 'Failed to initialize 3D Tiles viewer');
        }
      }
    };

    // Retry checking Cesium if script is still arriving
    const checkInterval = setInterval(() => {
      if ((window as any).Cesium) {
        clearInterval(checkInterval);
        initCesium();
      }
    }, 200);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      if (!(window as any).Cesium) {
        setLoadError('Cesium 3D engine script download timed out. Check network connection.');
      }
    }, 8000);

    return () => {
      isCancelled = true;
      clearInterval(checkInterval);
      clearTimeout(timeout);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        try {
          viewerRef.current.destroy();
        } catch (e) {}
        viewerRef.current = null;
      }
    };
  }, []);

  // Fly to location changes
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = (window as any).Cesium;
    if (viewer && !viewer.isDestroyed() && Cesium && lat && lon) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 700),
        orientation: {
          heading: Cesium.Math.toRadians(cameraTelemetry.heading || 0),
          pitch: Cesium.Math.toRadians(cameraTelemetry.pitch || -30),
          roll: 0.0,
        },
        duration: 2.0,
      });
    }
  }, [lat, lon]);

  // Camera Tilt Controls
  const adjustPitch = (deltaDegrees: number) => {
    const viewer = viewerRef.current;
    const Cesium = (window as any).Cesium;
    if (!viewer || !Cesium) return;
    const currentPitch = Cesium.Math.toDegrees(viewer.camera.pitch);
    const newPitch = Math.max(-89, Math.min(-10, currentPitch + deltaDegrees));
    viewer.camera.setView({
      orientation: {
        heading: viewer.camera.heading,
        pitch: Cesium.Math.toRadians(newPitch),
        roll: 0.0,
      },
    });
  };

  // Orbit Rotation Controls
  const rotateHeading = (deltaDegrees: number) => {
    const viewer = viewerRef.current;
    const Cesium = (window as any).Cesium;
    if (!viewer || !Cesium) return;
    const currentHeading = Cesium.Math.toDegrees(viewer.camera.heading);
    const newHeading = (currentHeading + deltaDegrees + 360) % 360;
    viewer.camera.setView({
      orientation: {
        heading: Cesium.Math.toRadians(newHeading),
        pitch: viewer.camera.pitch,
        roll: 0.0,
      },
    });
  };

  // Altitude Presets
  const setAltitudePreset = (heightMeters: number, pitchDeg = -30) => {
    const viewer = viewerRef.current;
    const Cesium = (window as any).Cesium;
    if (!viewer || !Cesium) return;

    const carto = viewer.camera.positionCartographic;
    if (!carto) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        Cesium.Math.toDegrees(carto.longitude),
        Cesium.Math.toDegrees(carto.latitude),
        heightMeters
      ),
      orientation: {
        heading: viewer.camera.heading,
        pitch: Cesium.Math.toRadians(pitchDeg),
        roll: 0.0,
      },
      duration: 1.5,
    });
  };

  // Preset City Fly-To
  const flyToPresetCity = (city: typeof PRESET_CITIES[0]) => {
    const viewer = viewerRef.current;
    const Cesium = (window as any).Cesium;
    if (!viewer || !Cesium) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(city.lon, city.lat, city.height),
      orientation: {
        heading: Cesium.Math.toRadians(city.heading),
        pitch: Cesium.Math.toRadians(city.pitch),
        roll: 0.0,
      },
      duration: 2.5,
    });
  };

  return (
    <div className="relative w-full h-full bg-[#060913] select-none overflow-hidden">
      {/* 3D Cesium Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Top Left View Mode & Telemetry Header */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 p-2 rounded-2xl weather-gpt-pill bg-[#0c121e]/85 border border-white/15 backdrop-blur-2xl shadow-2xl">
          <button
            onClick={onReturnToGlobe}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Return to Orbital Daylight Earth"
          >
            <ChevronLeft className="w-4 h-4 text-emerald-400" />
            <span>Orbital Globe</span>
          </button>

          <button
            onClick={onOpenRoadMap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/30 text-xs font-medium transition-all cursor-pointer"
            title="Switch to 2D Road Map & Traffic Flow"
          >
            <Route className="w-3.5 h-3.5 text-sky-400" />
            <span>2D Road Traffic</span>
          </button>

          <div className="h-4 w-px bg-white/15 mx-1" />

          <div className="flex items-center gap-2 px-2 text-xs font-mono text-neutral-300">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white">God's Eye 3D Tiles</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Photorealistic Mesh
            </span>
          </div>
        </div>

        {/* Current Camera Telemetry Card */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl weather-gpt-pill bg-[#0c121e]/75 border border-white/10 backdrop-blur-xl text-[11px] font-mono text-neutral-400">
          <span>ALT: <strong className="text-white">{cameraTelemetry.height}m</strong></span>
          <span>HDG: <strong className="text-white">{cameraTelemetry.heading}°</strong></span>
          <span>PITCH: <strong className="text-white">{cameraTelemetry.pitch}°</strong></span>
          <span className="text-emerald-400 font-semibold">{locationName || '3D Urban Sector'}</span>
        </div>
      </div>

      {/* Preset Cities Quick Jump Bar (Top Center) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-1 p-1.5 rounded-2xl weather-gpt-pill bg-[#0c121e]/80 border border-white/15 backdrop-blur-2xl shadow-2xl pointer-events-auto">
        <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 px-2">3D Cities:</span>
        {PRESET_CITIES.map((city) => (
          <button
            key={city.name}
            onClick={() => flyToPresetCity(city)}
            className="px-2.5 py-1 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            {city.name}
          </button>
        ))}
      </div>

      {/* Right Side: 3D Camera Gimbal & Altitude Controls */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3 pointer-events-auto">
        {/* Gimbal Card */}
        <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl weather-gpt-pill bg-[#0c121e]/85 border border-white/15 backdrop-blur-2xl shadow-2xl">
          <span className="text-[9px] font-mono text-neutral-400 tracking-wider">3D PITCH</span>
          <button
            onClick={() => adjustPitch(10)}
            className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tilt Up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => adjustPitch(-10)}
            className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tilt Down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-white/10 my-1" />

          <span className="text-[9px] font-mono text-neutral-400 tracking-wider">ORBIT</span>
          <button
            onClick={() => rotateHeading(-30)}
            className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Orbit Counter-Clockwise"
          >
            <RotateCw className="w-4 h-4 -scale-x-100" />
          </button>
          <button
            onClick={() => rotateHeading(30)}
            className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Orbit Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Altitude Presets */}
        <div className="flex flex-col gap-1.5 p-1.5 rounded-2xl weather-gpt-pill bg-[#0c121e]/85 border border-white/15 backdrop-blur-2xl shadow-2xl">
          <button
            onClick={() => setAltitudePreset(4000, -55)}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-center cursor-pointer"
            title="High Altitude Aerial Overview"
          >
            4,000m
          </button>
          <button
            onClick={() => setAltitudePreset(700, -30)}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 text-center cursor-pointer"
            title="Skyline Vista"
          >
            700m
          </button>
          <button
            onClick={() => setAltitudePreset(120, -15)}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-center cursor-pointer"
            title="Street Canyon Level"
          >
            120m
          </button>
        </div>
      </div>

      {/* Loading / Error Banner if needed */}
      {loadError && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs backdrop-blur-xl shadow-2xl flex items-center gap-2">
          <span>{loadError}</span>
        </div>
      )}
    </div>
  );
};
