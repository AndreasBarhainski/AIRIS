import React, { useState, useEffect, useRef } from "react";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { useConfigurationsStore } from "../store/configurationsStore";
import type { Configuration } from "../store/configurationsStore";
import ParameterInput from "../components/ParameterInput";
import type {
  ParameterType,
  StringInputMode,
} from "../components/ParameterInput";
import ParameterInputs from "../components/ParameterInputs";
import "./EditorPage.css";

interface WorkflowSummary {
  name?: string;
  nodeCount: number;
  parameters: string[];
  filename: string;
}

type Mode = "loading" | "creating" | "editing";

const EditorPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>("loading");
  const [allWorkflows, setAllWorkflows] = useState<WorkflowSummary[]>([]);
  const [workflowNodes, setWorkflowNodes] = useState<any[]>([]);
  const [selectedParams, setSelectedParams] = useState<{
    [nodeId: string]: string[];
  }>({});
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [newConfig, setNewConfig] = useState<{
    name: string;
    description: string;
    workflowId: string | null;
  }>({ name: "", description: "", workflowId: null });
  const {
    configurations,
    loading,
    error: configError,
    loadConfigurations,
    createConfiguration,
    deleteConfiguration,
    updateConfiguration,
  } = useConfigurationsStore();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const importBtnRef = useRef<HTMLButtonElement>(null);
  const [paramValues, setParamValues] = useState<{
    [nodeId: string]: { [param: string]: any };
  }>({});
  const [inputModes, setInputModes] = useState<{
    [nodeId: string]: { [param: string]: StringInputMode };
  }>({});
  const [seedModes, setSeedModes] = useState<Record<string, string>>({});
  const [parameterOrder, setParameterOrder] = useState<string[]>([]);

  // Fetch all workflows on mount
  useEffect(() => {
    const fetchWorkflows = async () => {
      const res = await fetch("/api/workflows");
      const data = await res.json();
      setAllWorkflows(data);
    };
    fetchWorkflows();
    loadConfigurations(""); // Load all configurations
  }, [loadConfigurations]);

  // When a workflow is selected for new config, fetch its nodes
  useEffect(() => {
    if (newConfig.workflowId) {
      fetch(`/api/workflows/${newConfig.workflowId}`)
        .then((res) => res.json())
        .then((json) => {
          const nodes = Object.entries(json).map(
            ([id, node]: [string, any]) => ({
              id,
              class_type: node.class_type,
              title: node._meta?.title || node.class_type,
              inputs: node.inputs || {},
            })
          );
          setWorkflowNodes(nodes);

          // Scroll to top when nodes are loaded
          window.scrollTo(0, 0);
        });
    } else {
      setWorkflowNodes([]);
    }
  }, [newConfig.workflowId]);

  // Handlers for mode switching
  const handleStartCreate = () => {
    setMode("creating");
    setEditingConfigId(null);
    setNewConfig({ name: "", description: "", workflowId: null });
    setSelectedParams({});
    window.scrollTo(0, 0);
  };

  const handleCancel = () => {
    setMode("loading");
    setEditingConfigId(null);
    setNewConfig({ name: "", description: "", workflowId: null });
    setSelectedParams({});
    setSuccessMsg(null);
    window.scrollTo(0, 0);
  };

  // Load config for editing
  const handleLoadConfig = (config: Configuration) => {
    setEditingConfigId(config.id);
    setNewConfig({
      name: config.name,
      description: config.description || "",
      workflowId: config.workflowId,
    });
    setSelectedParams(config.exposedParameters || {});
    setParamValues(config.parameterOverrides || {});

    // MIGRATION: convert parameterOrder to flat array if needed
    let flatOrder: string[] = [];
    if (Array.isArray(config.parameterOrder)) {
      flatOrder = config.parameterOrder;
    } else if (
      config.parameterOrder &&
      typeof config.parameterOrder === "object"
    ) {
      flatOrder = Object.entries(config.parameterOrder).flatMap(
        ([nodeId, params]) => params.map((param) => `${nodeId}.${param}`)
      );
    }
    // If still empty, build from selectedParams/exposedParameters
    if (flatOrder.length === 0 && config.exposedParameters) {
      flatOrder = Object.entries(config.exposedParameters).flatMap(
        ([nodeId, params]) => params.map((param) => `${nodeId}.${param}`)
      );
    }
    console.log("[LOAD] parameterOrder from config:", config.parameterOrder);
    console.log("[LOAD] flatOrder used in state:", flatOrder);
    setParameterOrder(flatOrder);

    // Validate/cast inputModes to correct type
    const loadedInputModes: {
      [nodeId: string]: { [param: string]: StringInputMode };
    } = {};

    if (config.inputModes) {
      Object.entries(config.inputModes).forEach(([nodeId, params]) => {
        Object.entries(params).forEach(([param, mode]) => {
          if (mode === "single" || mode === "multi") {
            if (!loadedInputModes[nodeId]) loadedInputModes[nodeId] = {};
            loadedInputModes[nodeId][param] = mode;
          }
        });
      });
    }

    setInputModes(loadedInputModes);
    setMode("editing");

    // Scroll to top when loading config
    window.scrollTo(0, 0);
  };

  // When selecting/deselecting parameters, update global order
  const handleParameterSelect = (
    nodeId: string,
    param: string,
    checked: boolean
  ) => {
    const key = `${nodeId}.${param}`;
    setSelectedParams((prev) => {
      const current = prev[nodeId] || [];
      return {
        ...prev,
        [nodeId]: checked
          ? [...current, param]
          : current.filter((p) => p !== param),
      };
    });
    setParamValues((prev) => {
      return {
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          ...(checked
            ? {
                [param]: workflowNodes.find((n) => n.id === nodeId)?.inputs[
                  param
                ],
              }
            : {}),
        },
      };
    });
    setParameterOrder((prev) => {
      if (checked) {
        if (!prev.includes(key)) return [...prev, key];
        return prev;
      } else {
        return prev.filter((k) => k !== key);
      }
    });
  };

  // Move parameter up/down in global order
  const moveParam = (key: string, direction: -1 | 1) => {
    setParameterOrder((prev) => {
      const idx = prev.indexOf(key);
      if (idx === -1) return prev;
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const newOrder = [...prev];
      [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
      return newOrder;
    });
  };

  // Save or update config: persist parameterOrder as a flat array
  const handleSaveConfig = async () => {
    if (!newConfig.workflowId || !newConfig.name) return;

    // Filter inputModes to only include exposed parameters
    const filteredInputModes: {
      [nodeId: string]: { [param: string]: StringInputMode };
    } = {};

    Object.entries(selectedParams).forEach(([nodeId, params]) => {
      params.forEach((param) => {
        const mode = inputModes[nodeId]?.[param];
        if (mode === "single" || mode === "multi") {
          if (!filteredInputModes[nodeId]) filteredInputModes[nodeId] = {};
          filteredInputModes[nodeId][param] = mode as StringInputMode;
        }
      });
    });

    console.log("[SAVE] parameterOrder to be saved:", parameterOrder);
    const configPayload = {
      workflowId: newConfig.workflowId,
      name: newConfig.name,
      description: newConfig.description,
      parameterOverrides: paramValues,
      exposedParameters: selectedParams,
      inputModes: filteredInputModes,
      parameterOrder,
    };

    if (editingConfigId) {
      await updateConfiguration(editingConfigId, configPayload);
      setSuccessMsg("Configuration updated successfully!");
    } else {
      await createConfiguration(configPayload);
      setSuccessMsg("Configuration created successfully!");
    }

    setEditingConfigId(null);
    setNewConfig({ name: "", description: "", workflowId: null });
    setSelectedParams({});
    setParamValues({});
    setInputModes({});
    setMode("loading");
    loadConfigurations("");

    // Scroll to top after saving
    window.scrollTo(0, 0);
  };

  const handleDeleteConfig = async (id: number) => {
    await deleteConfiguration(id);
    loadConfigurations("");
    setSuccessMsg("Configuration deleted successfully!");
    window.scrollTo(0, 0);
  };

  // --- Parameter selection helpers ---
  const handleSelectAll = (nodeId: string) => {
    const node = workflowNodes.find((n: any) => n.id === nodeId);
    if (node) {
      setSelectedParams((prev) => ({
        ...prev,
        [nodeId]: Object.keys(node.inputs),
      }));
    }
  };

  const handleDeselectAll = (nodeId: string) => {
    setSelectedParams((prev) => ({ ...prev, [nodeId]: [] }));
  };

  // Render the configuration form (split-screen)
  const renderConfigForm = () => (
    <div className="editor-form">
      <Button
        label="Back to List"
        className="p-button-text editor-back-button"
        onClick={handleCancel}
      />
      <h5 className="editor-form-title">
        {mode === "editing" ? "Edit Configuration" : "Create New Configuration"}
      </h5>
      {/* Configuration Details */}
      <div className="editor-form-group">
        <div className="editor-section-title">Configuration Details</div>
        <div className="editor-form-row">
          <InputText
            placeholder="Name *"
            value={newConfig.name}
            onChange={(e) =>
              setNewConfig((c) => ({ ...c, name: e.target.value }))
            }
            className={`editor-form-field name ${
              !newConfig.name ? "p-invalid" : ""
            }`}
          />
          <InputText
            placeholder="Description"
            value={newConfig.description}
            onChange={(e) =>
              setNewConfig((c) => ({ ...c, description: e.target.value }))
            }
            className="editor-form-field description"
          />
        </div>
        {!newConfig.name && (
          <div className="editor-form-error">Name is required</div>
        )}
      </div>
      {/* Workflow Selection */}
      <div className="editor-form-group">
        <div className="editor-section-title">Workflow Selection</div>
        {allWorkflows.length === 0 ? (
          <div className="editor-no-workflows">
            <span>No workflows available.</span>
            <Button
              label="Import Workflow"
              icon="pi pi-upload"
              className="p-button-text"
              onClick={() => importBtnRef.current?.click()}
            />
          </div>
        ) : (
          <Dropdown
            value={newConfig.workflowId}
            options={allWorkflows.map((w) => ({
              label: `${w.name} (${w.filename})`,
              value: w.filename,
            }))}
            onChange={(e) =>
              setNewConfig((c) => ({ ...c, workflowId: e.value }))
            }
            placeholder="Select a workflow"
            className="editor-workflow-dropdown"
          />
        )}
      </div>
      {/* Split Screen Section */}
      <div className="editor-split-container">
        {/* Left: Node/Parameter Selection */}
        <div className="editor-split-left">
          <div className="editor-section-title">Nodes & Parameters</div>
          {workflowNodes.length > 0 ? (
            <div className="editor-nodes">
              {workflowNodes
                .map((node) => {
                  // Only keep parameters that are selectable
                  const selectableParams = Object.entries(node.inputs).filter(
                    ([param, value]) =>
                      typeof value === "string" ||
                      typeof value === "number" ||
                      typeof value === "boolean"
                  );
                  if (selectableParams.length === 0) return null;
                  return (
                    <div key={node.id} className="editor-node">
                      <div className="editor-node-title">
                        {node.title} (ID: {node.id})
                      </div>
                      <ul className="editor-param-list">
                        {selectableParams.map(([param, value]) => {
                          let paramType: ParameterType | "seed" | "image" =
                            param === "seed"
                              ? "seed"
                              : param === "image" || param.includes("image")
                              ? "image"
                              : typeof value === "number"
                              ? "number"
                              : typeof value === "boolean"
                              ? "boolean"
                              : "string";
                          const isSelected =
                            selectedParams[node.id]?.includes(param) || false;
                          const inputMode =
                            inputModes[node.id]?.[param] || "single";
                          let seedMode =
                            paramType === "seed"
                              ? seedModes[`${node.id}.${param}`] || "fixed"
                              : undefined;
                          return (
                            <li key={param} className="editor-param-item">
                              <div className="editor-param-header">
                                <label className="editor-param-label">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      handleParameterSelect(
                                        node.id,
                                        param,
                                        e.target.checked
                                      );
                                    }}
                                  />
                                  {param}
                                </label>
                                {isSelected && paramType === "string" && (
                                  <div className="editor-param-type">
                                    <span className="editor-param-type-label">
                                      Input Type:
                                    </span>
                                    <Dropdown
                                      value={inputMode}
                                      options={[
                                        {
                                          label: "Single Line",
                                          value: "single",
                                        },
                                        { label: "Multi Line", value: "multi" },
                                      ]}
                                      onChange={(e) => {
                                        setInputModes((prev) => {
                                          const nodeInputs =
                                            prev[node.id] || {};
                                          return {
                                            ...prev,
                                            [node.id]: {
                                              ...nodeInputs,
                                              [param]: e.value,
                                            },
                                          };
                                        });
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          ) : (
            <Message
              severity="info"
              text="Select a workflow to expose parameters."
            />
          )}
        </div>
        {/* Right: Selected Parameter Inputs */}
        <div className="editor-split-right">
          <div className="editor-section-title">Selected Parameter Inputs</div>
          {parameterOrder.length === 0 ? (
            <div className="editor-no-params">No parameters selected.</div>
          ) : (
            <ul className="editor-selected-param-list">
              {parameterOrder.map((key, idx) => {
                const [nodeId, ...paramParts] = key.split(".");
                const param = paramParts.join(".");
                const node = workflowNodes.find((n) => n.id === nodeId);
                if (!node || !selectedParams[nodeId]?.includes(param))
                  return null;
                const value = node.inputs[param];
                let paramType: ParameterType | "seed" | "image" =
                  param === "seed"
                    ? "seed"
                    : param === "image" || param.includes("image")
                    ? "image"
                    : typeof value === "number"
                    ? "number"
                    : typeof value === "boolean"
                    ? "boolean"
                    : "string";
                const inputMode = inputModes[nodeId]?.[param] || "single";
                let seedMode =
                  paramType === "seed"
                    ? seedModes[`${nodeId}.${param}`] || "fixed"
                    : undefined;
                return (
                  <li key={key} className="editor-selected-param-item">
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span className="editor-selected-param-label">
                        {node.title} ({node.id}) — {param}
                      </span>
                      <Button
                        icon="pi pi-arrow-up"
                        className="p-button-text p-button-sm"
                        onClick={() => moveParam(key, -1)}
                        disabled={idx === 0}
                        type="button"
                        tabIndex={0}
                      />
                      <Button
                        icon="pi pi-arrow-down"
                        className="p-button-text p-button-sm"
                        onClick={() => moveParam(key, 1)}
                        disabled={idx === parameterOrder.length - 1}
                        type="button"
                        tabIndex={0}
                      />
                    </div>
                    <ParameterInputs
                      parameters={[
                        {
                          name: param,
                          type: paramType,
                          value: paramValues[nodeId]?.[param] ?? value,
                          onChange: (v) =>
                            setParamValues((prev) => ({
                              ...prev,
                              [nodeId]: {
                                ...prev[nodeId],
                                [param]: v,
                              },
                            })),
                          inputMode,
                          seedMode,
                          onSeedModeChange: (mode) =>
                            setSeedModes((prev) => ({
                              ...prev,
                              [`${nodeId}.${param}`]: mode,
                            })),
                        },
                      ]}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="editor-actions-footer">
        <Button
          label={
            mode === "editing" ? "Update Configuration" : "Save Configuration"
          }
          onClick={async () => {
            await handleSaveConfig();
          }}
          disabled={!newConfig.name || !newConfig.workflowId}
          className="editor-save-button"
        />
        <Button
          label="Cancel"
          className="p-button-text editor-cancel-button"
          onClick={handleCancel}
        />
      </div>
    </div>
  );

  // Render the loading mode content
  const renderLoadingMode = () => (
    <div className="editor-loading">
      <div className="editor-loading-header">
        <h5 className="editor-loading-title">Configurations</h5>
        <Button
          label="Create New Configuration"
          icon="pi pi-plus"
          className="p-button-primary editor-create-button"
          onClick={handleStartCreate}
        />
      </div>

      {successMsg && (
        <Message
          severity="success"
          text={successMsg}
          className="editor-success-message"
        />
      )}

      {configError && (
        <Message severity="error" text={configError} className="editor-error" />
      )}

      {loading ? (
        <p className="editor-loading-message">Loading configurations...</p>
      ) : configurations.length === 0 ? (
        <div className="editor-empty-state">
          <p>No configurations found. Create a new one to get started.</p>
        </div>
      ) : (
        <ul className="editor-config-list">
          {configurations.map((config) => (
            <li key={config.id} className="editor-config-item">
              <div className="editor-config-name">{config.name}</div>
              <div className="editor-config-description">
                {config.description}
              </div>
              <div className="editor-config-actions">
                <Button
                  label="Load"
                  icon="pi pi-upload"
                  className="p-button-text"
                  onClick={() => handleLoadConfig(config)}
                />
                <Button
                  label="Delete"
                  icon="pi pi-trash"
                  className="p-button-text p-button-danger"
                  onClick={() => handleDeleteConfig(config.id)}
                />
              </div>
              <div className="editor-config-meta">
                Workflow: {config.workflowId}
                <br />
                Exposed:{" "}
                {Object.entries(config.exposedParameters)
                  .map(
                    ([nodeId, params]) => `${nodeId}: [${params.join(", ")}]`
                  )
                  .join("; ")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="editor-page-container">
      <div className="editor-page">
        <Card className="editor-card">
          {mode === "creating" || mode === "editing"
            ? renderConfigForm()
            : renderLoadingMode()}
        </Card>
      </div>
    </div>
  );
};

export default EditorPage;
