const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sportvibe/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'fill', gravity: 'face' }],
  },
});

// Storage for tournament banners
const tournamentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sportvibe/tournaments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 630, crop: 'fill' }],
  },
});

// Storage for certificates
const certificateStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sportvibe/certificates',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
  },
});

const uploadProfile = multer({ storage: profileStorage });
const uploadTournament = multer({ storage: tournamentStorage });
const uploadCertificate = multer({ storage: certificateStorage });

module.exports = { cloudinary, uploadProfile, uploadTournament, uploadCertificate };
