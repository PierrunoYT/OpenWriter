/**
 * Shared utility functions for OpenRouter API integration
 */

/**
 * Applies common request parameters from options to the request body
 * @param requestBody The request body to modify
 * @param options The options containing parameters to apply
 */
export function applyCommonRequestParameters(requestBody: any, options: any): void {
  if (options.responseFormat) {
    requestBody.response_format = options.responseFormat;
  }
  
  if (options.structured_outputs !== undefined) {
    requestBody.structured_outputs = options.structured_outputs;
  }
  
  if (options.tools && options.tools.length > 0) {
    requestBody.tools = options.tools;
  }
  
  if (options.toolChoice) {
    requestBody.tool_choice = options.toolChoice;
  }
  
  if (options.seed !== undefined) {
    requestBody.seed = options.seed;
  }
  
  if (options.top_p !== undefined) {
    requestBody.top_p = options.top_p;
  }
  
  if (options.top_k !== undefined) {
    requestBody.top_k = options.top_k;
  }
  
  if (options.frequency_penalty !== undefined) {
    requestBody.frequency_penalty = options.frequency_penalty;
  }
  
  if (options.presence_penalty !== undefined) {
    requestBody.presence_penalty = options.presence_penalty;
  }
  
  if (options.repetition_penalty !== undefined) {
    requestBody.repetition_penalty = options.repetition_penalty;
  }
  
  if (options.logit_bias) {
    requestBody.logit_bias = options.logit_bias;
  }
  
  if (options.logprobs !== undefined) {
    requestBody.logprobs = options.logprobs;
  }
  
  if (options.top_logprobs !== undefined) {
    requestBody.top_logprobs = options.top_logprobs;
  }
  
  if (options.min_p !== undefined) {
    requestBody.min_p = options.min_p;
  }
  
  if (options.top_a !== undefined) {
    requestBody.top_a = options.top_a;
  }
  
  if (options.stop) {
    requestBody.stop = options.stop;
  }
  
  if (options.prediction) {
    requestBody.prediction = options.prediction;
  }
  
  if (options.transforms && options.transforms.length > 0) {
    requestBody.transforms = options.transforms;
  }
  
  if (options.models && options.models.length > 0) {
    requestBody.models = options.models;
  }
  
  if (options.route) {
    requestBody.route = options.route;
  }
  
  if (options.provider) {
    requestBody.provider = options.provider;
  }
  
  if (options.max_price) {
    requestBody.max_price = options.max_price;
  }
}

/**
 * Creates a standardized error object from OpenRouter API errors
 * @param error The error from the API call
 * @returns A standardized error object with type and details
 */
export function createStandardizedError(error: any): any {
  // Handle OpenAI SDK errors
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    const errorData = error.error || error.response?.data;
    
    const enhancedError: any = new Error(error.message || 'Unknown error');
    enhancedError.code = status;
    enhancedError.status = status;
    
    if (errorData && 'error' in errorData) {
      const openRouterError = errorData.error;
      if (openRouterError && typeof openRouterError === 'object') {
        enhancedError.message = openRouterError.message || error.message;
        enhancedError.metadata = openRouterError.metadata;
      }
    }
    
    // Set error type based on status code
    enhancedError.type = getErrorTypeFromStatus(status, enhancedError.metadata);
    
    // Add additional details for specific error types
    if (enhancedError.type === 'moderation' && enhancedError.metadata?.reasons) {
      enhancedError.reasons = enhancedError.metadata.reasons;
      enhancedError.flagged_input = enhancedError.metadata.flagged_input;
      enhancedError.provider = enhancedError.metadata.provider_name;
    } else if (enhancedError.type === 'provider_error' && enhancedError.metadata?.provider_name) {
      enhancedError.provider = enhancedError.metadata.provider_name;
      enhancedError.raw_error = enhancedError.metadata.raw;
    }
    
    return enhancedError;
  }
  
  // Handle Axios errors
  if (error.isAxiosError) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data;
    
    if (errorData && errorData.error) {
      const openRouterError = errorData.error;
      const errorCode = openRouterError.code || status;
      const errorMessage = openRouterError.message || 'Unknown error';
      const errorMetadata = openRouterError.metadata;
      
      const enhancedError: any = new Error(errorMessage);
      enhancedError.code = errorCode;
      enhancedError.status = status;
      enhancedError.metadata = errorMetadata;
      
      // Set error type based on status code
      enhancedError.type = getErrorTypeFromStatus(errorCode, errorMetadata);
      
      // Add additional details for specific error types
      if (enhancedError.type === 'moderation' && errorMetadata?.reasons) {
        enhancedError.reasons = errorMetadata.reasons;
        enhancedError.flagged_input = errorMetadata.flagged_input;
        enhancedError.provider = errorMetadata.provider_name;
      } else if (enhancedError.type === 'provider_error' && errorMetadata?.provider_name) {
        enhancedError.provider = errorMetadata.provider_name;
        enhancedError.raw_error = errorMetadata.raw;
      }
      
      return enhancedError;
    }
    
    // Generic error for Axios errors without detailed info
    const enhancedError: any = new Error(error.message || 'API request failed');
    enhancedError.code = status;
    enhancedError.status = status;
    enhancedError.type = getErrorTypeFromStatus(status);
    return enhancedError;
  }
  
  // Return the original error if we can't enhance it
  return error;
}

/**
 * Maps status codes to error types
 * @param status HTTP status code
 * @param metadata Optional metadata that might contain additional error details
 * @returns The error type string
 */
function getErrorTypeFromStatus(status: number, metadata?: any): string {
  switch (status) {
    case 400: return 'bad_request';
    case 401: return 'authentication';
    case 402: return 'insufficient_credits';
    case 403:
      if (metadata?.reasons) {
        return 'moderation';
      }
      return 'forbidden';
    case 404: return 'not_found';
    case 408: return 'timeout';
    case 429: return 'rate_limit';
    case 502: return 'provider_error';
    case 503: return 'no_provider_available';
    default: return 'unknown';
  }
}
