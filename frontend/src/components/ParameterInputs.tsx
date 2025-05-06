import React from "react";
import ParameterInput from "./ParameterInput";
import SeedInput from "./SeedInput";
import type { ParameterType, StringInputMode } from "./ParameterInput";

export interface ParameterMeta {
  name: string;
  type: ParameterType | "seed" | "image";
  value: any;
  onChange: (value: any) => void;
  options?: { label: string; value: any }[]; // for enum
  inputMode?: StringInputMode;
  disabled?: boolean;
  seedMode?: string;
  onSeedModeChange?: (mode: string) => void;
  paramKey?: string;
}

interface ParameterInputsProps {
  parameters: ParameterMeta[];
  title?: string;
}

const ParameterInputs: React.FC<ParameterInputsProps> = ({
  parameters,
  title = "Parameters",
}) => {
  const renderParameter = (param: ParameterMeta) => {
    if (param.type === "seed") {
      return (
        <SeedInput
          name={param.name}
          value={param.value}
          mode={param.seedMode || "fixed"}
          onChange={param.onChange}
          onModeChange={(mode) => param.onSeedModeChange?.(mode)}
          disabled={param.disabled}
        />
      );
    }

    return (
      <ParameterInput
        value={param.value}
        onChange={param.onChange}
        type={param.type}
        label={param.name}
        options={param.options}
        inputMode={param.inputMode}
        disabled={param.disabled}
        paramKey={param.paramKey}
      />
    );
  };

  return (
    <div className="parameters-section">
      {title && <h2 className="parameter-group-title">{title}</h2>}
      <div className="parameters-list">
        {parameters.map((param, index) => (
          <div key={`${param.name}-${index}`} className="parameter-item">
            {renderParameter(param)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParameterInputs;
