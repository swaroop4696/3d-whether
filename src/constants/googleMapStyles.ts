// Source: Google Maps Platform Code Assist
// Attribution ID: gmp_mcp_codeassist_v1_aistudio

/**
 * Custom dark minimalist JSON style for Google Maps to match Weather GPT aesthetic
 */
export const darkMinimalistMapStyles: google.maps.MapTypeStyle[] = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#090d16' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#090d16' }, { weight: 3 }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#38bdf8' }, { weight: 1.2 }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e2e8f0' }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0284c7' }, { weight: 1 }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bae6fd' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#93c5fd' }],
  },
  // Religious centers & places of worship (temples, churches, mosques, shrines)
  {
    featureType: 'poi.place_of_worship',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.place_of_worship',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.place_of_worship',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#fbbf24' }],
  },
  // Shops, retail, restaurants, and businesses
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.business',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.business',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#67e8f9' }],
  },
  // Tourist attractions & landmarks
  {
    featureType: 'poi.attraction',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.attraction',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.attraction',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f472b6' }],
  },
  // Parks & recreation
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#09231f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#86efac' }],
  },
  // Government & schools
  {
    featureType: 'poi.government',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.school',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#1e293b' }, { visibility: 'on' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f172a' }, { weight: 1.2 }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{ color: '#0284c7' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0369a1' }, { weight: 1.5 }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f0f9ff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0284c7' }, { weight: 2 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.fill',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#162338' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#04070d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#1e293b' }],
  },
];
