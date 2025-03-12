import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { cspMiddleware } from './middleware/cspMiddleware';

// Import routes
import indexRoutes from './routes/index';
import aiRoutes from './routes/ai';
import conversationsRoutes from './routes/conversations';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Add JSON body parser middleware
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(cspMiddleware);

// Routes
app.use('/', indexRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/conversations', conversationsRoutes);

// Export the configured app
export default app;
