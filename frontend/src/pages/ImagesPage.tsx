import React from "react";
import { useImageStore } from "../store/imageStore";
import type { ImageMeta } from "../store/imageStore";
import { Button } from "primereact/button";
import { ConfirmDialog } from "primereact/confirmdialog";
import { Toast } from "primereact/toast";
import "./ImagesPage.css";

const ImagesPage: React.FC = () => {
  const { images, loading, error, loadImages, deleteImage } = useImageStore();
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const toastRef = React.useRef<Toast>(null);

  React.useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleDelete = async (filename: string) => {
    try {
      await deleteImage(filename);
      toastRef.current?.show({
        severity: "success",
        summary: "Success",
        detail: "Image deleted successfully",
        life: 3000,
      });
    } catch (error) {
      toastRef.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to delete image",
        life: 3000,
      });
    }
  };

  return (
    <div className="images-page">
      <Toast ref={toastRef} />
      <ConfirmDialog
        visible={showDeleteDialog}
        onHide={() => setShowDeleteDialog(false)}
        message="Are you sure you want to delete this image?"
        header="Confirm Deletion"
        icon="pi pi-exclamation-triangle"
        accept={() => {
          if (selectedImage) {
            handleDelete(selectedImage);
            setShowDeleteDialog(false);
            setSelectedImage(null);
          }
        }}
        reject={() => {
          setShowDeleteDialog(false);
          setSelectedImage(null);
        }}
      />

      <div className="images-header">
        <h2>Generated Images</h2>
        <div className="images-count">
          {images.length} {images.length === 1 ? "image" : "images"}
        </div>
      </div>

      {loading ? (
        <div className="images-loading">
          <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem" }}></i>
          <p>Loading images...</p>
        </div>
      ) : error ? (
        <div className="images-error">
          <i className="pi pi-exclamation-circle"></i>
          <p>{error}</p>
        </div>
      ) : images.length === 0 ? (
        <div className="images-empty">
          <i className="pi pi-image"></i>
          <p>No images have been generated yet.</p>
        </div>
      ) : (
        <div className="images-grid">
          {images.map((img) => (
            <div key={img.id} className="image-card">
              <div className="image-preview">
                <img
                  src={`http://localhost:4000/images/${img.filename}`}
                  alt={img.filename}
                />
                <div className="image-actions">
                  <Button
                    icon="pi pi-trash"
                    className="p-button-rounded p-button-danger p-button-text"
                    onClick={() => {
                      setSelectedImage(img.filename);
                      setShowDeleteDialog(true);
                    }}
                  />
                </div>
              </div>
              <div className="image-info">
                <div className="info-row">
                  <span className="info-label">Created:</span>
                  <span className="info-value">
                    {new Date(img.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Filename:</span>
                  <span className="info-value">{img.filename}</span>
                </div>
                {img.workflow_id && (
                  <div className="info-row">
                    <span className="info-label">Workflow:</span>
                    <span className="info-value">{img.workflow_id}</span>
                  </div>
                )}
                {img.config_id && (
                  <div className="info-row">
                    <span className="info-label">Config:</span>
                    <span className="info-value">{img.config_id}</span>
                  </div>
                )}
                {img.prompt_id && (
                  <div className="info-row">
                    <span className="info-label">Prompt:</span>
                    <span className="info-value">{img.prompt_id}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImagesPage;
