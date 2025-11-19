import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import taxisRouter from './routes/taxis.js';
import taxisStreamRouter from './routes/taxis-stream.js';
import bookingsRouter from './routes/bookings.js';
import testRouter from './routes/test.js';
import distanceRouter from './routes/distance.js';
import weatherRouter from './routes/weather.js';
import adminRouter from './routes/admin.js';
import routesRouter from './routes/routes.js';
import mlPredictRouter from './routes/ml-predict.js';

// Load environment variables
dotenv.config();

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable parsing of JSON request bodies

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Taxi Booking API Server',
    endpoints: {
      test: '/api/test',
      taxis: '/api/taxis',
      book: '/api/book',
      cancel: '/api/cancel',
      distance: '/api/distance',
      weather: '/api/weather'
    }
  });
});

// API Routes
app.use('/api/test', testRouter);
app.use('/api/taxis', taxisRouter);
app.use('/api/taxis', taxisStreamRouter); // SSE stream endpoint
app.use('/api', bookingsRouter); // /api/book and /api/cancel
app.use('/api/distance', distanceRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/admin', adminRouter); // /api/admin/reset-taxis
app.use('/api/route', routesRouter); // /api/route - Get route coordinates
app.use('/api/ml-predict', mlPredictRouter); // /api/ml-predict - ML price prediction

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});