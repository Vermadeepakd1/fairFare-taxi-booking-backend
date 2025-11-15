import dotenv from 'dotenv';

dotenv.config();

const DISTANCE_MATRIX_API_KEY = process.env.DISTANCE_MATRIX_API_KEY || '06brU9ss75MnpnBvH32Ansn5ezlmGrxrnrU9E1oqWC7XzeNfjNJ4fVo6PxkIueqi';
const DISTANCE_MATRIX_BASE_URL = 'https://api-v2.distancematrix.ai/maps/api/distancematrix/json';

/**
 * Calculate distance between two points using DistanceMatrix API
 * @param {number} originLat - Origin latitude
 * @param {number} originLng - Origin longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @returns {Promise<Object>} - Object with distance (in meters) and duration (in seconds)
 */
export async function calculateDistance(originLat, originLng, destLat, destLng) {
  try {
    const origins = `${originLat},${originLng}`;
    const destinations = `${destLat},${destLng}`;
    
    const url = `${DISTANCE_MATRIX_BASE_URL}?origins=${origins}&destinations=${destinations}&key=${DISTANCE_MATRIX_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`DistanceMatrix API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`DistanceMatrix API returned error: ${data.status}`);
    }
    
    if (!data.rows || !data.rows[0] || !data.rows[0].elements || !data.rows[0].elements[0]) {
      throw new Error('Invalid response from DistanceMatrix API');
    }
    
    const element = data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      throw new Error(`Distance calculation failed: ${element.status}`);
    }
    
    return {
      distance: element.distance.value, // Distance in meters
      distanceText: element.distance.text, // Human-readable distance
      duration: element.duration.value, // Duration in seconds
      durationText: element.duration.text, // Human-readable duration
    };
  } catch (error) {
    console.error('Error calculating distance:', error);
    throw error;
  }
}

