import express from 'express';
import db from '../firebase.js';

const router = express.Router();

/**
 * GET /api/taxis
 * Returns all available taxis
 */
router.get('/', async (req, res) => {
  try {
    const taxisRef = db.collection('taxis');
    // Get all taxis (not just available) so we can track moving taxis
    const snapshot = await taxisRef.get();

    // Only log occasionally to reduce console spam
    if (Math.random() < 0.1) { // Log 10% of the time
      console.log(`Found ${snapshot.size} taxis in database`);
    }

    if (snapshot.empty) {
      return res.json({ taxis: [] });
    }

    const taxis = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const lat = data.location?.latitude || data.location?._latitude;
      const lng = data.location?.longitude || data.location?._longitude;
      
      // Include all taxis with valid locations (available, en-route, arrived, etc.)
      if (lat && lng) {
        taxis.push({
          id: doc.id,
          driverName: data.driverName,
          carType: data.carType || 'sedan', // Default to sedan if not specified
          location: {
            latitude: lat,
            longitude: lng,
          },
          status: data.status || 'available',
        });
      } else {
        // Only log warnings occasionally
        if (Math.random() < 0.1) {
          console.warn(`Taxi ${doc.id} has invalid location, skipping`);
        }
      }
    });

    res.json({ taxis });
  } catch (error) {
    console.error('Error fetching taxis:', error);
    // Check for quota errors
    if (error.code === 8 || error.message?.includes('Quota exceeded')) {
      res.status(429).json({ 
        error: 'Firestore quota exceeded. Please wait a moment before trying again.',
        quotaExceeded: true 
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch taxis' });
    }
  }
});

export default router;

