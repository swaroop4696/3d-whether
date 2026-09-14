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
import { Sun, RotateCw, MapPin, Eye, Compass, Route, Map } from 'lucide-react';
import { isLandCoordinate, initSurfaceMaskFromImage } from '../utils/surfaceClassifier';

export interface ThreeGlobeProps {
  currentLat: number | null;
  currentLon: number | null;
  particleType: WeatherParticleType;
  onLocationSelected: (lat: number, lon: number) => void;
  onZoomThresholdCrossed?: (lat: number, lon: number) => void;
  autoRotateGlobe: boolean;
  onToggleAutoRotate?: () => void;
  onOpenStreetMap?: () => void;
  isMapViewActive?: boolean;
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
 * Enhanced with anisotropic texture filtering, micro-detail relief & bicubic smoothing to prevent pixelation on zoom
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

    // Procedural high-frequency micro-normal perturbation for zoom-in anti-pixelation
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vPosition);
      vec3 sunDir = normalize(uSunPosition);

      // Texture samples - pure high-res NASA daylight imagery
      vec4 dayColor = texture2D(uDayTexture, vUv);
      vec4 normalSample = texture2D(uNormalMap, vUv);
      float specularStrength = texture2D(uSpecularMap, vUv).r;

      // Realistic bump perturbation from NASA normal map + micro-topography on zoom
      vec3 bumpNorm = (normalSample.xyz * 2.0 - 1.0) * 0.18;
      
      // Micro-detail texture noise to break up pixel grid when zoomed in close
      float microDetail = (noise(vUv * 2048.0) - 0.5) * 0.04 * (1.0 - specularStrength);
      vec3 perturbedNormal = normalize(normal + bumpNorm + vec3(microDetail, microDetail, 0.0));

      // Daylight shading: base ambient 0.76 ensures NO dark night side anywhere on the planet!
      float sunDot = max(dot(perturbedNormal, sunDir), 0.0);
      float viewDot = max(dot(perturbedNormal, viewDir), 0.0);
      float daylight = 0.78 + sunDot * 0.28 + viewDot * 0.14;
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
      isMapViewActive = false,
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
    const manualZoomCrossedRef = useRef<boolean>(false);

    // Continuous 3D Marine surface zoom indicator when zooming over water
    const [isOverWater, setIsOverWater] = useState<boolean>(false);
    const [waterCoords, setWaterCoords] = useState<{ lat: number; lon: number } | null>(null);
    const isOverWaterRef = useRef<boolean>(false);

    // Daylight Earth view with UTC clock tracking
    const [currentUtcString, setCurrentUtcString] = useState<string>('');

    const isMapViewActiveRef = useRef(isMapViewActive);
    useEffect(() => {
      isMapViewActiveRef.current = isMapViewActive;
    }, [isMapViewActive]);

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
        // Correctly transform surface local coordinate to world space considering globe tilt
        const surfacePosWorld = globeGroupRef.current
          ? globeGroupRef.current.localToWorld(surfacePos.clone())
          : surfacePos;
        const normal = surfacePosWorld.clone().normalize();
        const targetCameraPos = normal.clone().multiplyScalar(altitude);
        const onLand = isLandCoordinate(lat, lon);

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
            // If location is on land, trigger threshold handoff
            if (onLand && !thresholdTriggered && dist <= 6.6) {
              thresholdTriggered = true;
              manualZoomCrossedRef.current = true;
              if (onThresholdCrossed) onThresholdCrossed();
            }
          },
          onComplete: () => {
            if (onLand && !thresholdTriggered && onThresholdCrossed) {
              thresholdTriggered = true;
              manualZoomCrossedRef.current = true;
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

        // Prevent immediate re-trigger while pulling back
        manualZoomCrossedRef.current = true;
        setIsOverWater(false);

        // Pull straight back along current camera view angle to full orbital distance 14.5
        const dir = camera.position.clone().normalize();
        let targetX = dir.x * 14.5;
        let targetY = dir.y * 14.5;
        let targetZ = dir.z * 14.5;
        if (isNaN(targetX) || dir.length() < 0.1) {
          targetX = 0;
          targetY = 4;
          targetZ = 14.5;
        }

        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(controls.target);

        gsap.to(camera.position, {
          x: targetX,
          y: targetY,
          z: targetZ,
          duration: 1.3,
          ease: 'power3.inOut',
          onUpdate: () => {
            camera.lookAt(0, 0, 0);
          },
          onComplete: () => {
            manualZoomCrossedRef.current = false;
            if (onComplete) onComplete();
          },
        });

        gsap.to(controls.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.1,
          ease: 'power2.out',
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
     * Updates 3D NASA FIRMS Active Wildfire Beacons with distinct models based on FRP & Intensity
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

        const isMega = fire.frp >= 140 || fire.brightness >= 340;
        const isCanopy = fire.frp >= 50 && fire.frp < 140;

        // Ground burn radius ring
        const groundRadius = isMega ? 0.12 : isCanopy ? 0.08 : 0.05;
        const groundGeom = new THREE.RingGeometry(groundRadius * 0.4, groundRadius, 24);
        const groundMat = new THREE.MeshBasicMaterial({
          color: isMega ? 0xdc2626 : isCanopy ? 0xff3700 : 0xf59e0b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isMega ? 0.9 : 0.75,
        });
        const groundMesh = new THREE.Mesh(groundGeom, groundMat);
        groundMesh.rotation.x = Math.PI / 2;
        groundMesh.userData = { type: 'fires', data: fire };
        fireContainer.add(groundMesh);

        // Vertical flame cone
        const flameHeight = isMega
          ? Math.min(0.48, 0.22 + (fire.frp / 400) * 0.26)
          : isCanopy
          ? Math.min(0.32, 0.14 + (fire.frp / 400) * 0.18)
          : 0.16;
        const flameWidth = isMega ? 0.055 : isCanopy ? 0.038 : 0.024;
        const flameGeom = new THREE.ConeGeometry(flameWidth, flameHeight, 14);
        const flameMat = new THREE.MeshBasicMaterial({
          color: isMega ? 0xff5500 : isCanopy ? 0xff7700 : 0xfbbf24,
          transparent: true,
          opacity: 0.92,
        });
        const flameMesh = new THREE.Mesh(flameGeom, flameMat);
        flameMesh.position.y = flameHeight / 2;
        flameMesh.userData = { type: 'fires', data: fire };
        fireContainer.add(flameMesh);

        // Glowing ember at tip
        const tipRadius = isMega ? 0.032 : isCanopy ? 0.022 : 0.016;
        const tipGeom = new THREE.SphereGeometry(tipRadius, 10, 10);
        const tipMat = new THREE.MeshBasicMaterial({ color: isMega ? 0xffffff : 0xffdd00 });
        const tipMesh = new THREE.Mesh(tipGeom, tipMat);
        tipMesh.position.y = flameHeight;
        tipMesh.userData = { type: 'fires', data: fire };
        fireContainer.add(tipMesh);

        // For Mega Fires: Add smoke puff sphere
        if (isMega) {
          const smokeGeom = new THREE.SphereGeometry(0.045, 8, 8);
          const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x334155,
            transparent: true,
            opacity: 0.65,
          });
          const smokeMesh = new THREE.Mesh(smokeGeom, smokeMat);
          smokeMesh.position.y = flameHeight + 0.05;
          smokeMesh.userData = { type: 'fires', data: fire };
          fireContainer.add(smokeMesh);
        }

        fireContainer.userData = { type: 'fires', data: fire };
        group.add(fireContainer);
      });
    }, []);

    /**
     * Updates 3D USGS Earthquake Shockwaves & Depths with distinct styles for shallow megathrust vs deep subduction
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

        const isMega = quake.magnitude >= 6.8;
        const isDeep = (quake.depth || 10) >= 60;
        const color = quake.magnitude >= 6.0 ? 0xef4444 : quake.magnitude >= 4.5 ? 0xf59e0b : 0xeab308;
        const radius = Math.max(0.06, (quake.magnitude / 8.0) * 0.24);

        // Concentric expanding shockwave ring
        const ringGeom = new THREE.RingGeometry(radius * 0.82, radius, 28);
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isMega ? 0.95 : 0.72,
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.userData = { type: 'earthquakes', data: quake };
        quakeContainer.add(ringMesh);

        // Center epicenter dot
        const dotRadius = isMega ? 0.035 : 0.024;
        const dotGeom = new THREE.SphereGeometry(dotRadius, 12, 12);
        const dotMat = new THREE.MeshBasicMaterial({ color });
        const dotMesh = new THREE.Mesh(dotGeom, dotMat);
        dotMesh.userData = { type: 'earthquakes', data: quake };
        quakeContainer.add(dotMesh);

        // Subsurface hypocenter depth spike
        const depthLen = Math.min(0.45, Math.max(0.06, (quake.depth / 200) * 0.35));
        const stemGeom = new THREE.CylinderGeometry(0.007, 0.007, depthLen, 8);
        const stemMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isDeep ? 0.85 : 0.5 });
        const stemMesh = new THREE.Mesh(stemGeom, stemMat);
        stemMesh.position.y = -depthLen / 2;
        stemMesh.userData = { type: 'earthquakes', data: quake };
        quakeContainer.add(stemMesh);

        // If Mega: Add secondary outer shockwave ring
        if (isMega) {
          const outerRingGeom = new THREE.RingGeometry(radius * 1.35, radius * 1.45, 28);
          const outerRingMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
          });
          const outerRingMesh = new THREE.Mesh(outerRingGeom, outerRingMat);
          outerRingMesh.rotation.x = Math.PI / 2;
          outerRingMesh.userData = { type: 'earthquakes', data: quake };
          quakeContainer.add(outerRingMesh);
        }

        // If Deep Subduction: Add glowing core sphere at hypocenter depth
        if (isDeep) {
          const coreGeom = new THREE.SphereGeometry(0.028, 10, 10);
          const coreMat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
          const coreMesh = new THREE.Mesh(coreGeom, coreMat);
          coreMesh.position.y = -depthLen;
          coreMesh.userData = { type: 'earthquakes', data: quake };
          quakeContainer.add(coreMesh);
        }

        quakeContainer.userData = { type: 'earthquakes', data: quake };
        group.add(quakeContainer);
      });
    }, []);

    /**
     * Updates 3D OpenSky Live Aircraft Vector Positions with distinct models for Fighters, Helicopters, and Airliners
     */
    const updateFlightsLayer = useCallback((flightList: LiveFlight[], visible: boolean) => {
      if (!flightsGroupRef.current) return;
      const group = flightsGroupRef.current;
      group.clear();
      group.visible = visible;
      if (!visible) return;

      flightList.forEach((flight) => {
        const flightContainer = new THREE.Group();
        const altOffset = 0.12 + Math.min(0.16, (flight.altitude / 15000) * 0.1);
        const pos = latLonToVector3(flight.lat, flight.lon, 5.0 + altOffset);
        flightContainer.position.copy(pos);

        const normal = pos.clone().normalize();
        flightContainer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        const isFighter = !!(flight.callsign?.match(/VIPER|TOPCAT|GHOST|SWIFT|REACH|RCH|F16|F35|TYPHOON|JAS|MIG|SU/i) || flight.velocity > 230);
        const isHelicopter = !!(flight.callsign?.match(/MED|HELI|POLICE|RESCUE|LIFE|AIR1|H60|CH47|UH60/i) || (flight.altitude < 1800 && flight.velocity < 80));

        const planeGroup = new THREE.Group();

        if (isHelicopter) {
          // Rotorcraft model with spinning rotor blur
          const cabinGeom = new THREE.BoxGeometry(0.024, 0.02, 0.05);
          const cabinMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
          const cabinMesh = new THREE.Mesh(cabinGeom, cabinMat);
          planeGroup.add(cabinMesh);

          // Rotor disc
          const rotorGeom = new THREE.RingGeometry(0.005, 0.042, 16);
          const rotorMat = new THREE.MeshBasicMaterial({
            color: 0x6ee7b7,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
          });
          const rotorMesh = new THREE.Mesh(rotorGeom, rotorMat);
          rotorMesh.name = 'helicopterRotor';
          rotorMesh.rotation.x = Math.PI / 2;
          rotorMesh.position.y = 0.015;
          planeGroup.add(rotorMesh);
        } else if (isFighter) {
          // Sleek Delta Wing Fighter
          const fuseGeom = new THREE.ConeGeometry(0.014, 0.09, 6);
          fuseGeom.rotateX(Math.PI / 2);
          const fuseMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
          const fuseMesh = new THREE.Mesh(fuseGeom, fuseMat);
          fuseMesh.userData = { type: 'flights', data: flight };
          planeGroup.add(fuseMesh);

          const deltaGeom = new THREE.BufferGeometry();
          const deltaVerts = new Float32Array([
            0, 0, -0.04,   // nose
            0.05, 0, 0.035, // right wing
            -0.05, 0, 0.035 // left wing
          ]);
          deltaGeom.setAttribute('position', new THREE.BufferAttribute(deltaVerts, 3));
          deltaGeom.computeVertexNormals();
          const deltaMat = new THREE.MeshBasicMaterial({ color: 0xf87171, side: THREE.DoubleSide });
          const deltaMesh = new THREE.Mesh(deltaGeom, deltaMat);
          planeGroup.add(deltaMesh);

          // Glowing afterburner dot
          const afterburnerGeom = new THREE.SphereGeometry(0.008, 6, 6);
          const afterburnerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
          const afterburnerMesh = new THREE.Mesh(afterburnerGeom, afterburnerMat);
          afterburnerMesh.position.z = 0.042;
          planeGroup.add(afterburnerMesh);
        } else {
          // Commercial Airliner (Fuselage + Swept Wings + Twin Contrails)
          const fuseGeom = new THREE.CylinderGeometry(0.012, 0.008, 0.08, 8);
          const fuseMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
          const fuseMesh = new THREE.Mesh(fuseGeom, fuseMat);
          fuseMesh.rotation.x = Math.PI / 2;
          fuseMesh.userData = { type: 'flights', data: flight };
          planeGroup.add(fuseMesh);

          const wingGeom = new THREE.BoxGeometry(0.095, 0.004, 0.02);
          const wingMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
          const wingMesh = new THREE.Mesh(wingGeom, wingMat);
          wingMesh.position.z = -0.01;
          wingMesh.userData = { type: 'flights', data: flight };
          planeGroup.add(wingMesh);

          // Twin subtle contrails behind wings
          [-0.03, 0.03].forEach((offset) => {
            const contrailGeom = new THREE.CylinderGeometry(0.002, 0.005, 0.06, 4);
            contrailGeom.rotateX(Math.PI / 2);
            const contrailMat = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.45,
            });
            const contrailMesh = new THREE.Mesh(contrailGeom, contrailMat);
            contrailMesh.position.set(offset, -0.002, 0.05);
            planeGroup.add(contrailMesh);
          });
        }

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
        controlsRef.current.autoRotate = !isMapViewActive && autoRotateGlobe;
      }
    }, [isMapViewActive, autoRotateGlobe]);

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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
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
      // Allow deep close-up marine surface inspection (radius is 5.0)
      controls.minDistance = 5.08;
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

      // 8. High-Resolution NASA Textures (4K Ultra-HD Daytime Textures with Anisotropic Filtering)
      const textureLoader = new THREE.TextureLoader();
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

      const dayTexture = textureLoader.load(
        '/textures/earth_atmos_4096.jpg',
        (tex) => {
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = maxAnisotropy;
          tex.needsUpdate = true;
        },
        undefined,
        () => {
          dayTexture.image = textureLoader.load('/textures/earth_atmos_2048.jpg').image;
        }
      );

      const normalTexture = textureLoader.load(
        '/textures/earth_bump_4096.jpg',
        (tex) => {
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = maxAnisotropy;
          tex.needsUpdate = true;
        },
        undefined,
        () => {
          normalTexture.image = textureLoader.load('/textures/earth_normal_2048.jpg').image;
        }
      );

      const specularTexture = textureLoader.load('/textures/earth_specular_2048.jpg', (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = maxAnisotropy;
        tex.needsUpdate = true;
        if (tex.image) {
          initSurfaceMaskFromImage(tex.image);
        }
      });

      const cloudsTexture = textureLoader.load(
        '/textures/earth_clouds_4096.jpg',
        (tex) => {
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = maxAnisotropy;
          tex.needsUpdate = true;
        },
        undefined,
        () => {
          cloudsTexture.image = textureLoader.load('/textures/earth_clouds_1024.png').image;
        }
      );

      [dayTexture, normalTexture, specularTexture, cloudsTexture].forEach((tex) => {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = maxAnisotropy;
      });

      // 9. Earth Sphere Mesh (Ultra smooth 160x160 sphere, 100% Day Illumination)
      const earthGeometry = new THREE.SphereGeometry(5.0, 160, 160);
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

      // 10. Floating Cloud Layer (radius 5.06, 128x128)
      const cloudsGeometry = new THREE.SphereGeometry(5.06, 128, 128);
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
            const fireData = fGroup.userData?.data;
            const isMega = fireData?.frp >= 140;
            const tipMesh = fGroup.children[2];
            if (tipMesh) {
              const freq = isMega ? 10.0 : 6.5;
              const flicker = (isMega ? 1.0 : 0.8) + Math.sin(elapsedTime * freq + idx * 1.7) * (isMega ? 0.45 : 0.25);
              tipMesh.scale.set(flicker, flicker, flicker);
            }
            // Animate secondary smoke plume puff for mega fires
            const smokeMesh = fGroup.children[3];
            if (smokeMesh) {
              const smokePulse = 1.0 + Math.sin(elapsedTime * 3.2 + idx) * 0.25;
              smokeMesh.scale.set(smokePulse, smokePulse, smokePulse);
            }
          });
        }

        if (quakesGroupRef.current && activeLayers.earthquakes) {
          quakesGroupRef.current.children.forEach((qGroup: any, idx) => {
            const quakeData = qGroup.userData?.data;
            const isMega = (quakeData?.magnitude || 0) >= 6.8;
            const ringMesh = qGroup.children[0];
            if (ringMesh) {
              const waveSpeed = isMega ? 4.5 : 3.2;
              const waveAmp = isMega ? 0.35 : 0.2;
              const wave = 1.0 + Math.sin(elapsedTime * waveSpeed + idx * 0.8) * waveAmp;
              ringMesh.scale.set(wave, wave, 1);
            }
            // Secondary outer ring for mega quakes
            const outerRing = qGroup.children[3];
            if (outerRing) {
              const outerWave = 1.0 + Math.cos(elapsedTime * 4.0 + idx * 0.8) * 0.3;
              outerRing.scale.set(outerWave, outerWave, 1);
            }
          });
        }

        if (flightsGroupRef.current && activeLayers.flights) {
          flightsGroupRef.current.children.forEach((flightGroup: any) => {
            // Spin helicopter rotor blur disc
            const rotor = flightGroup.getObjectByName('helicopterRotor');
            if (rotor) {
              rotor.rotation.y += 0.45;
            }

            if (flightGroup.userData) {
              const bob = Math.sin(elapsedTime * 2.5 + (flightGroup.userData.heading || 0)) * 0.003;
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

        // Intelligent Proximity Monitoring: automatically transitions to high-detail map when user zooms into the globe
        if (!isMapViewActiveRef.current) {
          const camDistance = camera.position.length();

          // Calculate surface coordinate centered in viewport (camera position vector pointed at origin)
          const camNorm = camera.position.clone().normalize();
          const worldLookPoint = camNorm.clone().multiplyScalar(5.0);
          const localPoint = globeGroupRef.current
            ? globeGroupRef.current.worldToLocal(worldLookPoint.clone())
            : worldLookPoint;
          const { lat, lon } = vector3ToLatLon(localPoint, 5.0);
          const onLand = isLandCoordinate(lat, lon);

          // If zoomed in close (distance <= 6.20), trigger seamless transition to Google Map!
          // Radius is 5.0. 6.20 gives a natural, responsive zoom hand-off as the user zooms toward any point on Earth.
          if (camDistance <= 6.20 && onZoomThresholdCrossedRef.current && !manualZoomCrossedRef.current) {
            manualZoomCrossedRef.current = true;
            if (isOverWaterRef.current) {
              isOverWaterRef.current = false;
              setIsOverWater(false);
            }
            const roundedLat = Math.round(lat * 10000) / 10000;
            const roundedLon = Math.round(lon * 10000) / 10000;
            onZoomThresholdCrossedRef.current(roundedLat, roundedLon);
          } else if (!onLand && camDistance > 6.20 && isOverWaterRef.current) {
            isOverWaterRef.current = false;
            setIsOverWater(false);
          }

          if (camDistance > 6.45) {
            manualZoomCrossedRef.current = false;
            if (isOverWaterRef.current) {
              isOverWaterRef.current = false;
              setIsOverWater(false);
            }
          }
        }

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
        {/* Ocean Surface Continuous Zoom Telemetry Badge */}
        {isOverWater && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full bg-[#081528]/95 border border-cyan-400/50 shadow-2xl backdrop-blur-xl text-xs text-cyan-200 animate-fade-in">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
            </span>
            <span className="font-semibold tracking-wide">🌊 Ocean Waters • Continuous 3D Marine Surface Zoom</span>
            <span className="font-mono text-[10px] text-cyan-300/80">
              {waterCoords ? `(${waterCoords.lat.toFixed(2)}°, ${waterCoords.lon.toFixed(2)}°)` : ''}
            </span>
          </div>
        )}

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

            {/* Map & Street Roads Trigger */}
            {onOpenStreetMap && (
              <button
                id="inspect-street-map-btn"
                onClick={onOpenStreetMap}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 hover:bg-emerald-500/40 hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer"
                title="Open 2D high-precision map, streets & live traffic"
              >
                <Map className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open Map</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ThreeGlobe.displayName = 'ThreeGlobe';
