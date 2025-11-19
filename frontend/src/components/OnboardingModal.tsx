"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowLeft, Upload, User, Phone, Users, Plus } from "lucide-react";

interface OnboardingData {
  firstName: string;
  lastName: string;
  phone: string;
  profilePicture: string | null;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (data: OnboardingData, action: "join" | "create") => void;
  initialData?: Partial<OnboardingData>;
}

type Step = 1 | 2 | 3;

export default function OnboardingModal({
  isOpen,
  onComplete,
  initialData = {},
}: OnboardingModalProps) {
  const { t } = useTranslation();
  // Determine starting step based on available data
  const hasBasicInfo = initialData.firstName && initialData.lastName;
  const startingStep: Step = hasBasicInfo ? 3 : 1;
  
  const [step, setStep] = useState<Step>(startingStep);
  const [data, setData] = useState<OnboardingData>({
    firstName: initialData.firstName || "",
    lastName: initialData.lastName || "",
    phone: initialData.phone || "",
    profilePicture: initialData.profilePicture || null,
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Determine starting step based on available data
      const hasBasicInfo = initialData.firstName && initialData.lastName;
      const startStep: Step = hasBasicInfo ? 3 : 1;
      setStep(startStep);
      setData({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        phone: initialData.phone || "",
        profilePicture: initialData.profilePicture || null,
      });
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, initialData]);

  const handleNext = () => {
    if (step === 1) {
      if (!data.firstName.trim() || !data.lastName.trim()) {
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData({ ...data, profilePicture: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAction = (action: "join" | "create") => {
    onComplete(data, action);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl bg-background shadow-2xl border border-border-soft overflow-hidden"
            >
              {/* Progress Bar */}
              <div className="h-1 bg-surface">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: step === 3 ? "100%" : `${(step / 3) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Step 1: Name and Last Name */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl font-bold text-text-main mb-2">
                        {t('onboarding.welcome')}
                      </h2>
                      <p className="text-text-secondary">
                        {t('onboarding.welcomeSubtitle')}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-main mb-2">
                          {t('onboarding.firstName')} *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                          <input
                            type="text"
                            value={data.firstName}
                            onChange={(e) =>
                              setData({ ...data, firstName: e.target.value })
                            }
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border-soft bg-background text-text-main focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                            placeholder={t('onboarding.firstNamePlaceholder')}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-main mb-2">
                          {t('onboarding.lastName')} *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                          <input
                            type="text"
                            value={data.lastName}
                            onChange={(e) =>
                              setData({ ...data, lastName: e.target.value })
                            }
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border-soft bg-background text-text-main focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                            placeholder={t('onboarding.lastNamePlaceholder')}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleNext}
                      disabled={!data.firstName.trim() || !data.lastName.trim()}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      <span>{t('onboarding.continue')}</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </motion.div>
                )}

                {/* Step 2: Photo and Phone */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl font-bold text-text-main mb-2">
                        {t('onboarding.profile')}
                      </h2>
                      <p className="text-text-secondary">
                        {t('onboarding.profileSubtitle')}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Photo Upload */}
                      <div>
                        <label className="block text-sm font-medium text-text-main mb-2">
                          {t('onboarding.profilePicture')}
                        </label>
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            {data.profilePicture ? (
                              <img
                                src={data.profilePicture}
                                alt="Profile"
                                className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center">
                                <User className="w-10 h-10 text-text-secondary" />
                              </div>
                            )}
                          </div>
                          <label className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                            <div className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-border-soft bg-background text-text-main hover:bg-surface cursor-pointer transition-colors">
                              <Upload className="w-5 h-5" />
                              <span className="text-sm font-medium">
                                {data.profilePicture ? t('onboarding.changePhoto') : t('onboarding.addPhoto')}
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-text-main mb-2">
                          {t('onboarding.phone')}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                          <input
                            type="tel"
                            value={data.phone}
                            onChange={(e) =>
                              setData({ ...data, phone: e.target.value })
                            }
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border-soft bg-background text-text-main focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                            placeholder={t('onboarding.phonePlaceholder')}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleBack}
                        className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg border-2 border-primary text-primary bg-transparent hover:bg-surface transition-colors font-medium"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        <span>{t('onboarding.back')}</span>
                      </button>
                      <button
                        onClick={handleNext}
                        className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary-light transition-colors font-medium"
                      >
                        <span>{t('onboarding.continue')}</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Action Selection */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl font-bold text-text-main mb-2">
                        {t('onboarding.almostThere')}
                      </h2>
                      <p className="text-text-secondary">
                        {t('onboarding.almostThereSubtitle')}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => handleAction("join")}
                        className="w-full flex items-center space-x-4 p-4 rounded-lg border-2 border-border-soft bg-background hover:border-primary hover:bg-surface transition-all group"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-semibold text-text-main">
                            {t('onboarding.joinGroup')}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {t('onboarding.joinGroupSubtitle')}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
                      </button>

                      <button
                        onClick={() => handleAction("create")}
                        className="w-full flex items-center space-x-4 p-4 rounded-lg border-2 border-border-soft bg-background hover:border-primary hover:bg-surface transition-all group"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Plus className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-semibold text-text-main">
                            {t('onboarding.createGroup')}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {t('onboarding.createGroupSubtitle')}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
                      </button>
                    </div>

                    <button
                      onClick={handleBack}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg border-2 border-primary text-primary bg-transparent hover:bg-surface transition-colors font-medium"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>{t('onboarding.back')}</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

