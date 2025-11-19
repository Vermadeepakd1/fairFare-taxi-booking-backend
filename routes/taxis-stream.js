import express from 'express';
import db from '../firebase.js';

const router = express.Router();

// Store active listeners
const activeListeners = new Map();

/**
 * GET /api/taxis-stream
 * Server-Sent Events endpoint for real-time taxi updates
 * Uses Firestore onSnapshot listener (only counts reads on changes)
 */
router.get('/stream', (req, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  console.log('New SSE client connected for taxi updates');

  // Set up Firestore listener
  const taxisRef = db.collection('taxis');
  const unsubscribe = taxisRef.onSnapshot(
    (snapshot) => {
      const taxis = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const lat = data.location?.latitude || data.location?._latitude;
        const lng = data.location?.longitude || data.location?._longitude;
        
        if (lat && lng) {
          taxis.push({
            id: doc.id,
            driverName: data.driverName,
            carType: data.carType || 'sedan',
            location: {
              latitude: lat,
              longitude: lng,
            },
            status: data.status || 'available',
          });
        }
      });

      // Send update to client
      res.write(`data: ${JSON.stringify({ taxis, timestamp: Date.now() })}\n\n`);
    },
    (error) => {
      console.error('Firestore listener error:', error);
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    }
  );

  // Store listener for cleanup
  const clientId = req.headers['x-request-id'] || Date.now().toString();
  activeListeners.set(clientId, unsubscribe);

  // Clean up on client disconnect
  req.on('close', () => {
    console.log('SSE client disconnected, cleaning up listener');
    if (activeListeners.has(clientId)) {
      activeListeners.get(clientId)();
      activeListeners.delete(clientId);
    }
    res.end();
  });

  // Send initial connection message
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to taxi stream' })}\n\n`);
});

// Cleanup function for graceful shutdown
export function cleanupListeners() {
  activeListeners.forEach((unsubscribe) => unsubscribe());
  activeListeners.clear();
}

export default router;

