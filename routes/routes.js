import express from 'express';
import { getRouteCoordinates } from '../utils/openRouteService.js';

const router = express.Router();

/**
 * GET /api/route
 * Get route coordinates between two points
 * Query params: startLat, startLng, endLat, endLng
 */
router.get('/', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.query;

    // Validate input
    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ 
        error: 'Missing required parameters: startLat, startLng, endLat, endLng' 
      });
    }

    const startLatNum = parseFloat(startLat);
    const startLngNum = parseFloat(startLng);
    const endLatNum = parseFloat(endLat);
    const endLngNum = parseFloat(endLng);

    if (isNaN(startLatNum) || isNaN(startLngNum) || isNaN(endLatNum) || isNaN(endLngNum)) {
      return res.status(400).json({ error: 'Invalid coordinates. Must be valid numbers.' });
    }

    // Get route coordinates
    const routeCoordinates = await getRouteCoordinates(
      startLatNum,
      startLngNum,
      endLatNum,
      endLngNum
    );

    res.json({
      success: true,
      route: routeCoordinates,
      coordinates: routeCoordinates, // Alias for compatibility
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

/**
 * POST /api/route
 * Get route coordinates between two points
 * Body: { startLat, startLng, endLat, endLng }
 */
router.post('/', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.body;

    // Validate input
    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ 
        error: 'Missing required parameters: startLat, startLng, endLat, endLng' 
      });
    }

    const startLatNum = parseFloat(startLat);
    const startLngNum = parseFloat(startLng);
    const endLatNum = parseFloat(endLat);
    const endLngNum = parseFloat(endLng);

    if (isNaN(startLatNum) || isNaN(startLngNum) || isNaN(endLatNum) || isNaN(endLngNum)) {
      return res.status(400).json({ error: 'Invalid coordinates. Must be valid numbers.' });
    }

    // Get route coordinates
    const routeCoordinates = await getRouteCoordinates(
      startLatNum,
      startLngNum,
      endLatNum,
      endLngNum
    );

    res.json({
      success: true,
      route: routeCoordinates,
      coordinates: routeCoordinates, // Alias for compatibility
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

export default router;

