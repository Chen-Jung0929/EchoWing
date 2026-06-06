import { getGoogleMapsApiKey, isGoogleMapsConfigured } from './googleMaps';

/** @type {Promise<typeof google.maps> | null} */
let loadPromise = null;

/**
 * @returns {Promise<typeof google.maps>}
 */
export function loadGoogleMapsScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps is only available in the browser'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  const key = getGoogleMapsApiKey();
  if (!key) {
    return Promise.reject(new Error('Google Maps API key is not configured'));
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-echowing-gmaps]');
      if (existing) {
        existing.addEventListener('load', () => {
          if (window.google?.maps) resolve(window.google.maps);
          else reject(new Error('Google Maps failed to initialize'));
        });
        existing.addEventListener('error', () => reject(new Error('Google Maps script failed')));
        return;
      }

      const script = document.createElement('script');
      script.dataset.echowingGmaps = '1';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error('Google Maps failed to initialize'));
      };
      script.onerror = () => reject(new Error('Google Maps script failed to load'));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}

export { isGoogleMapsConfigured };

/**
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string>}
 */
export async function reverseGeocodeLabel(latitude, longitude) {
  const maps = await loadGoogleMapsScript();
  const geocoder = new maps.Geocoder();

  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK' && results?.[0]?.formatted_address) {
        resolve(results[0].formatted_address);
        return;
      }
      resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    });
  });
}
