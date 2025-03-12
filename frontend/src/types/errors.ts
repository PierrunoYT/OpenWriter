/**
 * Standard error interface for API responses
 */
export interface ErrorWithDetails {
  type?: string;
  code?: number;
  status?: number;
  message?: string;
  reasons?: string[];
  flagged_input?: string;
  provider?: string;
  raw_error?: unknown;
}
