import express from 'express';
import { getGenerationInfo } from '../../utils/openrouter';

const router = express.Router();

router.get('/generation/:id', async (req, res) => {
  try {
    const generationId = req.params.id;
    
    if (!generationId) {
      res.status(400).json({ error: 'Generation ID is required' });
      return;
    }
    
    const generationInfo = await getGenerationInfo(generationId);
    
    // Format response to match OpenRouter API spec
    if (generationInfo && generationInfo.data) {
      res.json(generationInfo);
    } else {
      // Handle case where generation data is missing
      res.status(404).json({ 
        error: 'Generation not found', 
        type: 'not_found' 
      });
    }
  } catch (error) {
    console.error('Error getting generation info:', error);
    
    // Handle specific errors
    if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object') {
      const status = 'status' in error.response ? error.response.status as number : 500;
      const errorMessage = error.response && 
                          typeof error.response === 'object' && 
                          'data' in error.response && 
                          error.response.data && 
                          typeof error.response.data === 'object' && 
                          'error' in error.response.data && 
                          error.response.data.error && 
                          typeof error.response.data.error === 'object' && 
                          'message' in error.response.data.error
                           ? String(error.response.data.error.message)
                           : 'Failed to retrieve generation info';
      
      res.status(status).json({ 
        error: errorMessage,
        type: status === 404 ? 'not_found' : 'server_error'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to retrieve generation info',
        type: 'server_error'
      });
    }
  }
});

export default router;
