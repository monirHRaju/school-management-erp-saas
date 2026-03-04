const express = require('express');
const authMiddleware = require('../middleware/auth');
const cloudinary = require('../utils/cloudinary');

const router = express.Router();

router.use(authMiddleware);

// POST /api/students/photo - upload student photo and return URL
router.post('/', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'Image is required' });
    }
    if (!process.env.CLOUDINARY_URL) {
      return res
        .status(500)
        .json({ success: false, error: 'CLOUDINARY_URL is not configured on the server' });
    }

    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: `school-management/students/${req.schoolId}`,
    });

    res.json({
      success: true,
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

