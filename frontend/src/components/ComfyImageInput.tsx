import React, { useState, useEffect } from "react";
import { FileUpload } from "primereact/fileupload";
import { Message } from "primereact/message";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dropdown } from "primereact/dropdown";
import { useSettingsStore } from "../store/settingsStore";
import { useGeneratePageStore } from "../store/generatePageStore";
import { useImageStore } from "../store/imageStore";
import "./ComfyImageInput.css";

interface ComfyImageInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  disabled?: boolean;
  paramKey?: string;
}

const ComfyImageInput: React.FC<ComfyImageInputProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  paramKey,
}) => {
  const [error, setError] = useState<string | null>(null);
  const { comfyApiUrl } = useSettingsStore();
  const {
    comfyInputImages,
    loading,
    error: storeError,
    loadComfyInputImages,
  } = useImageStore();

  useEffect(() => {
    loadComfyInputImages();
  }, [loadComfyInputImages]);

  const handleUpload = async (event: any) => {
    try {
      setError(null);
      const file = event.files[0];
      await useImageStore.getState().uploadImage(file);
      if (paramKey) {
        useGeneratePageStore.getState().updateParamValue(paramKey, file.name);
      }
      onChange(file.name);
      // Reload the input images list after successful upload
      await loadComfyInputImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    }
  };

  const handleClear = () => {
    if (paramKey) {
      useGeneratePageStore.getState().updateParamValue(paramKey, null);
    }
    onChange(null);
  };

  const handleSelect = (filename: string) => {
    if (paramKey) {
      useGeneratePageStore.getState().updateParamValue(paramKey, filename);
    }
    onChange(filename);
  };

  const renderImagePreview = () => {
    if (!value) return null;

    // Add a key prop that changes when the value changes to force re-render
    return (
      <div className="image-preview mt-2">
        <img
          key={value} // This ensures the image refreshes when the value changes
          src={`http://localhost:4000/api/comfy/view?comfyApiUrl=${encodeURIComponent(
            comfyApiUrl
          )}&filename=${encodeURIComponent(value)}&type=input`}
          alt="Preview"
        />
        <Button
          icon="pi pi-times"
          className="p-button-rounded p-button-danger p-button-text clear-button"
          onClick={handleClear}
          disabled={disabled}
        />
      </div>
    );
  };

  return (
    <div className="comfy-image-input">
      {label && <div className="input-label mb-2">{label}</div>}
      <div className="flex flex-column gap-2">
        {loading ? (
          <div className="loading-overlay">
            <ProgressSpinner />
          </div>
        ) : storeError ? (
          <Message severity="error" text={storeError} />
        ) : (
          <Dropdown
            value={value}
            options={comfyInputImages.map((filename) => ({
              label: filename,
              value: filename,
            }))}
            onChange={(e) => handleSelect(e.value)}
            placeholder="Select an image"
            filter
            showClear
            disabled={disabled}
            className="w-full"
            filterPlaceholder="Search images..."
            emptyFilterMessage="No images found"
            emptyMessage="No images available"
          />
        )}

        {renderImagePreview()}

        <FileUpload
          mode="basic"
          name="image"
          url={`http://localhost:4000/api/comfy/upload?comfyApiUrl=${encodeURIComponent(
            comfyApiUrl
          )}`}
          accept="image/*"
          maxFileSize={10000000}
          customUpload
          uploadHandler={handleUpload}
          auto
          chooseLabel="Upload Image"
          disabled={disabled}
          className="w-full"
        />

        {error && (
          <Message severity="error" text={error} className="error-message" />
        )}
      </div>
    </div>
  );
};

export default ComfyImageInput;
