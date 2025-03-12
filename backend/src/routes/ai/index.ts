import express from 'express';
import generationRoutes from './generation';

const router = express.Router();

// Mount AI-related routes
router.use('/', generationRoutes);

export default router;
