// Where things are, for the map. Shared by the server (checking a posted
// spot) and the page (distances, the map's starting view), so it imports
// nothing.

// The middle of ANU's Acton campus: where the map starts when the browser
// can't say where someone is.
export const ANU = { lat: -35.2777, lng: 149.1185 };

// How far from ANU an invite can be. Vybe is for ANU students; this keeps a
// stray tap (or a made-up request) from putting an invite in another city.
export const MAX_KM_FROM_ANU = 30;

// How much the map shows around someone when it opens: a short walk.
export const START_KM = 1;

// Straight-line distance between two points, in kilometres (haversine).
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// "350 m away", "1.4 km away": metres to the nearest 50 under a kilometre.
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m away`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}
