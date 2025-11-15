/**
 * Nearest Taxi Algorithm
 * Finds the nearest available taxi using Euclidean distance
 * @param {Array} availableTaxis - Array of taxi objects with location {latitude, longitude}
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @returns {Object|null} - The nearest taxi object or null if no taxis available
 */
export function findNearestTaxi(availableTaxis, userLat, userLng) {
  if (!availableTaxis || availableTaxis.length === 0) {
    return null;
  }

  let nearestTaxi = null;
  let minDistance = Infinity;

  for (const taxi of availableTaxis) {
    // Extract latitude and longitude from taxi location
    // Location can be a Geopoint object or an object with latitude/longitude
    const taxiLat = taxi.location?.latitude || taxi.location?._latitude || taxi.latitude;
    const taxiLng = taxi.location?.longitude || taxi.location?._longitude || taxi.longitude;

    if (taxiLat === undefined || taxiLng === undefined) {
      continue; // Skip taxis without valid location
    }

    // Calculate Euclidean distance
    const distance = Math.sqrt(
      Math.pow(userLat - taxiLat, 2) + Math.pow(userLng - taxiLng, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestTaxi = taxi;
    }
  }

  return nearestTaxi;
}

/**
 * Dynamic Pricing Algorithm
 * Calculates fare based on distance, demand, and car type
 * @param {number} distance - Distance in kilometers
 * @param {number} activeBookings - Number of active bookings in the system
 * @param {string} carType - Type of car (mini, sedan, suv)
 * @returns {number} - Calculated fare
 */
export function calculateDynamicFare(distance, activeBookings, carType = 'sedan') {
  // Base fare by car type
  const baseFares = {
    mini: 40,
    sedan: 50,
    suv: 70,
  };
  
  // Distance cost per km by car type
  const distanceCosts = {
    mini: 12,
    sedan: 15,
    suv: 20,
  };
  
  const baseFare = baseFares[carType.toLowerCase()] || baseFares.sedan;
  const distanceCost = distance * (distanceCosts[carType.toLowerCase()] || distanceCosts.sedan);
  
  // Determine demand multiplier based on active bookings
  let demandMultiplier = 1.0;
  if (activeBookings > 10) {
    demandMultiplier = 2.0;
  } else if (activeBookings > 5) {
    demandMultiplier = 1.5;
  }

  const finalFare = (baseFare + distanceCost) * demandMultiplier;
  
  // Round to 2 decimal places
  return Math.round(finalFare * 100) / 100;
}

