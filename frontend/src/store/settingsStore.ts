import { create } from "zustand";
import { persist } from "zustand/middleware";
import { COMFY_DEFAULT_URL } from "../config";

type SettingsState = {
  comfyApiUrl: string;
  progress: number;
  loading: boolean;
  setComfyApiUrl: (url: string) => void;
  setProgress: (progress: number) => void;
  setLoading: (loading: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      comfyApiUrl: COMFY_DEFAULT_URL,
      progress: 0,
      loading: false,
      setComfyApiUrl: (url) => set({ comfyApiUrl: url }),
      setProgress: (progress) => set({ progress }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: "settings-storage",
    }
  )
);
