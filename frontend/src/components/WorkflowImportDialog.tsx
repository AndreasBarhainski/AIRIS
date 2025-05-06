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
      const response = await fetch("http://localhost:4000/api/workflows", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();
      // Parse for summary and parameters
      const text = await file.text();
      const json = JSON.parse(text);
      let parameters: string[] = [];
      if (json.nodes) {
        if (Array.isArray(json.nodes)) {
          parameters = json.nodes.flatMap((node: any) =>
            node.inputs ? Object.keys(node.inputs) : []
          );
        } else if (typeof json.nodes === "object") {
          parameters = Object.values(json.nodes).flatMap((node: any) =>
            node.inputs ? Object.keys(node.inputs) : []
          );
        }
        parameters = Array.from(new Set(parameters));
      }
      const workflowSummary = {
        name: json.name || "Unnamed Workflow",
        nodeCount: Array.isArray(json.nodes)
          ? json.nodes.length
          : Object.keys(json.nodes || {}).length,
        parameters,
        filename: result.filename,
      };
      setSuccess("Workflow uploaded and saved successfully.");
      onImported(workflowSummary);
    } catch (err) {
      setError(
        "Invalid workflow file or upload failed. Please upload a valid ComfyUI workflow JSON."
      );
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
