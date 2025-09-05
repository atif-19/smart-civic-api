const multer = require('multer');

// Configure Multer to store files in memory as buffers
// This allows us to process the image with the AI before uploading to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    // Set a file size limit to prevent abuse (e.g., 10 MB)
    fileSize: 10 * 1024 * 1024 
  }
});

module.exports = upload;