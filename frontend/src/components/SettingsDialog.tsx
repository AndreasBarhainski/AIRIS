import React, { useState } from "react";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { useSettingsStore } from "../store/settingsStore";

interface SettingsDialogProps {
  visible: boolean;
  onHide: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ visible, onHide }) => {
  const { comfyApiUrl, setComfyApiUrl } = useSettingsStore();
  const [url, setUrl] = useState(comfyApiUrl);

  const handleSave = () => {
    setComfyApiUrl(url);
    onHide();
  };

  return (
    <Dialog
      header="Settings"
      visible={visible}
      style={{ width: "30vw" }}
      onHide={onHide}
      modal
    >
      <div className="p-fluid">
        <label
          htmlFor="comfyApiUrl"
          style={{ fontWeight: 500, marginBottom: 8 }}
        >
          ComfyUI API URL
        </label>
        <InputText
          id="comfyApiUrl"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:8188"
        />
      </div>
      <div style={{ marginTop: 24, textAlign: "right" }}>
        <Button
          label="Cancel"
          className="p-button-text"
          onClick={onHide}
          style={{ marginRight: 8 }}
        />
        <Button label="Save" icon="pi pi-save" onClick={handleSave} autoFocus />
      </div>
    </Dialog>
  );
};

export default SettingsDialog;
