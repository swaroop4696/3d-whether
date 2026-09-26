import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Global resilience: catch unhandled promise rejections & cross-origin script exceptions
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Global] Suppressed unhandled promise rejection:', event.reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    // Suppress cross-origin, extension, or empty script error noise
    if (!event.message || event.message === 'Script error.' || event.message === 'Uncaught ') {
      event.preventDefault();
      return true;
    }
  });

  // Google Maps authentication failure hook
  (window as any).gm_authFailure = () => {
    console.warn('[Google Maps] Authentication failure handled gracefully; defaulting to 2D Cartography & 3D Globe.');
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// Gracefully dissolve Fast Torch loader with 150ms ease
if (typeof window !== 'undefined') {
  requestAnimationFrame(() => {
    const loader = document.getElementById('fast-torch-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.pointerEvents = 'none';
      setTimeout(() => loader.remove(), 320);
    }
  });
}

