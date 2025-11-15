import express from 'express';
import db from '../firebase.js';

const router = express.Router();

/**
 * GET /api/admin/taxis-status
 * Get status of all taxis (for debugging)
 */
router.get('/taxis-status', async (req, res) => {
  try {
    const taxisRef = db.collection('taxis');
    const snapshot = await taxisRef.get();

    const statusCount = {
      total: 0,
      available: 0,
      booked: 0,
      'en-route': 0,
      other: 0,
    };

    const taxis = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      statusCount.total++;
      const status = data.status || 'unknown';
      
      if (status === 'available') statusCount.available++;
      else if (status === 'booked') statusCount.booked++;
      else if (status === 'en-route') statusCount['en-route']++;
      else statusCount.other++;

      taxis.push({
        id: doc.id,
        driverName: data.driverName,
        carType: data.carType,
        status: status,
      });
    });

    res.json({
      summary: statusCount,
      taxis: taxis,
    });
  } catch (error) {
    console.error('Error getting taxis status:', error);
    res.status(500).json({ error: 'Failed to get taxis status' });
  }
});

/**
 * POST /api/admin/reset-taxis
 * Reset all taxis to available status (for development/testing)
 */
router.post('/reset-taxis', async (req, res) => {
  try {
    const taxisRef = db.collection('taxis');
    const snapshot = await taxisRef.get();

    if (snapshot.empty) {
      return res.json({ message: 'No taxis found. Run seed script first.', updated: 0 });
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((doc) => {
      batch.update(doc.ref, { status: 'available' });
      count++;
    });

    await batch.commit();

    console.log(`Reset ${count} taxis to available status`);

    res.json({ 
      message: `Successfully reset ${count} taxis to available status`,
      updated: count 
    });
  } catch (error) {
    console.error('Error resetting taxis:', error);
    res.status(500).json({ error: 'Failed to reset taxis' });
  }
});

export default router;

