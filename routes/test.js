import express from 'express';

const router = express.Router();

/**
 * GET /api/test
 * Simple test route to verify server is running
 */
router.get('/', (req, res) => {
  res.json({ message: 'Server is alive!' });
});

export default router;

