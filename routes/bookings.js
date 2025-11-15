import express from 'express';
import db from '../firebase.js';
import { findNearestTaxi, calculateDynamicFare } from '../algorithms.js';
import { calculateDistance } from '../utils/distanceMatrix.js';
import { GeoPoint } from 'firebase-admin/firestore';

const router = express.Router();

// Hardcoded userId as per no-auth requirement
const USER_ID = 'user_123';

/**
 * POST /api/book
 * Books the nearest available taxi
 * Body: { userId: "user_123", pickupLocation: { latitude, longitude } }
 */
router.post('/book', async (req, res) => {
  try {
    const { userId, pickupLocation, carType } = req.body;

    // Validate input
    if (!pickupLocation || typeof pickupLocation.latitude !== 'number' || typeof pickupLocation.longitude !== 'number') {
      return res.status(400).json({ error: 'Invalid pickup location. Must provide latitude and longitude.' });
    }

    // Fetch available taxis, optionally filtered by car type
    const taxisRef = db.collection('taxis');
    let snapshot;
    if (carType && ['mini', 'sedan', 'suv'].includes(carType.toLowerCase())) {
      snapshot = await taxisRef
        .where('status', '==', 'available')
        .where('carType', '==', carType.toLowerCase())
        .get();
    } else {
      snapshot = await taxisRef.where('status', '==', 'available').get();
    }

    if (snapshot.empty) {
      const errorMsg = carType 
        ? `No available ${carType} taxis found. Try selecting a different car type.`
        : 'No available taxis found';
      return res.status(404).json({ error: errorMsg });
    }

    // Convert Firestore documents to array
    const availableTaxis = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      availableTaxis.push({
        id: doc.id,
        driverName: data.driverName,
        carType: data.carType || 'sedan', // Default to sedan if not specified
        location: data.location,
        status: data.status,
      });
    });

    // Find nearest taxi
    const nearestTaxi = findNearestTaxi(
      availableTaxis,
      pickupLocation.latitude,
      pickupLocation.longitude
    );

    if (!nearestTaxi) {
      return res.status(404).json({ error: 'Could not find nearest taxi' });
    }

    // Extract taxi location
    const taxiLat = nearestTaxi.location?.latitude || nearestTaxi.location?._latitude;
    const taxiLng = nearestTaxi.location?.longitude || nearestTaxi.location?._longitude;

    // Calculate distance and ETA using DistanceMatrix API
    let distanceInMeters;
    let etaInSeconds;
    let etaText;
    let distanceText;
    
    try {
      const distanceResult = await calculateDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        taxiLat,
        taxiLng
      );
      distanceInMeters = distanceResult.distance;
      etaInSeconds = distanceResult.duration;
      etaText = distanceResult.durationText;
      distanceText = distanceResult.distanceText;
    } catch (error) {
      console.error('Error calculating distance with DistanceMatrix API:', error);
      // Fallback to Euclidean distance if API fails
      const euclideanDistance = Math.sqrt(
        Math.pow(pickupLocation.latitude - taxiLat, 2) +
        Math.pow(pickupLocation.longitude - taxiLng, 2)
      );
      // Convert to approximate meters (1 degree ≈ 111km)
      distanceInMeters = euclideanDistance * 111000;
      distanceText = `${(distanceInMeters / 1000).toFixed(2)} km`;
      
      // Estimate ETA based on distance (assuming average speed of 30 km/h in city)
      const distanceInKm = distanceInMeters / 1000;
      etaInSeconds = Math.round((distanceInKm / 30) * 3600); // 30 km/h = 8.33 m/s average
      const minutes = Math.round(etaInSeconds / 60);
      etaText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    // Convert meters to kilometers for fare calculation
    const distanceInKm = distanceInMeters / 1000;

    // Get active bookings count for dynamic pricing
    const systemRef = db.collection('system');
    const configDoc = await systemRef.doc('config').get();
    const activeBookings = configDoc.exists ? (configDoc.data().activeBookings || 0) : 0;

    // Calculate fare (using distance in km and car type)
    const fare = calculateDynamicFare(distanceInKm, activeBookings, nearestTaxi.carType);

    // Generate booking ID
    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create booking document
    const bookingsRef = db.collection('bookings');
    const bookingData = {
      userId: userId || USER_ID,
      taxiId: nearestTaxi.id,
      status: 'requested',
      pickupLocation: new GeoPoint(pickupLocation.latitude, pickupLocation.longitude),
      dropoffLocation: null, // Will be set later if needed
      fare: fare,
      distance: distanceInMeters, // Distance in meters
      distanceText: distanceText,
      eta: etaInSeconds, // ETA in seconds
      etaText: etaText, // Human-readable ETA
      createdAt: new Date(),
    };
    await bookingsRef.doc(bookingId).set(bookingData);

    // Update taxi status to "booked"
    await taxisRef.doc(nearestTaxi.id).update({ status: 'booked' });

    // Increment activeBookings
    await systemRef.doc('config').set(
      { activeBookings: activeBookings + 1 },
      { merge: true }
    );

    // Return booking object
    res.json({
      booking: {
        id: bookingId,
        userId: bookingData.userId,
        taxiId: bookingData.taxiId,
        carType: nearestTaxi.carType,
        driverName: nearestTaxi.driverName,
        status: bookingData.status,
        pickupLocation: {
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude,
        },
        taxiLocation: {
          latitude: taxiLat,
          longitude: taxiLng,
        },
        dropoffLocation: bookingData.dropoffLocation,
        fare: bookingData.fare,
        distance: bookingData.distance,
        distanceText: bookingData.distanceText,
        eta: bookingData.eta,
        etaText: bookingData.etaText,
        createdAt: bookingData.createdAt,
      },
    });
  } catch (error) {
    console.error('Error booking taxi:', error);
    res.status(500).json({ error: 'Failed to book taxi' });
  }
});

/**
 * POST /api/cancel
 * Cancels an active booking
 * Body: { bookingId: "booking_abc", taxiId: "taxi_001" }
 */
router.post('/cancel', async (req, res) => {
  try {
    const { bookingId, taxiId } = req.body;

    if (!bookingId || !taxiId) {
      return res.status(400).json({ error: 'bookingId and taxiId are required' });
    }

    // Update booking status to "cancelled"
    const bookingsRef = db.collection('bookings');
    const bookingDoc = await bookingsRef.doc(bookingId).get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const bookingData = bookingDoc.data();
    if (bookingData.status === 'cancelled' || bookingData.status === 'completed') {
      return res.status(400).json({ error: `Booking is already ${bookingData.status}` });
    }

    await bookingsRef.doc(bookingId).update({ status: 'cancelled' });

    // Update taxi status back to "available"
    const taxisRef = db.collection('taxis');
    await taxisRef.doc(taxiId).update({ status: 'available' });

    // Decrement activeBookings
    const systemRef = db.collection('system');
    const configDoc = await systemRef.doc('config').get();
    const activeBookings = configDoc.exists ? (configDoc.data().activeBookings || 0) : 0;
    const newActiveBookings = Math.max(0, activeBookings - 1); // Ensure it doesn't go below 0
    await systemRef.doc('config').set(
      { activeBookings: newActiveBookings },
      { merge: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;

