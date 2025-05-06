import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GeneratePageState {
  selectedConfigId: number | null;
  paramValues: Record<string, any>;
  setSelectedConfigId: (id: number | null) => void;
  setParamValues: (values: Record<string, any>) => void;
  updateParamValue: (key: string, value: any) => void;
}

export const useGeneratePageStore = create<GeneratePageState>()(
  persist(
    (set) => ({
      selectedConfigId: null,
      paramValues: {},
      setSelectedConfigId: (id) => set({ selectedConfigId: id }),
      setParamValues: (values) => set({ paramValues: values }),
      updateParamValue: (key, value) =>
        set((state) => ({
          paramValues: {
            ...state.paramValues,
            [key]: value,
          },
        })),
    }),
    {
      name: "generate-page-storage",
    }
  )
);
