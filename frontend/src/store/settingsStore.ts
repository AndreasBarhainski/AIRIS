import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  comfyApiUrl: string;
  progress: number;
  loading: boolean;
  setComfyApiUrl: (url: string) => void;
  setProgress: (progress: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      comfyApiUrl: "http://localhost:8188",
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
