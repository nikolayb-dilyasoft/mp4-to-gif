const multer = require('multer');
const path = require('path');
const { enqueueJob } = require('../services/jobService');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const { ValidationError, FileProcessingError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { sanitizeFileName } = require('../middlewares/validation');
const FileType = require('file-type');

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, config.storage.uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = sanitizeFileName(file.originalname);
        cb(null, uniqueSuffix + path.extname(sanitizedName));
    }
});

// File Filter
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'video/mp4') {
        cb(null, true);
    } else {
        cb(new ValidationError('Invalid file type. Only MP4 is allowed.'), false);
    }
};

// Initialize Multer
const upload = multer({ 
    storage: storage,
    limits: { fileSize: config.storage.maxFileSize }, // Use configured file size limit
    fileFilter: fileFilter
}).single('file');

// Additional file type validation
const validateFileType = async (filePath) => {
    try {
        const type = await FileType.fromFile(filePath);
        if (!type || type.mime !== 'video/mp4') {
            logger.warn('Invalid file type detected:', { 
                filePath,
                detectedType: type ? type.mime : 'unknown' 
            });
            throw new ValidationError('Invalid file type. File content must be MP4.');
        }
    } catch (error) {
        if (error instanceof ValidationError) throw error;
        throw new FileProcessingError(`Error validating file type: ${error.message}`);
    }
};

// Video Validation Function
const validateVideo = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                logger.error('Failed to analyze video file:', { error: err.message, filePath });
                return reject(new FileProcessingError('Failed to analyze video file.'));
            }

            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            if (!videoStream) {
                logger.warn('No video stream found in file:', { filePath });
                return reject(new ValidationError('No video stream found in the file.'));
            }

            const width = videoStream.width;
            const height = videoStream.height;
            const duration = metadata.format.duration;

            logger.debug('Video metadata:', { width, height, duration, filePath });

            if (width > 1024 || height > 768) {
                logger.warn('Video dimensions exceed limits:', { width, height, filePath });
                return reject(new ValidationError(`Video dimensions (${width}x${height}) exceed maximum allowed (1024x768).`));
            }

            if (duration > 10) {
                logger.warn('Video duration exceeds limit:', { duration, filePath });
                return reject(new ValidationError(`Video duration (${duration.toFixed(1)}s) exceeds maximum allowed (10 seconds).`));
            }

            resolve();
        });
    });
};

// Helper function to clean up file on error
const cleanupFile = async (filePath) => {
    try {
        await fs.remove(filePath);
        logger.info('Successfully cleaned up file:', { filePath });
    } catch (err) {
        logger.error('Error deleting invalid file:', { error: err.message, filePath });
        // Don't throw here as this is a cleanup operation
    }
};

exports.uploadFile = (req, res, next) => {
    upload(req, res, async function(err) {
        // Handle multer errors
        if (err instanceof multer.MulterError) {
            logger.warn('Multer error during file upload:', { error: err.message });
            return next(new ValidationError(`Upload error: ${err.message}`));
        } else if (err) {
            logger.error('Unexpected error during file upload:', { error: err.message });
            return next(new AppError(err.message, 500));
        }

        // Check if file was uploaded
        if (!req.file) {
            logger.warn('No file provided in upload request');
            return next(new ValidationError('No file uploaded.'));
        }

        try {
            logger.info('File received:', { 
                filename: req.file.originalname,
                size: req.file.size,
                path: req.file.path 
            });

            // Additional file type validation
            await validateFileType(req.file.path);

            // Validate video dimensions and duration
            await validateVideo(req.file.path);

            const jobId = uuidv4();
            const jobData = {
                jobId: jobId,
                filePath: req.file.path,
                status: 'pending'
            };

            await enqueueJob(jobData);
            logger.info('Job enqueued successfully:', { jobId, filePath: req.file.path });

            res.status(200).json({
                status: 'success',
                data: {
                    jobId: jobId,
                    message: 'File uploaded successfully and queued for processing'
                }
            });
        } catch (error) {
            // Clean up the uploaded file if validation fails
            await cleanupFile(req.file.path);
            
            // Ensure all errors are properly wrapped
            if (!(error instanceof AppError)) {
                error = new FileProcessingError(`Unexpected error during file processing: ${error.message}`);
            }
            
            // Pass the error to the error handling middleware
            next(error);
        }
    });
};
