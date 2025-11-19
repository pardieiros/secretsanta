/**
 * Utility functions for handling API errors
 */

export interface ApiError {
  error?: string;
  message?: string;
  errors?: Record<string, string | string[]>;
  detail?: string;
}

export function formatApiError(error: any): {
  title: string;
  message?: string;
  errors?: Record<string, string | string[]>;
} {
  // Check if it's an axios error
  if (error?.response?.data) {
    const data: ApiError = error.response.data;
    
    return {
      title: data.error || data.message || "Error",
      message: data.message || data.error,
      errors: data.errors,
    };
  }
  
  // Check if it's a direct error object
  if (error?.error || error?.message) {
    return {
      title: error.error || "Error",
      message: error.message,
      errors: error.errors,
    };
  }
  
  // Fallback
  return {
    title: "Error",
    message: error?.message || "An unexpected error occurred",
  };
}

export function handleApiError(error: any, showError: (data: any) => void) {
  const formatted = formatApiError(error);
  showError(formatted);
}


