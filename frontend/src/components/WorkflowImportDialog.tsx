import React, { useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { FileUpload } from "primereact/fileupload";
import { Message } from "primereact/message";
import { Button } from "primereact/button";

interface WorkflowImportDialogProps {
  visible: boolean;
  onHide: () => void;
  onImported: (workflowSummary: any) => void;
}

const WorkflowImportDialog: React.FC<WorkflowImportDialogProps> = ({
  visible,
  onHide,
  onImported,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileUploadRef = useRef<FileUpload>(null);

  const handleFileUpload = async (e: { files: File[] }) => {
    setError(null);
    setSuccess(null);
    const file = e.files[0];
    if (!file) return;
    try {
      // Upload to backend
      const formData = new FormData();
      formData.append("workflow", file);
      const response = await fetch("/api/workflows", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();
      // Parse for summary (no validation)
      const text = await file.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch (err) {
        // If not valid JSON, just use empty object
        json = {};
      }
      // Always create a generic summary
      const workflowSummary = {
        name: json.name || file.name || "Unnamed Workflow",
        nodeCount: json.nodes
          ? Array.isArray(json.nodes)
            ? json.nodes.length
            : typeof json.nodes === "object"
            ? Object.keys(json.nodes).length
            : 0
          : 0,
        parameters: [],
        filename: result.filename,
        topLevelKeys: Object.keys(json),
      };
      setSuccess("Workflow uploaded and saved successfully.");
      onImported(workflowSummary);
    } catch (err) {
      setError("Upload failed. Please try again.");
    }
    if (fileUploadRef.current) fileUploadRef.current.clear();
  };

  return (
    <Dialog
      header="Import Workflow"
      visible={visible}
      style={{ width: "30vw" }}
      onHide={onHide}
      modal
    >
      <FileUpload
        ref={fileUploadRef}
        mode="basic"
        accept="application/json"
        maxFileSize={1000000}
        chooseLabel="Import Workflow JSON"
        customUpload
        uploadHandler={handleFileUpload}
        auto
      />
      {error && (
        <Message severity="error" text={error} style={{ marginTop: 16 }} />
      )}
      {success && (
        <Message severity="success" text={success} style={{ marginTop: 16 }} />
      )}
      <div style={{ marginTop: 24, textAlign: "right" }}>
        <Button label="Close" className="p-button-text" onClick={onHide} />
      </div>
    </Dialog>
  );
};

export default WorkflowImportDialog;
