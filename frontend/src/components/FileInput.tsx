import React, { useRef, useState, useEffect } from "react";
import { FileUpload } from "primereact/fileupload";
import { Message } from "primereact/message";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { TabView, TabPanel } from "primereact/tabview";
import { useImageStore } from "../store/imageStore";
import { useSettingsStore } from "../store/settingsStore";
import "./FileInput.css";

interface FileInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  disabled?: boolean;
  accept?: string;
}

const FileInput: React.FC<FileInputProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  accept = "image/*",
}) => {
  const fileUploadRef = useRef<FileUpload>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const {
    comfyInputImages,
    loading,
    error: storeError,
    loadComfyInputImages,
    uploadImage,
  } = useImageStore();
  const comfyApiUrl =
    useSettingsStore((state) => state.comfyApiUrl) || "http://127.0.0.1:8188";

  useEffect(() => {
    loadComfyInputImages();
  }, [loadComfyInputImages]);

  // Clear error when switching tabs
  useEffect(() => {
    setError(null);
  }, [activeTab]);

  const handleFileSelect = async (event: { files: File[] }) => {
    const file = event.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      if (fileUploadRef.current) {
        fileUploadRef.current.clear();
      }
      return;
    }

    try {
      await uploadImage(file);
      onChange(file.name);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      onChange(null);
    }

    if (fileUploadRef.current) {
      fileUploadRef.current.clear();
    }
  };

  const handleComfyImageSelect = (imageName: string) => {
    setError(null);
    onChange(imageName);
  };

  const handleClear = () => {
    onChange(null);
    setError(null);
    if (fileUploadRef.current) {
      fileUploadRef.current.clear();
    }
  };

  return (
    <div className="file-input-container">
      {label && <label className="input-label">{label}</label>}
      <div className="file-input-wrapper">
        <TabView
          activeIndex={activeTab}
          onTabChange={(e) => setActiveTab(e.index)}
        >
          <TabPanel header="Upload">
            <FileUpload
              ref={fileUploadRef}
              mode="basic"
              accept={accept}
              maxFileSize={10 * 1024 * 1024}
              customUpload
              uploadHandler={handleFileSelect}
              auto
              chooseLabel="Choose Image"
              disabled={disabled || loading}
            />
          </TabPanel>
          <TabPanel header="ComfyUI Images">
            <div className="comfy-images-panel">
              {loading ? (
                <div className="loading-message">Loading images...</div>
              ) : error ? (
                <div className="error-message">
                  <Message severity="error" text={error} />
                  <div className="error-help">
                    <p>Please check:</p>
                    <ul>
                      <li>ComfyUI is running and accessible</li>
                      <li>The ComfyUI API URL is correct in settings</li>
                      <li>Your network connection is stable</li>
                    </ul>
                  </div>
                </div>
              ) : comfyInputImages.length === 0 ? (
                <div className="no-images-message">
                  <Message
                    severity="info"
                    text="No images found in ComfyUI input directory"
                  />
                </div>
              ) : (
                <Dropdown
                  value={value}
                  onChange={(e) => onChange(e.value)}
                  options={comfyInputImages.map((filename) => ({
                    label: filename,
                    value: filename,
                  }))}
                  placeholder="Select an image"
                  className="w-full"
                  disabled={disabled}
                />
              )}
            </div>
          </TabPanel>
        </TabView>

        {error && (
          <Message
            severity="error"
            text={error}
            className="mt-2"
            style={{ width: "100%" }}
          />
        )}
        {storeError && (
          <Message
            severity="error"
            text={storeError}
            className="mt-2"
            style={{ width: "100%" }}
          />
        )}

        {value && (
          <div className="file-preview">
            <img
              src={`${comfyApiUrl}/view?filename=${encodeURIComponent(
                value
              )}&type=input`}
              alt="Preview"
              onError={(e) => {
                setError("Failed to load image preview");
                console.error("Image preview failed:", e);
              }}
              style={{ maxWidth: "100%", marginTop: "1rem" }}
            />
            <Button
              icon="pi pi-times"
              className="p-button-rounded p-button-danger p-button-text"
              onClick={handleClear}
              style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FileInput;
