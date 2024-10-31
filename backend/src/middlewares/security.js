const helmet = require('helmet');
const logger = require('../utils/logger');

// Configure security middleware
const security = {
    // Configure Helmet with strict security headers
    helmet: helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: []
            }
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: { policy: "same-site" },
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        ieNoOpen: true,
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xssFilter: true
    }),

    // Custom security middleware
    customSecurity: (req, res, next) => {
        // Remove sensitive headers
        res.removeHeader('X-Powered-By');
        
        // Add security headers not covered by Helmet
        res.setHeader('Permissions-Policy', 
            'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
        );

        // Log security-related events
        if (req.headers['x-forwarded-for'] || req.headers['x-forwarded-host']) {
            logger.warn('Potentially spoofed headers detected:', {
                ip: req.ip,
                path: req.path,
                forwardedFor: req.headers['x-forwarded-for'],
                forwardedHost: req.headers['x-forwarded-host']
            });
        }

        next();
    },

    // Middleware to validate content type
    validateContentType: (req, res, next) => {
        if (req.method === 'POST' || req.method === 'PUT') {
            const contentType = req.headers['content-type'];
            if (!contentType || !contentType.includes('multipart/form-data')) {
                logger.warn('Invalid content type:', {
                    ip: req.ip,
                    path: req.path,
                    contentType
                });
                return res.status(415).json({
                    error: {
                        message: 'Unsupported Media Type. Please use multipart/form-data.',
                        status: 415
                    }
                });
            }
        }
        next();
    }
};

module.exports = security;
