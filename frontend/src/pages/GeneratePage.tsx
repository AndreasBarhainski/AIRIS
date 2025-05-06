import React, { useState, useRef } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { useSettingsStore } from "../store/settingsStore";
import { useConfigurationsStore } from "../store/configurationsStore";
import { useGeneratePageStore } from "../store/generatePageStore";
import ParameterInputs from "../components/ParameterInputs";
import type {
  ParameterType,
  StringInputMode,
} from "../components/ParameterInput";
import {
  getParameterTypeInfo,
  organizeParameters,
  formatParameterName,
  getNodeDisplayName,
} from "../utils/parameterUtils";
import "./GeneratePage.css";

const GeneratePage: React.FC = () => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const comfyApiUrl = useSettingsStore((state) => state.comfyApiUrl);
  const progress = useSettingsStore((state) => state.progress);
  const setProgress = useSettingsStore((state) => state.setProgress);
  const loading = useSettingsStore((state) => state.loading);
  const setLoading = useSettingsStore((state) => state.setLoading);
  const wsRef = useRef<WebSocket | null>(null);
  const clientId = useRef<string>(Math.random().toString(36).substring(2, 15));

  // Use the persistent store
  const selectedConfigId = useGeneratePageStore(
    (state) => state.selectedConfigId
  );
  const setSelectedConfigId = useGeneratePageStore(
    (state) => state.setSelectedConfigId
  );
  const paramValues = useGeneratePageStore((state) => state.paramValues);
  const setParamValues = useGeneratePageStore((state) => state.setParamValues);

  const {
    configurations,
    loading: configsLoading,
    loadConfigurations,
  } = useConfigurationsStore();
  const [workflowNodes, setWorkflowNodes] = useState<any[]>([]);
  const [workflowJson, setWorkflowJson] = useState<any>(null);

  // Load all configurations on mount
  React.useEffect(() => {
    loadConfigurations("");
  }, [loadConfigurations]);

  // When a configuration is selected, fetch its workflow JSON and set up parameter values
  React.useEffect(() => {
    if (selectedConfigId != null) {
      const config = configurations.find((c) => c.id === selectedConfigId);
      if (config && config.workflowId) {
        fetch(`http://localhost:4000/api/workflows/${config.workflowId}`)
          .then((res) => res.json())
          .then((json) => {
            setWorkflowJson(json);
            // Set up workflow nodes for parameter editing
            const nodes = Object.entries(json).map(
              ([id, node]: [string, any]) => ({
                id,
                class_type: node.class_type,
                title: node._meta?.title || node.class_type,
                inputs: node.inputs || {},
              })
            );
            setWorkflowNodes(nodes);

            // Only set initial parameter values if they don't exist
            if (!paramValues[config.workflowId]) {
              // Flatten parameterOverrides for paramValues
              const flatParamValues: Record<string, any> = {};
              if (config.parameterOverrides) {
                Object.entries(config.parameterOverrides).forEach(
                  ([nodeId, params]) => {
                    if (typeof params === "object" && params !== null) {
                      Object.entries(params).forEach(([param, value]) => {
                        flatParamValues[`${nodeId}.${param}`] = value;
                      });
                    }
                  }
                );
              }
              setParamValues(flatParamValues);
            }
          });
      } else {
        setWorkflowJson(null);
        setWorkflowNodes([]);
      }
    } else {
      setWorkflowJson(null);
      setWorkflowNodes([]);
    }
  }, [selectedConfigId, configurations, setParamValues]);

  // Helper to get selected config
  const selectedConfig =
    configurations.find((c) => c.id === selectedConfigId) || null;
  // Helper to get exposed parameters (nodeId -> [paramName])
  const exposedParams = selectedConfig?.exposedParameters || {};

  // Helper to render parameter inputs
  const renderParameterInputs = () => {
    if (!selectedConfig) {
      return (
        <p className="empty-state-text">
          Select a configuration to edit parameters.
        </p>
      );
    }
    if (!workflowNodes.length) {
      return <p className="empty-state-text">No workflow nodes loaded.</p>;
    }

    const inputModes = selectedConfig.inputModes || {};
    const parameterOrder = Array.isArray(selectedConfig.parameterOrder)
      ? selectedConfig.parameterOrder
      : [];
    const categories = organizeParameters(workflowNodes, exposedParams);

    // Build a map of all exposed parameters for quick lookup
    const exposedParamSet = new Set(
      Object.entries(exposedParams).flatMap(([nodeId, params]) =>
        (params || []).map((param) => `${nodeId}.${param}`)
      )
    );

    // Build a map of parameter info for quick access
    const paramInfoMap = new Map();
    Object.values(categories)
      .flat()
      .forEach((p) => {
        paramInfoMap.set(`${p.nodeId}.${p.param}`, p);
      });

    // Use parameterOrder if present, else fallback to all exposed params
    const orderedKeys = parameterOrder.length
      ? parameterOrder.filter((key) => exposedParamSet.has(key))
      : Array.from(exposedParamSet);

    // Group ordered parameters by node for visual grouping
    const nodeGroups = new Map();
    orderedKeys.forEach((key) => {
      const [nodeId, param] = key.split(".");
      if (!nodeGroups.has(nodeId)) nodeGroups.set(nodeId, []);
      const p = paramInfoMap.get(key);
      if (p) nodeGroups.get(nodeId).push(p);
    });

    const createParameterInput = (
      nodeId: string,
      param: string,
      value: any,
      type: ParameterType | "seed" | "image"
    ) => {
      const nodeParamKey = `${nodeId}.${param}`;
      const { inputMode } = getParameterTypeInfo(param, value);
      const overriddenInputMode = inputModes[nodeId]?.[param];
      const seedMode =
        type === "seed"
          ? paramValues[`${nodeId}.${param}_mode`] || "fixed"
          : undefined;

      return {
        // Only show parameter name for non-image inputs
        name: type === "image" ? "" : formatParameterName(param),
        type,
        value:
          type === "image"
            ? paramValues[nodeParamKey] || value
            : paramValues[nodeParamKey] ?? value,
        onChange: (v: any) => {
          if (workflowJson?.[nodeId]?.inputs) {
            workflowJson[nodeId].inputs[param] = v;
          }
          useGeneratePageStore.getState().updateParamValue(nodeParamKey, v);
        },
        inputMode: overriddenInputMode || inputMode,
        disabled: false,
        seedMode,
        onSeedModeChange:
          type === "seed"
            ? (mode: string) => {
                useGeneratePageStore
                  .getState()
                  .updateParamValue(`${nodeParamKey}_mode`, mode);
                if (mode === "random") {
                  useGeneratePageStore
                    .getState()
                    .updateParamValue(
                      nodeParamKey,
                      Math.floor(Math.random() * 4294967296)
                    );
                }
              }
            : undefined,
        paramKey: nodeParamKey,
      };
    };

    return (
      <div className="parameters-list">
        {Array.from(nodeGroups.entries()).map(([nodeId, params]) => {
          const node = workflowNodes.find((n) => n.id === nodeId);
          const nodeTitle = node?.title || node?.class_type || "";
          return (
            <div key={nodeId}>
              <ParameterInputs
                title={nodeTitle}
                parameters={params.map((p: any) =>
                  createParameterInput(
                    p.nodeId,
                    p.param,
                    p.value,
                    p.type as ParameterType | "seed" | "image"
                  )
                )}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const handleGenerate = async () => {
    if (!selectedConfig || !workflowJson) return;
    setLoading(true);
    setProgress(0);
    setGeneratedImage(null);

    // 1. Open WebSocket for real-time progress
    const wsUrl =
      comfyApiUrl.replace(/^http/, "ws") + `/ws?clientId=${clientId.current}`;
    wsRef.current = new window.WebSocket(wsUrl);
    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "progress" && msg.data && msg.data.prompt_id) {
          if (msg.data.max > 0) {
            setProgress(Math.round((msg.data.value / msg.data.max) * 100));
          }
        }
      } catch (e) {}
    };

    try {
      // 1. Manipulate the workflow JSON
      const manipulatedWorkflow = JSON.parse(JSON.stringify(workflowJson)); // deep clone
      Object.entries(paramValues).forEach(([key, value]) => {
        if (value === undefined) return; // Only skip truly undefined values
        const [nodeId, paramName] = key.split(".");
        if (manipulatedWorkflow[nodeId]?.inputs && !key.endsWith("_mode")) {
          manipulatedWorkflow[nodeId].inputs[paramName] = value;
        }
      });
      console.log("Manipulated workflow sent to API:", manipulatedWorkflow);

      // 2. Send the manipulated workflow JSON to the backend
      const response = await fetch("http://localhost:4000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comfyApiUrl,
          client_id: clientId.current,
          workflow: manipulatedWorkflow,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to start image generation");
      }
      const { prompt_id } = await response.json();
      if (!prompt_id) throw new Error("No prompt_id returned");

      // 3. Poll for completion (as before)
      let polling = true;
      const BACKEND_URL = "http://localhost:4000";
      while (polling) {
        await new Promise((r) => setTimeout(r, 1000));
        const progressRes = await fetch(
          `http://localhost:4000/api/progress/${prompt_id}?comfyApiUrl=${encodeURIComponent(
            comfyApiUrl
          )}`
        );
        if (!progressRes.ok) throw new Error("Failed to poll progress");
        const progressData = await progressRes.json();
        if (progressData.status === "error") {
          throw new Error(progressData.error || "Unknown error");
        }
        if (progressData.status === "complete" && progressData.imageUrl) {
          // If the imageUrl is a relative path, prepend the backend URL
          const imgUrl = progressData.imageUrl.startsWith("http")
            ? progressData.imageUrl
            : BACKEND_URL + progressData.imageUrl;
          setGeneratedImage(imgUrl);
          // Update seed(s) if needed
          setParamValues((prev: Record<string, any>) => {
            const updated = { ...prev };
            Object.entries(prev).forEach(([key, value]) => {
              if (key.endsWith("seed")) {
                const mode = prev[`${key}_mode`] || "fixed";
                if (mode === "random") {
                  updated[key] = Math.floor(Math.random() * 4294967296); // 32-bit unsigned int
                } else if (mode === "increase") {
                  updated[key] = (parseInt(String(value), 10) || 0) + 1;
                } else if (mode === "decrease") {
                  updated[key] = (parseInt(String(value), 10) || 0) - 1;
                }
                // fixed: do nothing
              }
            });
            return updated;
          });
          polling = false;
        }
      }
    } catch (error) {
      alert("Error generating image");
    } finally {
      setLoading(false);
      setProgress(0);
      wsRef.current?.close();
    }
  };

  return (
    <div className="generate-page">
      <div className="sidebar">
        <div className="sidebar-content">
          <Dropdown
            value={selectedConfigId}
            options={configurations.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
            onChange={(e) => setSelectedConfigId(e.value)}
            placeholder="Select configuration"
            className="config-dropdown"
          />
          {renderParameterInputs()}
        </div>
        <Button
          label="Generate"
          icon="pi pi-play"
          onClick={handleGenerate}
          disabled={loading || !selectedConfigId}
          className="generate-button p-button-primary"
        />
      </div>

      <div className="main-content">
        {loading ? (
          <div className="loading-state">
            <ProgressSpinner />
            <p>Generating image...</p>
          </div>
        ) : generatedImage ? (
          <div className="generated-image-container">
            <img
              src={generatedImage}
              alt="Generated"
              className="generated-image"
            />
          </div>
        ) : (
          <p className="empty-state-text">No image generated yet.</p>
        )}
      </div>
    </div>
  );
};

export default GeneratePage;
