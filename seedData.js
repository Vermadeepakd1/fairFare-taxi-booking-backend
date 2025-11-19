import db from './firebase.js';
import { GeoPoint } from 'firebase-admin/firestore';

/**
 * Seed Firestore with dummy taxi data and system configuration
 */
async function seedData() {
  try {
    console.log('Starting data seeding...');

    // Create dummy taxis with varied locations and car types
    // Using Kurnool, Andhra Pradesh coordinates - well-known roads with good coverage
    // These coordinates are on actual roads in Kurnool
    const taxis = [
      { driverName: 'Driver A', carType: 'mini', location: new GeoPoint(15.8281, 78.0373), status: 'available' }, // Kurnool City Center
      { driverName: 'Driver B', carType: 'sedan', location: new GeoPoint(15.8350, 78.0420), status: 'available' }, // Nandyal Road
      { driverName: 'Driver C', carType: 'suv', location: new GeoPoint(15.8200, 78.0300), status: 'available' }, // Adoni Road
      { driverName: 'Driver D', carType: 'sedan', location: new GeoPoint(15.8400, 78.0500), status: 'available' }, // Railway Station Area
      { driverName: 'Driver E', carType: 'mini', location: new GeoPoint(15.8150, 78.0250), status: 'available' }, // Bus Stand Area
      { driverName: 'Driver F', carType: 'suv', location: new GeoPoint(15.8320, 78.0450), status: 'available' }, // Collector Office Area
      { driverName: 'Driver G', carType: 'sedan', location: new GeoPoint(15.8250, 78.0400), status: 'available' }, // Market Area
      { driverName: 'Driver H', carType: 'mini', location: new GeoPoint(15.8300, 78.0350), status: 'available' }, // Hospital Road
      { driverName: 'Driver I', carType: 'sedan', location: new GeoPoint(15.8380, 78.0380), status: 'available' }, // College Road
      { driverName: 'Driver J', carType: 'suv', location: new GeoPoint(15.8220, 78.0320), status: 'available' }, // Temple Street
      { driverName: 'Driver K', carType: 'mini', location: new GeoPoint(15.8280, 78.0400), status: 'available' }, // Main Road
      { driverName: 'Driver L', carType: 'sedan', location: new GeoPoint(15.8330, 78.0430), status: 'available' }, // Police Station Road
      { driverName: 'Driver M', carType: 'suv', location: new GeoPoint(15.8260, 78.0340), status: 'available' }, // Park Area
      { driverName: 'Driver N', carType: 'mini', location: new GeoPoint(15.8370, 78.0410), status: 'available' }, // School Road
      { driverName: 'Driver O', carType: 'sedan', location: new GeoPoint(15.8240, 78.0360), status: 'available' }, // Bank Street
      { driverName: 'Driver P', carType: 'suv', location: new GeoPoint(15.8310, 78.0440), status: 'available' }, // Post Office Road
      { driverName: 'Driver Q', carType: 'mini', location: new GeoPoint(15.8190, 78.0280), status: 'available' }, // Residential Area 1
      { driverName: 'Driver R', carType: 'sedan', location: new GeoPoint(15.8360, 78.0390), status: 'available' }, // Residential Area 2
      { driverName: 'Driver S', carType: 'suv', location: new GeoPoint(15.8230, 78.0330), status: 'available' }, // Industrial Area
      { driverName: 'Driver T', carType: 'mini', location: new GeoPoint(15.8290, 78.0420), status: 'available' }, // Commercial Area
      { driverName: 'Driver U', carType: 'sedan', location: new GeoPoint(15.8340, 78.0370), status: 'available' }, // Court Road
      { driverName: 'Driver V', carType: 'suv', location: new GeoPoint(15.8210, 78.0310), status: 'available' }, // Stadium Road
      { driverName: 'Driver W', carType: 'mini', location: new GeoPoint(15.8270, 78.0380), status: 'available' }, // Library Road
      { driverName: 'Driver X', carType: 'sedan', location: new GeoPoint(15.8390, 78.0460), status: 'available' }, // Museum Road
      { driverName: 'Driver Y', carType: 'suv', location: new GeoPoint(15.8170, 78.0260), status: 'available' }, // Airport Road
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

