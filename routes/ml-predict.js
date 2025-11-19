import express from 'express';
import { predictPriceWithML } from '../utils/mlPricePredictor.js';

const router = express.Router();

/**
 * POST /api/ml-predict
 * Predict price using ML model
 * Body: {
 *   distanceKm: number,
 *   demand: number (optional, will be fetched if not provided),
 *   availableTaxis: number (optional, will be fetched if not provided),
 *   carType: string,
 *   latitude: number,
 *   longitude: number,
 *   brandLoyaltyScore: number (optional, default 0.5)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { distanceKm, demand, availableTaxis, carType, latitude, longitude, brandLoyaltyScore } = req.body;

    // Validate input
    if (typeof distanceKm !== 'number' || distanceKm < 0) {
      return res.status(400).json({ error: 'Invalid distanceKm. Must be a non-negative number.' });
    }

    if (!carType || !['mini', 'sedan', 'suv'].includes(carType.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid carType. Must be one of: mini, sedan, suv.' });
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Invalid latitude/longitude. Must be numbers.' });
    }

    // Fetch demand and availableTaxis if not provided
    let finalDemand = demand;
    let finalAvailableTaxis = availableTaxis;
    
    if (typeof finalDemand !== 'number' || typeof finalAvailableTaxis !== 'number') {
      try {
        const db = (await import('../firebase.js')).default;
        const systemRef = db.collection('system');
        const configDoc = await systemRef.doc('config').get();
        finalDemand = configDoc.exists ? (configDoc.data().activeBookings || 0) : 0;
        
        const taxisRef = db.collection('taxis');
        const availableTaxisSnapshot = await taxisRef
          .where('status', '==', 'available')
          .get();
        finalAvailableTaxis = availableTaxisSnapshot.size;
      } catch (err) {
        console.error('Error fetching demand/available taxis:', err);
        finalDemand = finalDemand || 0;
        finalAvailableTaxis = finalAvailableTaxis || 10;
      }
    }

    // Predict price using ML model
    const predictedPrice = await predictPriceWithML(
      distanceKm,
      finalDemand,
      finalAvailableTaxis,
      carType,
      latitude,
      longitude,
      brandLoyaltyScore || 5.0
    );

    if (predictedPrice === null) {
      return res.status(500).json({ 
        error: 'ML prediction failed. Please try again or use default pricing.',
        fallback: true
      });
    }

    res.json({
      success: true,
      price: predictedPrice,
      currency: 'INR',
      method: 'ml'
    });
  } catch (error) {
    console.error('Error in ML prediction endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to predict price',
      fallback: true
    });
  }
});

export default router;

