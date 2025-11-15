import express from 'express';
import { getCurrentWeather, getWeatherCondition } from '../utils/weather.js';

const router = express.Router();

/**
 * GET /api/weather
 * Get current weather for a location
 * Query params: latitude, longitude
 * Example: /api/weather?latitude=52.52&longitude=13.41
 */
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Provide: latitude, longitude' 
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        error: 'Invalid coordinates. Latitude and longitude must be valid numbers.' 
      });
    }

    // Validate latitude range (-90 to 90)
    if (lat < -90 || lat > 90) {
      return res.status(400).json({ 
        error: 'Invalid latitude. Must be between -90 and 90.' 
      });
    }

    // Validate longitude range (-180 to 180)
    if (lng < -180 || lng > 180) {
      return res.status(400).json({ 
        error: 'Invalid longitude. Must be between -180 and 180.' 
      });
    }

    // Fetch weather data
    const weatherData = await getCurrentWeather(lat, lng);
    
    // Get weather condition category for ML model
    const condition = getWeatherCondition(weatherData);

    res.json({
      location: weatherData.location,
      current: {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        weatherCode: weatherData.weatherCode,
        weatherDescription: weatherData.weatherDescription,
        windSpeed: weatherData.windSpeed,
        precipitation: weatherData.precipitation,
        time: weatherData.time,
      },
      condition: condition, // For ML model: 'clear', 'cloudy', 'rainy', 'snowy', 'windy', 'foggy', 'stormy'
    });
  } catch (error) {
    console.error('Error in weather route:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weather data',
      message: error.message 
    });
  }
});

/**
 * POST /api/weather
 * Get current weather for a location
 * Body: { latitude, longitude }
 */
router.post('/', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate input
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ 
        error: 'Invalid input. Provide latitude and longitude as numbers.' 
      });
    }

    // Validate latitude range
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ 
        error: 'Invalid latitude. Must be between -90 and 90.' 
      });
    }

    // Validate longitude range
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        error: 'Invalid longitude. Must be between -180 and 180.' 
      });
    }

    // Fetch weather data
    const weatherData = await getCurrentWeather(latitude, longitude);
    
    // Get weather condition category for ML model
    const condition = getWeatherCondition(weatherData);

    res.json({
      location: weatherData.location,
      current: {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        weatherCode: weatherData.weatherCode,
        weatherDescription: weatherData.weatherDescription,
        windSpeed: weatherData.windSpeed,
        precipitation: weatherData.precipitation,
        time: weatherData.time,
      },
      condition: condition, // For ML model: 'clear', 'cloudy', 'rainy', 'snowy', 'windy', 'foggy', 'stormy'
    });
  } catch (error) {
    console.error('Error in weather route:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weather data',
      message: error.message 
    });
  }
});

export default router;

