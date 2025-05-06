const fetch = require("node-fetch");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

async function testComfyAPI() {
  const COMFY_URL = "http://localhost:8188";

  try {
    // First test if ComfyUI is running
    console.log("Testing ComfyUI connection...");
    const pingResponse = await fetch(`${COMFY_URL}/history`);
    if (!pingResponse.ok) {
      throw new Error(`ComfyUI server returned ${pingResponse.status}`);
    }
    console.log("ComfyUI is running!");

    // List input images using object info endpoint
    console.log("\nFetching input images...");
    const objectInfoResponse = await fetch(`${COMFY_URL}/object_info`);
    if (!objectInfoResponse.ok) {
      throw new Error(
        `Failed to fetch object info: ${objectInfoResponse.statusText}`
      );
    }
    const objectInfo = await objectInfoResponse.json();

    // Find LoadImage node info which contains the input images
    const loadImageNode = objectInfo.LoadImage;
    if (
      loadImageNode &&
      loadImageNode.input &&
      loadImageNode.input.required &&
      loadImageNode.input.required.image
    ) {
      console.log(
        "Available input images:",
        loadImageNode.input.required.image.filebrowser_filter
      );
    } else {
      console.log("No input images found in LoadImage node info");
    }

    // Test uploading an image
    console.log("\nTesting image upload...");
    const testImage = path.join(__dirname, "..", "test.png");
    if (fs.existsSync(testImage)) {
      const formData = new FormData();
      formData.append("image", fs.createReadStream(testImage));
      formData.append("overwrite", "true");

      const uploadResponse = await fetch(`${COMFY_URL}/upload/image`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
      }
      const uploadResult = await uploadResponse.json();
      console.log("Upload result:", uploadResult);

      // Verify the image was uploaded by checking if we can view it
      console.log("\nVerifying uploaded image...");
      const viewResponse = await fetch(
        `${COMFY_URL}/view?filename=test.png&type=input`
      );
      if (viewResponse.ok) {
        console.log("Successfully verified uploaded image");
      } else {
        console.log(
          "Could not verify uploaded image:",
          viewResponse.statusText
        );
      }
    } else {
      console.log("No test.png found in project root");
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.log("\nMake sure ComfyUI is running on http://localhost:8188");
    }
  }
}

testComfyAPI();
