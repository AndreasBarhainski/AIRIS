import React, { useState, useRef, useEffect, useCallback } from "react";
import { useImageStore } from "../store/imageStore";
import type { ImageMeta } from "../store/imageStore";
import { Button } from "primereact/button";
import { ConfirmDialog } from "primereact/confirmdialog";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { MultiSelect } from "primereact/multiselect";
import { Checkbox } from "primereact/checkbox";
import "./ImagesPage.css";

const ImagesPage: React.FC = () => {
  const { images, loading, error, loadImages, deleteImage } = useImageStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageData, setSelectedImageData] = useState<ImageMeta | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [sortOption, setSortOption] = useState({
    value: "newest",
    label: "Newest First",
  });
  const [filterText, setFilterText] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(-1);

  const toastRef = useRef<Toast>(null);

  useEffect(() => {
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

  const handleBulkDelete = async () => {
    try {
      for (const filename of selectedImages) {
        await deleteImage(filename);
      }
      toastRef.current?.show({
        severity: "success",
        summary: "Success",
        detail: `${selectedImages.length} images deleted successfully`,
        life: 3000,
      });
      setSelectedImages([]);
    } catch (error) {
      toastRef.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to delete some images",
        life: 3000,
      });
    }
  };

  const downloadImage = (img: ImageMeta) => {
    const link = document.createElement("a");
    link.href = `http://localhost:4000/images/${img.filename}`;
    link.download = img.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSelected = () => {
    images
      .filter((img) => selectedImages.includes(img.filename))
      .forEach((img) => downloadImage(img));
  };

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "name_asc", label: "Name (A-Z)" },
    { value: "name_desc", label: "Name (Z-A)" },
  ];

  // Get unique workflow IDs for filtering
  const getUniqueTypes = () => {
    const workflowIds = images
      .filter((img) => img.workflow_id)
      .map((img) => img.workflow_id as string);

    return [...new Set(workflowIds)].map((id) => ({ label: id, value: id }));
  };

  // Filter and sort images
  const filteredAndSortedImages = React.useMemo(() => {
    return images
      .filter((img) => {
        const matchesText =
          !filterText ||
          img.filename.toLowerCase().includes(filterText.toLowerCase()) ||
          (img.workflow_id &&
            img.workflow_id.toLowerCase().includes(filterText.toLowerCase()));

        const matchesType =
          selectedTypes.length === 0 ||
          (img.workflow_id && selectedTypes.includes(img.workflow_id));

        return matchesText && matchesType;
      })
      .sort((a, b) => {
        switch (sortOption.value) {
          case "newest":
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          case "oldest":
            return (
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
            );
          case "name_asc":
            return a.filename.localeCompare(b.filename);
          case "name_desc":
            return b.filename.localeCompare(a.filename);
          default:
            return 0;
        }
      });
  }, [images, filterText, selectedTypes, sortOption]);

  const toggleImageSelection = (filename: string) => {
    setSelectedImages((prev) =>
      prev.includes(filename)
        ? prev.filter((f) => f !== filename)
        : [...prev, filename]
    );
  };

  const selectAll = () => {
    setSelectedImages(filteredAndSortedImages.map((img) => img.filename));
  };

  const deselectAll = () => {
    setSelectedImages([]);
  };

  // Handle keyboard navigation in lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showLightbox && filteredAndSortedImages.length > 0) {
        if (e.key === "ArrowRight") {
          // Navigate to next image
          if (currentImageIndex < filteredAndSortedImages.length - 1) {
            const nextImage = filteredAndSortedImages[currentImageIndex + 1];
            setSelectedImageData(nextImage);
            setCurrentImageIndex(currentImageIndex + 1);
          }
        } else if (e.key === "ArrowLeft") {
          // Navigate to previous image
          if (currentImageIndex > 0) {
            const prevImage = filteredAndSortedImages[currentImageIndex - 1];
            setSelectedImageData(prevImage);
            setCurrentImageIndex(currentImageIndex - 1);
          }
        } else if (e.key === "Escape") {
          // Close lightbox
          setShowLightbox(false);
        }
      }
    },
    [showLightbox, filteredAndSortedImages, currentImageIndex]
  );

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Open lightbox with the selected image
  const openLightbox = (img: ImageMeta) => {
    setSelectedImageData(img);
    // Find the index of the selected image in the filtered list
    const index = filteredAndSortedImages.findIndex((i) => i.id === img.id);
    setCurrentImageIndex(index);
    setShowLightbox(true);
  };

  // Navigate to next image in lightbox
  const goToNextImage = () => {
    if (currentImageIndex < filteredAndSortedImages.length - 1) {
      const nextImage = filteredAndSortedImages[currentImageIndex + 1];
      setSelectedImageData(nextImage);
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  // Navigate to previous image in lightbox
  const goToPrevImage = () => {
    if (currentImageIndex > 0) {
      const prevImage = filteredAndSortedImages[currentImageIndex - 1];
      setSelectedImageData(prevImage);
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // Copy image URL to clipboard
  const copyImageLink = (img: ImageMeta) => {
    const imageUrl = `http://localhost:4000/images/${img.filename}`;
    navigator.clipboard
      .writeText(imageUrl)
      .then(() => {
        toastRef.current?.show({
          severity: "success",
          summary: "Link Copied",
          detail: "Image link copied to clipboard",
          life: 3000,
        });
      })
      .catch((err) => {
        console.error("Failed to copy link: ", err);
        toastRef.current?.show({
          severity: "error",
          summary: "Error",
          detail: "Failed to copy link to clipboard",
          life: 3000,
        });
      });
  };

  return (
    <div className="images-page">
      <Toast ref={toastRef} />

      {/* Delete confirmation */}
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

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        visible={showBulkDeleteDialog}
        onHide={() => setShowBulkDeleteDialog(false)}
        message={`Are you sure you want to delete ${selectedImages.length} selected images?`}
        header="Confirm Bulk Deletion"
        icon="pi pi-exclamation-triangle"
        accept={() => {
          handleBulkDelete();
          setShowBulkDeleteDialog(false);
        }}
        reject={() => {
          setShowBulkDeleteDialog(false);
        }}
      />

      {/* Lightbox image preview */}
      <Dialog
        visible={showLightbox}
        onHide={() => setShowLightbox(false)}
        header={selectedImageData?.filename}
        style={{ width: "90vw", maxWidth: "1200px" }}
        className="image-lightbox"
        maximizable
      >
        {selectedImageData && (
          <div className="lightbox-content">
            <div className="lightbox-navigation">
              <Button
                icon="pi pi-chevron-left"
                className="nav-button prev-button"
                disabled={currentImageIndex <= 0}
                onClick={goToPrevImage}
              />
              <img
                src={`http://localhost:4000/images/${selectedImageData.filename}`}
                alt={selectedImageData.filename}
                className="lightbox-image"
              />
              <Button
                icon="pi pi-chevron-right"
                className="nav-button next-button"
                disabled={
                  currentImageIndex >= filteredAndSortedImages.length - 1
                }
                onClick={goToNextImage}
              />
            </div>
            <div className="lightbox-info">
              <div className="lightbox-filename">
                {selectedImageData.filename}
              </div>
              <div className="info-row">
                <span className="info-label">Created:</span>
                <span className="info-value">
                  {new Date(selectedImageData.created_at).toLocaleString()}
                </span>
              </div>
              {selectedImageData.workflow_id && (
                <div className="info-row">
                  <span className="info-label">Workflow:</span>
                  <span className="info-value">
                    {selectedImageData.workflow_id}
                  </span>
                </div>
              )}
              {selectedImageData.config_id && (
                <div className="info-row">
                  <span className="info-label">Config:</span>
                  <span className="info-value">
                    {selectedImageData.config_id}
                  </span>
                </div>
              )}
              {selectedImageData.prompt_id && (
                <div className="info-row">
                  <span className="info-label">Prompt:</span>
                  <span className="info-value">
                    {selectedImageData.prompt_id}
                  </span>
                </div>
              )}
              <div className="lightbox-actions">
                <Button
                  icon="pi pi-download"
                  label="Download"
                  className="p-button-outlined"
                  onClick={() => downloadImage(selectedImageData)}
                />
                <Button
                  icon="pi pi-copy"
                  label="Copy Link"
                  className="p-button-outlined"
                  onClick={() => copyImageLink(selectedImageData)}
                />
                <Button
                  icon="pi pi-trash"
                  label="Delete"
                  className="p-button-outlined p-button-danger"
                  onClick={() => {
                    setSelectedImage(selectedImageData.filename);
                    setShowLightbox(false);
                    setShowDeleteDialog(true);
                  }}
                />
              </div>
              <div className="lightbox-position">
                {currentImageIndex + 1} of {filteredAndSortedImages.length}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Header with controls */}
      <div className="images-header">
        <div className="header-left">
          <h2>Generated Images</h2>
          <div className="images-count">
            {filteredAndSortedImages.length} of {images.length}{" "}
            {images.length === 1 ? "image" : "images"}
          </div>
        </div>

        <div className="header-controls">
          <div className="search-container">
            <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Search images..."
                className="p-inputtext-sm"
              />
            </span>
          </div>

          <div className="filter-container">
            <MultiSelect
              value={selectedTypes}
              options={getUniqueTypes()}
              onChange={(e) => setSelectedTypes(e.value)}
              placeholder="Filter by workflow"
              className="p-inputtext-sm"
              maxSelectedLabels={1}
              display="chip"
            />
          </div>

          <div className="sort-container">
            <Dropdown
              value={sortOption}
              options={sortOptions}
              onChange={(e) => setSortOption(e.value)}
              className="p-inputtext-sm"
            />
          </div>
        </div>
      </div>

      {/* Bulk actions bar (visible when images are selected) */}
      {selectedImages.length > 0 && (
        <div className="bulk-actions-bar">
          <div className="selection-info">
            {selectedImages.length}{" "}
            {selectedImages.length === 1 ? "image" : "images"} selected
          </div>
          <div className="selection-actions">
            <Button
              icon="pi pi-download"
              label="Download Selected"
              className="p-button-outlined p-button-sm"
              onClick={downloadSelected}
            />
            <Button
              icon="pi pi-trash"
              label="Delete Selected"
              className="p-button-outlined p-button-danger p-button-sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            />
            <Button
              icon="pi pi-times"
              label="Clear Selection"
              className="p-button-text p-button-sm"
              onClick={deselectAll}
            />
          </div>
        </div>
      )}

      {/* Main content */}
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
      ) : filteredAndSortedImages.length === 0 ? (
        <div className="images-empty">
          <i className="pi pi-filter-slash"></i>
          <p>No images match your filters.</p>
          <Button
            label="Clear Filters"
            className="p-button-text"
            onClick={() => {
              setFilterText("");
              setSelectedTypes([]);
            }}
          />
        </div>
      ) : (
        <div className="images-grid">
          {filteredAndSortedImages.map((img) => (
            <div
              key={img.id}
              className="image-card"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  openLightbox(img);
                }
              }}
            >
              <div className="image-preview">
                <div className="selection-checkbox">
                  <Checkbox
                    checked={selectedImages.includes(img.filename)}
                    onChange={() => toggleImageSelection(img.filename)}
                  />
                </div>
                <img
                  src={`http://localhost:4000/images/${img.filename}`}
                  alt={img.filename}
                  onClick={() => openLightbox(img)}
                />
                <div className="image-actions">
                  <Button
                    icon="pi pi-download"
                    className="p-button-rounded p-button-text"
                    tooltip="Download"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(img);
                    }}
                  />
                  <Button
                    icon="pi pi-copy"
                    className="p-button-rounded p-button-text"
                    tooltip="Copy Link"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyImageLink(img);
                    }}
                  />
                  <Button
                    icon="pi pi-trash"
                    className="p-button-rounded p-button-danger p-button-text"
                    tooltip="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(img.filename);
                      setShowDeleteDialog(true);
                    }}
                  />
                </div>
              </div>
              <div className="image-info">
                <div className="info-title">{img.filename}</div>
                <div className="info-meta">
                  <div className="meta-item">
                    <i className="pi pi-calendar"></i>
                    {new Date(img.created_at).toLocaleDateString()}
                  </div>
                  {img.workflow_id && (
                    <div className="meta-item">
                      <i className="pi pi-cog"></i>
                      {img.workflow_id}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating select all button (visible when no images are selected) */}
      {images.length > 0 && selectedImages.length === 0 && (
        <div className="select-all-button">
          <Button
            icon="pi pi-check-square"
            className="p-button-rounded"
            tooltip="Select All"
            onClick={selectAll}
          />
        </div>
      )}
    </div>
  );
};

export default ImagesPage;
