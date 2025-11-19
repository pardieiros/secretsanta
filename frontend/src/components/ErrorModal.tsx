"use client";
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  errors?: Record<string, string | string[]>;
}

export default function ErrorModal({
  isOpen,
  onClose,
  title = "Error",
  message,
  errors,
}: ErrorModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>

              {/* Content */}
              <div className="p-6">
                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pr-8">
                  {title}
                </h2>

                {/* Message */}
                {message && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {message}
                  </p>
                )}

                {/* Errors list */}
                {errors && Object.keys(errors).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(errors).map(([field, error]) => (
                      <div
                        key={field}
                        className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      >
                        <p className="text-sm font-medium text-red-800 dark:text-red-200 capitalize">
                          {field.replace(/_/g, " ")}:
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                          {Array.isArray(error) ? error[0] : error}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Close button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-light transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}


