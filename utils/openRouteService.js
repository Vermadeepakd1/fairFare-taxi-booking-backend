/**
 * OpenRouteService API integration for route planning
 * Get actual road paths between two points
 */

/**
 * Get route directions from OpenRouteService
 * @param {number} startLat - Starting latitude
 * @param {number} startLng - Starting longitude
 * @param {number} endLat - Destination latitude
 * @param {number} endLng - Destination longitude
 * @param {string} profile - Route profile: 'driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking'
 * @returns {Promise<Object>} Route data with geometry and instructions
 */
export async function getRouteDirections(startLat, startLng, endLat, endLng, profile = 'driving-car') {
  const apiKey = process.env.OPENROUTE_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenRouteService API key not found. Using fallback straight-line route.');
    return null;
  }

  try {
    const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey, // OpenRouteService uses the API key directly as Authorization header
      },
      body: JSON.stringify({
        coordinates: [[startLng, startLat], [endLng, endLat]],
        format: 'json',
        geometry: true,
        instructions: false,
        preference: 'fastest',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Only log non-404 errors (404 means no route found, which is expected in some areas)
      if (response.status !== 404) {
        console.error(`OpenRouteService API error: ${response.status} - ${errorText}`);
      }
      return null;
    }

    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const decodedCoords = decodePolyline(route.geometry);
      return {
        geometry: route.geometry, // Encoded polyline
        distance: route.summary.distance, // Distance in meters
        duration: route.summary.duration, // Duration in seconds
        coordinates: decodedCoords, // Decoded coordinates array
      };
    }

    console.warn('OpenRouteService: No routes found in response');
    return null;
  } catch (error) {
    console.error('Error fetching route from OpenRouteService:', error);
    return null;
  }
}

/**
 * Decode polyline string to coordinates array
 * @param {string} encoded - Encoded polyline string
 * @returns {Array} Array of [lat, lng] coordinates
 */
function decodePolyline(encoded) {
  if (!encoded) return [];
  
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }

  return poly;
}

/**
 * Get route coordinates for display on map
 * @param {number} startLat - Starting latitude
 * @param {number} startLng - Starting longitude
 * @param {number} endLat - Destination latitude
 * @param {number} endLng - Destination longitude
 * @returns {Promise<Array>} Array of [lat, lng] coordinates following roads
 */
export async function getRouteCoordinates(startLat, startLng, endLat, endLng) {
  try {
    const route = await getRouteDirections(startLat, startLng, endLat, endLng);
    
    if (route && route.coordinates && route.coordinates.length > 0) {
      // OpenRouteService returns coordinates as [lng, lat], convert to [lat, lng] for Leaflet
      const convertedCoords = route.coordinates.map(coord => {
        // coord is [lng, lat] from OpenRouteService
        return [coord[1], coord[0]]; // Return as [lat, lng]
      });
      return convertedCoords;
    }
    // Fallback to straight line if API fails
    return [[startLat, startLng], [endLat, endLng]];
  } catch (error) {
    console.error('getRouteCoordinates error:', error);
    // Fallback to straight line on error
    return [[startLat, startLng], [endLat, endLng]];
  }
}

