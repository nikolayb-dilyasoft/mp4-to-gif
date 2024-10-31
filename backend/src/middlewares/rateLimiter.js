const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const rateLimitConfig = require('../config/rateLimits');

// Create different rate limiters for different endpoints
const rateLimiters = {
    // General API rate limiter
    api: rateLimit({
        windowMs: rateLimitConfig.api.windowMs,
        max: rateLimitConfig.api.max,
        message: rateLimitConfig.api.message,
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res) => {
            logger.warn('Rate limit exceeded:', {
                ip: req.ip,
                path: req.path
            });
            res.status(429).json({
                error: {
                    message: rateLimitConfig.api.message,
                    status: 429
                }
            });
        }
    }),

    // Stricter rate limiter for file uploads
    upload: rateLimit({
        windowMs: rateLimitConfig.upload.windowMs,
        max: rateLimitConfig.upload.max,
        message: rateLimitConfig.upload.message,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn('Upload rate limit exceeded:', {
                ip: req.ip,
                path: req.path
            });
            res.status(429).json({
                error: {
                    message: rateLimitConfig.upload.message,
                    status: 429
                }
            });
        }
    }),

    // Rate limiter for status checks
    status: rateLimit({
        windowMs: rateLimitConfig.status.windowMs,
        max: rateLimitConfig.status.max,
        message: rateLimitConfig.status.message,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn('Status check rate limit exceeded:', {
                ip: req.ip,
                path: req.path
            });
            res.status(429).json({
                error: {
                    message: rateLimitConfig.status.message,
                    status: 429
                }
            });
        }
    })
};

module.exports = rateLimiters;
