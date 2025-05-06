import React from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import FileInput from "./FileInput";
import ComfyImageInput from "./ComfyImageInput";
import "./ParameterInput.css";

export type ParameterType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "file"
  | "image";
export type StringInputMode = "single" | "multi";

interface ParameterInputProps {
  value: any;
  onChange: (value: any) => void;
  type: ParameterType;
  label?: string;
  options?: { label: string; value: any }[]; // for enum
  inputMode?: StringInputMode; // for string
  disabled?: boolean;
  paramKey?: string;
}

const ParameterInput: React.FC<ParameterInputProps> = ({
  value,
  onChange,
  type,
  label,
  options,
  inputMode = "single",
  disabled = false,
  paramKey,
}) => {
  const renderInput = () => {
    switch (type) {
      case "string":
        return inputMode === "multi" ? (
          <InputTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            disabled={disabled}
            className="w-full"
          />
        ) : (
          <InputText
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full"
          />
        );
      case "number":
        return (
          <InputNumber
            value={value}
            onValueChange={(e) => onChange(e.value)}
            disabled={disabled}
            className="w-full"
            useGrouping={false}
          />
        );
      case "boolean":
        return (
          <Checkbox
            checked={value}
            onChange={(e) => onChange(e.checked)}
            disabled={disabled}
          />
        );
      case "enum":
        return (
          <Dropdown
            value={value}
            options={options}
            onChange={(e) => onChange(e.value)}
            disabled={disabled}
            className="w-full"
          />
        );
      case "file":
        return (
          <FileInput
            value={value}
            onChange={onChange}
            disabled={disabled}
            accept="*/*"
          />
        );
      case "image":
        return (
          <ComfyImageInput
            value={value}
            onChange={onChange}
            disabled={disabled}
            label={label}
            paramKey={paramKey}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="parameter-input-container">
      {type !== "image" && label && (
        <label className="parameter-label">{label}</label>
      )}
      {renderInput()}
    </div>
  );
};

export default ParameterInput;
