import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

if (!OPENROUTER_API_KEY) {
  console.warn('Missing OPENROUTER_API_KEY environment variable');
}

export async function getGenerationInfo(generationId: string) {
  try {
    const response = await axios.get(
      `${OPENROUTER_API_URL}/generation`,
      {
        params: {
          id: generationId
        },
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter',
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting generation info:', error);
    throw error;
  }
}
