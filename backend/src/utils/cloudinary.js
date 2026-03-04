const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true,
  });
}

module.exports = cloudinary;

