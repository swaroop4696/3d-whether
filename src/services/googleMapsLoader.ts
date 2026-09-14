// Source: Google Maps Platform Code Assist
// Attribution ID: gmp_mcp_codeassist_v1_aistudio
// Key restriction pattern inspired by: https://github.com/bilawalsidhu/gods-eye-view

export type MapsLoadStatus = 'idle' | 'loading' | 'ready' | 'missing_key' | 'error';

let loadPromise: Promise<boolean> | null = null;
let currentKeyUsed: string | null = null;

let cachedServerKey: string | null = null;
let hasCheckedServerKey = false;

/**
 * Returns the configured Google Maps API Key from env or localStorage
 */
export function getGoogleMapsApiKey(): string {
  // Check localStorage first (allows setting key in-app like God's Eye View's Provider Settings)
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('custom_google_maps_api_key');
    if (customKey && customKey.trim()) {
      return customKey.trim();
    }
  }

  // Fallback to cached server key if retrieved
  if (cachedServerKey) {
    return cachedServerKey;
  }

  // Fallback to Vite environment variable
  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  if (envKey && envKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
    return envKey.trim();
  }

  return '';
}

/**
 * Asynchronously checks if backend has a configured Maps API key
 */
export async function syncServerMapsKey(): Promise<string> {
  if (hasCheckedServerKey && cachedServerKey) return cachedServerKey;
  try {
    const res = await fetch('/api/config/maps-key');
    if (res.ok) {
      const data = await res.json();
      if (data?.key) {
        cachedServerKey = data.key.trim();
        hasCheckedServerKey = true;
        return cachedServerKey;
      }
    }
  } catch {
    // Ignore network failures
  }
  hasCheckedServerKey = true;
  return getGoogleMapsApiKey();
}

/**
 * Saves or clears custom key in local storage
 */
export function setGoogleMapsApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (!key || key.trim() === '') {
      localStorage.removeItem('custom_google_maps_api_key');
    } else {
      localStorage.setItem('custom_google_maps_api_key', key.trim());
    }
    // Reset load promise so next attempt can use the new key
    loadPromise = null;
    currentKeyUsed = null;
  }
}

/**
 * Dynamically loads the Google Maps JavaScript API with proper error handling
 */
export function loadGoogleMapsScript(customKey?: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // If already loaded on window and functional
  if (window.google?.maps?.Map) {
    return Promise.resolve(true);
  }

  const keyToUse = customKey ?? getGoogleMapsApiKey();

  if (!keyToUse || keyToUse === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return Promise.resolve(false);
  }

  // If same key is already being loaded, return existing promise
  if (loadPromise && currentKeyUsed === keyToUse) {
    return loadPromise;
  }

  currentKeyUsed = keyToUse;

  loadPromise = new Promise<boolean>((resolve) => {
    // Remove any stale failed script tag if present
    const existingScript = document.getElementById('google-maps-dynamic-script');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'google-maps-dynamic-script';
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      keyToUse
    )}&libraries=marker,places&v=weekly`;

    script.onload = () => {
      if (window.google?.maps?.Map) {
        resolve(true);
      } else {
        resolve(false);
      }
    };

    script.onerror = (err) => {
      console.warn('[Google Maps Loader] Script loading encountered network or auth error:', err);
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Recommended Key Restriction Specifications from bilawalsidhu/gods-eye-view
 */
export interface KeyRestrictionSpecs {
  httpReferrers: string[];
  authorizedApis: string[];
  securityGuideline: string;
}

export function getKeyRestrictionSpecs(): KeyRestrictionSpecs {
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://ais-dev-lmolkylohwlvkobxuyhd6h-916945520733.asia-east1.run.app';

  const referrers = [
    'http://localhost:3000/*',
    'https://*.run.app/*',
    `${currentOrigin}/*`,
  ];

  // Remove duplicates
  const uniqueReferrers = Array.from(new Set(referrers));

  return {
    httpReferrers: uniqueReferrers,
    authorizedApis: [
      'Maps JavaScript API',
      'Places API (New)',
      'Geocoding API',
    ],
    securityGuideline:
      'Per the bilawalsidhu/gods-eye-view security architecture: Google Maps keys are client-exposed in browser network requests. Always restrict your key by HTTP referrers and designated APIs in Google Cloud Console, and set daily quota backstops to prevent unauthorized spend.',
  };
}
