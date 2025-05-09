import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { Menubar } from "primereact/menubar";
import { Button } from "primereact/button";
import GeneratePage from "./pages/GeneratePage";
import ImagesPage from "./pages/ImagesPage";
import EditorPage from "./pages/EditorPage";
import SettingsDialog from "./components/SettingsDialog";
import { ProgressBar } from "primereact/progressbar";
import { useSettingsStore } from "./store/settingsStore";
import WorkflowImportDialog from "./components/WorkflowImportDialog";
import "./App.css";

const Navigation: React.FC<{
  onSettings: () => void;
  onImport: () => void;
}> = ({ onSettings, onImport }) => {
  const navigate = useNavigate();
  const menuItems = [
    {
      label: "Generate",
      icon: "pi pi-play",
      command: () => navigate("/"),
    },
    {
      label: "Gallery",
      icon: "pi pi-image",
      command: () => navigate("/gallery"),
    },
    {
      label: "Editor",
      icon: "pi pi-cog",
      command: () => navigate("/editor"),
    },
  ];
  return (
    <Menubar
      model={menuItems}
      start={<span className="app-title">AIRIS</span>}
      end={
        <>
          <Button
            icon="pi pi-upload"
            className="p-button-text p-button-rounded"
            aria-label="Import Workflow"
            onClick={onImport}
            style={{ marginRight: 8 }}
          />
          <Button
            icon="pi pi-sliders-h"
            className="p-button-text p-button-rounded"
            aria-label="Settings"
            onClick={onSettings}
          />
        </>
      }
    />
  );
};

const App: React.FC = () => {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const progress = useSettingsStore((state) => state.progress);
  const loading = useSettingsStore((state) => state.loading);
  const handleWorkflowImported = (workflowSummary: any) => {
    setImportVisible(false);
  };
  return (
    <Router>
      <div className="app-container">
        <div className="sticky-navbar">
          <Navigation
            onSettings={() => setSettingsVisible(true)}
            onImport={() => setImportVisible(true)}
          />
        </div>
        {/* Global progress bar */}
        {loading && (
          <ProgressBar
            value={progress > 0 ? progress : undefined}
            mode={progress > 0 ? "determinate" : "indeterminate"}
            style={{
              height: 6,
              borderRadius: 0,
              margin: 0,
              position: "relative",
              zIndex: 10,
            }}
          />
        )}
        <SettingsDialog
          visible={settingsVisible}
          onHide={() => setSettingsVisible(false)}
        />
        <WorkflowImportDialog
          visible={importVisible}
          onHide={() => setImportVisible(false)}
          onImported={handleWorkflowImported}
        />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<GeneratePage />} />
            <Route path="/gallery" element={<ImagesPage />} />
            <Route path="/editor" element={<EditorPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
