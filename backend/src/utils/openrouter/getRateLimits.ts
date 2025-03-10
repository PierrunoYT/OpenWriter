import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

if (!OPENROUTER_API_KEY) {
  console.warn('Missing OPENROUTER_API_KEY environment variable');
}

export interface RateLimitInfo {
  label: string;
  usage: number;
  limit: number | null;
  is_free_tier: boolean;
  rate_limit: {
    requests: number;
    interval: string;
  };
}

export async function getRateLimits(): Promise<RateLimitInfo> {
  try {
    const response = await axios.get(
      `${OPENROUTER_API_URL}/auth/key`,
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter',
        },
      }
    );
    
    return response.data.data;
  } catch (error) {
    console.error('Error getting rate limit info:', error);
    throw error;
  }
}
