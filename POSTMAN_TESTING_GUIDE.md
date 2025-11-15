# Postman API Testing Guide

This guide explains how to test all the Taxi Booking API endpoints using Postman.

## Prerequisites

1. Make sure your server is running:
   ```bash
   cd server
   npm start
   ```
   Server should be running on `http://localhost:3001`

2. Make sure you've seeded the database:
   ```bash
   npm run seed
   ```

## API Endpoints to Test

### 1. Test Server Health
**GET** `http://localhost:3001/api/test`

**Steps:**
1. Open Postman
2. Create a new request
3. Set method to **GET**
4. Enter URL: `http://localhost:3001/api/test`
5. Click **Send**

**Expected Response:**
```json
{
  "message": "Server is alive!"
}
```

---

### 2. Get Root Endpoint Info
**GET** `http://localhost:3001/`

**Steps:**
1. Create a new request
2. Set method to **GET**
3. Enter URL: `http://localhost:3001/`
4. Click **Send**

**Expected Response:**
```json
{
  "message": "Taxi Booking API Server",
  "endpoints": {
    "test": "/api/test",
    "taxis": "/api/taxis",
    "book": "/api/book",
    "cancel": "/api/cancel"
  }
}
```

---

### 3. Get Available Taxis
**GET** `http://localhost:3001/api/taxis`

**Steps:**
1. Create a new request
2. Set method to **GET**
3. Enter URL: `http://localhost:3001/api/taxis`
4. Click **Send**

**Expected Response:**
```json
{
  "taxis": [
    {
      "id": "taxi_001",
      "driverName": "Driver A",
      "location": {
        "latitude": 15.82,
        "longitude": 78.03
      },
      "status": "available"
    },
    {
      "id": "taxi_002",
      "driverName": "Driver B",
      "location": {
        "latitude": 15.85,
        "longitude": 78.05
      },
      "status": "available"
    }
    // ... more taxis
  ]
}
```

---

### 4. Book a Taxi
**POST** `http://localhost:3001/api/book`

**Steps:**
1. Create a new request
2. Set method to **POST**
3. Enter URL: `http://localhost:3001/api/book`
4. Go to **Headers** tab
5. Add header:
   - Key: `Content-Type`
   - Value: `application/json`
6. Go to **Body** tab
7. Select **raw** and choose **JSON** from dropdown
8. Enter the following JSON:
```json
{
  "userId": "user_123",
  "pickupLocation": {
    "latitude": 15.80,
    "longitude": 78.00
  }
}
```
9. Click **Send**

**Expected Response:**
```json
{
  "booking": {
    "id": "booking_1234567890_abc123",
    "userId": "user_123",
    "taxiId": "taxi_001",
    "status": "requested",
    "pickupLocation": {
      "latitude": 15.80,
      "longitude": 78.00
    },
    "dropoffLocation": null,
    "fare": 125.50,
    "distance": 6288,
    "distanceText": "6.288 km",
    "eta": 1016,
    "etaText": "16 minutes",
    "createdAt": "2025-11-15T10:30:00.000Z"
  }
}
```

**Note:** The fare will vary based on:
- Distance to nearest taxi (real road distance from DistanceMatrix API)
- Number of active bookings (demand multiplier)

**ETA Information:**
- `eta`: Estimated time of arrival in seconds
- `etaText`: Human-readable ETA (e.g., "16 minutes")
- `distance`: Distance in meters
- `distanceText`: Human-readable distance (e.g., "6.288 km")

**Test with different pickup locations:**
```json
{
  "userId": "user_123",
  "pickupLocation": {
    "latitude": 15.75,
    "longitude": 77.95
  }
}
```

---

### 5. Cancel a Booking
**POST** `http://localhost:3001/api/cancel`

**Steps:**
1. First, book a taxi using the `/api/book` endpoint (see above)
2. Copy the `booking.id` and `booking.taxiId` from the response
3. Create a new request
4. Set method to **POST**
5. Enter URL: `http://localhost:3001/api/cancel`
6. Go to **Headers** tab
7. Add header:
   - Key: `Content-Type`
   - Value: `application/json`
8. Go to **Body** tab
9. Select **raw** and choose **JSON** from dropdown
10. Enter the following JSON (replace with actual IDs from booking response):
```json
{
  "bookingId": "booking_1234567890_abc123",
  "taxiId": "taxi_001"
}
```
11. Click **Send**

**Expected Response:**
```json
{
  "success": true
}
```

---

## Testing Workflow

### Complete Booking Flow:

1. **Get Available Taxis**
   - GET `/api/taxis`
   - Note the available taxi IDs

2. **Book a Taxi**
   - POST `/api/book` with pickup location
   - Save the `booking.id` and `taxiId` from response

3. **Verify Taxi is Booked**
   - GET `/api/taxis` again
   - The booked taxi should no longer appear in the list

4. **Cancel the Booking**
   - POST `/api/cancel` with bookingId and taxiId
   - Should return `{ "success": true }`

5. **Verify Taxi is Available Again**
   - GET `/api/taxis` again
   - The cancelled taxi should appear back in the list

---

## Error Testing

### Test Invalid Pickup Location:
**POST** `/api/book`
```json
{
  "userId": "user_123",
  "pickupLocation": {
    "latitude": "invalid",
    "longitude": 78.00
  }
}
```
**Expected:** `400 Bad Request` with error message

### Test Missing Required Fields:
**POST** `/api/cancel`
```json
{
  "bookingId": "booking_123"
}
```
**Expected:** `400 Bad Request` - "bookingId and taxiId are required"

### Test Invalid Booking ID:
**POST** `/api/cancel`
```json
{
  "bookingId": "invalid_booking",
  "taxiId": "taxi_001"
}
```
**Expected:** `404 Not Found` - "Booking not found"

---

## Postman Collection Setup Tips

1. **Create a Collection:**
   - Click "New" → "Collection"
   - Name it "Taxi Booking API"

2. **Add Environment Variables:**
   - Click the gear icon → "Manage Environments"
   - Create new environment "Local"
   - Add variable: `base_url` = `http://localhost:3001`
   - Use `{{base_url}}` in your requests

3. **Save Responses:**
   - After booking, save the booking ID as an environment variable
   - Use `{{bookingId}}` in the cancel request

4. **Add Tests (Optional):**
   - In the "Tests" tab, add:
   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });
   ```

---

## Quick Test Data

**Pickup Locations to Test:**
```json
// Near taxi_001
{ "latitude": 15.82, "longitude": 78.03 }

// Near taxi_002
{ "latitude": 15.85, "longitude": 78.05 }

// Far from all taxis (will find nearest)
{ "latitude": 15.70, "longitude": 77.90 }
```

---

## Troubleshooting

**Issue:** "Cannot GET /"
- **Solution:** Make sure server is running and you're using the correct URL

**Issue:** "Failed to fetch taxis"
- **Solution:** Run `npm run seed` to populate the database

**Issue:** "No available taxis found"
- **Solution:** All taxis might be booked. Cancel a booking or seed the database again

**Issue:** Connection refused
- **Solution:** Check if server is running on port 3001

