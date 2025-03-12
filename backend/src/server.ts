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
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cspMiddleware);

// Routes
app.use('/', indexRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/conversations', conversationsRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
