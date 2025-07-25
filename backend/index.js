const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs");
const { Pool } = require("pg");
const axios = require("axios");
const FormData = require("form-data");
const { URL } = require("url");
const sharp = require("sharp");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
console.log("[DEBUG] process.env.OPENAI_KEY:", process.env.OPENAI_KEY);

const app = express();
const PORT = process.env.PORT || 5001;
const DEFAULT_COMFY_URL = "http://localhost:8188";

// Setup PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Define all routes before starting the server
app.use(cors());

// Express middleware
app.use(express.json());

// Multer setup for saving files in 'workflows' directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "workflows"));
  },
  filename: (req, file, cb) => {
    // Save with original filename, or you can generate a unique name
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Serve images statically
const IMAGES_DIR = path.join(__dirname, "images");
const COMFY_OUTPUTS_DIR = path.resolve(__dirname, "..", "comfyui", "output");

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR);
}

// Ensure frontend dist directory exists at startup
const FRONTEND_DIST = path.join(__dirname, "../frontend/dist");
if (!fs.existsSync(FRONTEND_DIST)) {
  fs.mkdirSync(FRONTEND_DIST, { recursive: true });
  const placeholderHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AIRIS - ComfyUI Workflows Frontend</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1 { color: #333; }
        .card { background: #f9f9f9; border: 1px solid #ddd; padding: 1rem; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h1>AIRIS Backend is Running</h1>
      <div class="card">
        <p>The backend API is running successfully. If you're seeing this page:</p>
        <ul>
          <li>In development: The frontend dev server should be started separately.</li>
          <li>In production: The frontend may not have been built properly.</li>
        </ul>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(FRONTEND_DIST, "index.html"), placeholderHTML);
  console.log("[INFO] Created placeholder frontend files");
}

// Serve images statically
app.use("/images", express.static(path.join(__dirname, "images")));

// Detect environment
const isProduction = process.env.NODE_ENV === "production";

// API ROUTES
app.post("/api/workflows", upload.single("workflow"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({
    message: "Workflow uploaded successfully",
    filename: req.file.filename,
    path: req.file.path,
  });
});

// POST /api/generate-image - submit workflow and return prompt_id
app.post("/api/generate-image", async (req, res) => {
  console.log("[DEBUG] Received request to /api/generate-image");
  try {
    const { comfyApiUrl, workflow: workflowFromBody } = req.body;
    if (!comfyApiUrl) {
      console.error("[ERROR] No comfyApiUrl provided");
      return res.status(400).json({ error: "comfyApiUrl is required" });
    }
    console.log("[DEBUG] Using ComfyUI URL:", comfyApiUrl);

    let workflow;
    if (workflowFromBody) {
      console.log("[DEBUG] Using workflow from request body");
      workflow = workflowFromBody;
    } else {
      // Load the test workflow JSON from disk (fallback)
      const workflowPath = path.join(
        __dirname,
        "workflows",
        "1746471738642-TestWorkflow.json"
      );
      console.log("[DEBUG] Reading workflow from:", workflowPath);
      workflow = JSON.parse(fs.readFileSync(workflowPath, "utf-8"));
    }
    console.log(
      "[DEBUG] Workflow used:",
      JSON.stringify(workflow).slice(0, 500),
      "..."
    );

    // --- Apply paramValues from frontend ---
    if (req.body.paramValues && typeof req.body.paramValues === "object") {
      for (const [key, value] of Object.entries(req.body.paramValues)) {
        if (value === undefined) continue;
        const [nodeId, paramName] = key.split(".");
        if (workflow[nodeId]?.inputs && !key.endsWith("_mode")) {
          workflow[nodeId].inputs[paramName] = value;
        }
      }
      console.log(
        "[DEBUG] Workflow after paramValues applied:",
        JSON.stringify(workflow, null, 2)
      );
    }
    // --- End paramValues application ---

    // --- Variable replacement logic ---
    // Recursively replace <<VARIABLE>> with process.env[VARIABLE] or req.body[VARIABLE]
    function deepReplaceVars(obj) {
      if (typeof obj === "string") {
        const match = obj.match(/^<<(.+?)>>$/);
        if (match) {
          const varName = match[1];
          // 1. Check process.env
          if (process.env[varName] !== undefined) {
            return process.env[varName];
          }
          // 2. Check request body (frontend-supplied variables)
          if (req.body[varName] !== undefined) {
            return req.body[varName];
          }
        }
        return obj;
      } else if (Array.isArray(obj)) {
        return obj.map(deepReplaceVars);
      } else if (obj && typeof obj === "object") {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          out[k] = deepReplaceVars(v);
        }
        return out;
      }
      return obj;
    }
    workflow = deepReplaceVars(workflow);
    console.log(
      "[DEBUG] Workflow after env var replacement:",
      JSON.stringify(workflow, null, 2)
    );
    // --- End variable replacement logic ---

    // Send workflow to ComfyUI API (assume /prompt endpoint)
    console.log(
      "[DEBUG] Workflow sent to ComfyUI:",
      JSON.stringify(workflow, null, 2)
    );
    console.log("[DEBUG] Sending workflow to ComfyUI /prompt endpoint...");
    const promptUrl = new URL("/prompt", comfyApiUrl);
    const comfyRes = await fetch(promptUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
    });
    const comfyText = await comfyRes.text();
    if (!comfyRes.ok) {
      console.error("[ERROR] Failed to send workflow to ComfyUI", comfyText);
      return res.status(500).json({
        error: "Failed to send workflow to ComfyUI",
        details: comfyText,
      });
    }
    const comfyData = JSON.parse(comfyText);
    const promptId = comfyData.prompt_id;
    if (!promptId) {
      console.error("[ERROR] No prompt_id returned from ComfyUI", comfyData);
      return res.status(500).json({
        error: "No prompt_id returned from ComfyUI",
        details: comfyData,
      });
    }
    console.log(`[DEBUG] Returning prompt_id: ${promptId}`);
    res.json({ prompt_id: promptId });
  } catch (err) {
    console.error("[ERROR] Internal server error:", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
});

// GET /api/progress/:prompt_id - poll ComfyUI for progress and image info
app.get("/api/progress/:prompt_id", async (req, res) => {
  const comfyApiUrl = req.query.comfyApiUrl;
  const promptId = req.params.prompt_id;
  if (!comfyApiUrl) {
    return res
      .status(400)
      .json({ error: "comfyApiUrl is required as query param" });
  }
  try {
    // Properly construct the history URL
    const historyURL = new URL(`/history/${promptId}`, comfyApiUrl);
    const historyRes = await fetch(historyURL.toString());
    const historyText = await historyRes.text();
    let historyData;
    try {
      historyData = JSON.parse(historyText);
    } catch (e) {
      return res.status(500).json({
        error: "Failed to parse history response",
        details: historyText,
      });
    }
    if (!historyData || !historyData[promptId]) {
      return res.json({ status: "pending", progress: 0 });
    }
    const promptHistory = historyData[promptId];
    // Check for error
    if (promptHistory.error) {
      return res.json({ status: "error", error: promptHistory.error });
    }
    // Check for outputs/images
    let imageUrl = null;
    let foundImage = false;
    let localFilename = null;
    let imageInfo = null;
    if (promptHistory.outputs) {
      for (const nodeId in promptHistory.outputs) {
        const output = promptHistory.outputs[nodeId];
        if (output.images && output.images.length > 0) {
          imageInfo = output.images[0];

          // Properly construct URL using URL class
          const imageURL = new URL("/view", comfyApiUrl);
          imageURL.searchParams.append("filename", imageInfo.filename);
          if (imageInfo.subfolder) {
            imageURL.searchParams.append("subfolder", imageInfo.subfolder);
          }

          imageUrl = imageURL.toString();
          foundImage = true;
          break;
        }
      }
    }
    // Progress calculation (if available)
    let progress = 0;
    if (promptHistory.progress && promptHistory.progress.max > 0) {
      progress = Math.round(
        (promptHistory.progress.value / promptHistory.progress.max) * 100
      );
    }
    if (foundImage && imageInfo) {
      // Download and save the image locally if not already saved
      localFilename = `${promptId}_${Date.now()}_${imageInfo.filename}`;
      const localPath = path.join(IMAGES_DIR, localFilename);
      if (!fs.existsSync(localPath)) {
        try {
          const response = await axios.get(imageUrl, {
            responseType: "stream",
          });
          await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(localPath);
            response.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
          });
          // Strip metadata from the image using sharp
          try {
            await sharp(localPath)
              .withMetadata({ exif: undefined })
              .toFile(localPath + ".stripped");
            fs.renameSync(localPath + ".stripped", localPath);
            console.log(
              `[DEBUG] Stripped metadata from image: ${localFilename}`
            );
          } catch (stripErr) {
            console.error(
              "[ERROR] Failed to strip metadata from image:",
              stripErr
            );
          }
          // Insert metadata into DB
          await pool.query(
            `
            INSERT INTO images (filename, prompt_id, workflow_id, config_id, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
            [
              localFilename,
              promptId,
              req.query.workflowId || null,
              req.query.configId || null,
            ]
          );
        } catch (e) {
          console.error("[ERROR] Downloading/saving image failed:", e);
        }
      }
      return res.json({
        status: "complete",
        progress: 100,
        imageUrl: `/images/${localFilename}`,
      });
    } else {
      return res.json({ status: "pending", progress });
    }
  } catch (err) {
    console.error("[ERROR] Progress endpoint error:", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
});

app.get("/api/ping", (req, res) => {
  console.log("[DEBUG] /api/ping called");
  res.json({ ok: true });
});

// POST /api/configurations - create a new configuration
app.post("/api/configurations", (req, res) => {
  const configData = req.body;
  pool.query(
    `INSERT INTO airis (data) VALUES ($1) RETURNING id`,
    [configData],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: result.rows[0].id });
    }
  );
});

// GET /api/configurations/:workflowId - list configurations for a workflow
app.get("/api/configurations/:workflowId", (req, res) => {
  const { workflowId } = req.params;
  pool.query(
    `SELECT id, data FROM airis WHERE (data->>'workflowId') = $1`,
    [workflowId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const configs = result.rows.map((row) => ({ id: row.id, ...row.data }));
      res.json(configs);
    }
  );
});

// PUT /api/configurations/:id - update a configuration
app.put("/api/configurations/:id", (req, res) => {
  const { id } = req.params;
  const configData = req.body;
  pool.query(
    `UPDATE airis SET data = $1 WHERE id = $2 RETURNING *`,
    [configData, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(result.rows[0]);
    }
  );
});

// DELETE /api/configurations/:id - delete a configuration
app.delete("/api/configurations/:id", (req, res) => {
  const { id } = req.params;
  pool.query(
    `DELETE FROM airis WHERE id = $1 RETURNING *`,
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(result.rows[0]);
    }
  );
});

// GET /api/configurations - list all configurations
app.get("/api/configurations", (req, res) => {
  pool.query(`SELECT id, data FROM airis`, [], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const configs = result.rows.map((row) => ({ id: row.id, ...row.data }));
    res.json(configs);
  });
});

// GET /api/workflows - list all uploaded workflow files with metadata
app.get("/api/workflows", (req, res) => {
  const workflowsDir = path.join(__dirname, "workflows");
  fs.readdir(workflowsDir, (err, files) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Failed to read workflows directory" });
    }
    const workflowFiles = files.filter((f) => f.endsWith(".json"));
    const workflows = workflowFiles.map((filename) => {
      try {
        const filePath = path.join(workflowsDir, filename);
        const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        let parameters = [];
        if (json.nodes) {
          if (Array.isArray(json.nodes)) {
            parameters = json.nodes.flatMap((node) =>
              node.inputs ? Object.keys(node.inputs) : []
            );
          } else if (typeof json.nodes === "object") {
            parameters = Object.values(json.nodes).flatMap((node) =>
              node.inputs ? Object.keys(node.inputs) : []
            );
          }
          parameters = Array.from(new Set(parameters));
        }
        return {
          filename,
          name: json.name || "Unnamed Workflow",
          nodeCount: Array.isArray(json.nodes)
            ? json.nodes.length
            : Object.keys(json.nodes || {}).length,
          parameters,
        };
      } catch (e) {
        return {
          filename,
          name: "Invalid Workflow",
          nodeCount: 0,
          parameters: [],
        };
      }
    });
    res.json(workflows);
  });
});

// GET /api/workflows/:filename - get full workflow JSON by filename
app.get("/api/workflows/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "workflows", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Workflow not found" });
  }
  try {
    const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: "Failed to parse workflow JSON" });
  }
});

// GET /api/images - list all generated images and metadata
app.get("/api/images", (req, res) => {
  pool.query(
    `SELECT * FROM images ORDER BY created_at DESC`,
    [],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(result.rows);
    }
  );
});

// DELETE /api/images/:filename - delete an image
app.delete("/api/images/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const imagePath = path.join(IMAGES_DIR, filename);

  // First check if the file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`[ERROR] Image file not found: ${imagePath}`);
    return res.status(404).json({ error: "Image not found" });
  }

  // Delete from database first
  pool.query(
    `DELETE FROM images WHERE filename = $1 RETURNING *`,
    [filename],
    (err, result) => {
      if (err) {
        console.error("[ERROR] Database deletion failed:", err);
        return res
          .status(500)
          .json({ error: "Failed to delete image from database" });
      }

      // Then delete the file
      fs.unlink(imagePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("[ERROR] File deletion failed:", unlinkErr);
          return res.status(500).json({ error: "Failed to delete image file" });
        }

        console.log(`[INFO] Successfully deleted image: ${filename}`);
        res.json({ message: "Image deleted successfully" });
      });
    }
  );
});

// POST /api/comfy/upload - upload an image to ComfyUI's input directory
app.post("/api/comfy/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const comfyApiUrl = req.query.comfyApiUrl || DEFAULT_COMFY_URL;
    console.log("[DEBUG] Uploading image to ComfyUI at:", comfyApiUrl);

    // Create form data with the file
    const formData = new FormData();
    formData.append("image", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    // Set overwrite flag if provided
    formData.append("overwrite", req.body.overwrite || "true");

    // Upload to ComfyUI
    console.log("[DEBUG] Sending image to ComfyUI upload endpoint...");
    const uploadUrl = new URL("/upload/image", comfyApiUrl);
    const response = await fetch(uploadUrl.toString(), {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ERROR] ComfyUI upload failed:", errorText);
      throw new Error(`Failed to upload to ComfyUI: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[DEBUG] Upload successful:", data);
    res.json(data);
  } catch (err) {
    console.error("[ERROR] Failed to upload image:", err);
    res.status(500).json({
      error: "Failed to upload image",
      details: err.message,
      hint: "Please ensure ComfyUI is running and the input directory is accessible",
    });
  } finally {
    // Clean up the temporary file
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("[ERROR] Failed to delete temporary file:", err);
      });
    }
  }
});

// GET /api/comfy/input_images - list all images in ComfyUI's input directory
app.get("/api/comfy/input_images", async (req, res) => {
  try {
    const comfyApiUrl = req.query.comfyApiUrl || DEFAULT_COMFY_URL;
    console.log("[DEBUG] Fetching input images from ComfyUI at:", comfyApiUrl);

    // First check if ComfyUI is accessible
    try {
      const historyUrl = new URL("/history", comfyApiUrl);
      const historyResponse = await fetch(historyUrl.toString(), {
        timeout: 5000,
      });
      if (!historyResponse.ok) {
        throw new Error(`ComfyUI server returned ${historyResponse.status}`);
      }
    } catch (err) {
      console.error("[ERROR] ComfyUI server not accessible:", err);
      return res.status(503).json({
        error: "ComfyUI server not accessible",
        details: err.message,
      });
    }

    // Get the list of input images using the object_info endpoint
    const objectInfoUrl = new URL("/object_info", comfyApiUrl);
    const response = await fetch(objectInfoUrl.toString(), {
      timeout: 5000,
    });

    if (!response.ok) {
      console.error("[ERROR] ComfyUI returned error:", response.statusText);
      const errorText = await response.text();
      return res.status(response.status).json({
        error: "Failed to fetch input images",
        details: `ComfyUI returned: ${response.statusText}`,
        raw: errorText,
        url: comfyApiUrl,
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error("[ERROR] Failed to parse ComfyUI response:", parseErr);
      return res.status(500).json({
        error: "Invalid response from ComfyUI",
        details: "The server response could not be parsed as JSON",
        raw: await response.text(),
        url: comfyApiUrl,
      });
    }

    // Extract input images from the LoadImage node info
    const loadImageNode = data.LoadImage;
    if (!loadImageNode?.input?.required?.image?.[0]) {
      console.error("[ERROR] Unexpected response format:", data);
      return res.status(500).json({
        error: "Invalid response format",
        details: "Could not find input images in LoadImage node info",
        raw: data,
      });
    }

    const inputImages = loadImageNode.input.required.image[0];
    if (!Array.isArray(inputImages)) {
      console.error(
        "[ERROR] Input images data is not in expected format:",
        inputImages
      );
      return res.status(500).json({
        error: "Invalid response format",
        details: "Input images data is not in the expected array format",
        raw: inputImages,
      });
    }

    console.log(
      "[DEBUG] Successfully fetched input files:",
      inputImages.length || 0,
      "files"
    );

    res.json(inputImages);
  } catch (err) {
    console.error("[ERROR] Failed to fetch input images:", err);
    res.status(500).json({
      error: "Failed to fetch input images",
      details: err.message,
      hint: "Please ensure ComfyUI is running and the input directory is accessible",
      url: req.query.comfyApiUrl,
      code: err.code,
    });
  }
});

// GET /api/comfy/view - proxy for ComfyUI's view endpoint
app.get("/api/comfy/view", async (req, res) => {
  try {
    const comfyApiUrl = req.query.comfyApiUrl || DEFAULT_COMFY_URL;
    const filename = req.query.filename;
    const type = req.query.type || "input";

    if (!filename) {
      return res.status(400).json({ error: "filename is required" });
    }

    console.log(
      "[DEBUG] Fetching image from ComfyUI:",
      filename,
      "type:",
      type
    );

    // Properly construct the URL using the URL class instead of template literals
    const viewUrl = new URL("/view", comfyApiUrl);
    viewUrl.searchParams.append("filename", filename);
    viewUrl.searchParams.append("type", type);

    // Forward the request to ComfyUI
    const response = await fetch(viewUrl.toString(), { timeout: 5000 });

    if (!response.ok) {
      console.error("[ERROR] ComfyUI view failed:", response.statusText);
      return res.status(response.status).json({
        error: "Failed to fetch image",
        details: response.statusText,
      });
    }

    // Forward the content type
    res.set("Content-Type", response.headers.get("content-type"));

    // Pipe the response directly to our response
    response.body.pipe(res);
  } catch (err) {
    console.error("[ERROR] Failed to fetch image:", err);
    res.status(500).json({
      error: "Failed to fetch image",
      details: err.message,
    });
  }
});

// FRONTEND ROUTES - MUST BE LAST
// Serve frontend build files
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Log successful requests in production
if (isProduction) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${
          res.statusCode
        } ${duration}ms`
      );
    });
    next();
  });
}

// Catch-all route for React Router (must be the very last route)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// Server startup with database initialization
async function startServer() {
  try {
    // Create images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        prompt_id TEXT,
        workflow_id TEXT,
        config_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create airis table for configurations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS airis (
        id SERIAL PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Only listen after database setup is complete
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Start the server
startServer();
