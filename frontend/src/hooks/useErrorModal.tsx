import { useState, useCallback } from "react";

interface ErrorData {
  title?: string;
  message?: string;
  errors?: Record<string, string | string[]>;
}

export function useErrorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [errorData, setErrorData] = useState<ErrorData>({});

  const showError = useCallback((data: ErrorData) => {
    setErrorData(data);
    setIsOpen(true);
  }, []);

  const hideError = useCallback(() => {
    setIsOpen(false);
    // Clear error data after animation
    setTimeout(() => {
      setErrorData({});
    }, 300);
  }, []);

  return {
    isOpen,
    errorData,
    showError,
    hideError,
  };
}






