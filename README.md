# FairFare Backend API

Express.js backend server for the FairFare taxi booking application.

## 🚀 Quick Start

```bash
npm install
npm run seed    # Seed database with 25 taxis
npm run dev     # Start with nodemon (auto-reload)
npm start       # Start server
```

## 📋 Environment Variables

Create a `.env` file:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
DISTANCE_MATRIX_API_KEY=your-api-key
```

## 🔌 API Endpoints

### Taxis
- `GET /api/taxis` - Get all available taxis

### Bookings
- `POST /api/book` - Book a taxi
- `POST /api/cancel` - Cancel a booking
- `GET /api/bookings?userId=user_123` - Get booking history

### Distance
- `GET /api/distance?originLat=...&originLng=...&destLat=...&destLng=...`
- `POST /api/distance` - Calculate distance and ETA

### Weather
- `GET /api/weather?latitude=...&longitude=...`
- `POST /api/weather` - Get current weather

### Admin
- `POST /api/admin/reset-taxis` - Reset all taxis to available
- `GET /api/admin/taxis-status` - Get taxis status summary

## 📊 Database Structure

### Collections

**taxis**
- `driverName` (string)
- `carType` (string: 'mini', 'sedan', 'suv')
- `location` (GeoPoint)
- `status` (string: 'available', 'booked', 'en-route')

**bookings**
- `userId` (string)
- `taxiId` (string)
- `status` (string: 'confirmed', 'cancelled', 'completed')
- `pickupLocation` (GeoPoint)
- `dropoffLocation` (GeoPoint)
- `fare` (number)
- `distance` (number, meters)
- `distanceText` (string)
- `eta` (number, seconds)
- `etaText` (string)
- `createdAt` (Timestamp)

**system**
- `config` document
  - `activeBookings` (number)

## 🔧 Scripts

- `npm start` - Start server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run seed` - Seed database with dummy data

## 📝 Testing

Use Postman or any API client. See `POSTMAN_TESTING_GUIDE.md` for detailed examples.

