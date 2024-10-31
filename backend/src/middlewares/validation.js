const { param, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');
const path = require('path');

// Validation rules for different routes
const validations = {
    jobId: param('jobId')
        .trim()
        .notEmpty()
        .withMessage('Job ID is required')
        .isUUID()
        .withMessage('Invalid Job ID format')
};

// Middleware to validate job ID parameter
exports.validateJobId = [
    validations.jobId,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed:', {
                path: req.path,
                errors: errors.array()
            });
            
            const errorMessage = errors.array()
                .map(err => err.msg)
                .join(', ');
                
            return next(new ValidationError(errorMessage));
        }
        next();
    }
];

// Helper function to sanitize file names
exports.sanitizeFileName = (fileName) => {
    if (!fileName) return '';
    
    // Get the file extension
    const ext = path.extname(fileName);
    // Get the file name without extension
    const name = path.basename(fileName, ext);
    
    // Sanitize the name part
    const sanitizedName = name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace any non-alphanumeric chars (except . and -) with _
        .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
        .replace(/^\.+|\.+$/g, '') // Remove dots from start and end
        .substring(0, 200); // Limit base name length
    
    // Sanitize the extension
    const sanitizedExt = ext
        .replace(/[^a-zA-Z0-9.-]/g, '')
        .substring(0, 10); // Limit extension length
    
    // Combine sanitized name and extension
    return sanitizedName + sanitizedExt;
};

// Middleware to sanitize file names in multipart/form-data requests
exports.sanitizeFileUpload = (req, res, next) => {
    if (!req.files && !req.file) {
        return next();
    }

    try {
        // Handle single file upload
        if (req.file) {
            const originalName = req.file.originalname;
            req.file.originalname = exports.sanitizeFileName(originalName);
            logger.debug('Sanitized single file name:', {
                original: originalName,
                sanitized: req.file.originalname
            });
        }

        // Handle multiple files upload
        if (req.files) {
            req.files.forEach(file => {
                const originalName = file.originalname;
                file.originalname = exports.sanitizeFileName(originalName);
                logger.debug('Sanitized file name in multiple upload:', {
                    original: originalName,
                    sanitized: file.originalname
                });
            });
        }

        next();
    } catch (error) {
        logger.error('Error sanitizing file names:', error);
        next(new ValidationError('Error processing file names'));
    }
};

// Middleware to validate file paths
exports.validateFilePath = (allowedDirs) => (req, res, next) => {
    const filePath = req.params.filePath || req.query.path || req.body.path;
    
    if (!filePath) {
        return next();
    }

    try {
        // Sanitize and validate the file path
        const sanitizedPath = exports.sanitizeFileName(path.basename(filePath));
        const normalizedPath = path.normalize(sanitizedPath).replace(/^(\.\.[\/\\])+/, '');

        // Check if the path is within allowed directories
        const isAllowed = allowedDirs.some(dir => {
            const fullPath = path.join(dir, normalizedPath);
            return fullPath.startsWith(dir);
        });

        if (!isAllowed) {
            logger.warn('Attempted access to unauthorized path:', {
                original: filePath,
                normalized: normalizedPath
            });
            return next(new ValidationError('Invalid file path'));
        }

        // Attach sanitized path to request
        req.sanitizedFilePath = normalizedPath;
        next();
    } catch (error) {
        logger.error('Error validating file path:', error);
        next(new ValidationError('Error processing file path'));
    }
};
