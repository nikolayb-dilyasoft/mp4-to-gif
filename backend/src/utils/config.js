const path = require('path');
const logger = require('./logger');
const { AppError } = require('./errors');

// Load environment variables
require('dotenv').config();

// Required environment variables
const requiredEnvVars = [
    'REDIS_HOST',
    'REDIS_PORT',
    'UPLOAD_DIR',
    'GIF_DIR'
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingVars.length > 0) {
    const error = new AppError(`Missing required environment variables: ${missingVars.join(', ')}`, 500);
    logger.error('Configuration Error:', { error: error.message });
    throw error;
}

// Helper function to validate numeric values
const validateNumber = (value, defaultValue, min, max, name) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
        logger.warn(`Invalid ${name} value, using default:`, { value, default: defaultValue });
        return defaultValue;
    }
    if (min !== undefined && num < min) {
        logger.warn(`${name} below minimum, using minimum:`, { value: num, min });
        return min;
    }
    if (max !== undefined && num > max) {
        logger.warn(`${name} above maximum, using maximum:`, { value: num, max });
        return max;
    }
    return num;
};

// Helper function to resolve directory paths
const resolveDir = (dir) => {
    if (!dir) return null;
    
    try {
        // If it's already an absolute path, use it directly
        if (path.isAbsolute(dir)) {
            return path.normalize(dir);
        }
        // Otherwise, resolve it relative to the project root
        return path.resolve(__dirname, '..', '..', dir);
    } catch (error) {
        logger.error('Error resolving directory path:', { dir, error: error.message });
        throw new AppError(`Invalid directory path: ${dir}`, 500);
    }
};

// Configuration object
const config = {
    // Server Configuration
    port: validateNumber(process.env.PORT, 3000, 1, 65535, 'PORT'),

    // Redis Configuration
    redis: {
        host: process.env.REDIS_HOST,
        port: validateNumber(process.env.REDIS_PORT, 6379, 1, 65535, 'REDIS_PORT'),
        password: process.env.REDIS_PASSWORD || null,
        maxRetries: validateNumber(process.env.REDIS_MAX_RETRIES, 10, 0, 100, 'REDIS_MAX_RETRIES'),
        retryDelay: validateNumber(process.env.REDIS_RETRY_DELAY, 3000, 100, 30000, 'REDIS_RETRY_DELAY')
    },

    // File Storage Configuration
    storage: {
        uploadDir: resolveDir(process.env.UPLOAD_DIR),
        gifDir: resolveDir(process.env.GIF_DIR),
        maxFileSize: validateNumber(process.env.MAX_FILE_SIZE, 50, 1, 1000, 'MAX_FILE_SIZE') * 1024 * 1024 // Convert MB to bytes
    },

    // Worker Configuration
    worker: {
        maxConcurrentJobs: validateNumber(process.env.MAX_CONCURRENT_JOBS, 5, 1, 20, 'MAX_CONCURRENT_JOBS'),
        jobTimeout: validateNumber(process.env.JOB_TIMEOUT, 300000, 5000, 3600000, 'JOB_TIMEOUT')
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        // Add more logging config as needed
    },

    // CORS Configuration
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:4200'
    },

    // SSL Configuration (if provided)
    ssl: process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH ? {
        key: resolveDir(process.env.SSL_KEY_PATH),
        cert: resolveDir(process.env.SSL_CERT_PATH)
    } : null
};

// Validate critical paths
if (!config.storage.uploadDir || !config.storage.gifDir) {
    throw new AppError('Invalid storage directory configuration', 500);
}

// Ensure upload and gif directories exist
const fs = require('fs-extra');
try {
    fs.ensureDirSync(config.storage.uploadDir);
    fs.ensureDirSync(config.storage.gifDir);
    
    // Verify directories are writable
    fs.accessSync(config.storage.uploadDir, fs.constants.W_OK);
    fs.accessSync(config.storage.gifDir, fs.constants.W_OK);
} catch (error) {
    logger.error('Error ensuring directory access:', { error: error.message });
    throw new AppError(`Failed to ensure directory access: ${error.message}`, 500);
}

// Log configuration on startup (excluding sensitive data)
logger.info('Application configuration loaded:', {
    port: config.port,
    redis: {
        host: config.redis.host,
        port: config.redis.port,
        hasPassword: !!config.redis.password
    },
    storage: {
        uploadDir: config.storage.uploadDir,
        gifDir: config.storage.gifDir,
        maxFileSize: `${config.storage.maxFileSize / (1024 * 1024)}MB`
    },
    worker: config.worker,
    logging: config.logging,
    cors: config.cors,
    hasSSL: !!config.ssl
});

module.exports = config;
