import React from "react";
import { Card } from "primereact/card";
import "./ParameterInput.css";

interface ParameterContainerProps {
  children: React.ReactNode;
  title?: string;
}

const ParameterContainer: React.FC<ParameterContainerProps> = ({
  children,
  title,
}) => {
  return (
    <Card className="parameter-card">
      {title && <h2 className="parameter-group-title">{title}</h2>}
      <div className="parameters-section">{children}</div>
    </Card>
  );
};

export default ParameterContainer;
