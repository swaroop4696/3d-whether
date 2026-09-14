/**
 * Earth Surface Classifier (Land vs Ocean / Water)
 * 
 * Provides instantaneous, high-precision detection of whether a given
 * geographic coordinate (lat, lon) is on Land or Water.
 * 
 * 1. Pixel-precise sampling from Earth specular mask (where oceans have specular highlight and land has 0)
 * 2. High-speed continental boundary & oceanic basin geometric classifier (instant zero-latency fallback)
 */

interface Point {
  lat: number;
  lon: number;
}

// Global cached specular mask sampled at 512x256 resolution
let specularMask: Uint8Array | null = null;
const MASK_WIDTH = 512;
const MASK_HEIGHT = 256;

/**
 * Initializes the pixel mask from an HTMLImageElement or canvas
 */
export function initSurfaceMaskFromImage(image: HTMLImageElement | HTMLCanvasElement): void {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = MASK_WIDTH;
    canvas.height = MASK_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(image, 0, 0, MASK_WIDTH, MASK_HEIGHT);
    const imgData = ctx.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT);
    const pixels = imgData.data;

    // Extract red channel (grayscale specular value)
    const mask = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
    for (let i = 0; i < mask.length; i++) {
      mask[i] = pixels[i * 4];
    }
    specularMask = mask;
  } catch (err) {
    console.warn('Failed to initialize surface specular mask:', err);
  }
}

/**
 * Auto-initializes surface mask in the browser by loading earth_specular_2048.jpg
 */
export function preloadSurfaceMask(): void {
  if (typeof window === 'undefined') return;
  if (specularMask) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    initSurfaceMaskFromImage(img);
  };
  img.src = '/textures/earth_specular_2048.jpg';
}

// Automatically trigger background preload
if (typeof window !== 'undefined') {
  preloadSurfaceMask();
}

/**
 * Fast geometric continental landmass test.
 * Used as immediate synchronous classifier or fallback before specular texture is ready.
 */
function isPointInLandGeometry(lat: number, lon: number): boolean {
  // Normalize lon to [-180, 180]
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;

  // 1. Extreme polar regions
  if (lat < -60) return true; // Antarctica continent & ice shelf
  if (lat > 84) return false; // Arctic Ocean pole

  // 2. High-certainty Open Oceanic Basins (Guaranteed Water)
  // North Pacific Ocean Basin
  if (lat >= 15 && lat <= 50 && lon >= 146 && lon <= 180) {
    return false;
  }
  if (lat >= 25 && lat <= 55 && lon >= -180 && lon <= -125) {
    return false;
  }

  // Mid & South Pacific Ocean
  if (lat > -55 && lat < 25 && lon >= -180 && lon <= -120) {
    // Hawaii archipelago exception
    if (lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154) return true;
    // French Polynesia / Cook Islands exception
    if (lat >= -23 && lat <= -8 && lon >= -155 && lon <= -134) return true;
    return false;
  }
  // Central Pacific Basin
  if (lat > -50 && lat < 25 && lon >= 160 && lon <= 180) {
    // New Zealand exception
    if (lat >= -48 && lat <= -34 && lon >= 166 && lon <= 179) return true;
    // Fiji exception
    if (lat >= -19 && lat <= -16 && lon >= 177 && lon <= 180) return true;
    return false;
  }
  // Mid Atlantic Ocean Basin (Open Ocean)
  if (lat >= 10 && lat <= 55 && lon >= -40 && lon <= -18) {
    // Azores & Iceland exceptions
    if (lat >= 36 && lat <= 40 && lon >= -32 && lon <= -24) return true;
    if (lat >= 63 && lat <= 67 && lon >= -25 && lon <= -13) return true;
    return false;
  }
  // South Atlantic Basin (Open Ocean)
  if (lat >= -50 && lat <= 0 && lon >= -32 && lon <= 5) {
    return false;
  }
  // Southern Indian Ocean Basin
  if (lat >= -55 && lat <= -10 && lon >= 55 && lon <= 110) {
    // Madagascar exception
    if (lat >= -26 && lat <= -11 && lon >= 43 && lon <= 51) return true;
    // Mauritius / Reunion exception
    if (lat >= -22 && lat <= -19 && lon >= 55 && lon <= 58) return true;
    return false;
  }
  // Central Indian Ocean Basin
  if (lat >= -10 && lat <= 5 && lon >= 60 && lon <= 90) {
    // Maldives / Sri Lanka exceptions
    if (lat >= -1 && lat <= 8 && lon >= 72 && lon <= 74) return true;
    if (lat >= 5 && lat <= 10 && lon >= 79 && lon <= 82) return true;
    return false;
  }

  // 3. Major Continents & Landmass Bounding Boxes
  // North America (US, Canada, Mexico)
  if (lat >= 14 && lat <= 72 && lon >= -168 && lon <= -52) {
    // Exclude Gulf of Mexico
    if (lat >= 20 && lat <= 29 && lon >= -94 && lon <= -84) return false;
    // Exclude Hudson Bay
    if (lat >= 54 && lat <= 64 && lon >= -92 && lon <= -78) return false;
    return true;
  }

  // Central America
  if (lat >= 7 && lat <= 18 && lon >= -92 && lon <= -77) {
    return true;
  }

  // South America
  if (lat >= -56 && lat <= 13 && lon >= -82 && lon <= -34) {
    return true;
  }

  // Eurasia (Europe + Asia)
  if (lat >= 1 && lat <= 78 && lon >= -10 && lon <= 180) {
    // Exclude Mediterranean Sea (Open Waters)
    if (lat >= 32 && lat <= 44 && lon >= 0 && lon <= 35) return false;
    // Exclude Black Sea
    if (lat >= 41 && lat <= 47 && lon >= 28 && lon <= 42) return false;
    // Exclude Caspian Sea
    if (lat >= 36 && lat <= 47 && lon >= 47 && lon <= 54) return false;
    // Exclude Red Sea
    if (lat >= 13 && lat <= 28 && lon >= 34 && lon <= 43) return false;
    // Exclude Arabian Sea
    if (lat >= 10 && lat <= 22 && lon >= 58 && lon <= 72) return false;
    // Exclude Bay of Bengal
    if (lat >= 8 && lat <= 20 && lon >= 82 && lon <= 92) return false;
    // Exclude South China Sea
    if (lat >= 5 && lat <= 20 && lon >= 110 && lon <= 118) return false;
    // Exclude Sea of Japan
    if (lat >= 35 && lat <= 48 && lon >= 130 && lon <= 139) return false;
    return true;
  }

  // Chukotka / Russian Far East crossing 180 to -170
  if (lat >= 60 && lat <= 72 && lon >= -180 && lon <= -168) {
    return true;
  }

  // United Kingdom & Ireland
  if (lat >= 50 && lat <= 60 && lon >= -11 && lon <= 2) {
    // Exclude North Sea / Irish Sea specific deep spots if needed, but land mass is dense
    return true;
  }

  // Africa
  if (lat >= -35 && lat <= 38 && lon >= -18 && lon <= 52) {
    return true;
  }

  // Australia & Tasmania
  if (lat >= -44 && lat <= -10 && lon >= 112 && lon <= 154) {
    return true;
  }

  // New Zealand
  if (lat >= -48 && lat <= -34 && lon >= 165 && lon <= 179) {
    return true;
  }

  // Japan
  if (lat >= 30 && lat <= 46 && lon >= 128 && lon <= 146) {
    return true;
  }

  // Indonesia, Malaysia, Philippines
  if (lat >= -11 && lat <= 20 && lon >= 95 && lon <= 142) {
    return true;
  }

  // Greenland
  if (lat >= 60 && lat <= 84 && lon >= -73 && lon <= -11) {
    return true;
  }

  // Default: if outside major landmasses, it is maritime water
  return false;
}

/**
 * Returns whether the given geographic coordinates are on Land or Water.
 * 
 * @param lat Latitude in degrees [-90, 90]
 * @param lon Longitude in degrees [-180, 180]
 * @returns true if on Land, false if on Water/Ocean
 */
export function isLandCoordinate(lat: number, lon: number): boolean {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return true; // Safe fallback
  }

  // If specular mask is ready, sample the exact pixel
  if (specularMask) {
    // Normalize coordinates
    let normLon = lon;
    while (normLon > 180) normLon -= 360;
    while (normLon < -180) normLon += 360;

    const u = (normLon + 180) / 360;
    const v = (90 - Math.max(-90, Math.min(90, lat))) / 180;

    const x = Math.min(MASK_WIDTH - 1, Math.max(0, Math.floor(u * MASK_WIDTH)));
    const y = Math.min(MASK_HEIGHT - 1, Math.max(0, Math.floor(v * MASK_HEIGHT)));

    const specularVal = specularMask[y * MASK_WIDTH + x];

    // In NASA specular maps:
    // Oceans & open water have strong specular reflection (specularVal > 60-100)
    // Land surfaces have 0 specular reflection (specularVal < 45)
    if (specularVal > 60) {
      return false; // Water / Ocean
    } else if (specularVal < 40) {
      return true; // Land
    }
  }

  // Use geometric land boundary evaluation
  return isPointInLandGeometry(lat, lon);
}
