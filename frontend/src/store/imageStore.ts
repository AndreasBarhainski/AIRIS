import { create } from "zustand";
import { useSettingsStore } from "./settingsStore";

export interface ImageMeta {
  id: number;
  filename: string;
  prompt_id: string | null;
  workflow_id: string | null;
  config_id: string | null;
  created_at: string;
}

interface ImageState {
  images: ImageMeta[];
  comfyInputImages: string[];
  loading: boolean;
  error: string | null;
  loadImages: () => Promise<void>;
  loadComfyInputImages: () => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  deleteImage: (filename: string) => Promise<void>;
}

export const useImageStore = create<ImageState>((set) => ({
  images: [],
  comfyInputImages: [],
  loading: false,
  error: null,

  loadImages: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("http://localhost:4000/api/images");
      if (!response.ok) {
        throw new Error(`Failed to load images: ${response.statusText}`);
      }
      const data = await response.json();
      set({ images: data, loading: false });
    } catch (error: unknown) {
      console.error("Failed to load images:", error);
      const message = error instanceof Error ? error.message : String(error);
      set({ error: `Failed to load images: ${message}`, loading: false });
    }
  },

  loadComfyInputImages: async () => {
    set({ loading: true, error: null });
    try {
      const comfyApiUrl = useSettingsStore.getState().comfyApiUrl;
      const response = await fetch(
        `http://localhost:4000/api/comfy/input_images?comfyApiUrl=${encodeURIComponent(
          comfyApiUrl
        )}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details ||
            `Failed to load input images: ${response.statusText}`
        );
      }

      const filenames = await response.json();

      // Validate response format
      if (!Array.isArray(filenames)) {
        throw new Error("Invalid response format: expected array of filenames");
      }

      set({ comfyInputImages: filenames, loading: false });
    } catch (error: unknown) {
      console.error("Failed to load ComfyUI input images:", error);
      const message = error instanceof Error ? error.message : String(error);
      set({
        error: `Failed to load ComfyUI input images: ${message}`,
        loading: false,
        comfyInputImages: [],
      });
    }
  },

  uploadImage: async (file: File) => {
    set({ loading: true, error: null });
    try {
      const comfyApiUrl = useSettingsStore.getState().comfyApiUrl;
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(
        `http://localhost:4000/api/comfy/upload?comfyApiUrl=${encodeURIComponent(
          comfyApiUrl
        )}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || `Failed to upload image: ${response.statusText}`
        );
      }

      // Reload the input images list after successful upload
      await useImageStore.getState().loadComfyInputImages();
      set({ loading: false });
    } catch (error: unknown) {
      console.error("Failed to upload image:", error);
      const message = error instanceof Error ? error.message : String(error);
      set({
        error: `Failed to upload image: ${message}`,
        loading: false,
      });
    }
  },

  deleteImage: async (filename: string) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/images/${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete image: ${response.statusText}`);
      }

      // Update the images list after successful deletion
      set((state) => ({
        images: state.images.filter((img) => img.filename !== filename),
      }));
    } catch (error: unknown) {
      console.error("Failed to delete image:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete image: ${message}`);
    }
  },
}));
