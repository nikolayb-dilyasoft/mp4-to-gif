const redis = require('../src/utils/redis');
const ffmpeg = require('fluent-ffmpeg');
const logger = require('../src/utils/logger');

/**
 * Performs health checks for the worker
 * @returns {Promise<boolean>} true if all checks pass
 */
const checkHealth = async () => {
    try {
        // Check Redis connection
        await redis.ping();
        logger.debug('Redis connection check passed');

        // Check FFmpeg availability
        await new Promise((resolve, reject) => {
            ffmpeg.getAvailableFormats((err, formats) => {
                if (err) {
                    reject(new Error('FFmpeg not available'));
                } else {
                    resolve();
                }
            });
        });
        logger.debug('FFmpeg availability check passed');

        // Check access to required directories
        const fs = require('fs-extra');
        const uploadDir = process.env.UPLOAD_DIR || '/uploads';
        const gifDir = process.env.GIF_DIR || '/gifs';
        
        await fs.ensureDir(uploadDir);
        await fs.ensureDir(gifDir);
        logger.debug('Directory access check passed');

        return true;
    } catch (error) {
        logger.error('Health check failed:', error);
        return false;
    }
};

module.exports = checkHealth;
