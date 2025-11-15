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
    const snapshot = await taxisRef.where('status', '==', 'available').get();

    console.log(`Found ${snapshot.size} available taxis in database`);

    if (snapshot.empty) {
      console.log('No available taxis found in database');
      return res.json({ taxis: [] });
    }

    const taxis = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const lat = data.location?.latitude || data.location?._latitude;
      const lng = data.location?.longitude || data.location?._longitude;
      
      // Only include taxis with valid locations
      if (lat && lng) {
        taxis.push({
          id: doc.id,
          driverName: data.driverName,
          carType: data.carType || 'sedan', // Default to sedan if not specified
          location: {
            latitude: lat,
            longitude: lng,
          },
          status: data.status,
        });
      } else {
        console.warn(`Taxi ${doc.id} has invalid location, skipping`);
      }
    });

    console.log(`Returning ${taxis.length} taxis with valid locations`);
    res.json({ taxis });
  } catch (error) {
    console.error('Error fetching taxis:', error);
    res.status(500).json({ error: 'Failed to fetch taxis' });
  }
});

export default router;

