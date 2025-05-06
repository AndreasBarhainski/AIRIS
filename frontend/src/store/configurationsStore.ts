import { create } from "zustand";
import type { StringInputMode } from "../components/ParameterInput";

export interface Configuration {
  id: number;
  workflowId: string;
  name: string;
  description?: string;
  parameterOverrides: Record<string, any>;
  exposedParameters: { [nodeId: string]: string[] };
  inputModes?: { [nodeId: string]: { [param: string]: StringInputMode } };
  parameterOrder?: string[] | { [nodeId: string]: string[] };
}

interface ConfigurationsStore {
  configurations: Configuration[];
  loading: boolean;
  error: string | null;
  loadConfigurations: (workflowId: string) => Promise<void>;
  createConfiguration: (config: Omit<Configuration, "id">) => Promise<void>;
  updateConfiguration: (
    id: number,
    config: Partial<Configuration>
  ) => Promise<void>;
  deleteConfiguration: (id: number) => Promise<void>;
}

// Utility to validate/cast inputModes
function sanitizeInputModes(inputModes: any): {
  [nodeId: string]: { [param: string]: StringInputMode };
} {
  const sanitized: { [nodeId: string]: { [param: string]: StringInputMode } } =
    {};
  if (!inputModes || typeof inputModes !== "object") return sanitized;
  Object.entries(inputModes).forEach(([nodeId, params]) => {
    if (typeof params === "object" && params !== null) {
      Object.entries(params).forEach(([param, mode]) => {
        if (mode === "single" || mode === "multi") {
          if (!sanitized[nodeId]) sanitized[nodeId] = {};
          sanitized[nodeId][param] = mode;
        }
      });
    }
  });
  return sanitized;
}

export const useConfigurationsStore = create<ConfigurationsStore>(
  (
    set: (partial: Partial<ConfigurationsStore>) => void,
    get: () => ConfigurationsStore
  ) => ({
    configurations: [],
    loading: false,
    error: null,
    loadConfigurations: async (workflowId: string) => {
      set({ loading: true, error: null });
      try {
        let url = "http://localhost:4000/api/configurations";
        if (workflowId) {
          url += `/${workflowId}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load configurations");
        const data: Configuration[] = await res.json();
        // Sanitize inputModes for all configs
        const sanitized = data.map((config) => ({
          ...config,
          inputModes: sanitizeInputModes(config.inputModes),
        }));
        set({ configurations: sanitized, loading: false });
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },
    createConfiguration: async (config: Omit<Configuration, "id">) => {
      set({ loading: true, error: null });
      try {
        const res = await fetch("http://localhost:4000/api/configurations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        if (!res.ok) throw new Error("Failed to create configuration");
        await get().loadConfigurations(config.workflowId);
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },
    updateConfiguration: async (id: number, config: Partial<Configuration>) => {
      set({ loading: true, error: null });
      try {
        const res = await fetch(
          `http://localhost:4000/api/configurations/${id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
          }
        );
        if (!res.ok) throw new Error("Failed to update configuration");
        // Find workflowId from current state
        const current = get().configurations.find(
          (c: Configuration) => c.id === id
        );
        if (current) await get().loadConfigurations(current.workflowId);
        else set({ loading: false });
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },
    deleteConfiguration: async (id: number) => {
      set({ loading: true, error: null });
      try {
        // Find workflowId from current state
        const current = get().configurations.find(
          (c: Configuration) => c.id === id
        );
        if (!current) throw new Error("Configuration not found");
        const res = await fetch(
          `http://localhost:4000/api/configurations/${id}`,
          {
            method: "DELETE",
          }
        );
        if (!res.ok) throw new Error("Failed to delete configuration");
        await get().loadConfigurations(current.workflowId);
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },
  })
);
