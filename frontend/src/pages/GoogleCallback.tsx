import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import OnboardingModal from "../components/OnboardingModal";
import { authAPI, userAPI } from "../lib/api";
import { handleApiError } from "../utils/errorHandler";
import { useErrorModal } from "../hooks/useErrorModal";
import ErrorModal from "../components/ErrorModal";

export default function GoogleCallback() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const { isOpen, errorData, showError, hideError } = useErrorModal();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      handleGoogleLogin(code);
    } else {
      // Check if there's an error parameter from Google
      const error = searchParams.get("error");
      if (error) {
        showError({
          title: t("errors.authenticationError"),
          message: t("errors.authFailed"),
        });
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        navigate("/login");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleGoogleLogin = async (code: string) => {
    try {
      setLoading(true);
      const data = await authAPI.googleAuth(code);
      
      console.log("Google auth response:", data);
      
      // Get rememberMe preference from sessionStorage
      const rememberMeStr = sessionStorage.getItem('google_remember_me');
      const rememberMe = rememberMeStr === 'true';
      sessionStorage.removeItem('google_remember_me'); // Clean up
      
      // Store tokens using the rememberMe preference
      setTokens(data.access, data.refresh, rememberMe);

      // Store user data for onboarding modal
      setUserData(data.user);

      // Update user context
      if (data.user) {
        setUser(data.user);
      }

      // Check if profile is complete
      // profile_complete can be false, undefined, or true
      const isProfileComplete = data.profile_complete === true;
      console.log("Profile complete:", isProfileComplete);
      console.log("User data:", data.user);
      
      // Always show onboarding for new Google logins unless explicitly completed
      if (!isProfileComplete) {
        console.log("Showing onboarding modal");
        setShowOnboarding(true);
        setLoading(false);
      } else {
        console.log("Profile already complete, going to dashboard");
        // Profile complete, go to dashboard
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Google login failed:", error);
      console.error("Error details:", error?.response?.data || error?.message);
      
      // Check if it's a network error (backend not running)
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.message?.includes('CORS')) {
        showError({
          title: t("errors.networkError"),
          message: t("errors.backendNotRunning"),
        });
      } else {
        handleApiError(error, showError);
      }
      // Don't auto-redirect, let user see the error
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async (
    onboardingData: {
      firstName: string;
      lastName: string;
      phone: string;
      profilePicture: string | null;
    },
    action: "join" | "create"
  ) => {
    try {
      // Update profile - mark as complete after choosing action
      const updateData: any = {
        profile_complete: true,
      };

      // Only update if different from existing data or if not set
      if (onboardingData.firstName && onboardingData.firstName !== userData?.first_name) {
        updateData.first_name = onboardingData.firstName;
      }
      if (onboardingData.lastName && onboardingData.lastName !== userData?.last_name) {
        updateData.last_name = onboardingData.lastName;
      }
      if (onboardingData.phone && onboardingData.phone !== userData?.phone) {
        updateData.phone = onboardingData.phone;
      }
      if (onboardingData.profilePicture && onboardingData.profilePicture !== userData?.profile_picture) {
        updateData.profile_picture = onboardingData.profilePicture;
      }

      await userAPI.updateProfile(updateData);

      // Refresh user data
      const updatedUserData = await userAPI.getMe();
      setUser(updatedUserData);
      setUserData(updatedUserData);

      // Navigate based on action
      if (action === "join") {
        navigate("/dashboard");
      } else {
        navigate("/groups/new");
      }
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      handleApiError(error, showError);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-main">{t("errors.processingLogin")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OnboardingModal
        isOpen={showOnboarding && !loading}
        onComplete={handleOnboardingComplete}
        initialData={{
          firstName: userData?.first_name || "",
          lastName: userData?.last_name || "",
          phone: userData?.phone || "",
          profilePicture: userData?.profile_picture || null,
        }}
      />
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

