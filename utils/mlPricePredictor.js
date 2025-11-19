import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCurrentWeather, getWeatherCondition } from './weather.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Predict price using ML model
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} demand - Number of active bookings (demand)
 * @param {number} availableTaxis - Number of available taxis
 * @param {string} carType - Car type (mini, sedan, suv)
 * @param {number} latitude - Latitude for weather data
 * @param {number} longitude - Longitude for weather data
 * @param {number} brandLoyaltyScore - User's brand loyalty score (0-10, default 5.0)
 * @returns {Promise<number|null>} - Predicted fare or null if prediction fails
 */
export async function predictPriceWithML(distanceKm, demand, availableTaxis, carType, latitude, longitude, brandLoyaltyScore = 5.0) {
  try {
    // Fetch weather data
    const weatherData = await getCurrentWeather(latitude, longitude);
    
    if (!weatherData) {
      console.warn('Could not fetch weather data, falling back to default pricing');
      return null;
    }

    // Get weather condition category
    const condition = getWeatherCondition(weatherData);
    
    // Get current date/time for hour and day_of_week
    const now = new Date();
    const hour = now.getHours(); // 0-23 (JavaScript returns 0-23, model expects 0-24)
    const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
    
    // Cap demand at 200 as per model specification
    const cappedDemand = Math.min(Math.max(0, demand), 200);
    
    // Ensure brand_loyalty_score is in range 0-10 (not 0-1)
    const normalizedLoyaltyScore = Math.min(Math.max(0, brandLoyaltyScore), 10);
    
    // Prepare features for ML model (matching the model's expected features)
    const features = {
      distance_km: distanceKm,
      hour: hour, // 0-23 (24 is midnight, same as 0)
      day_of_week: dayOfWeek, // 0-6
      demand: cappedDemand, // 0-200
      available_taxis: Math.max(0, Math.floor(availableTaxis)), // Integer, non-negative
      weather_encoded: condition || 'Clear', // Will be encoded by Python script (capitalized format: 'Rainy', 'Clear', etc.)
      brand_loyalty_score: normalizedLoyaltyScore, // 0-10
      car_type_encoded: carType.charAt(0).toUpperCase() + carType.slice(1).toLowerCase() // Capitalize: 'Sedan', 'Mini', 'Suv'
    };

    // Call Python script to make prediction
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '..', 'ml_models', 'predict.py');
      const modelPath = path.join(__dirname, '..', 'ml_models', 'model.pkl');
      const encoderPath = path.join(__dirname, '..', 'ml_models', 'encoders.pkl');

      // Prepare input data as JSON
      const inputData = JSON.stringify(features);

      // Spawn Python process
      const pythonProcess = spawn('python', [pythonScript, modelPath, encoderPath], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      // Send input data to Python script
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', stderr);
          resolve(null); // Fallback to default pricing
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.price !== undefined && result.price !== null) {
            // Ensure price is positive and reasonable
            const predictedPrice = Math.max(0, parseFloat(result.price));
            // Multiply by 400 as per model output scaling
            const scaledPrice = predictedPrice * 400;
            resolve(Math.round(scaledPrice * 100) / 100); // Round to 2 decimal places
          } else {
            console.warn('ML model returned invalid price:', result);
            resolve(null);
          }
        } catch (parseError) {
          console.error('Error parsing ML prediction result:', parseError);
          console.error('Raw output:', stdout);
          resolve(null);
        }
      });

      // Handle errors
      pythonProcess.on('error', (error) => {
        console.error('Error spawning Python process:', error);
        resolve(null); // Fallback to default pricing
      });
    });
  } catch (error) {
    console.error('Error in ML price prediction:', error);
    return null; // Fallback to default pricing
  }
}

