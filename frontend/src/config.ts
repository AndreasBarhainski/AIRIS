// API URL configuration
// In development, API calls will be proxied by Vite to the backend
// In production, they will be relative URLs that are handled by the backend serving the frontend

const isProduction = import.meta.env.PROD;

export const API_BASE_URL = isProduction ? "" : "";
export const COMFY_DEFAULT_URL = "http://localhost:8188";

// For WebSocket connection
export const getWsUrl = (comfyApiUrl: string, clientId: string) => {
  return comfyApiUrl.replace(/^http/, "ws") + `/ws?clientId=${clientId}`;
};
