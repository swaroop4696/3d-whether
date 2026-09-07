import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import type {
  WeatherParticleType,
  FireHotspot,
  EarthquakeData,
  LiveFlight,
  IntelligenceLayerType,
} from '../types';
import { Sun, RotateCw, MapPin, Eye, Compass, Route } from 'lucide-react';

export interface ThreeGlobeProps {
  currentLat: number | null;
  currentLon: number | null;
  particleType: WeatherParticleType;
  onLocationSelected: (lat: number, lon: number) => void;
  onZoomThresholdCrossed?: (lat: number, lon: number) => void;
  autoRotateGlobe: boolean;
  onToggleAutoRotate?: () => void;
  onOpenStreetMap?: () => void;
  // Spatial Intelligence Feeds
  fires?: FireHotspot[];
  earthquakes?: EarthquakeData[];
  flights?: LiveFlight[];
  activeLayers?: Record<IntelligenceLayerType, boolean>;
  onSelectIntelEvent?: (lat: number, lon: number, title: string, category: IntelligenceLayerType) => void;
}

export interface GlobeHandle {
  zoomToLocation: (
    lat: number,
    lon: number,
    altitude?: number,
    onComplete?: () => void,
    onThresholdCrossed?: () => void
  ) => void;
  resetView: (onComplete?: () => void) => void;
}

/**
 * Converts Latitude & Longitude to 3D Cartesian coordinates (x, y, z) on a sphere.
 * Aligns strictly with Three.js SphereGeometry equirectangular UV mapping:
 * lat=0, lon=0 -> (radius, 0, 0)
 * lat=0, lon=-90 -> (0, 0, radius)
 * lat=+90 -> (0, radius, 0)
 */
export function latLonToVector3(lat: number, lon: number, radius = 5.0): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/**
 * Converts a 3D point on the sphere surface back to Latitude & Longitude
 */
export function vector3ToLatLon(point: THREE.Vector3, radius = 5.0): { lat: number; lon: number } {
  const norm = point.clone().normalize();
  const phi = Math.acos(Math.max(-1, Math.min(1, norm.y)));
  const lat = 90 - (phi * 180) / Math.PI;
  let lon = (Math.atan2(norm.z, -norm.x) * 180) / Math.PI - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return { lat, lon };
}

/**
 * Calculates the exact real-time subsolar vector on Earth based on UTC date & time
 */
export function calculateRealTimeSunVector(radius = 50.0): { position: THREE.Vector3; declination: number; lon: number } {
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  
  // Solar longitude: Sun is at noon over Greenwich (lon=0) at UTC 12:00.
  // Moves 15 degrees westward per hour.
  const solarLon = (12 - utcHours) * 15;

  // Day of year calculation for solar declination
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);

  // Solar declination (approx -23.44° to +23.44°)
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));

  const pos = latLonToVector3(declination, solarLon, radius);
  return { position: pos, declination, lon: solarLon };
}

/**
 * Atmospheric Rayleigh scattering outer corona shader
 */
function createAtmosphereMaterial(): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
      fresnel = pow(fresnel, 3.2);

      // Deep atmospheric cyan-blue gradient
      vec3 atmosphericColor = vec3(0.15, 0.62, 1.0);
      vec3 outerHalo = vec3(0.4, 0.82, 1.0);
      vec3 finalColor = mix(atmosphericColor, outerHalo, pow(fresnel, 1.5));

      gl_FragColor = vec4(finalColor, fresnel * 0.85);
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}

/**
 * Pure Daylight Earth Shader Material (100% Day Illumination across all continents & oceans)
 */
function createEarthMaterial(
  textures: {
    day: THREE.Texture;
    normal: THREE.Texture;
    specular: THREE.Texture;
  },
  sunPos: THREE.Vector3
): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uDayTexture;
    uniform sampler2D uNormalMap;
    uniform sampler2D uSpecularMap;
    uniform vec3 uSunPosition;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vPosition);
      vec3 sunDir = normalize(uSunPosition);

      // Texture samples - pure high-res NASA daylight imagery
      vec4 dayColor = texture2D(uDayTexture, vUv);
      vec4 normalSample = texture2D(uNormalMap, vUv);
      float specularStrength = texture2D(uSpecularMap, vUv).r;

      // Realistic bump perturbation from NASA normal map
      vec3 perturbedNormal = normalize(normal + (normalSample.xyz * 2.0 - 1.0) * 0.16);

      // Daylight shading: base ambient 0.74 ensures NO dark night side anywhere on the planet!
      float sunDot = max(dot(perturbedNormal, sunDir), 0.0);
      float viewDot = max(dot(perturbedNormal, viewDir), 0.0);
      float daylight = 0.76 + sunDot * 0.30 + viewDot * 0.14;
      vec3 litDay = dayColor.rgb * daylight;

      // Physical sun glint on daytime oceans
      vec3 reflectDir = reflect(-sunDir, perturbedNormal);
      float specFactor = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
      vec3 oceanSpecular = vec3(1.0, 0.96, 0.88) * specFactor * specularStrength * 1.6;

      // Atmospheric cyan-blue Fresnel rim glow on Earth limb
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.8);
      vec3 limbGlow = vec3(0.22, 0.68, 1.0) * fresnel * 0.52;

      gl_FragColor = vec4(litDay + oceanSpecular + limbGlow, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uDayTexture: { value: textures.day },
      uNormalMap: { value: textures.normal },
      uSpecularMap: { value: textures.specular },
      uSunPosition: { value: sunPos },
    },
    vertexShader,
    fragmentShader,
  });
}

export const ThreeGlobe = React.forwardRef<GlobeHandle, ThreeGlobeProps>(
  (
    {
      currentLat,
      currentLon,
      particleType,
      onLocationSelected,
      onZoomThresholdCrossed,
      autoRotateGlobe,
      onToggleAutoRotate,
      onOpenStreetMap,
      fires = [],
      earthquakes = [],
      flights = [],
      activeLayers = { fires: true, earthquakes: true, flights: true },
      onSelectIntelEvent,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const globeGroupRef = useRef<THREE.Group | null>(null);
    const earthMeshRef = useRef<THREE.Mesh | null>(null);
    const earthMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
    const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
    const beaconGroupRef = useRef<THREE.Group | null>(null);
    const firesGroupRef = useRef<THREE.Group | null>(null);
    const quakesGroupRef = useRef<THREE.Group | null>(null);
    const flightsGroupRef = useRef<THREE.Group | null>(null);
    const weatherParticlesRef = useRef<THREE.Points | null>(null);
    const particlePositionsRef = useRef<Float32Array | null>(null);
    const particleVelocitiesRef = useRef<Float32Array | null>(null);
    const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

    // Daylight Earth view with UTC clock tracking
    const [currentUtcString, setCurrentUtcString] = useState<string>('');

    // Pointer down tracking to distinguish drag vs click
    const pointerDownPos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

    const onLocationSelectedRef = useRef(onLocationSelected);
    useEffect(() => {
      onLocationSelectedRef.current = onLocationSelected;
    }, [onLocationSelected]);

    const onSelectIntelEventRef = useRef(onSelectIntelEvent);
    useEffect(() => {
      onSelectIntelEventRef.current = onSelectIntelEvent;
    }, [onSelectIntelEvent]);

    const onZoomThresholdCrossedRef = useRef(onZoomThresholdCrossed);
    useEffect(() => {
      onZoomThresholdCrossedRef.current = onZoomThresholdCrossed;
    }, [onZoomThresholdCrossed]);

    const currentCoordsRef = useRef({ lat: currentLat, lon: currentLon, particleType });
    useEffect(() => {
      currentCoordsRef.current = { lat: currentLat, lon: currentLon, particleType };
    }, [currentLat, currentLon, particleType]);

    /**
     * Update UTC clock display
     */
    useEffect(() => {
      const updateClock = () => {
        const d = new Date();
        setCurrentUtcString(d.toISOString().slice(11, 19) + ' UTC');
      };
      updateClock();
      const interval = setInterval(updateClock, 1000);
      return () => clearInterval(interval);
    }, []);

    /**
     * GSAP Camera Flight Animation
     */
    const zoomToLocation = useCallback(
      (
        lat: number,
        lon: number,
        altitude = 5.4,
        onComplete?: () => void,
        onThresholdCrossed?: () => void
      ) => {
        if (!cameraRef.current || !controlsRef.current) return;

        const camera = cameraRef.current;
        const controls = controlsRef.current;

        const surfacePos = latLonToVector3(lat, lon, 5.0);
        const normal = surfacePos.clone().normalize();
        const targetCameraPos = normal.clone().multiplyScalar(altitude);

        controls.autoRotate = false;
        let thresholdTriggered = false;

        gsap.to(camera.position, {
          x: targetCameraPos.x,
          y: targetCameraPos.y,
          z: targetCameraPos.z,
          duration: 1.5,
          ease: 'power3.inOut',
          onUpdate: () => {
            camera.lookAt(controls.target);
            const dist = camera.position.length();
            if (!thresholdTriggered && dist <= 6.6) {
              thresholdTriggered = true;
              if (onThresholdCrossed) onThresholdCrossed();
            }
          },
          onComplete: () => {
            if (!thresholdTriggered && onThresholdCrossed) {
              thresholdTriggered = true;
              onThresholdCrossed();
            }
            if (onComplete) onComplete();
          },
        });

        gsap.to(controls.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.2,
          ease: 'power2.out',
        });
      },
      []
    );

    /**
     * Resets camera to standard orbital vantage point
     */
    const resetView = useCallback(
      (onComplete?: () => void) => {
        if (!cameraRef.current || !controlsRef.current) return;
        const camera = cameraRef.current;
        const controls = controlsRef.current;

        gsap.to(camera.position, {
          x: 0,
          y: 4,
          z: 14.5,
          duration: 1.4,
          ease: 'power3.inOut',
          onUpdate: () => {
            camera.lookAt(0, 0, 0);
          },
          onComplete: () => {
            if (onComplete) onComplete();
          },
        });

        gsap.to(controls.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.2,
        });

        if (autoRotateGlobe) {
          controls.autoRotate = true;
        }
      },
      [autoRotateGlobe]
    );

    useImperativeHandle(ref, () => ({
      zoomToLocation,
      resetView,
    }));

    /**
     * Updates Target Beacon position on Earth's surface
     */
    const updateTargetBeacon = useCallback((lat: number, lon: number) => {
      if (!beaconGroupRef.current) return;
      const beacon = beaconGroupRef.current;
      const pos = latLonToVector3(lat, lon, 5.02);
      beacon.position.copy(pos);

      const normal = pos.clone().normalize();
      beacon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      beacon.visible = true;
    }, []);

    /**
     * Updates 3D Weather Particles localized at target coordinates
     */
    const updateWeatherParticles = useCallback((type: WeatherParticleType, lat: number, lon: number) => {
      if (!weatherParticlesRef.current) return;

      const count = 350;
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const center = latLonToVector3(lat, lon, 5.06);
      const normal = center.clone().normalize();

      const up = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const tangent = new THREE.Vector3().crossVectors(normal, up).normalize();
      const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.5;
        const height = Math.random() * 2.0 + 0.1;

        const offset = tangent
          .clone()
          .multiplyScalar(Math.cos(angle) * radius)
          .add(bitangent.clone().multiplyScalar(Math.sin(angle) * radius))
          .add(normal.clone().multiplyScalar(height));

        positions[i3] = center.x + offset.x;
        positions[i3 + 1] = center.y + offset.y;
        positions[i3 + 2] = center.z + offset.z;

        if (type === 'rain') {
          const fall = normal.clone().multiplyScalar(-(Math.random() * 0.08 + 0.05));
          velocities[i3] = fall.x;
          velocities[i3 + 1] = fall.y;
          velocities[i3 + 2] = fall.z;
        } else if (type === 'snow') {
          const swirl = tangent
            .clone()
            .multiplyScalar((Math.random() - 0.5) * 0.02)
            .add(normal.clone().multiplyScalar(-0.015));
          velocities[i3] = swirl.x;
          velocities[i3 + 1] = swirl.y;
          velocities[i3 + 2] = swirl.z;
        } else if (type === 'wind') {
          const vortex = tangent
            .clone()
            .multiplyScalar(0.06)
            .add(normal.clone().multiplyScalar((Math.random() - 0.5) * 0.015));
          velocities[i3] = vortex.x;
          velocities[i3 + 1] = vortex.y;
          velocities[i3 + 2] = vortex.z;
        } else {
          velocities[i3] = (Math.random() - 0.5) * 0.005;
          velocities[i3 + 1] = (Math.random() - 0.5) * 0.005;
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.005;
        }
      }

      particlePositionsRef.current = positions;
      particleVelocitiesRef.current = velocities;

      const geom = weatherParticlesRef.current.geometry;
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.attributes.position.needsUpdate = true;

      const mat = weatherParticlesRef.current.material as THREE.PointsMaterial;
      if (type === 'rain') {
        mat.color.setHex(0x38bdf8);
        mat.size = 0.07;
        mat.opacity = 0.85;
      } else if (type === 'snow') {
        mat.color.setHex(0xf8fafc);
        mat.size = 0.09;
        mat.opacity = 0.95;
      } else if (type === 'wind') {
        mat.color.setHex(0xa7f3d0);
        mat.size = 0.06;
        mat.opacity = 0.75;
      } else {
        mat.color.setHex(0xfef08a);
        mat.size = 0.05;
        mat.opacity = 0.65;
      }
      mat.needsUpdate = true;
    }, []);

    /**
     * Updates 3D NASA FIRMS Active Wildfire Beacons
     */
    const updateFiresLayer = useCallback((fireList: FireHotspot[], visible: boolean) => {
      if (!firesGroupRef.current) return;
      const group = firesGroupRef.current;
      group.clear();
      group.visible = visible;
      if (!visible) return;

      fireList.forEach((fire) => {
        const fireContainer = new THREE.Group();
        const pos = latLonToVector3(fire.lat, fire.lon, 5.018);
        fireContainer.position.copy(pos);
        const normal = pos.clone().normalize();
        fireContainer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        // Ground burn radius ring
        const groundGeom = new THREE.RingGeometry(0.04, 0.09, 20);
        const groundMat = new THREE.MeshBasicMaterial({
          color: 0xff3700,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const groundMesh = new THREE.Mesh(groundGeom, groundMat);
        groundMesh.rotation.x = Math.PI / 2;
        groundMesh.userData = { type: 'fires', data: fire };
        fireContainer.add(groundMesh);

        // Vertical flame cone
        const flameHeight = Math.min(0.35, 0.12 + (fire.frp / 400) * 0.22);
        const flameGeom = new THREE.ConeGeometry(0.035, flameHeight, 12);
        const flameMat = new THREE.MeshBasicMaterial({
          color: 0xff7700,
          transparent: true,
          opacity: 0.88,
        });
        const flameMesh = new THREE.Mesh(flameGeom, flameMat);
        flameMesh.position.y = flameHeight / 2;
        flameMesh.userData = { type: 'fires', data: fire };
        fireContainer.add(flameMesh);

        // Glowing ember at tip
        const tipGeom = new THREE.SphereGeometry(0.02, 8, 8);
        const tipMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
        const tipMesh = new THREE.Mesh(tipGeom, tipMat);
        tipMesh.position.y = flameHeight;
        tipMesh.userData = { type: 'fires', data: fire };
        fireContainer.add(tipMesh);

        fireContainer.userData = { type: 'fires', data: fire };
        group.add(fireContainer);
      });
    }, []);

    /**
     * Updates 3D USGS Earthquake Shockwaves & Depths
     */
    const updateQuakesLayer = useCallback((quakeList: EarthquakeData[], visible: boolean) => {
      if (!quakesGroupRef.current) return;
      const group = quakesGroupRef.current;
      group.clear();
      group.visible = visible;
      if (!visible) return;

      quakeList.forEach((quake) => {
        const quakeContainer = new THREE.Group();
        const pos = latLonToVector3(quake.lat, quake.lon, 5.012);
        quakeContainer.position.copy(pos);
        const normal = pos.clone().normalize();
        quakeContainer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        const isHigh = quake.magnitude >= 5.0;
        const color = quake.magnitude >= 6.0 ? 0xef4444 : quake.magnitude >= 4.5 ? 0xf59e0b : 0xeab308;
        const radius = Math.max(0.06, (quake.magnitude / 8.0) * 0.22);

        // Concentric expanding shockwave ring
        const ringGeom = new THREE.RingGeometry(radius * 0.85, radius, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isHigh ? 0.9 : 0.7,
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.userData = { type: 'earthquakes', data: quake };
        quakeContainer.add(ringMesh);

        // Center epicenter dot
        const dotGeom = new THREE.SphereGeometry(0.025, 12, 12);
        const dotMat = new THREE.MeshBasicMaterial({ color });
        const dotMesh = new THREE.Mesh(dotGeom, dotMat);
        dotMesh.userData = { type: 'earthquakes', data: quake };
        quakeContainer.add(dotMesh);

        // Subsurface hypocenter depth spike
        const depthLen = Math.min(0.3, Math.max(0.05, (quake.depth / 200) * 0.25));
        const stemGeom = new THREE.CylinderGeometry(0.006, 0.006, depthLen, 8);
        const stemMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
        const stemMesh = new THREE.Mesh(stemGeom, stemMat);
        stemMesh.position.y = -depthLen / 2;
        stemMesh.userData = { type: 'earthquakes', data: quake };
        quakeContainer.add(stemMesh);

        quakeContainer.userData = { type: 'earthquakes', data: quake };
        group.add(quakeContainer);
      });
    }, []);

    /**
     * Updates 3D OpenSky Live Aircraft Vector Positions
     */
    const updateFlightsLayer = useCallback((flightList: LiveFlight[], visible: boolean) => {
      if (!flightsGroupRef.current) return;
      const group = flightsGroupRef.current;
      group.clear();
      group.visible = visible;
      if (!visible) return;

      flightList.forEach((flight) => {
        const flightContainer = new THREE.Group();
        const altOffset = 0.12 + Math.min(0.14, (flight.altitude / 15000) * 0.1);
        const pos = latLonToVector3(flight.lat, flight.lon, 5.0 + altOffset);
        flightContainer.position.copy(pos);

        const normal = pos.clone().normalize();
        flightContainer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        // 3D Airplane Mesh (Fuselage + Swept Wings)
        const planeGroup = new THREE.Group();

        const fuseGeom = new THREE.CylinderGeometry(0.012, 0.008, 0.08, 8);
        const fuseMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const fuseMesh = new THREE.Mesh(fuseGeom, fuseMat);
        fuseMesh.rotation.x = Math.PI / 2;
        fuseMesh.userData = { type: 'flights', data: flight };
        planeGroup.add(fuseMesh);

        const wingGeom = new THREE.BoxGeometry(0.09, 0.004, 0.02);
        const wingMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
        const wingMesh = new THREE.Mesh(wingGeom, wingMat);
        wingMesh.position.z = -0.01;
        wingMesh.userData = { type: 'flights', data: flight };
        planeGroup.add(wingMesh);

        planeGroup.rotation.y = -(flight.heading * Math.PI) / 180;
        flightContainer.add(planeGroup);

        flightContainer.userData = {
          type: 'flights',
          data: flight,
          velocity: flight.velocity,
          heading: flight.heading,
        };
        group.add(flightContainer);
      });
    }, []);

    // Sync Intelligence Layers
    useEffect(() => {
      updateFiresLayer(fires, !!activeLayers.fires);
    }, [fires, activeLayers.fires, updateFiresLayer]);

    useEffect(() => {
      updateQuakesLayer(earthquakes, !!activeLayers.earthquakes);
    }, [earthquakes, activeLayers.earthquakes, updateQuakesLayer]);

    useEffect(() => {
      updateFlightsLayer(flights, !!activeLayers.flights);
    }, [flights, activeLayers.flights, updateFlightsLayer]);

    // Sync Beacon & Particles on coordinates change
    useEffect(() => {
      if (currentLat !== null && currentLon !== null) {
        updateTargetBeacon(currentLat, currentLon);
        updateWeatherParticles(particleType, currentLat, currentLon);
      } else if (beaconGroupRef.current) {
        beaconGroupRef.current.visible = false;
      }
    }, [currentLat, currentLon, particleType, updateTargetBeacon, updateWeatherParticles]);

    // Sync autoRotate
    useEffect(() => {
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateGlobe;
      }
    }, [autoRotateGlobe]);

    // Initialize 3D Photorealistic Scene in 100% Daylight
    useEffect(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      // 1. Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020408);
      sceneRef.current = scene;

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 3.5, 14.5);
      cameraRef.current = camera;

      // 3. WebGL Renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.id = 'three-canvas';
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = autoRotateGlobe;
      controls.autoRotateSpeed = 0.45;
      controls.minDistance = 6.4;
      controls.maxDistance = 26.0;
      controls.enablePan = false;
      controlsRef.current = controls;

      // 5. Radiant Daytime Lighting (No dark night anywhere on Earth)
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
      scene.add(ambientLight);

      const initialSun = calculateRealTimeSunVector(50.0);
      const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
      sunLight.position.copy(initialSun.position);
      scene.add(sunLight);
      sunLightRef.current = sunLight;

      // Omnidirectional daylight fill lights ensuring all sides of the globe are bright and clear
      const fillLight1 = new THREE.DirectionalLight(0xdbeafe, 1.1);
      fillLight1.position.set(-30, 20, 25);
      scene.add(fillLight1);

      const fillLight2 = new THREE.DirectionalLight(0xfef3c7, 0.9);
      fillLight2.position.set(25, -20, -20);
      scene.add(fillLight2);

      // 6. Deep Space Celestial Starfield
      const starCount = 2200;
      const starGeometry = new THREE.BufferGeometry();
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);

      const starPalette = [
        new THREE.Color(0xffffff), // Bright white
        new THREE.Color(0xa5c9eb), // Blue giant
        new THREE.Color(0xffe4b5), // Warm star
        new THREE.Color(0xfcd34d), // Yellow dwarf
      ];

      for (let i = 0; i < starCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 160 + Math.random() * 80;

        starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i + 2] = r * Math.cos(phi);

        const col = starPalette[Math.floor(Math.random() * starPalette.length)];
        starColors[i] = col.r;
        starColors[i + 1] = col.g;
        starColors[i + 2] = col.b;
      }

      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
      const starMaterial = new THREE.PointsMaterial({
        size: 0.35,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
      });
      const starField = new THREE.Points(starGeometry, starMaterial);
      scene.add(starField);

      // 7. Globe Group with realistic Earth axial tilt (23.44°)
      const globeGroup = new THREE.Group();
      globeGroup.rotation.z = (23.44 * Math.PI) / 180;
      scene.add(globeGroup);
      globeGroupRef.current = globeGroup;

      // 8. High-Resolution NASA Textures (Pure Daytime Textures)
      const textureLoader = new THREE.TextureLoader();
      const dayTexture = textureLoader.load('/textures/earth_atmos_2048.jpg');
      const normalTexture = textureLoader.load('/textures/earth_normal_2048.jpg');
      const specularTexture = textureLoader.load('/textures/earth_specular_2048.jpg');
      const cloudsTexture = textureLoader.load('/textures/earth_clouds_1024.png');

      [dayTexture, normalTexture, specularTexture, cloudsTexture].forEach((tex) => {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
      });

      // 9. Earth Sphere Mesh (Ultra smooth 128x128 sphere, 100% Day Illumination)
      const earthGeometry = new THREE.SphereGeometry(5.0, 128, 128);
      const earthMaterial = createEarthMaterial(
        {
          day: dayTexture,
          normal: normalTexture,
          specular: specularTexture,
        },
        initialSun.position
      );
      const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
      globeGroup.add(earthMesh);
      earthMeshRef.current = earthMesh;
      earthMaterialRef.current = earthMaterial;

      // 10. Floating Cloud Layer (radius 5.06)
      const cloudsGeometry = new THREE.SphereGeometry(5.06, 96, 96);
      const cloudsMaterial = new THREE.MeshLambertMaterial({
        map: cloudsTexture,
        transparent: true,
        opacity: 0.38,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });
      const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
      globeGroup.add(cloudsMesh);
      cloudsMeshRef.current = cloudsMesh;

      // 11. Atmospheric Outer Corona Glow Shader
      const atmosphereGeometry = new THREE.SphereGeometry(5.24, 64, 64);
      const atmosphereMaterial = createAtmosphereMaterial();
      const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      globeGroup.add(atmosphereMesh);

      // 12. Holographic Target Beacon
      const beaconGroup = new THREE.Group();
      globeGroup.add(beaconGroup);
      beaconGroupRef.current = beaconGroup;
      beaconGroup.visible = false;

      // Core glowing center sphere
      const pinGeom = new THREE.SphereGeometry(0.08, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const pinMesh = new THREE.Mesh(pinGeom, pinMat);
      beaconGroup.add(pinMesh);

      // Pulsing radar rings
      const innerRingGeom = new THREE.RingGeometry(0.12, 0.17, 32);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat);
      innerRing.rotation.x = Math.PI / 2;
      beaconGroup.add(innerRing);

      const outerRingGeom = new THREE.RingGeometry(0.24, 0.28, 32);
      const outerRingMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });
      const outerRing = new THREE.Mesh(outerRingGeom, outerRingMat);
      outerRing.rotation.x = Math.PI / 2;
      beaconGroup.add(outerRing);

      // Vertical holographic light pillar
      const beamGeom = new THREE.CylinderGeometry(0.015, 0.015, 1.4, 16);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
      });
      const beamMesh = new THREE.Mesh(beamGeom, beamMat);
      beamMesh.position.y = 0.7;
      beaconGroup.add(beamMesh);

      // 13. Weather Particles Points
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
      const particleMaterial = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.07,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const weatherPoints = new THREE.Points(particleGeometry, particleMaterial);
      globeGroup.add(weatherPoints);
      weatherParticlesRef.current = weatherPoints;

      // 13b. Spatial Intelligence Layer Groups
      const firesGroup = new THREE.Group();
      globeGroup.add(firesGroup);
      firesGroupRef.current = firesGroup;

      const quakesGroup = new THREE.Group();
      globeGroup.add(quakesGroup);
      quakesGroupRef.current = quakesGroup;

      const flightsGroup = new THREE.Group();
      globeGroup.add(flightsGroup);
      flightsGroupRef.current = flightsGroup;

      // Sync initial layers
      updateFiresLayer(fires, !!activeLayers.fires);
      updateQuakesLayer(earthquakes, !!activeLayers.earthquakes);
      updateFlightsLayer(flights, !!activeLayers.flights);

      // Sync initial coords
      if (currentCoordsRef.current.lat !== null && currentCoordsRef.current.lon !== null) {
        updateTargetBeacon(currentCoordsRef.current.lat, currentCoordsRef.current.lon);
        updateWeatherParticles(
          currentCoordsRef.current.particleType,
          currentCoordsRef.current.lat,
          currentCoordsRef.current.lon
        );
      }

      // 14. High-Precision Raycasting Click & Drag Detection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onPointerDown = (e: PointerEvent) => {
        if (e.target !== renderer.domElement) return;
        pointerDownPos.current = {
          x: e.clientX,
          y: e.clientY,
          time: Date.now(),
        };
      };

      const onPointerUp = (e: PointerEvent) => {
        if (e.target !== renderer.domElement) return;
        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - pointerDownPos.current.time;

        if (dist > 6 || elapsed > 500) return; // Ignore drag gestures

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // First test intersection with interactive spatial intelligence entities
        const intelObjects: THREE.Object3D[] = [];
        if (firesGroupRef.current && activeLayers.fires) intelObjects.push(...firesGroupRef.current.children);
        if (quakesGroupRef.current && activeLayers.earthquakes) intelObjects.push(...quakesGroupRef.current.children);
        if (flightsGroupRef.current && activeLayers.flights) intelObjects.push(...flightsGroupRef.current.children);

        const intelIntersects = raycaster.intersectObjects(intelObjects, true);
        if (intelIntersects.length > 0) {
          let targetObj: any = intelIntersects[0].object;
          while (targetObj && (!targetObj.userData || !targetObj.userData.type)) {
            targetObj = targetObj.parent;
          }

          if (targetObj && targetObj.userData && targetObj.userData.type) {
            const { type, data } = targetObj.userData;
            const title =
              type === 'fires'
                ? data.locationName || 'Active Wildfire'
                : type === 'earthquakes'
                ? data.place || 'Earthquake Epicenter'
                : `Flight ${data.callsign}`;

            if (onSelectIntelEventRef.current) {
              onSelectIntelEventRef.current(data.lat, data.lon, title, type);
            }
            updateTargetBeacon(data.lat, data.lon);
            zoomToLocation(data.lat, data.lon, 6.2);
            return;
          }
        }

        const intersects = raycaster.intersectObject(earthMesh);

        if (intersects.length > 0) {
          const hitPoint = intersects[0].point;
          const localPoint = globeGroup.worldToLocal(hitPoint.clone());
          const { lat, lon } = vector3ToLatLon(localPoint, 5.0);
          const roundedLat = Math.round(lat * 100) / 100;
          const roundedLon = Math.round(lon * 100) / 100;

          // Update target marker
          updateTargetBeacon(roundedLat, roundedLon);

          // Trigger live weather fetch
          onLocationSelectedRef.current(roundedLat, roundedLon);

          // Fly camera toward clicked location on the 3D globe smoothly
          zoomToLocation(roundedLat, roundedLon, 6.2);
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      // 15. Responsive Resize Observer
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: newW, height: newH } = entry.contentRect;
          if (newW > 0 && newH > 0) {
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
          }
        }
      });
      resizeObserver.observe(container);

      // 16. Real-Time Animation Loop
      let animationFrameId: number;
      const clock = new THREE.Clock();

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Atmospheric cloud drifting
        if (cloudsMeshRef.current) {
          cloudsMeshRef.current.rotation.y = elapsedTime * 0.012;
        }

        // Real-time Sun position update
        const sun = calculateRealTimeSunVector(50.0);
        if (sunLightRef.current) {
          sunLightRef.current.position.copy(sun.position);
        }
        if (earthMaterialRef.current) {
          earthMaterialRef.current.uniforms.uSunPosition.value.copy(sun.position);
        }

        // Radar ring pulsing
        if (innerRing && outerRing) {
          const scale = 1.0 + Math.sin(elapsedTime * 4.2) * 0.3;
          innerRing.scale.set(scale, scale, 1);
          innerRingMat.opacity = 0.5 + Math.cos(elapsedTime * 4.2) * 0.3;

          const outerScale = 1.0 + Math.sin(elapsedTime * 2.8) * 0.35;
          outerRing.scale.set(outerScale, outerScale, 1);
          outerRingMat.opacity = 0.3 + Math.cos(elapsedTime * 2.8) * 0.2;
        }

        // Spatial Intelligence Layers Animation
        if (firesGroupRef.current && activeLayers.fires) {
          firesGroupRef.current.children.forEach((fGroup: any, idx) => {
            const tipMesh = fGroup.children[2];
            if (tipMesh) {
              const flicker = 0.8 + Math.sin(elapsedTime * 6.5 + idx * 1.7) * 0.25;
              tipMesh.scale.set(flicker, flicker, flicker);
            }
          });
        }

        if (quakesGroupRef.current && activeLayers.earthquakes) {
          quakesGroupRef.current.children.forEach((qGroup: any, idx) => {
            const ringMesh = qGroup.children[0];
            if (ringMesh) {
              const wave = 1.0 + Math.sin(elapsedTime * 3.2 + idx * 0.8) * 0.2;
              ringMesh.scale.set(wave, wave, 1);
            }
          });
        }

        if (flightsGroupRef.current && activeLayers.flights) {
          flightsGroupRef.current.children.forEach((flightGroup: any) => {
            if (flightGroup.userData) {
              const bob = Math.sin(elapsedTime * 2.0 + (flightGroup.userData.heading || 0)) * 0.003;
              flightGroup.position.y += bob * 0.005;
            }
          });
        }

        // Weather particles animation
        if (
          weatherParticlesRef.current &&
          particlePositionsRef.current &&
          particleVelocitiesRef.current
        ) {
          const positionAttr = weatherParticlesRef.current.geometry?.getAttribute('position') as
            | THREE.BufferAttribute
            | undefined;

          if (positionAttr && positionAttr.array && positionAttr.array.length > 0) {
            const positions = particlePositionsRef.current;
            const velocities = particleVelocitiesRef.current;
            const count = Math.min(positions.length, positionAttr.array.length) / 3;

            for (let i = 0; i < count; i++) {
              const i3 = i * 3;
              positions[i3] += velocities[i3];
              positions[i3 + 1] += velocities[i3 + 1];
              positions[i3 + 2] += velocities[i3 + 2];
            }
            positionAttr.needsUpdate = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        particlePositionsRef.current = null;
        particleVelocitiesRef.current = null;
        weatherParticlesRef.current = null;
        beaconGroupRef.current = null;
        firesGroupRef.current = null;
        quakesGroupRef.current = null;
        flightsGroupRef.current = null;
        earthMeshRef.current = null;
        earthMaterialRef.current = null;
        cloudsMeshRef.current = null;
        globeGroupRef.current = null;
        renderer.dispose();
      };
    }, [zoomToLocation, updateTargetBeacon, updateWeatherParticles, autoRotateGlobe]);

    return (
      <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden select-none">
        {/* Real-time Globe Controls & Status HUD */}
        <div
          id="globe-realtime-hud"
          className="absolute top-20 left-6 z-20 flex flex-col gap-2 pointer-events-none"
        >
          {/* Pure Daylight Earth indicator badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full weather-gpt-pill text-xs font-mono text-amber-300 pointer-events-auto border border-amber-500/25 bg-black/60 shadow-lg backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-200 font-semibold tracking-wide">Daylight Earth</span>
            <span className="text-neutral-400 text-[10px]">({currentUtcString})</span>
          </div>

          {/* Quick HUD controls */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Toggle Rotation */}
            {onToggleAutoRotate && (
              <button
                id="toggle-globe-rotation-btn"
                onClick={onToggleAutoRotate}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  autoRotateGlobe
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-white/10 text-neutral-300 border border-white/10 hover:bg-white/15'
                }`}
                title="Toggle Earth orbital rotation"
              >
                <RotateCw className={`w-3 h-3 ${autoRotateGlobe ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                <span>{autoRotateGlobe ? 'Rotating' : 'Paused'}</span>
              </button>
            )}

            {/* Reset View */}
            <button
              id="reset-globe-view-btn"
              onClick={() => resetView()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-neutral-300 border border-white/10 hover:bg-white/15 hover:text-white transition-all"
              title="Reset to orbital perspective"
            >
              <Compass className="w-3 h-3 text-cyan-400" />
              <span>Orbit</span>
            </button>

            {/* Street Roads Trigger */}
            {onOpenStreetMap && (
              <button
                id="inspect-street-map-btn"
                onClick={onOpenStreetMap}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-sky-600/40 to-blue-600/40 text-sky-200 border border-sky-400/40 hover:border-sky-400 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
                title="Open high-precision street roads & navigation view"
              >
                <Route className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Street Roads</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ThreeGlobe.displayName = 'ThreeGlobe';
