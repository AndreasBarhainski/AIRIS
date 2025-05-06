const fetch = require("node-fetch");

async function testGetInputImages() {
  const COMFY_URL = "http://localhost:8188";

  try {
    // 1. First check if ComfyUI is running
    console.log("Testing ComfyUI connection...");
    const pingResponse = await fetch(`${COMFY_URL}/history`);
    if (!pingResponse.ok) {
      throw new Error(`ComfyUI server returned ${pingResponse.status}`);
    }
    console.log("✅ ComfyUI is running!");

    // 2. Get the object_info to find available input images
    console.log("\nFetching object_info from ComfyUI...");
    const objectInfoResponse = await fetch(`${COMFY_URL}/object_info`);
    if (!objectInfoResponse.ok) {
      throw new Error(
        `Failed to fetch object info: ${objectInfoResponse.statusText}`
      );
    }
    const objectInfo = await objectInfoResponse.json();
    console.log("✅ Successfully fetched object_info");

    // 3. Extract input images from LoadImage node info
    console.log("\nExtracting input images from LoadImage node...");
    const loadImageNode = objectInfo.LoadImage;
    console.log(
      "\nLoadImage node structure:",
      JSON.stringify(loadImageNode, null, 2)
    );

    if (!loadImageNode?.input?.required?.image?.[0]) {
      throw new Error("Could not find input images in LoadImage node info");
    }

    const inputImages = loadImageNode.input.required.image[0];
    if (!Array.isArray(inputImages)) {
      throw new Error("Input images data is not in the expected array format");
    }
    console.log("\nAvailable input images:", inputImages);
    console.log(`\n✅ Found ${inputImages.length} input images`);

    // 4. Try to view one of the images if any exist
    if (inputImages.length > 0) {
      console.log(
        `\nTesting view endpoint with first image: ${inputImages[0]}`
      );
      const viewResponse = await fetch(
        `${COMFY_URL}/view?filename=${encodeURIComponent(
          inputImages[0]
        )}&type=input`,
        { method: "HEAD" } // Just check if accessible, don't download
      );
      if (viewResponse.ok) {
        console.log("✅ Successfully verified image is accessible");
      } else {
        console.log("❌ Could not access image:", viewResponse.statusText);
      }
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.log("\nMake sure ComfyUI is running on http://localhost:8188");
    }
    process.exit(1);
  }
}

testGetInputImages();
