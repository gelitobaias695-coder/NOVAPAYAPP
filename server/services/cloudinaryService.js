import { v2 as cloudinary } from 'cloudinary';

// Configure from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} folder - Cloudinary folder to upload to
 * @returns {Promise<string>} - Permanent secure_url from Cloudinary
 */
export async function uploadBuffer(buffer, folder = 'novapay') {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
                quality: 'auto:good',
                fetch_format: 'auto',
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        ).end(buffer);
    });
}

/**
 * Upload existing local files to Cloudinary by path
 * @param {string} filePath - Local file path
 * @returns {Promise<string>} - Permanent secure_url from Cloudinary
 */
export async function uploadFile(filePath, folder = 'novapay') {
    const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'auto',
        quality: 'auto:good',
        fetch_format: 'auto',
    });
    return result.secure_url;
}

export default cloudinary;
