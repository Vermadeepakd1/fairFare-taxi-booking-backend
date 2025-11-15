import db from './firebase.js';
import { GeoPoint } from 'firebase-admin/firestore';

/**
 * Seed Firestore with dummy taxi data and system configuration
 */
async function seedData() {
  try {
    console.log('Starting data seeding...');

    // Create dummy taxis with varied locations and car types
    const taxis = [
      { driverName: 'Driver A', carType: 'mini', location: new GeoPoint(15.82, 78.03), status: 'available' },
      { driverName: 'Driver B', carType: 'sedan', location: new GeoPoint(15.85, 78.05), status: 'available' },
      { driverName: 'Driver C', carType: 'suv', location: new GeoPoint(15.80, 78.01), status: 'available' },
      { driverName: 'Driver D', carType: 'sedan', location: new GeoPoint(15.88, 78.08), status: 'available' },
      { driverName: 'Driver E', carType: 'mini', location: new GeoPoint(15.75, 77.98), status: 'available' },
      { driverName: 'Driver F', carType: 'suv', location: new GeoPoint(15.90, 78.10), status: 'available' },
      { driverName: 'Driver G', carType: 'sedan', location: new GeoPoint(15.72, 77.95), status: 'available' },
      { driverName: 'Driver H', carType: 'mini', location: new GeoPoint(15.83, 78.02), status: 'available' },
      { driverName: 'Driver I', carType: 'sedan', location: new GeoPoint(15.79, 78.00), status: 'available' },
      { driverName: 'Driver J', carType: 'suv', location: new GeoPoint(15.87, 78.07), status: 'available' },
      { driverName: 'Driver K', carType: 'mini', location: new GeoPoint(15.76, 77.99), status: 'available' },
      { driverName: 'Driver L', carType: 'sedan', location: new GeoPoint(15.84, 78.04), status: 'available' },
      { driverName: 'Driver M', carType: 'suv', location: new GeoPoint(15.81, 78.06), status: 'available' },
      { driverName: 'Driver N', carType: 'mini', location: new GeoPoint(15.73, 77.96), status: 'available' },
      { driverName: 'Driver O', carType: 'sedan', location: new GeoPoint(15.89, 78.09), status: 'available' },
      { driverName: 'Driver P', carType: 'suv', location: new GeoPoint(15.78, 78.00), status: 'available' },
      { driverName: 'Driver Q', carType: 'mini', location: new GeoPoint(15.86, 78.05), status: 'available' },
      { driverName: 'Driver R', carType: 'sedan', location: new GeoPoint(15.74, 77.97), status: 'available' },
      { driverName: 'Driver S', carType: 'suv', location: new GeoPoint(15.91, 78.11), status: 'available' },
      { driverName: 'Driver T', carType: 'mini', location: new GeoPoint(15.77, 78.01), status: 'available' },
      { driverName: 'Driver U', carType: 'sedan', location: new GeoPoint(15.83, 78.03), status: 'available' },
      { driverName: 'Driver V', carType: 'suv', location: new GeoPoint(15.71, 77.94), status: 'available' },
      { driverName: 'Driver W', carType: 'mini', location: new GeoPoint(15.88, 78.08), status: 'available' },
      { driverName: 'Driver X', carType: 'sedan', location: new GeoPoint(15.80, 78.02), status: 'available' },
      { driverName: 'Driver Y', carType: 'suv', location: new GeoPoint(15.85, 78.06), status: 'available' },
    ];

    // Add taxis to Firestore (use merge to update existing or create new)
    const taxisRef = db.collection('taxis');
    for (let i = 0; i < taxis.length; i++) {
      const taxiId = `taxi_${String(i + 1).padStart(3, '0')}`;
      await taxisRef.doc(taxiId).set(taxis[i], { merge: false }); // Use set to overwrite
      console.log(`Added ${taxiId}: ${taxis[i].driverName} (${taxis[i].carType})`);
    }
    
    console.log(`\nTotal taxis seeded: ${taxis.length}`);

    // Initialize system config
    const systemRef = db.collection('system');
    await systemRef.doc('config').set({
      activeBookings: 0,
    });
    console.log('Initialized system/config with activeBookings: 0');

    console.log('Data seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seed function
seedData();

