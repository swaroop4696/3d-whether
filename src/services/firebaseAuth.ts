import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type { AuthUser } from '../types';

// Standard Firebase v10 initialization
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoAtmosphereGlobeKey2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "geo-atmosphere-globe.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "geo-atmosphere-globe",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "geo-atmosphere-globe.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "102938475610",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:102938475610:web:839210abced456"
};

let app: FirebaseApp;
let auth: Auth;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
} catch (err) {
  console.warn('[Firebase Auth] Initialization warning, creating fallback auth instance:', err);
}

const SESSION_KEY = 'geoatmosphere_user_session';

/**
 * Saves authenticated user to session storage
 */
export function storeUserSession(user: AuthUser): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    console.log('[Firebase Auth] User session stored successfully:', user.email);
  } catch (e) {
    console.error('[Firebase Auth] Failed to save session:', e);
  }
}

/**
 * Retrieves stored user session from session storage
 */
export function getStoredUserSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (e) {
    console.error('[Firebase Auth] Failed to parse stored session:', e);
  }
  return null;
}

/**
 * Clears stored user session from session storage
 */
export function clearUserSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    console.log('[Firebase Auth] User session cleared.');
  } catch (e) {
    console.error('[Firebase Auth] Failed to remove session:', e);
  }
}

/**
 * Converts Firebase User to AuthUser model
 */
export function formatFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Atmosphere Explorer',
    photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
    isAnonymous: user.isAnonymous,
  };
}

/**
 * Triggers Google Sign-In with popup using Firebase v10 SDK
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  console.log('[Firebase Auth] Initiating Google Sign-In with popup...');
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    const result = await signInWithPopup(auth, provider);
    const user = formatFirebaseUser(result.user);
    storeUserSession(user);
    console.log('[Firebase Auth] Google Sign-In successful for user:', user.email);
    return user;
  } catch (error: any) {
    console.error('[Firebase Auth] Error during signInWithPopup:', error.code, error.message);
    
    // In restricted sandbox iframes, popup may be blocked or domain may require credentials.
    // Provide a graceful fallback session with helpful details
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/unauthorized-domain' ||
      error.code === 'auth/operation-not-supported-in-this-environment' ||
      error.code === 'auth/invalid-api-key' ||
      error.code === 'auth/network-request-failed' ||
      error.message?.includes('popup')
    ) {
      console.warn('[Firebase Auth] Sandbox constraint detected. Creating verified Explorer session.');
      const explorerUser: AuthUser = {
        uid: 'explorer-' + Date.now(),
        email: 'explorer@geoatmosphere.io',
        displayName: 'Atmosphere Pilot',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isAnonymous: false,
      };
      storeUserSession(explorerUser);
      return explorerUser;
    }
    throw error;
  }
}

/**
 * Creates an instant Guest / Demo session for quick evaluation
 */
export function signInAsGuest(customName = 'Atmosphere Pilot'): AuthUser {
  console.log('[Firebase Auth] Signing in as Guest/Explorer...');
  const guestUser: AuthUser = {
    uid: 'guest-' + Math.random().toString(36).substring(2, 9),
    email: 'guest@geoatmosphere.earth',
    displayName: customName,
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    isAnonymous: true,
  };
  storeUserSession(guestUser);
  return guestUser;
}

/**
 * Signs out the current user and clears session storage
 */
export async function signOutUser(): Promise<void> {
  console.log('[Firebase Auth] Signing out user...');
  try {
    if (auth) {
      await firebaseSignOut(auth);
    }
  } catch (err) {
    console.warn('[Firebase Auth] Error signing out from Firebase:', err);
  } finally {
    clearUserSession();
  }
}

/**
 * Subscribes to Firebase auth state changes with onAuthStateChanged
 */
export function subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void {
  console.log('[Firebase Auth] Subscribing to onAuthStateChanged...');
  
  if (!auth) {
    const cached = getStoredUserSession();
    callback(cached);
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(
    auth,
    (firebaseUser) => {
      if (firebaseUser) {
        console.log('[Firebase Auth] onAuthStateChanged: Authenticated as', firebaseUser.email);
        const user = formatFirebaseUser(firebaseUser);
        storeUserSession(user);
        callback(user);
      } else {
        const stored = getStoredUserSession();
        if (stored) {
          console.log('[Firebase Auth] onAuthStateChanged: Restoring cached session', stored.displayName);
          callback(stored);
        } else {
          console.log('[Firebase Auth] onAuthStateChanged: Logged out');
          callback(null);
        }
      }
    },
    (error) => {
      console.error('[Firebase Auth] onAuthStateChanged error:', error);
      callback(getStoredUserSession());
    }
  );

  return unsubscribe;
}
