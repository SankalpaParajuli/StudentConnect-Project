const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (fileStream, fileName) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'studentconnect/avatars',
          public_id: fileName,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      fileStream.pipe(uploadStream);
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

const uploadFile = async (fileStream, fileName, folder = 'studentconnect') => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: fileName,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Handle both stream and buffer inputs
      if (fileStream && typeof fileStream.pipe === 'function') {
        fileStream.pipe(uploadStream);
      } else if (Buffer.isBuffer(fileStream)) {
        uploadStream.end(fileStream);
      } else {
        reject(new Error('Invalid file input: must be a stream or buffer'));
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

module.exports = {
  uploadImage,
  uploadFile,
  deleteFile,
  deleteImage,
};
