/**
 * API configuration for the application
 */

// Base URL for the OpenRouter API
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

// Base URL for the backend API
export const BACKEND_API_URL = 'http://localhost:3001';

// Base URL for the frontend API
export const FRONTEND_API_URL = '/api';

// Headers for OpenRouter API requests
export const OPENROUTER_HEADERS = {
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://openwriter.app',
  'X-Title': 'OpenWriter'
};
