import express from 'express';
import { getRateLimits } from '../../utils/openrouter/getRateLimits';

const router = express.Router();

router.get('/limits', async (req, res) => {
  try {
    const rateLimitInfo = await getRateLimits();
    
    // Calculate some additional helpful information
    const remainingCredits = rateLimitInfo.limit !== null 
      ? Math.max(0, rateLimitInfo.limit - rateLimitInfo.usage) 
      : null;
      
    // Parse the interval string (e.g., "10s", "1m") into seconds
    let intervalSeconds = 0;
    const intervalMatch = rateLimitInfo.rate_limit.interval.match(/(\d+)([smh])/);
    if (intervalMatch) {
      const [, value, unit] = intervalMatch;
      const numValue = parseInt(value, 10);
      
      switch (unit) {
        case 's': intervalSeconds = numValue; break;
        case 'm': intervalSeconds = numValue * 60; break;
        case 'h': intervalSeconds = numValue * 3600; break;
      }
    }
    
    // Calculate the effective rate limit based on credits
    const effectiveRateLimit = remainingCredits !== null 
      ? Math.min(rateLimitInfo.rate_limit.requests, Math.max(1, Math.ceil(remainingCredits)))
      : rateLimitInfo.rate_limit.requests;
    
    res.json({
      ...rateLimitInfo,
      remaining_credits: remainingCredits,
      effective_rate_limit: {
        requests_per_second: effectiveRateLimit,
        interval_seconds: intervalSeconds
      },
      can_use_free_models: rateLimitInfo.is_free_tier || (remainingCredits !== null ? remainingCredits > 0 : true)
    });
  } catch (error) {
    console.error('Error getting rate limits:', error);
    res.status(500).json({ error: 'Failed to retrieve rate limit information' });
  }
});

export default router;
