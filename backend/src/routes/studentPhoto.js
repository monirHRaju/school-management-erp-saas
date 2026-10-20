const express = require('express');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const cloudinary = require('../utils/cloudinary');

const router = express.Router();

const MAX_PHOTO_SIZE = 200 * 1024; // 200 KB

router.use(authMiddleware);
router.use(requireRole('admin', 'staff'));

// POST /api/students/photo - upload student photo and return URL
router.post('/', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, error: 'Image is required' });
    }

    // Validate base64 image size (max 200KB)
    const base64Part = image.includes(',') ? image.split(',')[1] : image;
    const byteLength = Buffer.byteLength(base64Part, 'base64');
    if (byteLength > MAX_PHOTO_SIZE) {
      return res.status(400).json({ success: false, error: 'Image size must not exceed 200KB' });
    }

    if (!process.env.CLOUDINARY_URL) {
      return res
        .status(500)
        .json({ success: false, error: 'CLOUDINARY_URL is not configured on the server' });
    }

    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: `school-management/students/${req.schoolId}`,
      transformation: [
        { width: 600, height: 600, crop: 'limit' },
        { quality: 'auto:low', fetch_format: 'auto' },
      ],
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
