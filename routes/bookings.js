import express from 'express';
import db from '../firebase.js';
import { findNearestTaxi, calculateDynamicFare } from '../algorithms.js';
import { calculateDistance } from '../utils/distanceMatrix.js';
import { GeoPoint } from 'firebase-admin/firestore';
import { moveTaxiToPickup, moveTaxiToDropoff } from '../utils/taxiMovement.js';
import { stopTaxiMovement, storeTaxiMovement } from '../utils/taxiMovementTracker.js';
import { getRouteCoordinates } from '../utils/openRouteService.js';
import { predictPriceWithML } from '../utils/mlPricePredictor.js';

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
    const { userId, pickupLocation, dropoffLocation, carType } = req.body;

    // Validate input
    if (!pickupLocation || typeof pickupLocation.latitude !== 'number' || typeof pickupLocation.longitude !== 'number') {
      return res.status(400).json({ error: 'Invalid pickup location. Must provide latitude and longitude.' });
    }

    if (!dropoffLocation || typeof dropoffLocation.latitude !== 'number' || typeof dropoffLocation.longitude !== 'number') {
      return res.status(400).json({ error: 'Invalid dropoff location. Must provide latitude and longitude.' });
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

    // Calculate distance from taxi to pickup (for ETA)
    let taxiToPickupDistance;
    let taxiToPickupEta;
    let taxiToPickupEtaText;
    
    try {
      const taxiToPickupResult = await calculateDistance(
        taxiLat,
        taxiLng,
        pickupLocation.latitude,
        pickupLocation.longitude
      );
      if (taxiToPickupResult) {
        taxiToPickupDistance = taxiToPickupResult.distance;
        taxiToPickupEta = taxiToPickupResult.duration;
        taxiToPickupEtaText = taxiToPickupResult.durationText;
      } else {
        // ZERO_RESULTS - fallback to Euclidean distance
        const euclideanDistance = Math.sqrt(
          Math.pow(pickupLocation.latitude - taxiLat, 2) +
          Math.pow(pickupLocation.longitude - taxiLng, 2)
        );
        taxiToPickupDistance = euclideanDistance * 111000;
        const distanceInKm = taxiToPickupDistance / 1000;
        taxiToPickupEta = Math.round((distanceInKm / 30) * 3600);
        const minutes = Math.round(taxiToPickupEta / 60);
        taxiToPickupEtaText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Error calculating taxi to pickup distance:', error);
      // Fallback to Euclidean distance
      const euclideanDistance = Math.sqrt(
        Math.pow(pickupLocation.latitude - taxiLat, 2) +
        Math.pow(pickupLocation.longitude - taxiLng, 2)
      );
      taxiToPickupDistance = euclideanDistance * 111000;
      const distanceInKm = taxiToPickupDistance / 1000;
      taxiToPickupEta = Math.round((distanceInKm / 30) * 3600);
      const minutes = Math.round(taxiToPickupEta / 60);
      taxiToPickupEtaText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    // Calculate distance from pickup to dropoff (for fare calculation)
    let tripDistanceInMeters;
    let tripDistanceText;
    
    try {
      const tripDistanceResult = await calculateDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        dropoffLocation.latitude,
        dropoffLocation.longitude
      );
      if (tripDistanceResult) {
        tripDistanceInMeters = tripDistanceResult.distance;
        tripDistanceText = tripDistanceResult.distanceText;
      } else {
        // ZERO_RESULTS - fallback to Euclidean distance
        const euclideanDistance = Math.sqrt(
          Math.pow(dropoffLocation.latitude - pickupLocation.latitude, 2) +
          Math.pow(dropoffLocation.longitude - pickupLocation.longitude, 2)
        );
        tripDistanceInMeters = euclideanDistance * 111000;
        tripDistanceText = `${(tripDistanceInMeters / 1000).toFixed(2)} km`;
      }
    } catch (error) {
      console.error('Error calculating trip distance:', error);
      // Fallback to Euclidean distance
      const euclideanDistance = Math.sqrt(
        Math.pow(dropoffLocation.latitude - pickupLocation.latitude, 2) +
        Math.pow(dropoffLocation.longitude - pickupLocation.longitude, 2)
      );
      tripDistanceInMeters = euclideanDistance * 111000;
      tripDistanceText = `${(tripDistanceInMeters / 1000).toFixed(2)} km`;
    }

    // Convert meters to kilometers for fare calculation
    const distanceInKm = tripDistanceInMeters / 1000;

    // Get active bookings count (demand) and available taxis count
    const systemRef = db.collection('system');
    const configDoc = await systemRef.doc('config').get();
    const demand = configDoc.exists ? (configDoc.data().activeBookings || 0) : 0;
    
    // Count available taxis (for ML model)
    const availableTaxisSnapshot = await taxisRef
      .where('status', '==', 'available')
      .get();
    const availableTaxisCount = availableTaxisSnapshot.size;

    // Get brand loyalty score (0-10 scale, default 5.0 for now, can be enhanced with user data)
    const brandLoyaltyScore = 5.0; // TODO: Get from user profile if available (range: 0-10)

    // Try ML-based price prediction first, fallback to dynamic pricing
    let fare;
    try {
      const mlPrice = await predictPriceWithML(
        distanceInKm,
        demand,
        availableTaxisCount,
        nearestTaxi.carType,
        pickupLocation.latitude,
        pickupLocation.longitude,
        brandLoyaltyScore
      );
      
      if (mlPrice !== null && mlPrice > 0) {
        fare = mlPrice;
        console.log(`ML predicted fare: ₹${fare.toFixed(2)}`);
      } else {
        // Fallback to dynamic pricing algorithm
        fare = calculateDynamicFare(distanceInKm, demand, nearestTaxi.carType);
        console.log(`Using dynamic pricing (ML unavailable): ₹${fare.toFixed(2)}`);
      }
    } catch (error) {
      console.error('Error in ML price prediction, using fallback:', error);
      // Fallback to dynamic pricing algorithm
      fare = calculateDynamicFare(distanceInKm, demand, nearestTaxi.carType);
    }

    // Generate booking ID
    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create booking document
    const bookingsRef = db.collection('bookings');
    const bookingData = {
      userId: userId || USER_ID,
      taxiId: nearestTaxi.id,
      status: 'confirmed',
      pickupLocation: new GeoPoint(pickupLocation.latitude, pickupLocation.longitude),
      dropoffLocation: new GeoPoint(dropoffLocation.latitude, dropoffLocation.longitude),
      fare: fare,
      distance: tripDistanceInMeters, // Distance from pickup to dropoff in meters
      distanceText: tripDistanceText,
      taxiToPickupDistance: taxiToPickupDistance,
      eta: taxiToPickupEta, // ETA from taxi to pickup in seconds
      etaText: taxiToPickupEtaText, // Human-readable ETA
      createdAt: new Date(),
    };
    await bookingsRef.doc(bookingId).set(bookingData);

    // Update taxi status to "en-route" (moving to pickup)
    await taxisRef.doc(nearestTaxi.id).update({ status: 'en-route' });

    // Start simulating taxi movement to pickup location
    moveTaxiToPickup(
      nearestTaxi.id,
      taxiLat,
      taxiLng,
      pickupLocation.latitude,
      pickupLocation.longitude,
      taxiToPickupEta
    ).then(pickupInterval => {
      // Store the pickup interval so we can stop it if booking is cancelled
      if (pickupInterval) {
        storeTaxiMovement(nearestTaxi.id, 'pickupInterval', pickupInterval);
      }

      // Monitor when taxi reaches pickup (status changes to 'arrived')
      const checkPickupReached = setInterval(async () => {
        try {
          const taxiDoc = await db.collection('taxis').doc(nearestTaxi.id).get();
          if (!taxiDoc.exists) {
            clearInterval(checkPickupReached);
            return;
          }
          
          const taxiData = taxiDoc.data();
          if (taxiData && taxiData.status === 'arrived') {
            clearInterval(checkPickupReached);
            
            // After reaching pickup, start moving to dropoff
            // Calculate trip duration (pickup to dropoff) - estimate based on distance
            const tripDistanceKm = tripDistanceInMeters / 1000;
            const tripDurationSeconds = Math.round((tripDistanceKm / 30) * 3600); // Assuming 30 km/h average speed
            
            moveTaxiToDropoff(
              nearestTaxi.id,
              pickupLocation.latitude,
              pickupLocation.longitude,
              dropoffLocation.latitude,
              dropoffLocation.longitude,
              tripDurationSeconds
            ).then(dropoffInterval => {
              if (dropoffInterval) {
                storeTaxiMovement(nearestTaxi.id, 'dropoffInterval', dropoffInterval);
              }
            });
          } else if (taxiData && taxiData.status === 'available') {
            // Booking was cancelled, stop checking
            clearInterval(checkPickupReached);
          }
        } catch (err) {
          console.error('Error checking pickup status:', err);
        }
      }, 2000); // Check every 2 seconds
    }).catch(err => {
      console.error('Error in taxi movement simulation:', err);
    });

    // Increment activeBookings (demand)
    await systemRef.doc('config').set(
      { activeBookings: demand + 1 },
      { merge: true }
    );

    // Get route coordinates for taxi to pickup (for map display)
    let taxiToPickupRoute;
    try {
      taxiToPickupRoute = await getRouteCoordinates(
        taxiLat,
        taxiLng,
        pickupLocation.latitude,
        pickupLocation.longitude
      );
    } catch (error) {
      console.error('Error fetching taxi to pickup route:', error);
      taxiToPickupRoute = [[taxiLat, taxiLng], [pickupLocation.latitude, pickupLocation.longitude]];
    }

    // Get route coordinates for pickup to dropoff (for map display)
    let pickupToDropoffRoute;
    try {
      pickupToDropoffRoute = await getRouteCoordinates(
        pickupLocation.latitude,
        pickupLocation.longitude,
        dropoffLocation.latitude,
        dropoffLocation.longitude
      );
    } catch (error) {
      console.error('Error fetching pickup to dropoff route:', error);
      pickupToDropoffRoute = [[pickupLocation.latitude, pickupLocation.longitude], [dropoffLocation.latitude, dropoffLocation.longitude]];
    }

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
        dropoffLocation: {
          latitude: dropoffLocation.latitude,
          longitude: dropoffLocation.longitude,
        },
        taxiLocation: {
          latitude: taxiLat,
          longitude: taxiLng,
        },
        fare: bookingData.fare,
        distance: bookingData.distance,
        distanceText: bookingData.distanceText,
        eta: bookingData.eta,
        etaText: bookingData.etaText,
        createdAt: bookingData.createdAt,
        // Route coordinates for map display
        taxiToPickupRoute: taxiToPickupRoute,
        pickupToDropoffRoute: pickupToDropoffRoute,
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

    // Stop taxi movement immediately
    stopTaxiMovement(taxiId);

    // Update taxi status back to "available" and get current location to keep it there
    const taxisRef = db.collection('taxis');
    const taxiDoc = await taxisRef.doc(taxiId).get();
    const taxiData = taxiDoc.data();
    
    // Keep the taxi at its current location, just change status
    await taxisRef.doc(taxiId).update({ 
      status: 'available',
      // Keep current location (don't reset it)
    });

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

/**
 * GET /api/bookings
 * Get booking history for a user
 * Query: { userId: "user_123" }
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || USER_ID;

    const bookingsRef = db.collection('bookings');
    const snapshot = await bookingsRef
      .where('userId', '==', targetUserId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    if (snapshot.empty) {
      return res.json({ bookings: [] });
    }

    const bookings = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      bookings.push({
        id: doc.id,
        userId: data.userId,
        taxiId: data.taxiId,
        driverName: data.driverName || 'Unknown',
        carType: data.carType || 'sedan',
        status: data.status,
        pickupLocation: {
          latitude: data.pickupLocation?.latitude || data.pickupLocation?._latitude,
          longitude: data.pickupLocation?.longitude || data.pickupLocation?._longitude,
        },
        dropoffLocation: data.dropoffLocation ? {
          latitude: data.dropoffLocation?.latitude || data.dropoffLocation?._latitude,
          longitude: data.dropoffLocation?.longitude || data.dropoffLocation?._longitude,
        } : null,
        fare: data.fare,
        distance: data.distance,
        distanceText: data.distanceText,
        eta: data.eta,
        etaText: data.etaText,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      });
    });

    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

export default router;

