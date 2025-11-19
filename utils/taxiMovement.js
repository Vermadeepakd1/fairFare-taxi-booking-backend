import db from '../firebase.js';
import { GeoPoint } from 'firebase-admin/firestore';

/**
 * Simulate taxi movement from current location to destination using simple interpolation
 * @param {string} taxiId - Taxi document ID
 * @param {number} startLat - Starting latitude
 * @param {number} startLng - Starting longitude
 * @param {number} endLat - Destination latitude
 * @param {number} endLng - Destination longitude
 * @param {number} durationSeconds - Total duration in seconds
 * @param {Function} onComplete - Callback when movement completes
 */
export async function simulateTaxiMovement(taxiId, startLat, startLng, endLat, endLng, durationSeconds, onComplete) {
  const taxisRef = db.collection('taxis');
  const bookingsRef = db.collection('bookings');

  // Use fixed number of steps for smooth interpolation (50-100 steps)
  // More steps = smoother movement, but more Firestore writes
  const totalSteps = Math.min(100, Math.max(50, Math.floor(durationSeconds / 2)));

  // Calculate step duration in milliseconds
  // Ensure minimum 500ms and maximum 2000ms per step for smooth movement
  const stepDuration = Math.max(500, Math.min(2000, Math.floor((durationSeconds * 1000) / totalSteps)));

  // Generate interpolated coordinates
  const routeCoordinates = [];
  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps; // Interpolation factor (0 to 1)
    const lat = startLat + (endLat - startLat) * t;
    const lng = startLng + (endLng - startLng) * t;
    routeCoordinates.push([lat, lng]);
  }

  let currentStep = 0;

  const moveInterval = setInterval(async () => {
    try {
      // Check if taxi is still in a valid state (not cancelled)
      const taxiDoc = await taxisRef.doc(taxiId).get();
      if (!taxiDoc.exists) {
        clearInterval(moveInterval);
        return;
      }

      const taxiData = taxiDoc.data();

      // If taxi is available, it means booking was cancelled - stop movement
      if (taxiData.status === 'available') {
        clearInterval(moveInterval);
        console.log(`Taxi ${taxiId} is now available, stopping movement`);
        return;
      }

      // Check if booking is cancelled
      const bookingSnapshot = await bookingsRef
        .where('taxiId', '==', taxiId)
        .where('status', 'in', ['confirmed', 'en-route'])
        .limit(1)
        .get();

      if (bookingSnapshot.empty) {
        // No active booking found, stop movement
        clearInterval(moveInterval);
        await taxisRef.doc(taxiId).update({ status: 'available' });
        console.log(`No active booking for taxi ${taxiId}, stopping movement`);
        return;
      }

      // Move to next coordinate in route
      if (currentStep < totalSteps) {
        const [currentLat, currentLng] = routeCoordinates[currentStep];

        // Update taxi location in Firestore
        await taxisRef.doc(taxiId).update({
          location: new GeoPoint(currentLat, currentLng),
        });

        currentStep++;

        // If reached destination
        if (currentStep >= totalSteps) {
          clearInterval(moveInterval);
          if (onComplete) {
            onComplete();
          }
        }
      }
    } catch (error) {
      console.error('Error updating taxi location:', error);
      clearInterval(moveInterval);
    }
  }, stepDuration); // Update based on calculated step duration (already in milliseconds)

  return moveInterval;
}

/**
 * Start taxi movement to pickup location
 */
export async function moveTaxiToPickup(taxiId, taxiLat, taxiLng, pickupLat, pickupLng, etaSeconds) {
  const interval = await simulateTaxiMovement(taxiId, taxiLat, taxiLng, pickupLat, pickupLng, etaSeconds, async () => {
    // When taxi reaches pickup, update status
    const taxisRef = db.collection('taxis');
    const taxiDoc = await taxisRef.doc(taxiId).get();
    const taxiData = taxiDoc.data();

    // Only update if taxi is still in en-route status (not cancelled)
    if (taxiData && taxiData.status === 'en-route') {
      await taxisRef.doc(taxiId).update({ status: 'arrived' });
    }
  });

  return Promise.resolve(interval);
}

/**
 * Start taxi movement to dropoff location (after pickup)
 */
export async function moveTaxiToDropoff(taxiId, pickupLat, pickupLng, dropoffLat, dropoffLng, tripDurationSeconds) {
  const interval = await simulateTaxiMovement(taxiId, pickupLat, pickupLng, dropoffLat, dropoffLng, tripDurationSeconds, async () => {
    // When taxi reaches dropoff, update status
    const taxisRef = db.collection('taxis');
    const taxiDoc = await taxisRef.doc(taxiId).get();
    const taxiData = taxiDoc.data();

    // Only complete if taxi is still in valid state
    if (taxiData && taxiData.status !== 'available') {
      await taxisRef.doc(taxiId).update({ status: 'available' });

      // Update booking status to completed
      const bookingsRef = db.collection('bookings');
      // Find the active booking for this taxi
      const snapshot = await bookingsRef
        .where('taxiId', '==', taxiId)
        .where('status', 'in', ['confirmed', 'en-route'])
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const bookingDoc = snapshot.docs[0];
        await bookingDoc.ref.update({ status: 'completed' });

        // Decrement active bookings
        const systemRef = db.collection('system');
        const configDoc = await systemRef.doc('config').get();
        const activeBookings = configDoc.exists ? (configDoc.data().activeBookings || 0) : 0;
        await systemRef.doc('config').set(
          { activeBookings: Math.max(0, activeBookings - 1) },
          { merge: true }
        );
      }
    }
  });

  return Promise.resolve(interval);
}

