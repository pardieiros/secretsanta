"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { userAPI } from "../lib/api";
import Button from "./Button";

interface PushNotificationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PushNotificationPromptModal({
  isOpen,
  onClose,
}: PushNotificationPromptModalProps) {
  const { t } = useTranslation();
  const { subscribe, isLoading } = usePushNotifications();

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

  const handleYes = async () => {
    try {
      // Subscribe to push notifications
      await subscribe();
      
      // Mark as asked in backend
      await userAPI.updatePushNotificationPreference({
        push_notifications_asked: true,
      });
      
      onClose();
    } catch (error) {
      console.error("Error enabling push notifications:", error);
      // Even if subscription fails, mark as asked so we don't ask again
      try {
        await userAPI.updatePushNotificationPreference({
          push_notifications_asked: true,
        });
      } catch (e) {
        console.error("Error updating preference:", e);
      }
      onClose();
    }
  };

  const handleNo = async () => {
    try {
      // Mark as asked in backend (user declined)
      await userAPI.updatePushNotificationPreference({
        push_notifications_asked: true,
      });
    } catch (error) {
      console.error("Error updating preference:", error);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleNo}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl bg-background shadow-2xl border border-border-soft"
            >
              {/* Content */}
              <div className="p-6">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-8 h-8 text-primary" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-text-main mb-4 text-center">
                  {t("pushNotificationPrompt.title")}
                </h2>

                {/* Message */}
                <p className="text-text-secondary mb-6 text-center">
                  {t("pushNotificationPrompt.message")}
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleNo}
                    variant="secondary"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {t("pushNotificationPrompt.no")}
                  </Button>
                  <Button
                    onClick={handleYes}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? t("pushNotificationPrompt.activating")
                      : t("pushNotificationPrompt.yes")}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

