import React from "react";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import "./SeedInput.css";

export interface SeedInputProps {
  name: string;
  value: number;
  mode: string;
  onChange: (value: number) => void;
  onModeChange: (mode: string) => void;
  disabled?: boolean;
}

const SEED_MODES = [
  { label: "Fixed", value: "fixed" },
  { label: "Random", value: "random" },
  { label: "Increase", value: "increase" },
  { label: "Decrease", value: "decrease" },
];

const SeedInput: React.FC<SeedInputProps> = ({
  name,
  value,
  mode,
  onChange,
  onModeChange,
  disabled = false,
}) => {
  const generateRandomSeed = () => {
    onChange(Math.floor(Math.random() * 1000000000));
  };

  return (
    <div className="seed-input-container">
      <label className="parameter-label">{name}</label>
      <div className="seed-controls">
        <div className="seed-number-container">
          <InputNumber
            value={value}
            onValueChange={(e) => onChange(e.value ?? 0)}
            disabled={disabled || mode === "random"}
            className="seed-number"
            mode="decimal"
            useGrouping={false}
            showButtons
          />
          <Button
            icon="pi pi-refresh"
            className="p-button-text seed-random-button"
            onClick={generateRandomSeed}
            disabled={disabled}
            tooltip="Generate Random Seed"
          />
        </div>
        <Dropdown
          value={mode}
          options={SEED_MODES}
          onChange={(e) => onModeChange(e.value)}
          disabled={disabled}
          className="seed-mode"
        />
      </div>
    </div>
  );
};

export default SeedInput;
