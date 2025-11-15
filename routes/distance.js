import express from 'express';
import { calculateDistance } from '../utils/distanceMatrix.js';

const router = express.Router();

/**
 * GET /api/distance
 * Calculate distance between two points using DistanceMatrix API
 * Query params: originLat, originLng, destLat, destLng
 * Example: /api/distance?originLat=51.4822656&originLng=-0.1933769&destLat=51.4994794&destLng=-0.1269979
 */
router.get('/', async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;

    // Validate input
    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Provide: originLat, originLng, destLat, destLng' 
      });
    }

    const originLatNum = parseFloat(originLat);
    const originLngNum = parseFloat(originLng);
    const destLatNum = parseFloat(destLat);
    const destLngNum = parseFloat(destLng);

    if (isNaN(originLatNum) || isNaN(originLngNum) || isNaN(destLatNum) || isNaN(destLngNum)) {
      return res.status(400).json({ 
        error: 'Invalid coordinates. All parameters must be valid numbers.' 
      });
    }

    // Calculate distance using DistanceMatrix API
    const result = await calculateDistance(originLatNum, originLngNum, destLatNum, destLngNum);

    res.json({
      origin: {
        latitude: originLatNum,
        longitude: originLngNum,
      },
      destination: {
        latitude: destLatNum,
        longitude: destLngNum,
      },
      distance: result.distance, // in meters
      distanceText: result.distanceText,
      duration: result.duration, // in seconds
      durationText: result.durationText,
    });
  } catch (error) {
    console.error('Error in distance route:', error);
    res.status(500).json({ 
      error: 'Failed to calculate distance',
      message: error.message 
    });
  }
});

/**
 * POST /api/distance
 * Calculate distance between two points using DistanceMatrix API
 * Body: { origin: { latitude, longitude }, destination: { latitude, longitude } }
 */
router.post('/', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    // Validate input
    if (!origin || typeof origin.latitude !== 'number' || typeof origin.longitude !== 'number') {
      return res.status(400).json({ 
        error: 'Invalid origin. Must provide { latitude, longitude }' 
      });
    }

    if (!destination || typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number') {
      return res.status(400).json({ 
        error: 'Invalid destination. Must provide { latitude, longitude }' 
      });
    }

    // Calculate distance using DistanceMatrix API
    const result = await calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    res.json({
      origin,
      destination,
      distance: result.distance, // in meters
      distanceText: result.distanceText,
      duration: result.duration, // in seconds
      durationText: result.durationText,
    });
  } catch (error) {
    console.error('Error in distance route:', error);
    res.status(500).json({ 
      error: 'Failed to calculate distance',
      message: error.message 
    });
  }
});

export default router;

