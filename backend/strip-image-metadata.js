const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const imagesDir = path.join(__dirname, "images");

fs.readdir(imagesDir, async (err, files) => {
  if (err) {
    console.error("Failed to read images directory:", err);
    process.exit(1);
  }

  const pngs = files.filter((f) => f.endsWith(".png"));
  for (const file of pngs) {
    const filePath = path.join(imagesDir, file);
    const tempPath = filePath + ".stripped";
    try {
      await sharp(filePath).withMetadata({ exif: undefined }).toFile(tempPath);
      fs.renameSync(tempPath, filePath);
      console.log(`Stripped metadata from: ${file}`);
    } catch (e) {
      console.error(`Failed to strip metadata from ${file}:`, e);
    }
  }
  console.log("Done.");
});
