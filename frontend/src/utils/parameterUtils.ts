import type {
  ParameterType,
  StringInputMode,
} from "../components/ParameterInput";

interface ParameterTypeInfo {
  type: ParameterType | "seed" | "image";
  defaultValue: any;
  inputMode?: StringInputMode;
}

export const getParameterTypeInfo = (
  paramName: string,
  value: any,
  nodeType?: string
): ParameterTypeInfo => {
  // Special cases based on parameter name
  if (paramName === "seed") {
    return {
      type: "seed",
      defaultValue: Math.floor(Math.random() * 1000000000),
    };
  }

  if (paramName === "image" || paramName.toLowerCase().includes("image")) {
    return { type: "image", defaultValue: null };
  }

  // Type based on value
  if (typeof value === "number") {
    return { type: "number", defaultValue: 0 };
  }

  if (typeof value === "boolean") {
    return { type: "boolean", defaultValue: false };
  }

  // String types with input mode detection
  if (typeof value === "string") {
    const inputMode = value.includes("\n") ? "multi" : "single";
    return {
      type: "string",
      defaultValue: "",
      inputMode,
    };
  }

  // Default to string type
  return { type: "string", defaultValue: "", inputMode: "single" };
};

export const organizeParameters = (
  nodes: any[],
  exposedParams: { [nodeId: string]: string[] }
) => {
  // Group parameters by category
  const categories = {
    seed: [] as any[],
    image: [] as any[],
    text: [] as any[],
    number: [] as any[],
    other: [] as any[],
  };

  Object.entries(exposedParams).forEach(([nodeId, params]) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    params.forEach((param) => {
      const value = node.inputs[param];
      if (value === undefined || value === "") return;

      const { type } = getParameterTypeInfo(param, value, node.class_type);

      const paramInfo = {
        nodeId,
        param,
        value,
        type,
        nodeName: node._meta?.title || node.class_type,
      };

      switch (type) {
        case "seed":
          categories.seed.push(paramInfo);
          break;
        case "image":
          categories.image.push(paramInfo);
          break;
        case "string":
          categories.text.push(paramInfo);
          break;
        case "number":
          categories.number.push(paramInfo);
          break;
        default:
          categories.other.push(paramInfo);
      }
    });
  });

  return categories;
};

export const formatParameterName = (name: string): string => {
  return name === "seed"
    ? "Seed"
    : name
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

export const getNodeDisplayName = (node: any): string => {
  return node._meta?.title || node.class_type || "Unknown Node";
};
