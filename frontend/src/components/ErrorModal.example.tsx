/**
 * Example usage of ErrorModal component
 * 
 * This shows how to integrate the ErrorModal in your forms
 */

import React from "react";
import ErrorModal from "./ErrorModal";
import { useErrorModal } from "../hooks/useErrorModal";
import { handleApiError } from "../utils/errorHandler";

export function ExampleForm() {
  const { isOpen, errorData, showError, hideError } = useErrorModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Your API call here
      const response = await fetch("/api/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "pt", // or "en"
        },
        body: JSON.stringify({
          email: "test@example.com",
          // ... other fields
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        handleApiError({ response: { data: error } }, showError);
        return;
      }

      // Success handling
      const data = await response.json();
      console.log("Success:", data);
    } catch (error) {
      handleApiError(error, showError);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Your form fields */}
        <button type="submit">Submit</button>
      </form>

      <ErrorModal
        isOpen={isOpen}
        onClose={hideError}
        title={errorData.title}
        message={errorData.message}
        errors={errorData.errors}
      />
    </>
  );
}






