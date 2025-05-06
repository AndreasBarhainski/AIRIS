const fetch = require("node-fetch");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

async function testImageUpload() {
  const COMFY_URL = "http://localhost:8188";
  const TEST_IMAGE = path.join(__dirname, "images", "test-upload.png");

  try {
    // 1. Check if ComfyUI is running
    console.log("Testing ComfyUI connection...");
    const pingResponse = await fetch(`${COMFY_URL}/history`);
    if (!pingResponse.ok) {
      throw new Error(`ComfyUI server returned ${pingResponse.status}`);
    }
    console.log("ComfyUI is running!");

    // 2. Upload the test image
    console.log("\nUploading test image...");
    const formData = new FormData();
    formData.append("image", fs.createReadStream(TEST_IMAGE));
    formData.append("overwrite", "true");

    const uploadResponse = await fetch(`${COMFY_URL}/upload/image`, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
    }
    const uploadResult = await uploadResponse.json();
    console.log("Upload successful:", uploadResult);

    // 3. Verify the image is accessible
    console.log("\nVerifying image accessibility...");
    const viewResponse = await fetch(
      `${COMFY_URL}/view?filename=test-upload.png&type=input`
    );
    if (viewResponse.ok) {
      console.log("Image is accessible in ComfyUI input directory");

      // 4. Get input images list to confirm
      const objectInfoResponse = await fetch(`${COMFY_URL}/object_info`);
      if (objectInfoResponse.ok) {
        const objectInfo = await objectInfoResponse.json();
        const loadImageNode = objectInfo.LoadImage;
        if (loadImageNode?.input?.required?.image?.filebrowser_filter) {
          console.log(
            "\nAvailable input images:",
            loadImageNode.input.required.image.filebrowser_filter
          );
        }
      }
    } else {
      console.log(
        "Could not verify image accessibility:",
        viewResponse.statusText
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.log("\nMake sure ComfyUI is running on http://localhost:8188");
    }
  }
}

testImageUpload();
