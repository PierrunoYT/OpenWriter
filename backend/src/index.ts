import dotenv from 'dotenv';
import app from './server';

// Load environment variables
dotenv.config();

// Validate required environment variables
const REQUIRED_ENV_VARS = ['OPENROUTER_API_KEY'];
const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
  console.warn('Some functionality may not work correctly. Please check your .env file.');
}

// Get port from environment or use default
const PORT = Number(process.env.PORT) || 3001;

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});