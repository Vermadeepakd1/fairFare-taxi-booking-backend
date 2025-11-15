# Distance Matrix API Integration Guide

## Overview

The Taxi Booking API now uses the [DistanceMatrix API](https://api-v2.distancematrix.ai) for accurate distance calculations instead of simple Euclidean distance. This provides real-world road distances and travel times.

## New Route: `/api/distance`

### GET Request
Calculate distance using query parameters.

**URL:** `GET /api/distance?originLat={lat}&originLng={lng}&destLat={lat}&destLng={lng}`

**Example:**
```
GET http://localhost:3001/api/distance?originLat=51.4822656&originLng=-0.1933769&destLat=51.4994794&destLng=-0.1269979
```

**Response:**
```json
{
  "origin": {
    "latitude": 51.4822656,
    "longitude": -0.1933769
  },
  "destination": {
    "latitude": 51.4994794,
    "longitude": -0.1269979
  },
  "distance": 6288,
  "distanceText": "6.288 km",
  "duration": 1016,
  "durationText": "16 minutes"
}
```

### POST Request
Calculate distance using JSON body.

**URL:** `POST /api/distance`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "origin": {
    "latitude": 51.4822656,
    "longitude": -0.1933769
  },
  "destination": {
    "latitude": 51.4994794,
    "longitude": -0.1269979
  }
}
```

**Response:** Same as GET request

## Integration with Booking API

The `/api/book` endpoint now automatically uses the DistanceMatrix API to calculate the distance between the user's pickup location and the nearest taxi. The distance is used for accurate fare calculation.

### Changes:
- **Before:** Used Euclidean distance (straight-line distance)
- **Now:** Uses DistanceMatrix API (real road distance)
- **Fallback:** If the API fails, falls back to Euclidean distance with conversion

## Testing with Postman

### Test Distance Calculation:

1. **GET Request:**
   - Method: `GET`
   - URL: `http://localhost:3001/api/distance?originLat=51.4822656&originLng=-0.1933769&destLat=51.4994794&destLng=-0.1269979`
   - Click **Send**

2. **POST Request:**
   - Method: `POST`
   - URL: `http://localhost:3001/api/distance`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
   ```json
   {
     "origin": {
       "latitude": 51.4822656,
       "longitude": -0.1933769
     },
     "destination": {
       "latitude": 51.4994794,
       "longitude": -0.1269979
     }
   }
   ```
   - Click **Send**

### Test Booking with Real Distance:

1. **Book a Taxi:**
   - Method: `POST`
   - URL: `http://localhost:3001/api/book`
   - Body:
   ```json
   {
     "userId": "user_123",
     "pickupLocation": {
       "latitude": 15.80,
       "longitude": 78.00
     }
   }
   ```
   - The booking will automatically use DistanceMatrix API for distance calculation

## API Key Configuration

The DistanceMatrix API key is stored in the `.env` file:

```
DISTANCE_MATRIX_API_KEY=06brU9ss75MnpnBvH32Ansn5ezlmGrxrnrU9E1oqWC7XzeNfjNJ4fVo6PxkIueqi
```

If the key is not found in environment variables, the code will use the default key provided.

## Response Fields

- **distance**: Distance in meters (number)
- **distanceText**: Human-readable distance (e.g., "6.288 km")
- **duration**: Duration in seconds (number)
- **durationText**: Human-readable duration (e.g., "16 minutes")

## Error Handling

If the DistanceMatrix API fails:
- The booking endpoint will fall back to Euclidean distance calculation
- An error will be logged to the console
- The booking will still proceed with the fallback calculation

## API Documentation

For more information about the DistanceMatrix API, visit:
https://api-v2.distancematrix.ai

