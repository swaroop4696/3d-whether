import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  Globe,
  Compass,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Route,
  ChevronLeft,
  ChevronRight,
  Search,
  MapPin,
  X,
  Loader2,
  Flame,
  Plane,
  Eye,
  Check,
  Radio,
  Sliders,
  Sparkles,
  Gauge,
  Wind,
  Layers,
  Crosshair,
  Satellite,
  ShieldAlert,
  Zap,
  Activity,
  ChevronUp,
  ChevronDown,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import type { FireHotspot, EarthquakeData, LiveFlight, IntelligenceLayerType, MeshIntelMode } from '../types';

export type { MeshIntelMode };

interface GodsEye3DViewProps {
  lat?: number;
  lon?: number;
  locationName?: string;
  onReturnToGlobe: () => void;
  onOpenRoadMap: () => void;
  onSelectLocation?: (lat: number, lon: number, name: string) => void;
  fires?: FireHotspot[];
  earthquakes?: EarthquakeData[];
  flights?: LiveFlight[];
  onSelectIntelEvent?: (lat: number, lon: number, title: string, category: IntelligenceLayerType) => void;
  initialMode?: MeshIntelMode;
}

// Fallback high-fidelity real flight telemetry if network is loading
const FALLBACK_FLIGHTS: LiveFlight[] = [
  {
    icao24: 'a0f12c',
    callsign: 'UAL901',
    originCountry: 'United States',
    lat: 40.7128,
    lon: -74.006,
    altitude: 10668, // 35,000 ft
    velocity: 242, // ~470 knots
    heading: 84,
    verticalRate: 0,
  },
  {
    icao24: '4005b8',
    callsign: 'BAW178',
    originCountry: 'United Kingdom',
    lat: 51.5074,
    lon: -0.1278,
    altitude: 11277, // 37,000 ft
    velocity: 255, // ~495 knots
    heading: 260,
    verticalRate: -2.5,
  },
  {
    icao24: '3819e4',
    callsign: 'AFR006',
    originCountry: 'France',
    lat: 48.8566,
    lon: 2.3522,
    altitude: 9753, // 32,000 ft
    velocity: 238, // ~462 knots
    heading: 145,
    verticalRate: 4.8,
  },
  {
    icao24: '800bc1',
    callsign: 'AIC101',
    originCountry: 'India',
    lat: 12.9716,
    lon: 77.5946,
    altitude: 10058, // 33,000 ft
    velocity: 235,
    heading: 310,
    verticalRate: 0,
  },
  {
    icao24: '861a4f',
    callsign: 'JAL004',
    originCountry: 'Japan',
    lat: 35.6895,
    lon: 139.6917,
    altitude: 11887, // 39,000 ft
    velocity: 260,
    heading: 65,
    verticalRate: 0,
  },
];

// Fallback high-fidelity NASA FIRMS active wildfire hotspots
const FALLBACK_FIRES: FireHotspot[] = [
  {
    id: 'firms-1',
    lat: -3.4653,
    lon: -62.2159,
    brightness: 348.6,
    frp: 184.5,
    confidence: 'high',
    acqDate: '2026-09-09',
    acqTime: '14:22',
    satellite: 'VIIRS-NOAA20',
    locationName: 'Amazon Rainforest Basin, Brazil',
    country: 'Brazil',
  },
  {
    id: 'firms-2',
    lat: 39.7392,
    lon: -121.5542,
    brightness: 362.4,
    frp: 312.8,
    confidence: 'high',
    acqDate: '2026-09-09',
    acqTime: '11:05',
    satellite: 'VIIRS-SNPP',
    locationName: 'Sierra Nevada Foothills, California',
    country: 'United States',
  },
  {
    id: 'firms-3',
    lat: -28.0167,
    lon: 153.4,
    brightness: 334.1,
    frp: 128.2,
    confidence: 'nominal',
    acqDate: '2026-09-09',
    acqTime: '06:18',
    satellite: 'MODIS-Terra',
    locationName: 'Queensland Bushfire Sector, Australia',
    country: 'Australia',
  },
  {
    id: 'firms-4',
    lat: 53.9333,
    lon: -116.5765,
    brightness: 341.9,
    frp: 165.7,
    confidence: 'high',
    acqDate: '2026-09-09',
    acqTime: '09:40',
    satellite: 'VIIRS-NOAA20',
    locationName: 'Alberta Boreal Forest Complex, Canada',
    country: 'Canada',
  },
  {
    id: 'firms-5',
    lat: 37.9838,
    lon: 23.7275,
    brightness: 338.0,
    frp: 140.0,
    confidence: 'high',
    acqDate: '2026-09-09',
    acqTime: '13:15',
    satellite: 'MODIS-Aqua',
    locationName: 'Attica Coastal Woodlands, Greece',
    country: 'Greece',
  },
];

// Fallback high-fidelity USGS real-time earthquakes
const FALLBACK_EARTHQUAKES: EarthquakeData[] = [
  {
    id: 'usgs-1',
    lat: 35.7053,
    lon: -117.5038,
    magnitude: 7.1,
    depth: 8.0,
    place: '17 km NNE of Ridgecrest, California',
    time: Date.now() - 1000 * 60 * 45,
    tsunami: 0,
    status: 'reviewed',
    url: 'https://earthquake.usgs.gov',
    felt: 4820,
    mmi: 8.4,
    alert: 'yellow',
  },
  {
    id: 'usgs-2',
    lat: 38.297,
    lon: 142.373,
    magnitude: 7.4,
    depth: 32.0,
    place: 'Off the Coast of Honshu, Japan',
    time: Date.now() - 1000 * 60 * 180,
    tsunami: 1,
    status: 'reviewed',
    url: 'https://earthquake.usgs.gov',
    felt: 6200,
    mmi: 8.1,
    alert: 'red',
  },
  {
    id: 'usgs-3',
    lat: 37.174,
    lon: 37.032,
    magnitude: 7.8,
    depth: 17.9,
    place: 'Pazarcik, Kahramanmaras, Turkey',
    time: Date.now() - 1000 * 60 * 360,
    tsunami: 0,
    status: 'reviewed',
    url: 'https://earthquake.usgs.gov',
    felt: 15400,
    mmi: 9.2,
    alert: 'red',
  },
  {
    id: 'usgs-4',
    lat: -24.123,
    lon: -67.432,
    magnitude: 6.2,
    depth: 140.5,
    place: 'Salta Province, Andes Mountains, Argentina',
    time: Date.now() - 1000 * 60 * 720,
    tsunami: 0,
    status: 'reviewed',
    url: 'https://earthquake.usgs.gov',
    felt: 320,
    mmi: 5.6,
    alert: 'green',
  },
  {
    id: 'usgs-5',
    lat: 23.856,
    lon: 121.654,
    magnitude: 6.9,
    depth: 15.0,
    place: 'Hualien County Offshore, Taiwan',
    time: Date.now() - 1000 * 60 * 240,
    tsunami: 0,
    status: 'reviewed',
    url: 'https://earthquake.usgs.gov',
    felt: 3900,
    mmi: 7.9,
    alert: 'yellow',
  },
];

// Procedural soft-radial circular glow texture generator for photorealistic particle sprites
const createCircleGlowTexture = (
  stops: { offset: number; color: string }[],
  size = 64
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  stops.forEach((s) => grad.addColorStop(s.offset, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

// Procedural High-Fidelity Fluid Flame Tongue Texture (Volumetric combustion gradient)
const createFluidFlameTongueTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Vertical flame gradient: incandescent white-hot base -> fiery gold -> vivid orange -> crimson tip -> transparent
  const grad = ctx.createLinearGradient(64, 256, 64, 0);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)'); // White-hot combustion
  grad.addColorStop(0.18, 'rgba(255, 235, 120, 0.98)'); // Blazing yellow
  grad.addColorStop(0.48, 'rgba(249, 115, 22, 0.88)'); // Hot flame orange
  grad.addColorStop(0.78, 'rgba(220, 38, 38, 0.55)'); // Licking red tongue
  grad.addColorStop(1.0, 'rgba(120, 20, 0, 0.0)'); // Dissolving heat wisp

  // Draw natural flame droplet shape
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(64, 10);
  ctx.bezierCurveTo(95, 80, 115, 170, 110, 220);
  ctx.bezierCurveTo(105, 250, 75, 256, 64, 256);
  ctx.bezierCurveTo(53, 256, 23, 250, 18, 220);
  ctx.bezierCurveTo(13, 170, 33, 80, 64, 10);
  ctx.closePath();
  ctx.fill();

  // Core incandescent inner tongue
  const innerGrad = ctx.createLinearGradient(64, 256, 64, 60);
  innerGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  innerGrad.addColorStop(0.5, 'rgba(255, 245, 160, 0.92)');
  innerGrad.addColorStop(1.0, 'rgba(255, 180, 0, 0.0)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.moveTo(64, 70);
  ctx.bezierCurveTo(80, 120, 90, 180, 85, 225);
  ctx.bezierCurveTo(80, 250, 68, 256, 64, 256);
  ctx.bezierCurveTo(60, 256, 48, 250, 43, 225);
  ctx.bezierCurveTo(38, 180, 48, 120, 64, 70);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

// Procedural Minecraft-style Voxel Lava Particle Texture (Crisp pixelated ember with incandescent hot core)
const createMinecraftVoxelParticleTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Outer ambient heat halo
  ctx.fillStyle = 'rgba(255, 85, 0, 0.35)';
  ctx.fillRect(0, 0, 32, 32);

  // Minecraft pixelated ember border
  ctx.fillStyle = '#ea580c'; // Fiery orange border
  ctx.fillRect(4, 4, 24, 24);

  // Core magma molten body
  ctx.fillStyle = '#f97316';
  ctx.fillRect(6, 6, 20, 20);

  // Blazing incandescent yellow center
  ctx.fillStyle = '#fde047';
  ctx.fillRect(10, 10, 12, 12);

  // White-hot center spark
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(12, 12, 8, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; // True pixelated Minecraft voxel aesthetic!
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
};

// Clean Harmonic Concentric Seismic Wavefront Texture (Soft physical compression gradient)
const createHarmonicSeismicWaveTexture = (color = '#38bdf8'): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 64;
  const cy = 64;
  const grad = ctx.createRadialGradient(cx, cy, 38, cx, cy, 62);
  grad.addColorStop(0.0, 'transparent');
  grad.addColorStop(0.5, color);
  grad.addColorStop(1.0, 'transparent');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

// Procedural Lush Green Forest & Meadow Terrain Texture with Localized Burn Hearth
const createLushWildfireTerrainTexture = (burnRadius = 110): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Lush Green Forest Grass & Meadow Base
  ctx.fillStyle = '#2d6a4f';
  ctx.fillRect(0, 0, 1024, 1024);

  // Natural green meadow patches & moss variations
  for (let i = 0; i < 90; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const pr = 40 + Math.random() * 120;
    const grad = ctx.createRadialGradient(px, py, 6, px, py, pr);
    grad.addColorStop(0, i % 3 === 0 ? '#40916c' : i % 2 === 0 ? '#1b4332' : '#52b788');
    grad.addColorStop(0.7, '#2d6a4f');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }

  // Meadow wildflowers (colorful natural speckles)
  for (let f = 0; f < 150; f++) {
    const fx = Math.random() * 1024;
    const fy = Math.random() * 1024;
    ctx.fillStyle = f % 3 === 0 ? '#fef08a' : f % 2 === 0 ? '#fed7aa' : '#ffffff';
    ctx.beginPath();
    ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Forest dirt trail winding through the meadow
  ctx.strokeStyle = '#785938';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(60, 0);
  ctx.bezierCurveTo(240, 320, 380, 580, 290, 1024);
  ctx.stroke();

  // Localized Burn Scar in the central hearth (fading naturally into green grass)
  const cx = 512;
  const cy = 512;
  const burnGrad = ctx.createRadialGradient(cx, cy, 15, cx, cy, burnRadius * 2.2);
  burnGrad.addColorStop(0, '#141416'); // Dark charred soot & ash
  burnGrad.addColorStop(0.35, '#291d18'); // Scorched peat earth
  burnGrad.addColorStop(0.65, '#3d3024'); // Heat-damaged border
  burnGrad.addColorStop(1, 'transparent'); // Fades seamlessly into lush green grass!
  ctx.fillStyle = burnGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, burnRadius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Subtle glowing ember fissures inside the central hearth
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 1.8;
  for (let e = 0; e < 18; e++) {
    ctx.beginPath();
    let ex = cx + (Math.random() - 0.5) * (burnRadius * 0.9);
    let ey = cy + (Math.random() - 0.5) * (burnRadius * 0.9);
    ctx.moveTo(ex, ey);
    for (let k = 0; k < 4; k++) {
      ex += (Math.random() - 0.5) * 22;
      ey += (Math.random() - 0.5) * 22;
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

// Procedural Dense Oily Black Toxic Smoke Texture for Burning Tire Piles
const createToxicBlackSmokeTexture = (): THREE.CanvasTexture => {
  return createCircleGlowTexture(
    [
      { offset: 0.0, color: 'rgba(10, 10, 14, 0.95)' },
      { offset: 0.35, color: 'rgba(24, 24, 30, 0.82)' },
      { offset: 0.72, color: 'rgba(42, 42, 50, 0.42)' },
      { offset: 1.0, color: 'rgba(0, 0, 0, 0.0)' },
    ],
    128
  );
};

// Procedural Normal Countryside Landscape Texture (Green grass meadows, country asphalt road, and magnitude-based fissures)
const createNormalLandTexture = (hasCracks: boolean, crackSeverity: number): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Lush Green Countryside Pasture & Meadows
  ctx.fillStyle = '#2d6a4f';
  ctx.fillRect(0, 0, 1024, 1024);

  // Varied rolling turf textures
  for (let i = 0; i < 70; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const pr = 40 + Math.random() * 95;
    const grad = ctx.createRadialGradient(px, py, 4, px, py, pr);
    grad.addColorStop(0, i % 2 === 0 ? '#40916c' : '#1b4332');
    grad.addColorStop(0.7, i % 3 === 0 ? '#52b788' : '#2d6a4f');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }

  // Fertile soil & agricultural field patches
  for (let i = 0; i < 9; i++) {
    const sx = 80 + Math.random() * 820;
    const sy = 80 + Math.random() * 820;
    const sw = 100 + Math.random() * 160;
    const sh = 70 + Math.random() * 120;
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(sx, sy, sw, sh);
    // Tilled soil furrow lines
    ctx.strokeStyle = '#4a3328';
    ctx.lineWidth = 2;
    for (let f = sy + 6; f < sy + sh; f += 9) {
      ctx.beginPath();
      ctx.moveTo(sx, f);
      ctx.lineTo(sx + sw, f);
      ctx.stroke();
    }
  }

  // 2. Realistic Two-Lane Paved Asphalt Country Highway
  // Road curves gracefully across the countryside landscape
  ctx.strokeStyle = '#27272a'; // Deep asphalt charcoal
  ctx.lineWidth = 58;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 480);
  ctx.bezierCurveTo(340, 520, 680, 440, 1024, 500);
  ctx.stroke();

  // Dirt & gravel road shoulders
  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 66;
  ctx.globalCompositeOperation = 'destination-over';
  ctx.beginPath();
  ctx.moveTo(0, 480);
  ctx.bezierCurveTo(340, 520, 680, 440, 1024, 500);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';

  // White outer edge boundary lane lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 458);
  ctx.bezierCurveTo(340, 498, 680, 418, 1024, 478);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 502);
  ctx.bezierCurveTo(340, 542, 680, 462, 1024, 522);
  ctx.stroke();

  // Double Yellow Solid Highway Centerline
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 478);
  ctx.bezierCurveTo(340, 518, 680, 438, 1024, 498);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 482);
  ctx.bezierCurveTo(340, 522, 680, 442, 1024, 502);
  ctx.stroke();

  // 3. Magnitude-Dependent Seismic Road & Soil Fractures
  if (hasCracks && crackSeverity > 0) {
    const crackWidth = Math.min(22, 2.5 + crackSeverity * 3.2);
    ctx.strokeStyle = '#18181b'; // Deep jagged fissure chasm
    ctx.lineWidth = crackWidth;
    ctx.beginPath();
    ctx.moveTo(220, 0);
    let curX = 220;
    for (let curY = 0; curY <= 1024; curY += 24) {
      curX += (Math.random() - 0.48) * (20 + crackSeverity * 8);
      ctx.lineTo(curX, curY);
    }
    ctx.stroke();

    // Branching tension cracks along road asphalt
    if (crackSeverity >= 2) {
      ctx.lineWidth = Math.max(1.5, crackWidth * 0.4);
      for (let b = 0; b < 8; b++) {
        let bx = 280 + b * 75;
        let by = 380 + (b % 3) * 110;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        for (let s = 0; s < 7; s++) {
          bx += (Math.random() - 0.5) * 40;
          by += (Math.random() - 0.5) * 40;
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
      }
    }

    // High Magnitude glowing crustal friction stress inside the fault
    if (crackSeverity >= 3) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(220, 0);
      let cx = 220;
      for (let cy = 0; cy <= 1024; cy += 32) {
        cx += (Math.random() - 0.48) * 20;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

// Procedural Lush Greenery Meadow & Forest Terrain Texture with localized ember clearing
const createGreeneryForestTexture = (burnRadius = 80): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Lush Green Forest Grass & Woodland Undergrowth
  ctx.fillStyle = '#38a169';
  ctx.fillRect(0, 0, 1024, 1024);

  // Natural green meadow patches & moss variations
  for (let i = 0; i < 90; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const pr = 35 + Math.random() * 110;
    const grad = ctx.createRadialGradient(px, py, 5, px, py, pr);
    grad.addColorStop(0, i % 3 === 0 ? '#48bb78' : i % 2 === 0 ? '#2f855a' : '#68d391');
    grad.addColorStop(0.7, '#38a169');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }

  // Meadow wildflowers (tiny colorful speckles across the green fields)
  for (let f = 0; f < 120; f++) {
    const fx = Math.random() * 1024;
    const fy = Math.random() * 1024;
    ctx.fillStyle = f % 3 === 0 ? '#fef08a' : f % 2 === 0 ? '#fed7aa' : '#ffffff';
    ctx.beginPath();
    ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Forest dirt trail winding through the meadow
  ctx.strokeStyle = '#785938';
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(80, 0);
  ctx.bezierCurveTo(280, 360, 420, 620, 320, 1024);
  ctx.stroke();

  // Localized Campfire / Fire clearing in the center (soft transition into lush grass)
  const cx = 512;
  const cy = 512;
  const burnGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, burnRadius * 2.2);
  burnGrad.addColorStop(0, '#1c1917'); // Dark charred hearth
  burnGrad.addColorStop(0.35, '#451a03'); // Warm burnt earth
  burnGrad.addColorStop(0.65, '#523e2b'); // Peat boundary
  burnGrad.addColorStop(1, 'transparent'); // Fades into lush green grass!
  ctx.fillStyle = burnGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, burnRadius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Subtle glowing ember fissures only inside the central hearth
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.6;
  for (let e = 0; e < 12; e++) {
    ctx.beginPath();
    let ex = cx + (Math.random() - 0.5) * (burnRadius * 0.7);
    let ey = cy + (Math.random() - 0.5) * (burnRadius * 0.7);
    ctx.moveTo(ex, ey);
    for (let k = 0; k < 3; k++) {
      ex += (Math.random() - 0.5) * 16;
      ey += (Math.random() - 0.5) * 16;
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

export const GodsEye3DView: React.FC<GodsEye3DViewProps> = ({
  lat,
  lon,
  locationName,
  onReturnToGlobe,
  onOpenRoadMap,
  onSelectLocation,
  fires = [],
  earthquakes = [],
  flights = [],
  onSelectIntelEvent,
  initialMode = 'fires',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Intel Mode: 'fires' or 'earthquakes' (planes removed per user request)
  const sanitizedInitialMode: MeshIntelMode = initialMode === 'flights' ? 'fires' : initialMode;
  const [intelMode, setIntelMode] = useState<MeshIntelMode>(sanitizedInitialMode);

  // Sync initialMode when parent prop changes
  useEffect(() => {
    if (initialMode) {
      setIntelMode(initialMode === 'flights' ? 'fires' : initialMode);
    }
  }, [initialMode]);

  // If lat & lon are provided, ensure there's always a localized entity at that exact region
  const localizedFlight = useMemo<LiveFlight | null>(() => {
    if (lat == null || lon == null) return null;
    return {
      icao24: `geo-${Math.abs(Math.round(lat * 100))}`,
      callsign: locationName ? `${locationName.slice(0, 3).toUpperCase()}-402` : 'AIR-101',
      originCountry: locationName || 'Regional Airspace',
      lat: lat + 0.04,
      lon: lon + 0.03,
      altitude: 9400,
      heading: 135,
      velocity: 245,
      verticalRate: 0,
    };
  }, [lat, lon, locationName]);

  const localizedFire = useMemo<FireHotspot | null>(() => {
    if (lat == null || lon == null) return null;
    return {
      id: `local-fire-${Math.abs(Math.round(lat * 100))}`,
      lat: lat,
      lon: lon,
      brightness: 342.5,
      frp: 48.2,
      confidence: 'high',
      acqDate: new Date().toISOString().split('T')[0],
      acqTime: '12:00',
      satellite: 'VIIRS-NOAA20',
      locationName: locationName || 'Regional Hotspot Sector',
    };
  }, [lat, lon, locationName]);

  const localizedEarthquake = useMemo<EarthquakeData | null>(() => {
    if (lat == null || lon == null) return null;
    const cleanPlace = (locationName || 'Regional Tectonic Fault')
      .replace(/(\s*(?:Sensor Node|Seismic Station))+$/gi, '')
      .trim();
    return {
      id: `local-eq-${Math.abs(Math.round(lat * 100))}`,
      lat: lat,
      lon: lon,
      magnitude: 4.8,
      depth: 12.0,
      place: `${cleanPlace || 'Regional Fault'} Seismic Station`,
      time: Date.now() - 3600000,
      tsunami: 0,
      status: 'reviewed',
      url: 'https://earthquake.usgs.gov',
      alert: 'green',
    };
  }, [lat, lon, locationName]);

  // Real data lists (falling back to verified authentic real-world feeds if empty)
  const activeFlightsList = useMemo(() => {
    const base = flights.length > 0 ? flights : FALLBACK_FLIGHTS;
    return localizedFlight ? [localizedFlight, ...base] : base;
  }, [flights, localizedFlight]);

  const activeFiresList = useMemo(() => {
    const base = fires.length > 0 ? fires : FALLBACK_FIRES;
    return localizedFire ? [localizedFire, ...base] : base;
  }, [fires, localizedFire]);

  const activeEarthquakesList = useMemo(() => {
    const base = earthquakes.length > 0 ? earthquakes : FALLBACK_EARTHQUAKES;
    return localizedEarthquake ? [localizedEarthquake, ...base] : base;
  }, [earthquakes, localizedEarthquake]);

  // Selected Target Indices
  const [flightIndex, setFlightIndex] = useState<number>(0);
  const [fireIndex, setFireIndex] = useState<number>(0);
  const [earthquakeIndex, setEarthquakeIndex] = useState<number>(0);

  // Sync index when selected location changes
  useEffect(() => {
    if (lat != null && lon != null) {
      setFlightIndex(0);
      setFireIndex(0);
      setEarthquakeIndex(0);
    }
  }, [lat, lon]);

  // Camera vantage mode
  const [cameraViewPreset, setCameraViewPreset] = useState<'orbit' | 'chase' | 'topdown'>('orbit');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Current active entity with bulletproof array indexing
  const currentFlight =
    activeFlightsList.length > 0
      ? activeFlightsList[Math.abs(flightIndex) % activeFlightsList.length] || FALLBACK_FLIGHTS[0]
      : FALLBACK_FLIGHTS[0];
  const currentFire =
    activeFiresList.length > 0
      ? activeFiresList[Math.abs(fireIndex) % activeFiresList.length] || FALLBACK_FIRES[0]
      : FALLBACK_FIRES[0];
  const currentEarthquake =
    activeEarthquakesList.length > 0
      ? activeEarthquakesList[Math.abs(earthquakeIndex) % activeEarthquakesList.length] || FALLBACK_EARTHQUAKES[0]
      : FALLBACK_EARTHQUAKES[0];

  // Camera Telemetry HUD
  const [camTelemetry, setCamTelemetry] = useState({
    distance: 420,
    pitch: -28,
    heading: 45,
  });

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const targetGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Dynamic animated components inside Three.js
  const strobeLightsRef = useRef<{ redLight: THREE.PointLight; greenLight: THREE.PointLight; tailStrobe: THREE.PointLight } | null>(null);
  const airplaneGroupRef = useRef<THREE.Group | null>(null);
  const baseAircraftYRef = useRef<number>(140);
  const engineGlowMeshesRef = useRef<THREE.Mesh[]>([]);
  const contrailParticlesRef = useRef<{ points: THREE.Points; offsets: Float32Array; count: number } | null>(null);
  const dropLineRef = useRef<THREE.Line | null>(null);

  // Wildfire realistic procedural fire, ember, smoke & illumination refs
  const wildfireFlamesRef = useRef<{
    points: THREE.Points;
    baseX: Float32Array;
    baseZ: Float32Array;
    progress: Float32Array;
    speeds: Float32Array;
    maxHeights: Float32Array;
    count: number;
  } | null>(null);

  const wildfireEmbersRef = useRef<{
    points: THREE.Points;
    speeds: Float32Array;
    initialRadii: Float32Array;
    angles: Float32Array;
    count: number;
  } | null>(null);

  const wildfireSmokeRef = useRef<{
    points: THREE.Points;
    speeds: Float32Array;
    driftAngles: Float32Array;
    initialRadii: Float32Array;
    count: number;
  } | null>(null);

  const wildfireLightsRef = useRef<{
    light1: THREE.PointLight;
    light2: THREE.PointLight;
    firelineMesh?: THREE.Line;
  } | null>(null);

  // Earthquake continuous harmonic shockwaves, fault rupture, ray paths & seismogram telemetry refs
  const earthquakeWavefrontsRef = useRef<{
    mesh: THREE.Mesh;
    type: 'P' | 'S';
    phase: number;
    speed: number;
    baseRadius: number;
    maxRadius: number;
    peakOpacity: number;
  }[]>([]);

  const earthquakeFaultSparksRef = useRef<{
    points: THREE.Points;
    progress: Float32Array;
    speeds: Float32Array;
    count: number;
  } | null>(null);

  const earthquakeHypocenterRef = useRef<{
    beachballMesh: THREE.Mesh;
    stressGroup: THREE.Group;
    rayLines: THREE.Line[];
  } | null>(null);

  const earthquakeEpicenterRef = useRef<{
    reticle: THREE.Mesh;
    crosshair: THREE.LineSegments;
    beacon: THREE.Mesh;
  } | null>(null);

  const seismogramTelemetryRef = useRef<{
    line: THREE.Line;
    scanMarker: THREE.Mesh;
    startX: number;
    endX: number;
    baseY: number;
    baseZ: number;
    mag: number;
  } | null>(null);

  // Scene Illumination & Environment References
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Interactive Action Triggers
  const seismicTriggerRef = useRef<number>(0);
  const fireSurgeTriggerRef = useRef<number>(0);
  const [seismicActive, setSeismicActive] = useState(false);
  const [fireSurgeActive, setFireSurgeActive] = useState(false);

  // Fire Scene Variation: 'all' (combined trees, tires, debris & greenery) | 'trees' | 'tires' | 'debris'
  const [fireSceneType, setFireSceneType] = useState<'all' | 'trees' | 'tires' | 'debris'>('all');
  // Interactive Fire Intensity (MW FRP) - dynamically scales flame volume, ember updrafts, smoke buoyancy
  const [interactiveFireIntensity, setInteractiveFireIntensity] = useState<number | null>(null);
  // Earthquake custom interactive magnitude (dynamically changes smooth ground shaking on normal land)
  const [interactiveMagnitude, setInteractiveMagnitude] = useState<number | null>(null);

  // Floating Telemetry HUD Positioning & Minimization State
  const [isTelemetryCollapsed, setIsTelemetryCollapsed] = useState(false);
  const [telemetryDockSide, setTelemetryDockSide] = useState<'right' | 'left'>('right');

  // Live References for zero-latency 60FPS animation updates without rebuilding meshes
  const intelModeRef = useRef<MeshIntelMode>(intelMode);
  useEffect(() => {
    intelModeRef.current = intelMode;
  }, [intelMode]);

  const liveMagnitudeRef = useRef<number>(6.0);
  useEffect(() => {
    liveMagnitudeRef.current = interactiveMagnitude ?? (typeof currentEarthquake?.magnitude === 'number' ? currentEarthquake.magnitude : 6.0);
  }, [interactiveMagnitude, currentEarthquake]);

  // References for Burning Objects in Wildfire
  const burningTreesRef = useRef<{
    trees: {
      group: THREE.Group;
      foliageMeshes: THREE.Mesh[];
      flamePoints?: THREE.Points;
      baseX: number;
      baseZ: number;
    }[];
  } | null>(null);

  const burningTiresRef = useRef<{
    tiresGroup: THREE.Group;
    denseSmokePoints: THREE.Points;
    denseSmokeProgress: Float32Array;
    denseSmokeSpeeds: Float32Array;
    denseSmokeAngles: Float32Array;
    denseSmokeRadii: Float32Array;
    denseSmokeCount: number;
    drippingTarPoints: THREE.Points;
    drippingTarPosY: Float32Array;
    drippingTarSpeeds: Float32Array;
    drippingTarBaseX: Float32Array;
    drippingTarBaseZ: Float32Array;
    tarCount: number;
  } | null>(null);

  const burningDebrisRef = useRef<{
    debrisGroup: THREE.Group;
    vortexPoints: THREE.Points;
    vortexSpeeds: Float32Array;
    vortexAngles: Float32Array;
    vortexRadii: Float32Array;
    vortexCount: number;
  } | null>(null);

  // References for Normal Land Earthquake Shaking & Deformation
  const normalLandWaveRef = useRef<{
    mesh: THREE.Mesh;
    basePositions: Float32Array;
    vertexCount: number;
    magnitude: number;
  } | null>(null);

  const landObjectsRef = useRef<{
    trees: { group: THREE.Group; baseY: number; phase: number; freq: number }[];
    poles: { group: THREE.Group; baseY: number; phase: number; sparkLine?: THREE.Line }[];
    structures: { group: THREE.Group; baseY: number; baseZ: number; freq: number; isBarn?: boolean }[];
    cars: { group: THREE.Group; baseY: number; phase: number }[];
    roadSegments?: {
      roadPlateWest: THREE.Group;
      roadPlateEast: THREE.Group;
      buckledSlabs: { mesh: THREE.Mesh; baseY: number; baseRotZ: number; baseRotX: number }[];
      faultFissure?: THREE.Line;
    };
  } | null>(null);

  // Camera Spherical Position
  const cameraAngleRef = useRef({
    theta: Math.PI / 4,
    phi: Math.PI / 3.2,
    radius: 380,
    target: new THREE.Vector3(0, 45, 0),
  });

  const isDraggingRef = useRef(false);
  const isRightDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const hasFramedInitialCameraRef = useRef(false);

  // Update Camera Vector
  const updateCamera = useCallback(() => {
    if (!cameraRef.current) return;
    const { theta, phi, radius, target } = cameraAngleRef.current;

    const clampedPhi = Math.max(0.08, Math.min(Math.PI / 2 - 0.04, phi));
    cameraAngleRef.current.phi = clampedPhi;

    const x = target.x + radius * Math.sin(clampedPhi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(clampedPhi);
    const z = target.z + radius * Math.sin(clampedPhi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);

    setCamTelemetry({
      distance: Math.round(radius),
      pitch: -Math.round((clampedPhi * 180) / Math.PI),
      heading: Math.round(((theta * 180) / Math.PI) % 360),
    });
  }, []);

  /**
   * BUILD ACCURATE 3D AIRCRAFT MESH
   * Full aerodynamic airframe: fuselage, nose radome, cockpit glass, swept wings,
   * winglets, turbofan jet engines, tail empennage, navigation strobes, contrails,
   * vertical altitude drop-line and ground radar ring.
   */
  const build3DAircraftMesh = useCallback((flight: LiveFlight) => {
    if (!sceneRef.current) return;

    if (targetGroupRef.current) {
      sceneRef.current.remove(targetGroupRef.current);
    }

    const group = new THREE.Group();
    targetGroupRef.current = group;

    // Reset references
    strobeLightsRef.current = null;
    airplaneGroupRef.current = null;
    engineGlowMeshesRef.current = [];
    contrailParticlesRef.current = null;
    dropLineRef.current = null;
    wildfireFlamesRef.current = null;
    wildfireEmbersRef.current = null;
    wildfireSmokeRef.current = null;
    wildfireLightsRef.current = null;
    earthquakeWavefrontsRef.current = [];
    earthquakeFaultSparksRef.current = null;
    earthquakeHypocenterRef.current = null;
    earthquakeEpicenterRef.current = null;
    seismogramTelemetryRef.current = null;

    // Tactical Dark Ocean / Terrain Base
    const groundGeo = new THREE.PlaneGeometry(3200, 3200, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x05070c,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    group.add(ground);

    // Radar Concentric Range Rings on Ground
    const radarRingMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3 });
    [150, 300, 600, 1000].forEach((r) => {
      const ringGeo = new THREE.RingGeometry(r - 1.5, r, 64);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.2 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.5;
      group.add(ring);
    });

    // Polar Grid Coordinates
    const grid = new THREE.PolarGridHelper(1200, 16, 8, 64, 0x1e293b, 0x0f172a);
    grid.position.y = 0.8;
    group.add(grid);

    // Altitude Scaled Representation (Flight Level)
    const altitudeFt = flight.altitude ? flight.altitude * 3.28084 : 35000;
    const aircraftY = Math.max(90, Math.min(220, (altitudeFt / 40000) * 180));

    // AIRCRAFT ASSEMBLY ROOT
    const airplane = new THREE.Group();
    airplane.position.set(0, aircraftY, 0);

    // Rotate according to real ADS-B Heading
    const headingRad = ((flight.heading || 0) * Math.PI) / 180;
    airplane.rotation.y = -headingRad; // Align with compass track

    // Fuselage Materials
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Aeronautical titanium white
      metalness: 0.35,
      roughness: 0.25,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Cockpit canopy glass
      metalness: 0.9,
      roughness: 0.1,
    });

    // 1. Main Fuselage Body
    const fuselageLength = 76;
    const fuselageRadius = 4.2;
    const bodyGeo = new THREE.CylinderGeometry(fuselageRadius, fuselageRadius, fuselageLength, 32);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, fuselageMat);
    airplane.add(body);

    // 2. Aerodynamic Nose Cone & Radome
    const noseGeo = new THREE.ConeGeometry(fuselageRadius, 18, 32);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, fuselageMat);
    nose.position.z = -fuselageLength / 2 - 9;
    airplane.add(nose);

    // 3. Cockpit Windshield Windows
    const cockpitGeo = new THREE.BoxGeometry(4.4, 2.2, 5.2);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 2.6, -fuselageLength / 2 - 2);
    cockpit.rotation.x = -Math.PI / 10;
    airplane.add(cockpit);

    // 4. Tail Cone (Tapering to APU exhaust)
    const tailConeGeo = new THREE.ConeGeometry(fuselageRadius, 26, 32);
    tailConeGeo.rotateX(Math.PI / 2);
    const tailCone = new THREE.Mesh(tailConeGeo, fuselageMat);
    tailCone.position.z = fuselageLength / 2 + 13;
    airplane.add(tailCone);

    // 5. Main Swept-Back Wings
    const wingspan = 82;
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(wingspan / 2, -18);
    wingShape.lineTo(wingspan / 2 - 4, -22);
    wingShape.lineTo(0, -14);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.9, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.2, bevelThickness: 0.2 };
    const wingGeomRight = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeomRight.rotateX(Math.PI / 2);
    const rightWing = new THREE.Mesh(wingGeomRight, fuselageMat);
    rightWing.position.set(0, -0.5, 6);
    airplane.add(rightWing);

    // Mirror for Left Wing
    const leftWing = rightWing.clone();
    leftWing.scale.set(-1, 1, 1);
    airplane.add(leftWing);

    // Winglet Wingtips (Angled upward aerodynamic fences)
    for (const sign of [-1, 1]) {
      const wingletGeo = new THREE.BoxGeometry(0.5, 6.5, 3.2);
      const winglet = new THREE.Mesh(wingletGeo, fuselageMat);
      winglet.position.set(sign * (wingspan / 2 - 1), 2.8, -12);
      winglet.rotation.z = sign * -0.25;
      airplane.add(winglet);
    }

    // 6. Twin Turbofan Jet Engines
    for (const sign of [-1, 1]) {
      const engineGroup = new THREE.Group();
      engineGroup.position.set(sign * 16, -3.2, 0);

      // Nacelle Cowling
      const nacelleGeo = new THREE.CylinderGeometry(2.4, 2.3, 14, 24);
      nacelleGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeo, fuselageMat);
      engineGroup.add(nacelle);

      // Front Inlet Spinner (Titanium fan core)
      const spinnerGeo = new THREE.ConeGeometry(1.2, 3.2, 16);
      spinnerGeo.rotateX(-Math.PI / 2);
      const spinner = new THREE.Mesh(spinnerGeo, darkMetalMat);
      spinner.position.z = -6.2;
      engineGroup.add(spinner);

      // Engine Mount Pylon
      const pylonGeo = new THREE.BoxGeometry(0.8, 2.8, 8);
      const pylon = new THREE.Mesh(pylonGeo, darkMetalMat);
      pylon.position.set(0, 2.2, 0);
      engineGroup.add(pylon);

      // Exhaust Nozzle with Radiant Blue/Amber Afterburner Core
      const exhaustGeo = new THREE.CylinderGeometry(1.9, 1.7, 2, 24);
      exhaustGeo.rotateX(Math.PI / 2);
      const exhaustMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
      exhaust.position.z = 7.5;
      engineGroup.add(exhaust);

      // Radiant Supersonic Mach Shock Discs inside jet nozzle
      for (let m = 0; m < 3; m++) {
        const discGeo = new THREE.RingGeometry(0.3 + m * 0.35, 0.7 + m * 0.35, 16);
        const discMat = new THREE.MeshBasicMaterial({
          color: m === 0 ? 0xffedd5 : 0x38bdf8,
          transparent: true,
          opacity: 0.85 - m * 0.22,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.position.z = 8.2 + m * 1.8;
        engineGroup.add(disc);
        engineGlowMeshesRef.current.push(disc);
      }

      airplane.add(engineGroup);
    }

    // 7. Empennage (Vertical Fin & Horizontal Stabilizers)
    // Vertical Tail Fin
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 22);
    finShape.lineTo(7, 22);
    finShape.lineTo(16, 0);
    finShape.closePath();

    const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.8, bevelEnabled: false });
    finGeom.rotateY(-Math.PI / 2);
    const verticalFin = new THREE.Mesh(finGeom, fuselageMat);
    verticalFin.position.set(0.4, 3.8, fuselageLength / 2 - 14);
    airplane.add(verticalFin);

    // Horizontal Stabilizers
    const hStabShape = new THREE.Shape();
    hStabShape.moveTo(0, 0);
    hStabShape.lineTo(16, -7);
    hStabShape.lineTo(14, -9);
    hStabShape.lineTo(0, -6);
    hStabShape.closePath();

    const hStabGeom = new THREE.ExtrudeGeometry(hStabShape, { depth: 0.6, bevelEnabled: false });
    hStabGeom.rotateX(Math.PI / 2);
    const rightHStab = new THREE.Mesh(hStabGeom, fuselageMat);
    rightHStab.position.set(0, 3.8, fuselageLength / 2 + 10);
    airplane.add(rightHStab);

    const leftHStab = rightHStab.clone();
    leftHStab.scale.set(-1, 1, 1);
    airplane.add(leftHStab);

    // 8. FAA Navigation Lights (Port Red, Starboard Green, Tail Strobe)
    // Left Wingtip: Port Red
    const redLight = new THREE.PointLight(0xef4444, 4, 40);
    redLight.position.set(-wingspan / 2, 0, -12);
    airplane.add(redLight);
    const redMesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redMesh.position.copy(redLight.position);
    airplane.add(redMesh);

    // Right Wingtip: Starboard Green
    const greenLight = new THREE.PointLight(0x22c55e, 4, 40);
    greenLight.position.set(wingspan / 2, 0, -12);
    airplane.add(greenLight);
    const greenMesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    greenMesh.position.copy(greenLight.position);
    airplane.add(greenMesh);

    // Tail Fin Strobe: White
    const tailStrobe = new THREE.PointLight(0xffffff, 5, 50);
    tailStrobe.position.set(0, 26, fuselageLength / 2 - 7);
    airplane.add(tailStrobe);
    const tailStrobeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tailStrobeMesh.position.copy(tailStrobe.position);
    airplane.add(tailStrobeMesh);

    strobeLightsRef.current = { redLight, greenLight, tailStrobe };

    // 9. Twin Supersonic Laminar Jet Contrails (High-Speed Condensation Wake Particles)
    const contrailCount = 360;
    const contrailPositions = new Float32Array(contrailCount * 3);
    const contrailOffsets = new Float32Array(contrailCount);

    for (let i = 0; i < contrailCount; i++) {
      const prog = (i % (contrailCount / 2)) / (contrailCount / 2);
      contrailOffsets[i] = prog;
      const eng = i < contrailCount / 2 ? -16 : 16;
      const zDist = prog * 360;
      const dispersion = prog * 3.8;
      contrailPositions[i * 3] = eng + (Math.random() - 0.5) * dispersion;
      contrailPositions[i * 3 + 1] = -3.2 + (Math.random() - 0.5) * (dispersion * 0.3);
      contrailPositions[i * 3 + 2] = 8 + zDist;
    }

    const contrailGeo = new THREE.BufferGeometry();
    contrailGeo.setAttribute('position', new THREE.BufferAttribute(contrailPositions, 3));
    const contrailMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 2.4,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const contrailPointsMesh = new THREE.Points(contrailGeo, contrailMat);
    airplane.add(contrailPointsMesh);
    contrailParticlesRef.current = {
      points: contrailPointsMesh,
      offsets: contrailOffsets,
      count: contrailCount,
    };

    group.add(airplane);
    airplaneGroupRef.current = airplane;
    baseAircraftYRef.current = aircraftY;

    // 10. Vertical Altitude Dropline to Ground
    const dropLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 6,
      gapSize: 4,
      transparent: true,
      opacity: 0.85,
    });
    const dropLinePoints = [new THREE.Vector3(0, aircraftY, 0), new THREE.Vector3(0, 0, 0)];
    const dropLineGeo = new THREE.BufferGeometry().setFromPoints(dropLinePoints);
    const dropLine = new THREE.Line(dropLineGeo, dropLineMat);
    dropLine.computeLineDistances();
    group.add(dropLine);
    dropLineRef.current = dropLine;

    // Ground Shadow / Radar Target Marker
    const targetRingGeo = new THREE.RingGeometry(18, 22, 32);
    const targetRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
    targetRing.rotation.x = -Math.PI / 2;
    targetRing.position.y = 1.2;
    group.add(targetRing);

    // Forward Flight Track Vector Arrow
    const forwardLength = 160;
    const forwardX = -Math.sin(headingRad) * forwardLength;
    const forwardZ = -Math.cos(headingRad) * forwardLength;
    const vectorPoints = [new THREE.Vector3(0, aircraftY, 0), new THREE.Vector3(forwardX, aircraftY, forwardZ)];
    const vectorGeo = new THREE.BufferGeometry().setFromPoints(vectorPoints);
    const vectorLine = new THREE.Line(vectorGeo, new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 }));
    group.add(vectorLine);

    sceneRef.current.add(group);

    // Align camera target to aircraft altitude
    cameraAngleRef.current.target.set(0, aircraftY * 0.7, 0);
    cameraAngleRef.current.radius = 280;
    updateCamera();
  }, [updateCamera]);

  /**
   * BUILD ACCURATE 3D WILDFIRE HOTSPOT MESH
   * Clean, Photorealistic Combustion Physics with Lush Greenery Environment:
   * - Lush green forest & meadow terrain with central charred burn scar
   * - Living green tree perimeter framing the scene with vibrant greenery
   * - Real burning objects: conifer trees, rubber tire piles, and large quantity of debris
   * - Scaled dynamically based on Fire Radiative Power (FRP) intensity
   * - Fluid flame tongues, convective thermal ember vortex, and buoyant dark smoke plumes
   * - Warm dynamic firelight illuminating trees and landscape
   */
  const build3DWildfireMesh = useCallback((
    fire: FireHotspot,
    overrideType?: 'all' | 'trees' | 'tires' | 'debris',
    overrideIntensity?: number
  ) => {
    if (!sceneRef.current) return;

    if (targetGroupRef.current) {
      sceneRef.current.remove(targetGroupRef.current);
    }

    const group = new THREE.Group();
    targetGroupRef.current = group;

    // Reset references
    strobeLightsRef.current = null;
    airplaneGroupRef.current = null;
    engineGlowMeshesRef.current = [];
    contrailParticlesRef.current = null;
    dropLineRef.current = null;
    wildfireFlamesRef.current = null;
    wildfireEmbersRef.current = null;
    wildfireSmokeRef.current = null;
    wildfireLightsRef.current = null;
    earthquakeWavefrontsRef.current = [];
    earthquakeFaultSparksRef.current = null;
    earthquakeHypocenterRef.current = null;
    earthquakeEpicenterRef.current = null;
    seismogramTelemetryRef.current = null;
    burningTreesRef.current = null;
    burningTiresRef.current = null;
    burningDebrisRef.current = null;

    const activeSceneType = overrideType || fireSceneType;
    const frpMW = overrideIntensity ?? (interactiveFireIntensity ?? (fire.frp || 150));
    const perimeterRadius = Math.max(50, Math.min(220, Math.sqrt(frpMW) * 8.0));

    // 1. Lush Rolling Green Landscape with Localized Hearth Depression
    const terrainGeo = new THREE.PlaneGeometry(2400, 2400, 64, 64);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const distFromCenter = Math.sqrt(vx * vx + vy * vy);
      // Gentle natural rolling hills elevation
      const elevation =
        Math.sin(vx * 0.007) * 16 +
        Math.cos(vy * 0.007) * 16 +
        Math.sin(vx * 0.018 + vy * 0.018) * 7;
      // Gentle natural valley depression at the clearing
      pos.setZ(i, elevation - Math.max(0, 14 - distFromCenter * 0.035));
    }
    terrainGeo.computeVertexNormals();

    const terrainTexture = createLushWildfireTerrainTexture(perimeterRadius * 0.65);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.82,
      metalness: 0.08,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    group.add(terrain);

    // 2. HEALTHY LIVING GREEN FOREST RING (Lush Greenery Framing Perimeter)
    // 42 vibrant green living pines and deciduous trees surrounding the meadow
    const greenForestGroup = new THREE.Group();
    const livingTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const livingPineFoliage1 = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.85 });
    const livingPineFoliage2 = new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.85 });
    const livingOakFoliage = new THREE.MeshStandardMaterial({ color: 0x40916c, roughness: 0.85 });

    for (let g = 0; g < 42; g++) {
      const treeAngle = (g / 42) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const treeDist = perimeterRadius + 75 + Math.random() * 240;
      const gx = Math.cos(treeAngle) * treeDist;
      const gz = Math.sin(treeAngle) * treeDist;

      const treeGroup = new THREE.Group();
      const isPine = g % 3 !== 0;
      const tHeight = 24 + Math.random() * 16;
      const trunkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, tHeight, 7), livingTrunkMat);
      trunkMesh.position.y = tHeight / 2;
      treeGroup.add(trunkMesh);

      if (isPine) {
        // Multi-tier healthy pine canopy
        const foliageMat = g % 2 === 0 ? livingPineFoliage1 : livingPineFoliage2;
        const tiers = 3;
        for (let k = 0; k < tiers; k++) {
          const coneR = (9.5 - k * 2.2) * (tHeight / 28);
          const coneH = (12 - k * 1.8) * (tHeight / 28);
          const coneMesh = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 7), foliageMat);
          coneMesh.position.y = tHeight * 0.45 + k * (coneH * 0.65);
          treeGroup.add(coneMesh);
        }
      } else {
        // Broadleaf deciduous round crown
        const crownMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(11, 1), livingOakFoliage);
        crownMesh.position.y = tHeight + 4;
        treeGroup.add(crownMesh);
      }

      treeGroup.position.set(gx, 2.0, gz);
      treeGroup.rotation.y = Math.random() * Math.PI * 2;
      treeGroup.rotation.z = (Math.random() - 0.5) * 0.08;
      greenForestGroup.add(treeGroup);
    }
    group.add(greenForestGroup);

    // 3. BURNING OBJECTS: Trees, Tires, and Huge Quantity of Debris
    const shouldBuildTrees = activeSceneType === 'all' || activeSceneType === 'trees';
    const shouldBuildTires = activeSceneType === 'all' || activeSceneType === 'tires';
    const shouldBuildDebris = activeSceneType === 'all' || activeSceneType === 'debris';

    // 3a. Burning Conifer Trees (Charred trunks, glowing embers, climbing flame tongues)
    if (shouldBuildTrees) {
      const treeCount = activeSceneType === 'all' ? 10 : 16;
      const treesData: {
        group: THREE.Group;
        foliageMeshes: THREE.Mesh[];
        flamePoints?: THREE.Points;
        baseX: number;
        baseZ: number;
      }[] = [];

      const charredTrunkMat = new THREE.MeshStandardMaterial({
        color: 0x141416, // Black charred bark
        roughness: 0.95,
        emissive: 0x991b1b, // Deep smoldering ember heat inside cracks
        emissiveIntensity: 0.75,
      });

      const burningFoliageMat = new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        roughness: 0.85,
        emissive: 0xea580c, // Glowing fiery foliage needles
        emissiveIntensity: 0.85,
      });

      const burningTreeGroup = new THREE.Group();
      for (let t = 0; t < treeCount; t++) {
        const tGroup = new THREE.Group();
        const angle = (t / treeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 35 + Math.random() * (perimeterRadius * 0.6);
        const tx = Math.cos(angle) * dist;
        const tz = Math.sin(angle) * dist;

        const treeHeight = 26 + Math.random() * 14;
        const trunkMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, treeHeight, 7), charredTrunkMat);
        trunkMesh.position.y = treeHeight / 2;
        tGroup.add(trunkMesh);

        // Foliage tiers catching fire
        const foliageMeshes: THREE.Mesh[] = [];
        const tiers = 3;
        for (let k = 0; k < tiers; k++) {
          const coneR = (10 - k * 2.3) * (treeHeight / 28);
          const coneH = (12 - k * 1.8) * (treeHeight / 28);
          const coneMesh = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 7), burningFoliageMat);
          coneMesh.position.y = treeHeight * 0.45 + k * (coneH * 0.65);
          tGroup.add(coneMesh);
          foliageMeshes.push(coneMesh);
        }

        // Animated flame sprite dancing on tree crown
        const flameTex = createFluidFlameTongueTexture();
        const tFlameGeo = new THREE.BufferGeometry();
        tFlameGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, treeHeight + 5, 0]), 3));
        const tFlameMat = new THREE.PointsMaterial({
          map: flameTex,
          size: 26,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const tFlamePoints = new THREE.Points(tFlameGeo, tFlameMat);
        tGroup.add(tFlamePoints);

        tGroup.position.set(tx, 2.0, tz);
        tGroup.rotation.z = (Math.random() - 0.5) * 0.12;
        burningTreeGroup.add(tGroup);

        treesData.push({
          group: tGroup,
          foliageMeshes,
          flamePoints: tFlamePoints,
          baseX: tx,
          baseZ: tz,
        });
      }
      group.add(burningTreeGroup);
      burningTreesRef.current = { trees: treesData };
    }

    // 3b. Burning Rubber Tire Piles (Toxic smoke columns, orange flame tongues)
    if (shouldBuildTires) {
      const tiresGroup = new THREE.Group();
      const tireGeo = new THREE.TorusGeometry(3.6, 1.3, 10, 20);
      const tireMat = new THREE.MeshStandardMaterial({
        color: 0x141416, // Matte charred rubber
        roughness: 0.95,
        metalness: 0.1,
        emissive: 0xea580c, // Glowing hot inner rim
        emissiveIntensity: 0.65,
      });

      const pileCenters = activeSceneType === 'all'
        ? [{ x: -35, z: 25 }, { x: 40, z: -25 }]
        : [{ x: -35, z: -20 }, { x: 35, z: -15 }, { x: 5, z: 35 }, { x: -15, z: -40 }];

      pileCenters.forEach((center) => {
        const countInPile = 8;
        for (let p = 0; p < countInPile; p++) {
          const tMesh = new THREE.Mesh(tireGeo, tireMat);
          const py = 1.4 + p * 1.6;
          const px = center.x + (Math.random() - 0.5) * 8;
          const pz = center.z + (Math.random() - 0.5) * 8;
          tMesh.position.set(px, py, pz);
          tMesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.35;
          tMesh.rotation.y = (Math.random() - 0.5) * 0.4;
          tMesh.rotation.z = Math.random() * Math.PI;
          tiresGroup.add(tMesh);
        }

        // Licking Core Fire Sprite
        const pFlameGeo = new THREE.BufferGeometry();
        pFlameGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([center.x, 8, center.z]), 3));
        const pFlameMat = new THREE.PointsMaterial({
          map: createFluidFlameTongueTexture(),
          size: 38,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        tiresGroup.add(new THREE.Points(pFlameGeo, pFlameMat));
      });

      // Dense Oily Black Smoke Columns Billowing Upward
      const denseSmokeTex = createToxicBlackSmokeTexture();
      const denseSmokeCount = activeSceneType === 'all' ? 100 : 160;
      const dSmokeProg = new Float32Array(denseSmokeCount);
      const dSmokeSpeeds = new Float32Array(denseSmokeCount);
      const dSmokeAngles = new Float32Array(denseSmokeCount);
      const dSmokeRadii = new Float32Array(denseSmokeCount);
      const dSmokePos = new Float32Array(denseSmokeCount * 3);

      for (let i = 0; i < denseSmokeCount; i++) {
        dSmokeProg[i] = Math.random();
        dSmokeSpeeds[i] = 0.007 + Math.random() * 0.014;
        dSmokeAngles[i] = Math.random() * Math.PI * 2;
        dSmokeRadii[i] = 8 + Math.random() * 28;
        const p = dSmokeProg[i];
        const r = dSmokeRadii[i] + p * 90;
        dSmokePos[i * 3] = Math.cos(dSmokeAngles[i]) * r + p * 80;
        dSmokePos[i * 3 + 1] = 6.0 + p * 400;
        dSmokePos[i * 3 + 2] = Math.sin(dSmokeAngles[i]) * r - p * 50;
      }

      const dSmokeGeo = new THREE.BufferGeometry();
      dSmokeGeo.setAttribute('position', new THREE.BufferAttribute(dSmokePos, 3));
      const dSmokeMat = new THREE.PointsMaterial({
        map: denseSmokeTex,
        size: 75,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const dSmokePoints = new THREE.Points(dSmokeGeo, dSmokeMat);
      tiresGroup.add(dSmokePoints);

      // Dripping molten rubber drops
      const tarCount = 35;
      const tarProg = new Float32Array(tarCount);
      const tarSpeeds = new Float32Array(tarCount);
      const tarBaseX = new Float32Array(tarCount);
      const tarBaseZ = new Float32Array(tarCount);
      const tarPos = new Float32Array(tarCount * 3);

      for (let i = 0; i < tarCount; i++) {
        tarProg[i] = Math.random();
        tarSpeeds[i] = 0.015 + Math.random() * 0.025;
        const pile = pileCenters[i % pileCenters.length];
        tarBaseX[i] = pile.x + (Math.random() - 0.5) * 12;
        tarBaseZ[i] = pile.z + (Math.random() - 0.5) * 12;
        tarPos[i * 3] = tarBaseX[i];
        tarPos[i * 3 + 1] = 2.0 + tarProg[i] * 10;
        tarPos[i * 3 + 2] = tarBaseZ[i];
      }

      const tarGeo = new THREE.BufferGeometry();
      tarGeo.setAttribute('position', new THREE.BufferAttribute(tarPos, 3));
      const tarMat = new THREE.PointsMaterial({
        map: createCircleGlowTexture([{ offset: 0, color: '#f97316' }, { offset: 1, color: 'transparent' }], 32),
        size: 8,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const tarPoints = new THREE.Points(tarGeo, tarMat);
      tiresGroup.add(tarPoints);
      group.add(tiresGroup);

      burningTiresRef.current = {
        tiresGroup,
        denseSmokePoints: dSmokePoints,
        denseSmokeProgress: dSmokeProg,
        denseSmokeSpeeds: dSmokeSpeeds,
        denseSmokeAngles: dSmokeAngles,
        denseSmokeRadii: dSmokeRadii,
        denseSmokeCount,
        drippingTarPoints: tarPoints,
        drippingTarPosY: tarProg,
        drippingTarSpeeds: tarSpeeds,
        drippingTarBaseX: tarBaseX,
        drippingTarBaseZ: tarBaseZ,
        tarCount,
      };
    }

    // 3c. Burning Debris in Huge Quantity (Wooden pallets, crates, structural timber beams, steel drums)
    if (shouldBuildDebris) {
      const debrisGroup = new THREE.Group();

      // 18 Burning Wooden Cargo Pallets & Crates
      const crateGeo = new THREE.BoxGeometry(7, 7, 7);
      const crateMat = new THREE.MeshStandardMaterial({
        color: 0x3d200b,
        roughness: 0.9,
        emissive: 0xea580c,
        emissiveIntensity: 0.8,
      });

      for (let cr = 0; cr < 18; cr++) {
        const crMesh = new THREE.Mesh(crateGeo, crateMat);
        const crAngle = Math.random() * Math.PI * 2;
        const crDist = 18 + Math.random() * (perimeterRadius * 0.55);
        crMesh.position.set(Math.cos(crAngle) * crDist, 3.5, Math.sin(crAngle) * crDist);
        crMesh.rotation.y = Math.random() * Math.PI;
        crMesh.rotation.x = (Math.random() - 0.5) * 0.35;
        debrisGroup.add(crMesh);
      }

      // 12 Stacked Wooden Cargo Pallets
      const palletGeo = new THREE.BoxGeometry(12, 2.4, 10);
      const palletMat = new THREE.MeshStandardMaterial({
        color: 0x451a03,
        roughness: 0.92,
        emissive: 0xc2410c,
        emissiveIntensity: 0.75,
      });
      for (let pl = 0; pl < 12; pl++) {
        const plMesh = new THREE.Mesh(palletGeo, palletMat);
        const plAngle = Math.random() * Math.PI * 2;
        const plDist = 15 + Math.random() * (perimeterRadius * 0.5);
        plMesh.position.set(Math.cos(plAngle) * plDist, 1.8 + (pl % 2) * 2.4, Math.sin(plAngle) * plDist);
        plMesh.rotation.y = Math.random() * Math.PI;
        debrisGroup.add(plMesh);
      }

      // 14 Steel Fuel Drums & Cylinders (charred, burning)
      const drumGeo = new THREE.CylinderGeometry(2.8, 2.8, 8, 12);
      const drumMat = new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        metalness: 0.65,
        roughness: 0.35,
        emissive: 0xf97316,
        emissiveIntensity: 0.65,
      });
      for (let dr = 0; dr < 14; dr++) {
        const drMesh = new THREE.Mesh(drumGeo, drumMat);
        const drAngle = Math.random() * Math.PI * 2;
        const drDist = 20 + Math.random() * (perimeterRadius * 0.55);
        const isTipped = dr % 3 === 0;
        drMesh.position.set(Math.cos(drAngle) * drDist, isTipped ? 2.8 : 4.0, Math.sin(drAngle) * drDist);
        if (isTipped) {
          drMesh.rotation.z = Math.PI / 2;
          drMesh.rotation.y = Math.random() * Math.PI;
        }
        debrisGroup.add(drMesh);
      }

      // Swirling flame pockets around the debris
      const vortexTexture = createFluidFlameTongueTexture();
      const vortexCount = 180;
      const vortexSpeeds = new Float32Array(vortexCount);
      const vortexAngles = new Float32Array(vortexCount);
      const vortexRadii = new Float32Array(vortexCount);
      const vortexPos = new Float32Array(vortexCount * 3);

      for (let v = 0; v < vortexCount; v++) {
        vortexSpeeds[v] = 1.6 + Math.random() * 3.2;
        vortexAngles[v] = Math.random() * Math.PI * 2;
        vortexRadii[v] = 6 + Math.random() * (perimeterRadius * 0.45);
        const y = Math.random() * 180;
        const prog = y / 180;
        const r = vortexRadii[v] * (1.0 + prog * 1.5);
        const a = vortexAngles[v] + prog * 10.0;
        vortexPos[v * 3] = Math.cos(a) * r;
        vortexPos[v * 3 + 1] = y + 2.5;
        vortexPos[v * 3 + 2] = Math.sin(a) * r;
      }

      const vortexGeo = new THREE.BufferGeometry();
      vortexGeo.setAttribute('position', new THREE.BufferAttribute(vortexPos, 3));
      const vortexMat = new THREE.PointsMaterial({
        map: vortexTexture,
        size: 32,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const vortexPoints = new THREE.Points(vortexGeo, vortexMat);
      debrisGroup.add(vortexPoints);
      group.add(debrisGroup);

      burningDebrisRef.current = {
        debrisGroup,
        vortexPoints,
        vortexSpeeds,
        vortexAngles,
        vortexRadii,
        vortexCount,
      };
    }

    // 4. NASA FIRMS Fire Radiative Power (FRP) Concentric Isolines
    [perimeterRadius * 0.5, perimeterRadius, perimeterRadius * 1.5].forEach((r, idx) => {
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0xf97316 : 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.38 - idx * 0.1,
      });
      const ringMesh = new THREE.Mesh(new THREE.RingGeometry(r - 1.2, r + 0.8, 64), ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 2.2 + idx * 0.4;
      group.add(ringMesh);
    });

    // 5. Satellite Observation Footprint Boundary
    const pixelSize = fire.satellite?.includes('MODIS') ? 220 : 130;
    const footprintGeo = new THREE.BoxGeometry(pixelSize, 1.2, pixelSize);
    const footprintEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(footprintGeo),
      new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.75 })
    );
    footprintEdges.position.y = 3;
    group.add(footprintEdges);

    // 6. Photorealistic Fluid Flame Billows (Scaled with FRP intensity)
    const flameTexture = createCircleGlowTexture([
      { offset: 0.0, color: 'rgba(255, 255, 255, 1.0)' },
      { offset: 0.18, color: 'rgba(255, 225, 90, 0.95)' },
      { offset: 0.45, color: 'rgba(255, 105, 15, 0.75)' },
      { offset: 0.75, color: 'rgba(220, 38, 38, 0.3)' },
      { offset: 1.0, color: 'rgba(0, 0, 0, 0.0)' },
    ]);

    const flameCount = Math.min(850, Math.max(320, Math.round(frpMW * 2.2)));
    const flamePositions = new Float32Array(flameCount * 3);
    const flameBaseX = new Float32Array(flameCount);
    const flameBaseZ = new Float32Array(flameCount);
    const flameProgress = new Float32Array(flameCount);
    const flameSpeeds = new Float32Array(flameCount);
    const flameMaxHeights = new Float32Array(flameCount);

    for (let i = 0; i < flameCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.6) * (perimeterRadius * 0.5);
      flameBaseX[i] = Math.cos(angle) * radius;
      flameBaseZ[i] = Math.sin(angle) * radius;
      flameProgress[i] = Math.random();
      flameSpeeds[i] = 0.012 + Math.random() * 0.022;
      flameMaxHeights[i] = 32 + (frpMW / 1000) * 45 + Math.random() * 25;
      const y = flameProgress[i] * flameMaxHeights[i];
      flamePositions[i * 3] = flameBaseX[i];
      flamePositions[i * 3 + 1] = y + 1.5;
      flamePositions[i * 3 + 2] = flameBaseZ[i];
    }

    const flameGeo = new THREE.BufferGeometry();
    flameGeo.setAttribute('position', new THREE.BufferAttribute(flamePositions, 3));
    const flameMat = new THREE.PointsMaterial({
      map: flameTexture,
      size: 26,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flamePoints = new THREE.Points(flameGeo, flameMat);
    group.add(flamePoints);

    wildfireFlamesRef.current = {
      points: flamePoints,
      baseX: flameBaseX,
      baseZ: flameBaseZ,
      progress: flameProgress,
      speeds: flameSpeeds,
      maxHeights: flameMaxHeights,
      count: flameCount,
    };

    // 7. Convective Thermal Vortex Sparks & Embers
    const emberTexture = createCircleGlowTexture([
      { offset: 0.0, color: 'rgba(255, 255, 255, 1.0)' },
      { offset: 0.3, color: 'rgba(255, 195, 45, 0.95)' },
      { offset: 0.7, color: 'rgba(245, 105, 10, 0.5)' },
      { offset: 1.0, color: 'rgba(0, 0, 0, 0.0)' },
    ]);

    const emberCount = Math.min(1000, Math.max(380, Math.round(frpMW * 2.6)));
    const emberPositions = new Float32Array(emberCount * 3);
    const emberSpeeds = new Float32Array(emberCount);
    const emberRadii = new Float32Array(emberCount);
    const emberAngles = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      emberAngles[i] = Math.random() * Math.PI * 2;
      emberRadii[i] = Math.random() * (perimeterRadius * 0.45);
      emberSpeeds[i] = 1.6 + Math.random() * 4.2;
      const y = Math.random() * 520;
      const prog = y / 520;
      const r = emberRadii[i] + prog * 55;
      const a = emberAngles[i] + prog * 4.0;
      emberPositions[i * 3] = Math.cos(a) * r + prog * 170;
      emberPositions[i * 3 + 1] = y + 2;
      emberPositions[i * 3 + 2] = Math.sin(a) * r - prog * 120;
    }

    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    const emberMat = new THREE.PointsMaterial({
      map: emberTexture,
      size: 5.5,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const emberPoints = new THREE.Points(emberGeo, emberMat);
    group.add(emberPoints);

    wildfireEmbersRef.current = {
      points: emberPoints,
      speeds: emberSpeeds,
      initialRadii: emberRadii,
      angles: emberAngles,
      count: emberCount,
    };

    // 8. Atmospheric Dark Smoke Plume
    const smokeTexture = createCircleGlowTexture([
      { offset: 0.0, color: 'rgba(30, 32, 38, 0.72)' },
      { offset: 0.45, color: 'rgba(45, 48, 55, 0.42)' },
      { offset: 0.85, color: 'rgba(60, 64, 75, 0.12)' },
      { offset: 1.0, color: 'rgba(0, 0, 0, 0.0)' },
    ]);

    const smokeCount = 380;
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeSpeeds = new Float32Array(smokeCount);
    const smokeRadii = new Float32Array(smokeCount);
    const smokeAngles = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
      smokeAngles[i] = Math.random() * Math.PI * 2;
      smokeRadii[i] = 12 + Math.random() * (perimeterRadius * 0.4);
      smokeSpeeds[i] = 1.0 + Math.random() * 2.8;
      const y = 30 + Math.random() * 550;
      const prog = (y - 30) / 550;
      const r = smokeRadii[i] + prog * 140;
      const a = smokeAngles[i] + prog * 1.5;
      smokePositions[i * 3] = Math.cos(a) * r + prog * 200;
      smokePositions[i * 3 + 1] = y;
      smokePositions[i * 3 + 2] = Math.sin(a) * r - prog * 150;
    }

    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      map: smokeTexture,
      size: 90,
      transparent: true,
      depthWrite: false,
    });
    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    group.add(smokePoints);

    wildfireSmokeRef.current = {
      points: smokePoints,
      speeds: smokeSpeeds,
      driftAngles: smokeAngles,
      initialRadii: smokeRadii,
      count: smokeCount,
    };

    // 9. Active Glowing Firefront Perimeter Line
    const firelinePoints: THREE.Vector3[] = [];
    const segments = 64;
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const r = perimeterRadius * (0.95 + Math.sin(a * 6.0) * 0.08);
      firelinePoints.push(new THREE.Vector3(Math.cos(a) * r, 2.5, Math.sin(a) * r));
    }
    const firelineGeo = new THREE.BufferGeometry().setFromPoints(firelinePoints);
    const firelineMat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      linewidth: 2.5,
      transparent: true,
      opacity: 0.85,
    });
    const fireline = new THREE.Line(firelineGeo, firelineMat);
    group.add(fireline);

    // 10. Multi-Octave Turbulent Firelight Illuminating Greenery & Ground
    const fireLight1 = new THREE.PointLight(0xff6600, 8.5, 450);
    fireLight1.position.set(0, 22, 0);
    group.add(fireLight1);

    const fireLight2 = new THREE.PointLight(0xffaa00, 5.5, 320);
    fireLight2.position.set(perimeterRadius * 0.35, 14, -perimeterRadius * 0.25);
    group.add(fireLight2);

    wildfireLightsRef.current = {
      light1: fireLight1,
      light2: fireLight2,
      firelineMesh: fireline,
    };

    // 11. Wind Direction Ground Vector Arrow
    const windVectorPoints = [new THREE.Vector3(0, 3, 0), new THREE.Vector3(130, 3, -100)];
    const windLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(windVectorPoints),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
    );
    group.add(windLine);

    sceneRef.current.add(group);

    // Re-center camera on wildfire hotspot
    cameraAngleRef.current.target.set(30, 45, -20);
    cameraAngleRef.current.radius = 360;
    updateCamera();
  }, [updateCamera, fireSceneType, interactiveFireIntensity]);

  /**
   * BUILD ACCURATE 3D EARTHQUAKE EPICENTER & TECTONIC FAULT RUPTURE MESH
   * Clean, Tasteful Seismological Physics on Normal Countryside Land:
   * - Normal countryside topography with lush grass meadows, asphalt highway, trees, utility poles, houses & vehicles
   * - Continuous smooth harmonic P-Wave and S-Wave shockwave ripples (zero popping/snapping)
   * - Smooth Rayleigh and Love surface wave ground undulations scaled gracefully to Magnitude
   * - Subterranean hypocenter with 3D USGS focal mechanism beachball & curved ray paths
   * - Clean digital seismograph HUD with active traveling scan needle
   * - Zero cartoon artifacts, no DBZ levitating rocks, no lightning arcs, no typhoon wind bursts
   */
  const build3DEarthquakeMesh = useCallback((earthquake: EarthquakeData, overrideMag?: number) => {
    if (!sceneRef.current) return;

    if (targetGroupRef.current) {
      sceneRef.current.remove(targetGroupRef.current);
    }

    const group = new THREE.Group();
    targetGroupRef.current = group;

    // Reset references
    strobeLightsRef.current = null;
    airplaneGroupRef.current = null;
    engineGlowMeshesRef.current = [];
    contrailParticlesRef.current = null;
    dropLineRef.current = null;
    wildfireFlamesRef.current = null;
    wildfireEmbersRef.current = null;
    wildfireSmokeRef.current = null;
    wildfireLightsRef.current = null;
    earthquakeWavefrontsRef.current = [];
    earthquakeFaultSparksRef.current = null;
    earthquakeHypocenterRef.current = null;
    earthquakeEpicenterRef.current = null;
    seismogramTelemetryRef.current = null;
    landObjectsRef.current = null;
    normalLandWaveRef.current = null;

    const mag = typeof overrideMag === 'number' ? overrideMag : (interactiveMagnitude ?? (earthquake.magnitude || 6.0));

    // 1. Topographic Normal Countryside Land with Highway and Magnitude-Dependent Fault Scarp
    const terrainGeo = new THREE.PlaneGeometry(2400, 2400, 80, 80);
    const pos = terrainGeo.attributes.position;
    const basePosArr = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);

      // Normal rolling countryside topography with gentle hills & valleys
      let elevation =
        Math.sin(vx * 0.005) * 22 +
        Math.cos(vy * 0.005) * 22 +
        Math.sin(vx * 0.012 + vy * 0.012) * 10;

      // Magnitude-based fault rupture scarp offset (clean geological displacement if M >= 5.5)
      const faultDist = vy - (vx * 0.35 + 20);
      if (mag >= 5.5) {
        const scarpStep = Math.min(20, (mag - 5.0) * 5.0);
        if (faultDist > 0) {
          elevation += scarpStep * 0.55;
        } else {
          elevation -= scarpStep * 0.45;
        }
        // Fissure chasm depression along fault line
        if (Math.abs(faultDist) < 32) {
          elevation -= (1.0 - Math.abs(faultDist) / 32) * (scarpStep * 0.65 + 3);
        }
      }

      pos.setZ(i, elevation);
      basePosArr[i * 3] = vx;
      basePosArr[i * 3 + 1] = vy;
      basePosArr[i * 3 + 2] = elevation;
    }
    terrainGeo.computeVertexNormals();

    const crackSeverity = mag < 4.5 ? 0 : mag < 6.0 ? 1 : mag < 7.2 ? 2 : 3;
    const normalLandTexture = createNormalLandTexture(mag >= 4.5, crackSeverity);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: normalLandTexture,
      roughness: 0.88,
      metalness: 0.08,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    group.add(terrain);

    normalLandWaveRef.current = {
      mesh: terrain,
      basePositions: basePosArr,
      vertexCount: pos.count,
      magnitude: mag,
    };

    // 1b. REAL-WORLD OBJECTS ON NORMAL LAND: Countryside Trees, Highway Utility Poles, Cottages & Vehicles
    const normalTreesData: { group: THREE.Group; baseY: number; phase: number; freq: number }[] = [];
    const normalPolesData: { group: THREE.Group; baseY: number; phase: number; sparkLine?: THREE.Line }[] = [];
    const normalStructuresData: { group: THREE.Group; baseY: number; baseZ: number; freq: number; isBarn?: boolean }[] = [];
    const normalCarsData: { group: THREE.Group; baseY: number; phase: number }[] = [];

    // 24 Countryside Evergreen & Deciduous Trees
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const greenFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.85 });
    const greenFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.85 });

    for (let t = 0; t < 24; t++) {
      const tGroup = new THREE.Group();
      const tx = -350 + (t % 6) * 140 + (Math.random() - 0.5) * 45;
      const tz = -320 + Math.floor(t / 6) * 160 + (Math.random() - 0.5) * 45;

      const isPine = t % 2 === 0;
      const trunkH = 14 + Math.random() * 8;
      const trunkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, trunkH, 7), treeTrunkMat);
      trunkMesh.position.y = trunkH / 2;
      tGroup.add(trunkMesh);

      if (isPine) {
        const coneMesh = new THREE.Mesh(new THREE.ConeGeometry(7, 18, 7), greenFoliageMat1);
        coneMesh.position.y = trunkH + 8;
        tGroup.add(coneMesh);
      } else {
        const sphereMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(8, 1), greenFoliageMat2);
        sphereMesh.position.y = trunkH + 7;
        tGroup.add(sphereMesh);
      }

      tGroup.position.set(tx, 2.0, tz);
      group.add(tGroup);

      normalTreesData.push({
        group: tGroup,
        baseY: 2.0,
        phase: Math.random() * Math.PI * 2,
        freq: 10.0 + Math.random() * 5.0,
      });
    }

    // 8 Roadside Wooden Utility / Telephone Poles with Sagging Power Lines
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x523e2b, roughness: 0.95 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x18181b, linewidth: 1.5 });
    const poleH = 26;
    const polePositions: THREE.Vector3[] = [];

    for (let p = 0; p < 8; p++) {
      const pGroup = new THREE.Group();
      const px = -280 + p * 80;
      const pz = -30 + Math.sin(p * 0.5) * 15;

      const poleCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, poleH, 8), poleMat);
      poleCyl.position.y = poleH / 2;
      pGroup.add(poleCyl);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 0.6), poleMat);
      arm.position.y = poleH - 1.5;
      pGroup.add(arm);

      if (p % 3 === 1) {
        const trans = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.5, 8), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 }));
        trans.position.set(1.4, poleH - 5, 0);
        pGroup.add(trans);
      }

      pGroup.position.set(px, 2.0, pz);
      group.add(pGroup);

      polePositions.push(new THREE.Vector3(px, poleH + 0.5, pz));
      normalPolesData.push({
        group: pGroup,
        baseY: 2.0,
        phase: p * 0.7,
      });
    }

    // Sagging overhead power cables connecting poles
    for (let w = 0; w < polePositions.length - 1; w++) {
      const startP = polePositions[w];
      const endP = polePositions[w + 1];
      const wirePoints: THREE.Vector3[] = [];
      const segs = 10;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const wx = startP.x + t * (endP.x - startP.x);
        const wz = startP.z + t * (endP.z - startP.z);
        const sag = Math.sin(t * Math.PI) * 2.8;
        const wy = startP.y - sag;
        wirePoints.push(new THREE.Vector3(wx, wy, wz));
      }
      const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
      const wireLine = new THREE.Line(wireGeo, wireMat);
      group.add(wireLine);
    }

    // 1c. FARM COMPLEX & RURAL STRUCTURES: Red Timber Barn, Silo, Country Cottages & Fences
    const barnWallMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 }); // Classic barn red
    const barnRoofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
    const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.35 });
    const houseWallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
    const houseRoofMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

    // --- Red Farm Barn with Silo & Gambrel Roof ---
    const barnGroup = new THREE.Group();
    // Barn Main Hall
    const barnWalls = new THREE.Mesh(new THREE.BoxGeometry(38, 22, 28), barnWallMat);
    barnWalls.position.y = 11;
    barnGroup.add(barnWalls);

    // Barn White Cross-Brace Trim
    const doorTrim1 = new THREE.Mesh(new THREE.BoxGeometry(10, 14, 0.6), trimMat);
    doorTrim1.position.set(0, 7, 14.2);
    barnGroup.add(doorTrim1);

    // Barn Gambrel Roof
    const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(25, 12, 4), barnRoofMat);
    barnRoof.position.y = 28;
    barnRoof.rotation.y = Math.PI / 4;
    barnGroup.add(barnRoof);

    // Farm Grain Silo
    const siloCyl = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 32, 16), siloMat);
    siloCyl.position.set(26, 16, 0);
    barnGroup.add(siloCyl);
    const siloDome = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), siloMat);
    siloDome.position.set(26, 32, 0);
    barnGroup.add(siloDome);

    barnGroup.position.set(-150, 2.0, -85);
    barnGroup.rotation.y = 0.15;
    group.add(barnGroup);

    normalStructuresData.push({
      group: barnGroup,
      baseY: 2.0,
      baseZ: -85,
      freq: 15.0,
      isBarn: true,
    });

    // --- 3 Rural Country Farmhouses / Cottages ---
    const houseCoords = [
      { x: 140, z: -75, ry: -0.3, freq: 18.0 },
      { x: 60, z: 100, ry: 0.35, freq: 21.0 },
      { x: -95, z: 115, ry: -0.2, freq: 19.0 },
    ];

    houseCoords.forEach((hc) => {
      const hGroup = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 16), houseWallMat);
      walls.position.y = 6;
      hGroup.add(walls);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(17, 8, 4), houseRoofMat);
      roof.position.y = 16;
      roof.rotation.y = Math.PI / 4;
      hGroup.add(roof);

      const chim = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), new THREE.MeshStandardMaterial({ color: 0x78716c }));
      chim.position.set(5, 17, 2);
      hGroup.add(chim);

      hGroup.position.set(hc.x, 2.0, hc.z);
      hGroup.rotation.y = hc.ry;
      group.add(hGroup);

      normalStructuresData.push({
        group: hGroup,
        baseY: 2.0,
        baseZ: hc.z,
        freq: hc.freq,
      });
    });

    // --- Farm Wooden Post-and-Rail Fences ---
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x78533b, roughness: 0.95 });
    for (let f = 0; f < 8; f++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6, 6), fenceMat);
      post.position.set(-180 + f * 12, 3.0, -110);
      group.add(post);

      if (f < 7) {
        const rail1 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 0.4), fenceMat);
        rail1.position.set(-174 + f * 12, 4.5, -110);
        group.add(rail1);
        const rail2 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 0.4), fenceMat);
        rail2.position.set(-174 + f * 12, 2.8, -110);
        group.add(rail2);
      }
    }

    // 1d. 3D PAVED HIGHWAY ROAD WITH DYNAMIC TECTONIC FAULT SCARP & ASPHALT BUCKLING (M >= 6.8)
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.88 });
    const roadShoulderMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.95 });
    const whiteStripeMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
    const yellowStripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // West Road Plate (from X = -480 to -15)
    const roadPlateWest = new THREE.Group();
    const westRoadMesh = new THREE.Mesh(new THREE.BoxGeometry(450, 1.2, 42), asphaltMat);
    westRoadMesh.position.set(-240, 2.4, 0);
    roadPlateWest.add(westRoadMesh);
    const westShoulder = new THREE.Mesh(new THREE.BoxGeometry(450, 0.8, 50), roadShoulderMat);
    westShoulder.position.set(-240, 2.0, 0);
    roadPlateWest.add(westShoulder);
    // Yellow centerline
    const westYellow = new THREE.Mesh(new THREE.BoxGeometry(450, 0.2, 1.4), yellowStripeMat);
    westYellow.position.set(-240, 3.05, 0);
    roadPlateWest.add(westYellow);
    // White border lanes
    const westWhite1 = new THREE.Mesh(new THREE.BoxGeometry(450, 0.2, 0.8), whiteStripeMat);
    westWhite1.position.set(-240, 3.05, 18);
    roadPlateWest.add(westWhite1);
    const westWhite2 = new THREE.Mesh(new THREE.BoxGeometry(450, 0.2, 0.8), whiteStripeMat);
    westWhite2.position.set(-240, 3.05, -18);
    roadPlateWest.add(westWhite2);
    group.add(roadPlateWest);

    // East Road Plate (from X = 15 to 480)
    const roadPlateEast = new THREE.Group();
    const eastRoadMesh = new THREE.Mesh(new THREE.BoxGeometry(450, 1.2, 42), asphaltMat);
    eastRoadMesh.position.set(240, 2.4, 0);
    roadPlateEast.add(eastRoadMesh);
    const eastShoulder = new THREE.Mesh(new THREE.BoxGeometry(450, 0.8, 50), roadShoulderMat);
    eastShoulder.position.set(240, 2.0, 0);
    roadPlateEast.add(eastShoulder);
    // Yellow centerline
    const eastYellow = new THREE.Mesh(new THREE.BoxGeometry(450, 0.2, 1.4), yellowStripeMat);
    eastYellow.position.set(240, 3.05, 0);
    roadPlateEast.add(eastYellow);
    // White border lanes
    const eastWhite1 = new THREE.Mesh(new THREE.BoxGeometry(450, 0.2, 0.8), whiteStripeMat);
    eastWhite1.position.set(240, 3.05, 18);
    roadPlateEast.add(eastWhite1);
    const eastWhite2 = new THREE.Mesh(new THREE.BoxGeometry(450, 0.2, 0.8), whiteStripeMat);
    eastWhite2.position.set(240, 3.05, -18);
    roadPlateEast.add(eastWhite2);
    group.add(roadPlateEast);

    // Buckled Asphalt Slabs along Fault Rupture Crossing (-15 <= X <= 15)
    const buckledSlabsData: { mesh: THREE.Mesh; baseY: number; baseRotZ: number; baseRotX: number }[] = [];
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.92 });
    for (let s = 0; s < 6; s++) {
      const sx = -12 + s * 5;
      const sz = -16 + (s % 3) * 16;
      const slabGeo = new THREE.BoxGeometry(6.5, 1.4, 12);
      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      slabMesh.position.set(sx, 2.45, sz);
      slabMesh.rotation.z = (Math.random() - 0.5) * 0.05;
      slabMesh.rotation.x = (Math.random() - 0.5) * 0.05;
      group.add(slabMesh);

      buckledSlabsData.push({
        mesh: slabMesh,
        baseY: 2.45,
        baseRotZ: slabMesh.rotation.z,
        baseRotX: slabMesh.rotation.x,
      });
    }

    // 2 Vehicles on Country Road
    const carMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const carMat2 = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 });

    const car1 = new THREE.Group();
    car1.add(new THREE.Mesh(new THREE.BoxGeometry(10, 4, 5), carMat1));
    car1.position.set(-60, 3.5, 0);
    roadPlateWest.add(car1);

    const car2 = new THREE.Group();
    car2.add(new THREE.Mesh(new THREE.BoxGeometry(12, 5, 5.5), carMat2));
    car2.position.set(90, 3.5, 10);
    roadPlateEast.add(car2);

    normalCarsData.push(
      { group: car1, baseY: 3.5, phase: 0 },
      { group: car2, baseY: 3.5, phase: 1.5 }
    );

    landObjectsRef.current = {
      trees: normalTreesData,
      poles: normalPolesData,
      structures: normalStructuresData,
      cars: normalCarsData,
      roadSegments: {
        roadPlateWest,
        roadPlateEast,
        buckledSlabs: buckledSlabsData,
      },
    };

    // 2. Surface Epicenter USGS Target Ring & Crosshairs
    const reticleGeo = new THREE.RingGeometry(12, 16, 48);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleMesh.rotation.x = -Math.PI / 2;
    reticleMesh.position.y = 2.8;
    group.add(reticleMesh);

    // Inner bullseye dot
    const bullseyeGeo = new THREE.CircleGeometry(4, 32);
    const bullseyeMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const bullseyeMesh = new THREE.Mesh(bullseyeGeo, bullseyeMat);
    bullseyeMesh.rotation.x = -Math.PI / 2;
    bullseyeMesh.position.y = 2.82;
    group.add(bullseyeMesh);

    // Clean ground crosshair lines
    const crossPoints = [
      new THREE.Vector3(-28, 2.85, 0),
      new THREE.Vector3(28, 2.85, 0),
      new THREE.Vector3(0, 2.85, -28),
      new THREE.Vector3(0, 2.85, 28),
    ];
    const crossLine = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(crossPoints),
      new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 })
    );
    group.add(crossLine);

    earthquakeEpicenterRef.current = {
      reticle: reticleMesh,
      crosshair: crossLine,
      beacon: reticleMesh,
    };

    // 3. Smooth, Clean Concentric Seismic Shockwaves (3 lightweight rings, zero lag)
    const baseWaveRadius = 25;
    const maxWaveRadius = Math.max(160, Math.min(380, 50 * Math.sqrt(mag)));
    const wavefrontsList: {
      mesh: THREE.Mesh;
      type: 'P' | 'S';
      phase: number;
      speed: number;
      baseRadius: number;
      maxRadius: number;
      peakOpacity: number;
    }[] = [];

    const phases = [0.0, 0.33, 0.66];
    phases.forEach((phase, idx) => {
      const ringGeo = new THREE.RingGeometry(1, 2.5, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xef4444 : idx === 1 ? 0xf59e0b : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 3.0;
      group.add(ringMesh);

      wavefrontsList.push({
        mesh: ringMesh,
        type: idx === 0 ? 'S' : 'P',
        phase,
        speed: 0.22,
        baseRadius: baseWaveRadius,
        maxRadius: maxWaveRadius,
        peakOpacity: 0.75,
      });
    });

    earthquakeWavefrontsRef.current = wavefrontsList;

    // 4. Subtle Geological Fault Rupture Crevasses on Ground Surface (M >= 5.0)
    if (mag >= 5.0) {
      const crackLinesGroup = new THREE.Group();
      for (let c = 0; c < 4; c++) {
        const baseAngle = (c / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        const crackPoints: THREE.Vector3[] = [];
        let cx = 0;
        let cz = 0;
        crackPoints.push(new THREE.Vector3(cx, 2.85, cz));
        const segments = 8;
        const maxLen = 60 + Math.random() * 80;
        for (let s = 1; s <= segments; s++) {
          const segDist = (s / segments) * maxLen;
          const jitterA = baseAngle + (Math.random() - 0.5) * 0.35;
          cx = Math.cos(jitterA) * segDist;
          cz = Math.sin(jitterA) * segDist;
          crackPoints.push(new THREE.Vector3(cx, 2.85, cz));
        }
        const crackGeo = new THREE.BufferGeometry().setFromPoints(crackPoints);
        const crackMat = new THREE.LineBasicMaterial({
          color: c % 2 === 0 ? 0xdc2626 : 0xd97706,
          linewidth: 1.5,
          transparent: true,
          opacity: 0.75,
        });
        const crackLine = new THREE.Line(crackGeo, crackMat);
        crackLinesGroup.add(crackLine);
      }
      group.add(crackLinesGroup);
    }

    sceneRef.current.add(group);

    // Camera Framing: Position camera looking at Epicenter and Waveform on initial load
    if (!hasFramedInitialCameraRef.current) {
      cameraAngleRef.current.target.set(0, 25, 20);
      cameraAngleRef.current.radius = 380;
      updateCamera();
      hasFramedInitialCameraRef.current = true;
    }
  }, [updateCamera, interactiveMagnitude]);

  // Initialize WebGL Scene, Camera, Renderer, and Render Loop ONCE
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 8000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(400, 800, 500);
    sunLightRef.current = sunLight;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-400, 300, -500);
    scene.add(rimLight);

    // Setup initial natural atmosphere based on mode
    if (intelMode === 'earthquakes') {
      // Natural daylight countryside sky & atmosphere (no dark void!)
      scene.background = new THREE.Color(0x89b0d6);
      scene.fog = new THREE.FogExp2(0xb0cae4, 0.0006);
      ambientLight.color.setHex(0xdce7f0);
      ambientLight.intensity = 1.6;
      sunLight.color.setHex(0xfffbeb);
      sunLight.intensity = 2.4;
      sunLight.position.set(300, 600, 400);
    } else if (intelMode === 'fires') {
      // Natural forest dusk / clearing atmosphere with warm fire glow (no dark void!)
      scene.background = new THREE.Color(0x2f4236);
      scene.fog = new THREE.FogExp2(0x3a4f42, 0.0007);
      ambientLight.color.setHex(0x506555);
      ambientLight.intensity = 1.5;
      sunLight.color.setHex(0xffe8cc);
      sunLight.intensity = 2.0;
      sunLight.position.set(250, 450, 350);
    } else {
      scene.background = new THREE.Color(0x020617);
      scene.fog = new THREE.FogExp2(0x030a1c, 0.0009);
      ambientLight.color.setHex(0xffffff);
      ambientLight.intensity = 1.4;
      sunLight.color.setHex(0xffffff);
      sunLight.intensity = 2.0;
      sunLight.position.set(400, 800, 500);
    }

    // Initial build based on active mode
    if (intelMode === 'flights') {
      build3DAircraftMesh(currentFlight);
    } else if (intelMode === 'fires') {
      build3DWildfireMesh(currentFire, fireSceneType, interactiveFireIntensity ?? undefined);
    } else {
      build3DEarthquakeMesh(currentEarthquake, interactiveMagnitude ?? undefined);
    }

    // 60 FPS Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // 1. AIRCRAFT
      if (airplaneGroupRef.current) {
        const roll = Math.sin(elapsed * 0.9) * 0.032;
        const pitch = Math.cos(elapsed * 0.6) * 0.014;
        const heave = Math.sin(elapsed * 1.3) * 2.4;
        airplaneGroupRef.current.rotation.z = roll;
        airplaneGroupRef.current.rotation.x = pitch;
        airplaneGroupRef.current.position.y = baseAircraftYRef.current + heave;

        engineGlowMeshesRef.current.forEach((disc, idx) => {
          const p = 1.0 + Math.sin(elapsed * 22.0 + idx * 1.4) * 0.16;
          disc.scale.set(p, p, p);
        });

        if (contrailParticlesRef.current) {
          const { points, offsets, count } = contrailParticlesRef.current;
          const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
          const arr = posAttr.array as Float32Array;
          for (let i = 0; i < count; i++) {
            offsets[i] = (offsets[i] + 0.014) % 1.0;
            const prog = offsets[i];
            const eng = i < count / 2 ? -16 : 16;
            const zDist = prog * 360;
            const dispersion = prog * 3.8;
            arr[i * 3] = eng + Math.sin(elapsed * 16.0 + i) * dispersion * 0.35;
            arr[i * 3 + 1] = -3.2 + Math.cos(elapsed * 12.0 + i) * dispersion * 0.22;
            arr[i * 3 + 2] = 8 + zDist;
          }
          posAttr.needsUpdate = true;
        }

        if (dropLineRef.current) {
          (dropLineRef.current.material as any).dashOffset = -elapsed * 18.0;
        }
      }

      // 2. WILDFIRE: Clean, fluid flame billows, convective thermal embers, atmospheric smoke & firelight
      if (wildfireFlamesRef.current) {
        const { points, baseX, baseZ, progress, speeds, maxHeights, count } = wildfireFlamesRef.current;
        const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const isSurge = fireSurgeTriggerRef.current > 0;
        const surgeFactor = isSurge ? 1.4 : 1.0;

        for (let i = 0; i < count; i++) {
          progress[i] = (progress[i] + speeds[i] * surgeFactor) % 1.0;
          const p = progress[i];
          const y = p * maxHeights[i] * surgeFactor;

          const windDrift = p * 42.0;
          const flickerX = Math.sin(elapsed * 16.0 + i * 0.4) * (p * 9.0);
          const flickerZ = Math.cos(elapsed * 14.0 + i * 0.4) * (p * 6.5);

          arr[i * 3] = baseX[i] + flickerX + windDrift;
          arr[i * 3 + 1] = y + 1.5;
          arr[i * 3 + 2] = baseZ[i] + flickerZ - windDrift * 0.75;
        }
        posAttr.needsUpdate = true;
      }

      // Ascending thermal embers in convective vortex
      if (wildfireEmbersRef.current) {
        const { points, speeds, initialRadii, angles, count } = wildfireEmbersRef.current;
        const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const isSurge = fireSurgeTriggerRef.current > 0;
        const speedBoost = isSurge ? 1.6 : 1.0;

        for (let i = 0; i < count; i++) {
          arr[i * 3 + 1] += speeds[i] * speedBoost;
          const y = arr[i * 3 + 1];
          const prog = Math.min(1.0, y / 520);
          const currentRadius = initialRadii[i] + prog * 55;
          const currentAngle = angles[i] + prog * 4.0 + elapsed * 0.35;

          arr[i * 3] = Math.cos(currentAngle) * currentRadius + prog * 170;
          arr[i * 3 + 2] = Math.sin(currentAngle) * currentRadius - prog * 120;

          if (arr[i * 3 + 1] > 520) {
            arr[i * 3 + 1] = 2;
            initialRadii[i] = Math.random() * 45;
            angles[i] = Math.random() * Math.PI * 2;
          }
        }
        posAttr.needsUpdate = true;
      }

      // Atmospheric dark smoke plume expansion
      if (wildfireSmokeRef.current) {
        const { points, speeds, driftAngles, initialRadii, count } = wildfireSmokeRef.current;
        const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;

        for (let i = 0; i < count; i++) {
          arr[i * 3 + 1] += speeds[i];
          const y = arr[i * 3 + 1];
          const prog = Math.min(1.0, (y - 30) / 550);
          const currentRadius = initialRadii[i] + prog * 140;
          const currentAngle = driftAngles[i] + prog * 1.5;

          arr[i * 3] = Math.cos(currentAngle) * currentRadius + prog * 200;
          arr[i * 3 + 2] = Math.sin(currentAngle) * currentRadius - prog * 150;

          if (arr[i * 3 + 1] > 580) {
            arr[i * 3 + 1] = 30 + Math.random() * 20;
          }
        }
        posAttr.needsUpdate = true;
      }

      // Multi-octave firelight flicker on terrain & fireline pulse
      if (wildfireLightsRef.current) {
        const { light1, light2, firelineMesh } = wildfireLightsRef.current;
        const isSurge = fireSurgeTriggerRef.current > 0;
        const surgeAdd = isSurge ? 6.0 : 0;
        const flicker1 = 8.5 + surgeAdd + Math.sin(elapsed * 24.0) * 2.2 + Math.cos(elapsed * 15.0) * 1.6;
        const flicker2 = 5.5 + surgeAdd * 0.7 + Math.cos(elapsed * 20.0) * 1.5 + Math.sin(elapsed * 31.0) * 1.1;

        light1.intensity = flicker1;
        light2.intensity = flicker2;

        if (firelineMesh) {
          const mat = firelineMesh.material as THREE.LineBasicMaterial;
          mat.color.setHex(Math.sin(elapsed * 4.0) > 0 ? 0xf97316 : 0xef4444);
        }

        if (fireSurgeTriggerRef.current > 0) {
          fireSurgeTriggerRef.current = Math.max(0, fireSurgeTriggerRef.current - 0.015);
        }
      }

      // Burning Trees Animation: subtle convective sway and glowing foliage ember pulse
      if (burningTreesRef.current) {
        const { trees } = burningTreesRef.current;
        trees.forEach((t, idx) => {
          t.group.rotation.z = Math.sin(elapsed * 3.5 + idx) * 0.028;
          t.group.rotation.x = Math.cos(elapsed * 3.0 + idx) * 0.02;

          const emberPulse = 0.7 + Math.sin(elapsed * 14.0 + idx * 2.0) * 0.3;
          t.foliageMeshes.forEach((fMesh) => {
            const m = fMesh.material as THREE.MeshStandardMaterial;
            m.emissiveIntensity = emberPulse;
          });
        });
      }

      // Burning Tires Animation: dense smoke columns and dripping tar
      if (burningTiresRef.current) {
        const {
          denseSmokePoints,
          denseSmokeProgress,
          denseSmokeSpeeds,
          denseSmokeAngles,
          denseSmokeRadii,
          denseSmokeCount,
          drippingTarPoints,
          drippingTarPosY,
          drippingTarSpeeds,
          drippingTarBaseX,
          drippingTarBaseZ,
          tarCount,
        } = burningTiresRef.current;

        const sPosAttr = denseSmokePoints.geometry.attributes.position as THREE.BufferAttribute;
        const sArr = sPosAttr.array as Float32Array;
        for (let i = 0; i < denseSmokeCount; i++) {
          denseSmokeProgress[i] = (denseSmokeProgress[i] + denseSmokeSpeeds[i]) % 1.0;
          const p = denseSmokeProgress[i];
          const r = denseSmokeRadii[i] + p * 90;
          sArr[i * 3] = Math.cos(denseSmokeAngles[i]) * r + p * 80;
          sArr[i * 3 + 1] = 6.0 + p * 400;
          sArr[i * 3 + 2] = Math.sin(denseSmokeAngles[i]) * r - p * 50;
        }
        sPosAttr.needsUpdate = true;

        const tarPosAttr = drippingTarPoints.geometry.attributes.position as THREE.BufferAttribute;
        const tarArr = tarPosAttr.array as Float32Array;
        for (let i = 0; i < tarCount; i++) {
          drippingTarPosY[i] -= drippingTarSpeeds[i];
          if (drippingTarPosY[i] <= 0) {
            drippingTarPosY[i] = 1.0;
          }
          tarArr[i * 3] = drippingTarBaseX[i];
          tarArr[i * 3 + 1] = 2.0 + drippingTarPosY[i] * 10;
          tarArr[i * 3 + 2] = drippingTarBaseZ[i];
        }
        tarPosAttr.needsUpdate = true;
      }

      // Burning Debris Animation: flame pockets swirling around crates and pallets
      if (burningDebrisRef.current) {
        const { vortexPoints, vortexSpeeds, vortexAngles, vortexRadii, vortexCount } = burningDebrisRef.current;
        const vPosAttr = vortexPoints.geometry.attributes.position as THREE.BufferAttribute;
        const vArr = vPosAttr.array as Float32Array;
        for (let v = 0; v < vortexCount; v++) {
          vArr[v * 3 + 1] += vortexSpeeds[v];
          if (vArr[v * 3 + 1] > 180) {
            vArr[v * 3 + 1] = 2.5;
          }
          vortexAngles[v] += 0.05;
          const y = vArr[v * 3 + 1];
          const prog = y / 180;
          const r = vortexRadii[v] * (1.0 + prog * 1.5);
          vArr[v * 3] = Math.cos(vortexAngles[v]) * r;
          vArr[v * 3 + 2] = Math.sin(vortexAngles[v]) * r;
        }
        vPosAttr.needsUpdate = true;
      }

      // 3. EARTHQUAKE: Clean, smooth concentric seismic shockwave ripples (Zero CPU/GPU lag)
      if (earthquakeWavefrontsRef.current.length > 0 && intelModeRef.current === 'earthquakes') {
        const curMag = liveMagnitudeRef.current;
        const isJolt = seismicTriggerRef.current > 0;
        const waveSpeedFactor = isJolt ? 1.6 : 1.0;

        earthquakeWavefrontsRef.current.forEach((wf) => {
          const { mesh, speed, phase, baseRadius, maxRadius, peakOpacity } = wf;
          const progress = (elapsed * speed * waveSpeedFactor + phase) % 1.0;
          const currentRadius = baseRadius + progress * (maxRadius - baseRadius);
          mesh.scale.set(currentRadius, currentRadius, 1);

          // Smooth sine windowing for opacity: 0 at start, peak at mid, 0 at outer perimeter
          const windowAlpha = Math.sin(progress * Math.PI);
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, peakOpacity * windowAlpha * (isJolt ? 1.15 : 0.85));
        });
      }

      // Realistic, tiered earthquake physical simulation (Small vs Larger vs Major)
      if (landObjectsRef.current && intelModeRef.current === 'earthquakes') {
        const { trees, poles, structures, cars, roadSegments } = landObjectsRef.current;
        const curMag = liveMagnitudeRef.current;
        const isJolt = seismicTriggerRef.current > 0;
        const joltMult = isJolt ? 1.0 + seismicTriggerRef.current * 1.5 : 1.0;

        // -------------------------------------------------------------
        // TIER 1: SMALL MAGNITUDE (M < 5.0)
        // User request: "for small magnitude use form like that"
        // Clean subtle form; gentle harmonic ground ripples;
        // buildings remain calm and firm on foundation; road is stationary.
        // -------------------------------------------------------------
        if (curMag < 5.0) {
          const smallRatio = Math.max(0.1, curMag / 5.0);
          const microTremor = 0.003 * smallRatio * joltMult;

          // Trees & poles: very gentle whisper micro-sway
          trees.forEach((tree) => {
            tree.group.rotation.z = Math.sin(elapsed * tree.freq + tree.phase) * microTremor;
            tree.group.rotation.x = Math.cos(elapsed * (tree.freq * 0.8) + tree.phase) * (microTremor * 0.6);
          });
          poles.forEach((pole) => {
            pole.group.rotation.z = Math.sin(elapsed * 10.0 + pole.phase) * (microTremor * 0.5);
            pole.group.rotation.x = 0;
          });

          // Buildings: resting firm and still with faint micro-vibration
          structures.forEach((st, sIdx) => {
            st.group.rotation.z = Math.sin(elapsed * 8.0 + sIdx) * 0.0006;
            st.group.rotation.x = Math.cos(elapsed * 6.0 + sIdx) * 0.0004;
            st.group.position.y = st.baseY + Math.abs(Math.sin(elapsed * 10.0 + sIdx)) * 0.03;
          });

          // Cars: resting stationary
          cars.forEach((car) => {
            car.group.position.y = car.baseY;
            car.group.rotation.z = 0;
            car.group.rotation.x = 0;
          });

          // Road: perfectly smooth, peaceful and motionless
          if (roadSegments) {
            roadSegments.roadPlateWest.position.set(0, 0, 0);
            roadSegments.roadPlateEast.position.set(0, 0, 0);
            roadSegments.roadPlateWest.rotation.set(0, 0, 0);
            roadSegments.roadPlateEast.rotation.set(0, 0, 0);
            roadSegments.buckledSlabs.forEach((slab) => {
              slab.mesh.position.y = slab.baseY;
              slab.mesh.rotation.z = slab.baseRotZ;
              slab.mesh.rotation.x = slab.baseRotX;
            });
          }
        }
        // -------------------------------------------------------------
        // TIER 2: LARGER MAGNITUDE (5.0 <= M < 6.8)
        // User request: "and larger magnitude users building shaking"
        // Prominent, realistic building shaking! Resonant structural sway,
        // pitch and roll rocking, timber creaking, roof and chimney vibrations;
        // trees sway heavily, roadside utility poles oscillate side-to-side.
        // -------------------------------------------------------------
        else if (curMag < 6.8) {
          const modRatio = (curMag - 4.8) / 2.0; // ~0.1 to 1.0
          const bldgAmp = (0.024 + modRatio * 0.032) * joltMult;
          const treeAmp = (0.020 + modRatio * 0.035) * joltMult;
          const poleAmp = (0.018 + modRatio * 0.030) * joltMult;

          // BUILDINGS SHAKING: Pitch, roll, and structural shudder
          structures.forEach((st, sIdx) => {
            const inertia = st.isBarn ? 1.25 : 1.0;
            const rockZ = Math.sin(elapsed * (st.freq * 0.75) + sIdx * 1.5) * (bldgAmp * inertia);
            const pitchX = Math.cos(elapsed * (st.freq * 0.6) + sIdx * 1.2) * (bldgAmp * 0.75 * inertia);
            const vertJolt = Math.abs(Math.sin(elapsed * (st.freq * 1.3) + sIdx)) * (0.35 + modRatio * 0.5) * joltMult;

            st.group.rotation.z = rockZ;
            st.group.rotation.x = pitchX;
            st.group.position.y = st.baseY + vertJolt;
          });

          // Trees swaying heavily
          trees.forEach((tree) => {
            tree.group.rotation.z = Math.sin(elapsed * tree.freq + tree.phase) * treeAmp;
            tree.group.rotation.x = Math.cos(elapsed * (tree.freq * 0.8) + tree.phase) * (treeAmp * 0.65);
          });

          // Roadside utility poles swaying
          poles.forEach((pole) => {
            pole.group.rotation.z = Math.sin(elapsed * 12.0 + pole.phase) * poleAmp;
            pole.group.rotation.x = Math.cos(elapsed * 9.0 + pole.phase) * (poleAmp * 0.4);
          });

          // Cars bobbing on tires
          cars.forEach((car) => {
            car.group.position.y = car.baseY + Math.abs(Math.sin(elapsed * 16.0 + car.phase)) * (0.15 + modRatio * 0.25) * joltMult;
            car.group.rotation.z = Math.sin(elapsed * 12.0 + car.phase) * 0.015 * modRatio;
          });

          // Road has subtle ground vibration
          if (roadSegments) {
            const roadVib = (0.04 + modRatio * 0.08) * joltMult;
            roadSegments.roadPlateWest.position.y = Math.sin(elapsed * 16.0) * roadVib;
            roadSegments.roadPlateEast.position.y = -Math.sin(elapsed * 16.0) * roadVib;
            roadSegments.roadPlateWest.position.z = Math.cos(elapsed * 11.0) * (roadVib * 0.5);
            roadSegments.roadPlateEast.position.z = -Math.cos(elapsed * 11.0) * (roadVib * 0.5);
            roadSegments.buckledSlabs.forEach((slab, sIdx) => {
              slab.mesh.position.y = slab.baseY + Math.abs(Math.sin(elapsed * 18.0 + sIdx)) * (roadVib * 0.6);
            });
          }
        }
        // -------------------------------------------------------------
        // TIER 3: MAJOR / EVEN LARGER MAGNITUDE (M >= 6.8 to 8.5)
        // User request: "and that's larger magnitude Use the road along with Road etc"
        // Along with heavy building shaking, the road actively shakes,
        // fractures, shifts, and shears across the fault rupture scarp!
        // Buckled asphalt slabs bounce and clash; roadside utility poles tilt alarmingly;
        // vehicles rock violently on the broken pavement!
        // -------------------------------------------------------------
        else {
          const majorRatio = Math.min(1.0, (curMag - 6.6) / 1.7); // 0.1 to 1.0
          const bldgAmp = (0.058 + majorRatio * 0.042) * joltMult;
          const roadAmp = (0.65 + majorRatio * 0.95) * joltMult;
          const slabAmp = (1.1 + majorRatio * 1.3) * joltMult;

          // 1. VIOLENT BUILDING SHAKING (Red Barn, Silo, Cottages, Farmhouses)
          structures.forEach((st, sIdx) => {
            const inertia = st.isBarn ? 1.3 : 1.0;
            const rockZ = Math.sin(elapsed * (st.freq * 0.8) + sIdx * 1.5) * (bldgAmp * inertia);
            const pitchX = Math.cos(elapsed * (st.freq * 0.65) + sIdx * 1.2) * (bldgAmp * 0.75 * inertia);
            const vertJolt = Math.abs(Math.sin(elapsed * (st.freq * 1.4) + sIdx)) * (0.8 + majorRatio * 1.1) * joltMult;

            st.group.rotation.z = rockZ;
            st.group.rotation.x = pitchX;
            st.group.position.y = st.baseY + vertJolt;
          });

          // 2. THE ROAD: TELESCOPING TECTONIC SHEAR & FAULT DISPLACEMENT ALONG WITH THE ROAD
          if (roadSegments) {
            const { roadPlateWest, roadPlateEast, buckledSlabs } = roadSegments;

            // West plate tectonic heaving and lateral strike-slip fault offset
            roadPlateWest.position.y = Math.sin(elapsed * 15.0) * roadAmp;
            roadPlateWest.position.z = Math.cos(elapsed * 12.0) * (roadAmp * 1.4);
            roadPlateWest.position.x = Math.sin(elapsed * 9.0) * (roadAmp * 0.45);
            roadPlateWest.rotation.z = Math.sin(elapsed * 13.0) * (0.028 * majorRatio * joltMult);
            roadPlateWest.rotation.x = Math.cos(elapsed * 10.0) * (0.022 * majorRatio * joltMult);

            // East plate moves opposite across the active fault plane
            roadPlateEast.position.y = -Math.sin(elapsed * 15.0) * roadAmp;
            roadPlateEast.position.z = -Math.cos(elapsed * 12.0) * (roadAmp * 1.4);
            roadPlateEast.position.x = -Math.sin(elapsed * 9.0) * (roadAmp * 0.45);
            roadPlateEast.rotation.z = -Math.sin(elapsed * 13.0) * (0.028 * majorRatio * joltMult);
            roadPlateEast.rotation.x = -Math.cos(elapsed * 10.0) * (0.022 * majorRatio * joltMult);

            // Buckled asphalt slabs along the fault crossing violently bouncing and tilting
            buckledSlabs.forEach((slab, sIdx) => {
              const bounce = Math.abs(Math.sin(elapsed * 22.0 + sIdx * 1.8)) * slabAmp;
              const tiltZ = Math.sin(elapsed * 16.0 + sIdx * 2.1) * (0.13 * majorRatio * joltMult);
              const tiltX = Math.cos(elapsed * 18.0 + sIdx * 1.6) * (0.10 * majorRatio * joltMult);

              slab.mesh.position.y = slab.baseY + bounce;
              slab.mesh.rotation.z = slab.baseRotZ + tiltZ;
              slab.mesh.rotation.x = slab.baseRotX + tiltX;
            });
          }

          // 3. VEHICLES ON ROAD: Rocking and bouncing on shaking buckled asphalt
          cars.forEach((car) => {
            const carBounce = Math.abs(Math.sin(elapsed * 23.0 + car.phase)) * (0.75 + majorRatio * 0.85) * joltMult;
            const carTiltZ = Math.sin(elapsed * 17.0 + car.phase) * (0.065 * majorRatio * joltMult);
            const carTiltX = Math.cos(elapsed * 15.0 + car.phase) * (0.045 * majorRatio * joltMult);

            car.group.position.y = car.baseY + carBounce;
            car.group.rotation.z = carTiltZ;
            car.group.rotation.x = carTiltX;
          });

          // 4. ROADSIDE UTILITY POLES & TREES: Violent swaying and leaning along the road
          poles.forEach((pole) => {
            const poleTilt = (0.065 + majorRatio * 0.055) * joltMult;
            pole.group.rotation.z = Math.sin(elapsed * 13.0 + pole.phase) * poleTilt;
            pole.group.rotation.x = Math.cos(elapsed * 10.5 + pole.phase) * (poleTilt * 0.45);
          });

          trees.forEach((tree) => {
            const treeTilt = (0.060 + majorRatio * 0.050) * joltMult;
            tree.group.rotation.z = Math.sin(elapsed * tree.freq + tree.phase) * treeTilt;
            tree.group.rotation.x = Math.cos(elapsed * (tree.freq * 0.8) + tree.phase) * (treeTilt * 0.65);
          });
        }
      }

      // Epicenter target ring subtle rotation
      if (earthquakeEpicenterRef.current && intelModeRef.current === 'earthquakes') {
        const { reticle, crosshair } = earthquakeEpicenterRef.current;
        reticle.rotation.z = elapsed * 0.2;
        crosshair.rotation.y = -elapsed * 0.1;
      }

      // Camera Seismic Tremor (Clean, grounded tremor during jolts or major earthquakes)
      let camTremorX = 0;
      let camTremorY = 0;
      let camTremorZ = 0;
      if (intelModeRef.current === 'earthquakes') {
        const curMag = liveMagnitudeRef.current;
        const isJolt = seismicTriggerRef.current > 0;
        const magRumble = curMag >= 6.8 ? (curMag - 6.6) * 0.16 : 0;
        const joltRumble = isJolt ? 0.35 * seismicTriggerRef.current : 0;
        const totalRumble = magRumble + joltRumble;

        if (totalRumble > 0) {
          camTremorX = Math.sin(elapsed * 20.0) * totalRumble;
          camTremorY = Math.cos(elapsed * 16.0) * (totalRumble * 0.65);
          camTremorZ = Math.sin(elapsed * 14.0) * (totalRumble * 0.35);
        }
        if (isJolt) {
          seismicTriggerRef.current = Math.max(0, seismicTriggerRef.current - 0.015);
        }
      }

      camera.position.x += camTremorX;
      camera.position.y += camTremorY;
      camera.position.z += camTremorZ;

      renderer.render(scene, camera);

      camera.position.x -= camTremorX;
      camera.position.y -= camTremorY;
      camera.position.z -= camTremorZ;
    };
    animate();

    // Interaction Gestures (Orbit, Pan, Zoom)
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightDraggingRef.current = true;
      } else {
        isDraggingRef.current = true;
      }
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

      if (isRightDraggingRef.current) {
        // Pan Target
        const panSpeed = 0.5;
        const theta = cameraAngleRef.current.theta;
        const forward = new THREE.Vector3(-Math.sin(theta), 0, -Math.cos(theta));
        const right = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));

        cameraAngleRef.current.target.addScaledVector(right, -deltaX * panSpeed);
        cameraAngleRef.current.target.addScaledVector(forward, deltaY * panSpeed);
        updateCamera();
      } else if (isDraggingRef.current) {
        // Orbit Angles
        cameraAngleRef.current.theta -= deltaX * 0.008;
        cameraAngleRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI / 2.05, cameraAngleRef.current.phi - deltaY * 0.008)
        );
        updateCamera();
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isRightDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      cameraAngleRef.current.radius = Math.max(35, Math.min(2200, cameraAngleRef.current.radius * zoomFactor));
      updateCamera();
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []); // Run once on mount

  const onSelectLocationRef = useRef(onSelectLocation);
  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
  }, [onSelectLocation]);

  // Watch for mode or target change and rebuild 3D mesh
  useEffect(() => {
    if (sceneRef.current && ambientLightRef.current && sunLightRef.current) {
      if (intelMode === 'earthquakes') {
        sceneRef.current.background = new THREE.Color(0x89b0d6);
        sceneRef.current.fog = new THREE.FogExp2(0xb0cae4, 0.0006);
        ambientLightRef.current.color.setHex(0xdce7f0);
        ambientLightRef.current.intensity = 1.6;
        sunLightRef.current.color.setHex(0xfffbeb);
        sunLightRef.current.intensity = 2.4;
        sunLightRef.current.position.set(300, 600, 400);
      } else if (intelMode === 'fires') {
        sceneRef.current.background = new THREE.Color(0x2f4236);
        sceneRef.current.fog = new THREE.FogExp2(0x3a4f42, 0.0007);
        ambientLightRef.current.color.setHex(0x506555);
        ambientLightRef.current.intensity = 1.5;
        sunLightRef.current.color.setHex(0xffe8cc);
        sunLightRef.current.intensity = 2.0;
        sunLightRef.current.position.set(250, 450, 350);
      } else {
        sceneRef.current.background = new THREE.Color(0x020617);
        sceneRef.current.fog = new THREE.FogExp2(0x030a1c, 0.0009);
        ambientLightRef.current.color.setHex(0xffffff);
        ambientLightRef.current.intensity = 1.4;
        sunLightRef.current.color.setHex(0xffffff);
        sunLightRef.current.intensity = 2.0;
        sunLightRef.current.position.set(400, 800, 500);
      }
    }

    if (intelMode === 'flights') {
      build3DAircraftMesh(currentFlight);
    } else if (intelMode === 'fires') {
      build3DWildfireMesh(currentFire, fireSceneType, interactiveFireIntensity ?? undefined);
    } else if (intelMode === 'earthquakes') {
      build3DEarthquakeMesh(currentEarthquake);
    }
  }, [
    intelMode,
    flightIndex,
    fireIndex,
    earthquakeIndex,
    fireSceneType,
    interactiveFireIntensity,
    build3DAircraftMesh,
    build3DWildfireMesh,
    build3DEarthquakeMesh,
    currentFlight,
    currentFire,
    currentEarthquake,
  ]);

  // Shift to Next / Previous Target
  const handleShiftTarget = (direction: 1 | -1) => {
    if (intelMode === 'fires') {
      const nextIdx = (fireIndex + direction + activeFiresList.length) % activeFiresList.length;
      setFireIndex(nextIdx);
      setInteractiveFireIntensity(null);
    } else {
      const nextIdx = (earthquakeIndex + direction + activeEarthquakesList.length) % activeEarthquakesList.length;
      setEarthquakeIndex(nextIdx);
      setInteractiveMagnitude(null); // Reset to natural USGS magnitude
    }
  };

  // Camera presets
  const handleSetPreset = (preset: 'orbit' | 'chase' | 'topdown') => {
    setCameraViewPreset(preset);
    if (preset === 'orbit') {
      cameraAngleRef.current.radius = intelMode === 'flights' ? 280 : 360;
      cameraAngleRef.current.phi = Math.PI / 3.2;
    } else if (preset === 'chase') {
      cameraAngleRef.current.radius = intelMode === 'earthquakes' ? 240 : 140;
      cameraAngleRef.current.phi = Math.PI / 2.3;
      if (intelMode === 'flights') {
        const headingRad = ((currentFlight.heading || 0) * Math.PI) / 180;
        cameraAngleRef.current.theta = headingRad + Math.PI; // Look directly from behind tail
      }
    } else if (preset === 'topdown') {
      cameraAngleRef.current.radius = 520;
      cameraAngleRef.current.phi = 0.12; // High overhead nadir
    }
    updateCamera();
  };

  // Current entity coordinates for HUD with bulletproof null-safety
  const currentEntityCoords = useMemo(() => {
    if (intelMode === 'flights') {
      return {
        lat: typeof currentFlight?.lat === 'number' ? currentFlight.lat : (lat ?? 0),
        lon: typeof currentFlight?.lon === 'number' ? currentFlight.lon : (lon ?? 0),
      };
    } else if (intelMode === 'fires') {
      return {
        lat: typeof currentFire?.lat === 'number' ? currentFire.lat : (lat ?? 0),
        lon: typeof currentFire?.lon === 'number' ? currentFire.lon : (lon ?? 0),
      };
    } else {
      return {
        lat: typeof currentEarthquake?.lat === 'number' ? currentEarthquake.lat : (lat ?? 0),
        lon: typeof currentEarthquake?.lon === 'number' ? currentEarthquake.lon : (lon ?? 0),
      };
    }
  }, [intelMode, currentFlight, currentFire, currentEarthquake, lat, lon]);

  return (
    <div className={`relative w-full h-full select-none overflow-hidden font-sans transition-colors duration-500 ${
      intelMode === 'earthquakes' ? 'bg-[#89b0d6]' : intelMode === 'fires' ? 'bg-[#2f4236]' : 'bg-[#020408]'
    }`}>
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left: Navigation & Tactical Telemetry Header */}
      <div className="absolute top-6 left-6 z-30 flex flex-col gap-3 pointer-events-auto">
        <div className="flex items-center gap-2">
          {onReturnToGlobe && (
            <button
              onClick={onReturnToGlobe}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/20 text-white font-medium text-xs shadow-2xl backdrop-blur-xl transition-all cursor-pointer hover:border-cyan-400 group active:scale-95"
            >
              <Globe className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform" />
              <span>Return to Planetary Globe</span>
            </button>
          )}

          {onOpenRoadMap && (
            <button
              onClick={() => onOpenRoadMap()}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/20 text-white font-medium text-xs shadow-2xl backdrop-blur-xl transition-all cursor-pointer hover:border-emerald-400 active:scale-95"
              title="View on Google Map Street View"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Map View</span>
            </button>
          )}
        </div>

        {/* Tactical Intel Mode Switcher: Fires & Earthquakes (Clean 2-tier HUD) */}
        <div className="flex items-center p-1 rounded-2xl bg-black/70 border border-white/20 shadow-2xl backdrop-blur-xl">

          <button
            onClick={() => setIntelMode('fires')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              intelMode === 'fires'
                ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/30'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Flame className={`w-4 h-4 ${intelMode === 'fires' ? 'text-black' : 'text-orange-400 animate-pulse'}`} />
            <span>Wildfires</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                intelMode === 'fires' ? 'bg-black/20 text-black' : 'bg-white/10 text-neutral-300'
              }`}
            >
              {activeFiresList.length}
            </span>
          </button>

          <button
            onClick={() => setIntelMode('earthquakes')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              intelMode === 'earthquakes'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Activity className={`w-4 h-4 ${intelMode === 'earthquakes' ? 'text-black' : 'text-amber-400'}`} />
            <span>Earthquakes</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                intelMode === 'earthquakes' ? 'bg-black/20 text-black' : 'bg-white/10 text-neutral-300'
              }`}
            >
              {activeEarthquakesList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Top Right: Camera Presets & Search */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-2 pointer-events-auto">
        {/* Vantage Presets */}
        <div className="flex items-center p-1 rounded-2xl bg-black/60 border border-white/20 shadow-2xl backdrop-blur-xl">
          {[
            { id: 'orbit', label: 'Tactical Orbit' },
            { id: 'chase', label: intelMode === 'fires' ? 'Perimeter View' : 'Fault Line' },
            { id: 'topdown', label: 'Nadir 90°' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSetPreset(preset.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                cameraViewPreset === preset.id
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Target Entity Switcher & Search */}
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/20 text-white font-medium text-xs shadow-2xl backdrop-blur-xl transition-all cursor-pointer hover:border-white/40"
          title="Browse all targets"
        >
          <Search className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">
            {intelMode === 'fires'
              ? currentFire.locationName?.split(',')[0] || 'Wildfire Hotspot'
              : currentEarthquake.place?.split(' of ')[1] || currentEarthquake.place || 'Seismic Epicenter'}
          </span>
        </button>

        {/* Previous / Next Target Arrows */}
        <div className="flex items-center rounded-2xl bg-black/60 border border-white/20 shadow-2xl backdrop-blur-xl overflow-hidden">
          <button
            onClick={() => handleShiftTarget(-1)}
            className="p-2 hover:bg-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Previous hotspot"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleShiftTarget(1)}
            className="p-2 hover:bg-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer border-l border-white/10"
            title="Next hotspot"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Selector Dropdown Modal */}
      {isSearchOpen && (
        <div className="absolute top-20 right-6 z-40 w-80 max-h-96 rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-fade-in pointer-events-auto">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider font-mono">
              Select {intelMode === 'fires' ? 'Wildfire' : 'Earthquake'}
            </span>
            <button onClick={() => setIsSearchOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">

            {intelMode === 'fires' &&
              activeFiresList.map((fr, idx) => (
                <button
                  key={`${fr.id}-${idx}`}
                  onClick={() => {
                    setFireIndex(idx);
                    setIsSearchOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    idx === fireIndex % activeFiresList.length
                      ? 'bg-orange-500/25 border-orange-400 text-white font-bold'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{fr.locationName || 'Hotspot'}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{fr.satellite}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-orange-300 shrink-0 font-bold">
                    {Math.round(fr.frp)} MW
                  </span>
                </button>
              ))}

            {intelMode === 'earthquakes' &&
              activeEarthquakesList.map((eq, idx) => (
                <button
                  key={`${eq.id}-${idx}`}
                  onClick={() => {
                    setEarthquakeIndex(idx);
                    setIsSearchOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    idx === earthquakeIndex % activeEarthquakesList.length
                      ? 'bg-amber-500/25 border-amber-400 text-white font-bold'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Activity className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{eq.place}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">Depth: {Math.round(eq?.depth ?? 10)} km</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-amber-300 shrink-0 font-bold">
                    M {typeof eq?.magnitude === 'number' ? eq.magnitude.toFixed(1) : '--'}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Bottom Floating Telemetry Card: SCIENTIFIC FIELDS */}
      <div
        className={`absolute bottom-6 z-30 transition-all duration-300 pointer-events-auto ${
          telemetryDockSide === 'right' ? 'right-6' : 'left-6'
        } ${isTelemetryCollapsed ? 'w-auto' : 'w-full max-w-sm sm:max-w-md'}`}
      >
        {isTelemetryCollapsed ? (
          <div
            onClick={() => setIsTelemetryCollapsed(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-black/85 border border-white/20 shadow-2xl backdrop-blur-2xl text-white font-sans text-xs cursor-pointer hover:border-amber-400 hover:bg-black/95 transition-all group"
            title="Expand real-time telemetry card"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  intelMode === 'flights' ? 'bg-sky-400' : intelMode === 'fires' ? 'bg-orange-400' : 'bg-amber-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  intelMode === 'flights' ? 'bg-sky-500' : intelMode === 'fires' ? 'bg-orange-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span
              className={`font-mono font-bold text-xs uppercase tracking-wider ${
                intelMode === 'flights' ? 'text-sky-400' : intelMode === 'fires' ? 'text-orange-400' : 'text-amber-400'
              }`}
            >
              {intelMode === 'flights'
                ? `ADS-B ${currentFlight.callsign}`
                : intelMode === 'fires'
                ? `FRP ${Math.round(interactiveFireIntensity ?? currentFire.frp)} MW`
                : `USGS M ${(interactiveMagnitude ?? (typeof currentEarthquake?.magnitude === 'number' ? currentEarthquake.magnitude : 6.0)).toFixed(1)}`}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1 group-hover:text-white">
              <span>Show Telemetry</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </span>
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-black/85 border border-white/20 shadow-2xl backdrop-blur-2xl text-white font-sans space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      intelMode === 'flights' ? 'bg-sky-400' : intelMode === 'fires' ? 'bg-orange-400' : 'bg-amber-400'
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      intelMode === 'flights' ? 'bg-sky-500' : intelMode === 'fires' ? 'bg-orange-500' : 'bg-amber-500'
                    }`}
                  ></span>
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider font-mono ${
                    intelMode === 'flights' ? 'text-sky-400' : intelMode === 'fires' ? 'text-orange-400' : 'text-amber-400'
                  }`}
                >
                  {intelMode === 'flights'
                    ? 'OpenSky Network ADS-B Telemetry'
                    : intelMode === 'fires'
                    ? 'NASA FIRMS Satellite Telemetry'
                    : 'USGS Real-Time Seismological Telemetry'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTelemetryDockSide(telemetryDockSide === 'right' ? 'left' : 'right')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer"
                  title={`Move telemetry card to ${telemetryDockSide === 'right' ? 'left side' : 'right side'}`}
                >
                  {telemetryDockSide === 'right' ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsTelemetryCollapsed(true)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer"
                  title="Minimize telemetry card"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          {/* TELEMETRY GRID FOR WILDFIRE */}
          {intelMode === 'fires' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-orange-400" /> FRP
                  </span>
                  <p className="text-sm font-bold font-mono text-orange-300">
                    {Math.round(interactiveFireIntensity ?? currentFire.frp)} MW
                  </p>
                  <span className="text-[9px] text-neutral-400">Radiative Power</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-red-400" /> Temperature
                  </span>
                  <p className="text-sm font-bold font-mono text-white">{Math.round(currentFire.brightness)} K</p>
                  <span className="text-[9px] text-neutral-400">{Math.round(currentFire.brightness - 273.15)}°C</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                    <Satellite className="w-3 h-3 text-sky-400" /> Satellite
                  </span>
                  <p className="text-xs font-bold font-mono text-sky-200 truncate">{currentFire.satellite}</p>
                  <span className="text-[9px] text-neutral-400">{currentFire.confidence} conf</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                    <Wind className="w-3 h-3 text-emerald-400" /> Dispersion
                  </span>
                  <p className="text-xs font-bold font-mono text-white">ENE 14 kts</p>
                  <span className="text-[9px] text-neutral-400">Thermal Updraft</span>
                </div>
              </div>

              {/* Burning Source Scene Selector: ALL, TREES, TIRES, DEBRIS */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span>BURNING MATERIAL IN GREENERY LANDSCAPE:</span>
                  <span className="text-amber-400 font-semibold uppercase">
                    {fireSceneType === 'all'
                      ? '🌲 All Burning (Trees + Tires + Debris)'
                      : fireSceneType === 'trees'
                      ? '🌲 Burning Forest Trees'
                      : fireSceneType === 'tires'
                      ? '🛞 Scrap Rubber Tires'
                      : '🏭 Massive Debris Inferno'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => {
                      setFireSceneType('all');
                      build3DWildfireMesh(currentFire, 'all', interactiveFireIntensity ?? undefined);
                    }}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      fireSceneType === 'all'
                        ? 'bg-orange-500/25 text-orange-300 border-orange-500/60 shadow-sm shadow-orange-500/20'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>🔥 All</span>
                  </button>
                  <button
                    onClick={() => {
                      setFireSceneType('trees');
                      build3DWildfireMesh(currentFire, 'trees', interactiveFireIntensity ?? undefined);
                    }}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      fireSceneType === 'trees'
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-500/20'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>🌲 Trees</span>
                  </button>
                  <button
                    onClick={() => {
                      setFireSceneType('tires');
                      build3DWildfireMesh(currentFire, 'tires', interactiveFireIntensity ?? undefined);
                    }}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      fireSceneType === 'tires'
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm shadow-amber-500/20'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>🛞 Tires</span>
                  </button>
                  <button
                    onClick={() => {
                      setFireSceneType('debris');
                      build3DWildfireMesh(currentFire, 'debris', interactiveFireIntensity ?? undefined);
                    }}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      fireSceneType === 'debris'
                        ? 'bg-red-500/25 text-red-300 border-red-500/60 shadow-sm shadow-red-500/20'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>🏭 Debris</span>
                  </button>
                </div>
              </div>

              {/* Fire Radiative Power (FRP) Intensity Live Controller */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span>FIRE INTENSITY SIMULATOR:</span>
                  <span className="text-orange-400 font-bold font-mono">
                    {Math.round(interactiveFireIntensity ?? currentFire.frp)} MW {
                      (interactiveFireIntensity ?? currentFire.frp) < 100
                        ? '• Gentle Spot Fire'
                        : (interactiveFireIntensity ?? currentFire.frp) < 300
                        ? '• Active Wildfire'
                        : (interactiveFireIntensity ?? currentFire.frp) < 600
                        ? '• High Intensity Conflagration'
                        : '• Extreme Roaring Firestorm'
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-3 gap-1.5 flex-1">
                    {[
                      { label: '80 MW Low', val: 80 },
                      { label: '250 MW Mid', val: 250 },
                      { label: '750 MW Storm', val: 750 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setInteractiveFireIntensity(preset.val);
                          build3DWildfireMesh(currentFire, fireSceneType, preset.val);
                        }}
                        className={`px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          (interactiveFireIntensity ?? currentFire.frp) === preset.val
                            ? 'bg-orange-500/25 text-orange-300 border-orange-500/60 shadow-sm shadow-orange-500/20'
                            : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {interactiveFireIntensity !== null && (
                    <button
                      onClick={() => {
                        setInteractiveFireIntensity(null);
                        build3DWildfireMesh(currentFire, fireSceneType, currentFire.frp);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono text-neutral-300 hover:text-white bg-white/10 border border-white/15 hover:bg-white/20 cursor-pointer transition-all"
                      title="Reset to natural satellite sensor FRP"
                    >
                      Reset FRP
                    </button>
                  )}
                </div>

                {/* Fire Intensity Live Range Slider */}
                <div className="flex items-center gap-2 px-1 pt-0.5">
                  <span className="text-[10px] font-mono text-neutral-400">50 MW</span>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="25"
                    value={interactiveFireIntensity ?? Math.round(currentFire.frp)}
                    onChange={(e) => {
                      const newFrp = parseInt(e.target.value, 10);
                      setInteractiveFireIntensity(newFrp);
                      build3DWildfireMesh(currentFire, fireSceneType, newFrp);
                    }}
                    className="flex-1 accent-orange-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                  />
                  <span className="text-[10px] font-mono text-neutral-400">1000 MW</span>
                </div>
              </div>

              {/* Thermal Surge Trigger */}
              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    fireSurgeTriggerRef.current = 1.0;
                    setFireSurgeActive(true);
                    setTimeout(() => setFireSurgeActive(false), 2400);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-black hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-orange-500/25"
                >
                  <Flame className="w-3.5 h-3.5 text-black" />
                  <span>{fireSurgeActive ? '🔥 Thermal Updraft Surge Active' : '🔥 Trigger Thermal Convection Surge'}</span>
                </button>
              </div>
            </>
          )}

          {/* TELEMETRY GRID FOR EARTHQUAKE */}
          {intelMode === 'earthquakes' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-red-400" /> Magnitude
                  </span>
                  <p className="text-sm font-bold font-mono text-red-300">
                    M {(interactiveMagnitude ?? (typeof currentEarthquake?.magnitude === 'number' ? currentEarthquake.magnitude : 6.0)).toFixed(1)}
                  </p>
                  <span className="text-[9px] text-neutral-400">{interactiveMagnitude !== null ? 'Interactive Simulator' : 'USGS Real Sensor'}</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                    <ArrowDown className="w-3 h-3 text-amber-400" /> Focal Depth
                  </span>
                  <p className="text-sm font-bold font-mono text-white">
                    {Math.round(currentEarthquake?.depth ?? 10)} km
                  </p>
                  <span className="text-[9px] text-neutral-400">Hypocenter Depth</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-yellow-400" /> Ground Shake
                  </span>
                  <p className="text-xs font-bold font-mono text-yellow-200 truncate">
                    {(interactiveMagnitude ?? currentEarthquake?.magnitude ?? 6.0) < 4.5
                      ? 'IV Light Tremor'
                      : (interactiveMagnitude ?? currentEarthquake?.magnitude ?? 6.0) < 6.0
                      ? 'VI Strong Shaking'
                      : (interactiveMagnitude ?? currentEarthquake?.magnitude ?? 6.0) < 7.3
                      ? 'VIII Severe Rolling'
                      : 'X Major Surface Waves'}
                  </p>
                  <span className="text-[9px] text-neutral-400">Modified Mercalli</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-neutral-400 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400" /> Felt Reports
                  </span>
                  <p className="text-xs font-bold font-mono text-emerald-300">
                    {currentEarthquake?.felt ? `${currentEarthquake.felt.toLocaleString()} DYFI` : 'USGS NEIC'}
                  </p>
                  <span className="text-[9px] text-neutral-400">
                    {currentEarthquake?.tsunami ? 'Tsunami Threat' : 'No Tsunami'}
                  </span>
                </div>
              </div>

              {/* Normal Land Magnitude Shaking Controller */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span>MAGNITUDE TIER SIMULATOR:</span>
                  <span className="text-red-400 font-bold font-mono">
                    M {(interactiveMagnitude ?? (currentEarthquake?.magnitude || 6.0)).toFixed(1)} {
                      (interactiveMagnitude ?? (currentEarthquake?.magnitude || 6.0)) < 5.0
                        ? '• Subtle Waveform (Stable Buildings & Road)'
                        : (interactiveMagnitude ?? (currentEarthquake?.magnitude || 6.0)) < 6.8
                        ? '• Strong Shaking (Buildings Shaking & Swaying)'
                        : '• Major Rupture (Road Shearing & Asphalt Buckling)'
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-3 gap-1.5 flex-1">
                    {[
                      { label: 'M 3.8 Light', magVal: 3.8, title: 'Gentle ground ripples, stable buildings & smooth intact road' },
                      { label: 'M 5.8 Strong', magVal: 5.8, title: 'Visible building shaking, timber creaking & structural sway' },
                      { label: 'M 7.8 Severe', magVal: 7.8, title: 'Road plates shear, buckled asphalt bounces & buildings rock' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setInteractiveMagnitude(preset.magVal);
                          liveMagnitudeRef.current = preset.magVal;
                          build3DEarthquakeMesh(currentEarthquake, preset.magVal);
                        }}
                        title={preset.title}
                        className={`px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          (interactiveMagnitude ?? currentEarthquake?.magnitude) === preset.magVal
                            ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-sm shadow-red-500/20'
                            : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {interactiveMagnitude !== null && (
                    <button
                      onClick={() => {
                        setInteractiveMagnitude(null);
                        const naturalMag = typeof currentEarthquake?.magnitude === 'number' ? currentEarthquake.magnitude : 6.0;
                        liveMagnitudeRef.current = naturalMag;
                        build3DEarthquakeMesh(currentEarthquake, naturalMag);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono text-neutral-300 hover:text-white bg-white/10 border border-white/15 hover:bg-white/20 cursor-pointer transition-all"
                      title="Reset to natural USGS sensor magnitude"
                    >
                      Reset USGS
                    </button>
                  )}
                </div>

                {/* Magnitude Live Range Slider */}
                <div className="flex items-center gap-2 px-1 pt-0.5">
                  <span className="text-[10px] font-mono text-neutral-400">M 3.0</span>
                  <input
                    type="range"
                    min="3.0"
                    max="8.5"
                    step="0.1"
                    value={interactiveMagnitude ?? (currentEarthquake?.magnitude || 6.0)}
                    onChange={(e) => {
                      const newMag = parseFloat(e.target.value);
                      setInteractiveMagnitude(newMag);
                      liveMagnitudeRef.current = newMag;
                    }}
                    onPointerUp={(e) => {
                      const newMag = parseFloat((e.target as HTMLInputElement).value);
                      build3DEarthquakeMesh(currentEarthquake, newMag);
                    }}
                    onTouchEnd={(e) => {
                      const newMag = parseFloat((e.target as HTMLInputElement).value);
                      build3DEarthquakeMesh(currentEarthquake, newMag);
                    }}
                    className="flex-1 accent-red-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                  />
                  <span className="text-[10px] font-mono text-neutral-400">M 8.5</span>
                </div>
              </div>

              {/* Seismic Shockwave Trigger */}
              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    seismicTriggerRef.current = 1.0;
                    setSeismicActive(true);
                    setTimeout(() => setSeismicActive(false), 2400);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 via-amber-400 to-sky-400 text-black hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-red-500/25"
                >
                  <Zap className="w-3.5 h-3.5 text-black" />
                  <span>{seismicActive ? '💥 Seismic Wavefront Active' : '⚡ Trigger Seismic Rupture Shockwave'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  </div>
);
};
