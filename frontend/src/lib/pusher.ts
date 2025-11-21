import Pusher from "pusher-js";

const SOCKET_APP_KEY = import.meta.env.VITE_SOCKET_APP_KEY || "app-key-super-secreta";
const SOCKET_HOST = import.meta.env.VITE_SOCKET_HOST || "192.168.1.73";
const SOCKET_PORT = import.meta.env.VITE_SOCKET_PORT || "6001";
const SOCKET_USE_TLS = import.meta.env.VITE_SOCKET_USE_TLS === "true";

// Get auth token from localStorage or sessionStorage
const getAuthToken = (): string | null => {
  let token = localStorage.getItem("access_token");
  if (!token) {
    token = sessionStorage.getItem("access_token");
  }
  return token;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const pusher = new Pusher(SOCKET_APP_KEY, {
  wsHost: SOCKET_HOST,
  wsPort: parseInt(SOCKET_PORT),
  forceTLS: SOCKET_USE_TLS,
  enabledTransports: ["ws", "wss"],
  cluster: "eu",
  authEndpoint: `${API_URL}/pusher/auth/`,
  auth: {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  },
});

// Update auth headers when token changes
export const updatePusherAuth = () => {
  const token = getAuthToken();
  if (token) {
    pusher.config.auth = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }
};

