const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const { AppError } = require('./utils/errors');
const logger = require('./utils/logger');
const config = require('./utils/config');
const security = require('./middlewares/security');
const rateLimiters = require('./middlewares/rateLimiter');

// Initialize Express application
logger.info('Initializing Express application...');
const app = express();

// Security middleware
logger.info('Applying security middleware...');
app.use(security.helmet);
app.use(security.customSecurity);

// CORS configuration
logger.info('Configuring CORS...', { origin: config.cors.origin });
app.use(cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition']
}));

// Body parsing middleware
logger.info('Configuring body parsers...');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// HTTP request logging
logger.info('Setting up HTTP request logging...');
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting - apply specific limiters before general API limiter
logger.info('Setting up rate limiters...');
app.use('/api/upload', rateLimiters.upload);
app.use('/api/status', rateLimiters.status);
app.use('/api', rateLimiters.api); // General API limiter applied last

// Validate content type for file uploads
logger.info('Setting up content type validation for uploads...');
app.use('/api/upload', security.validateContentType);

// Static file serving with security headers
logger.info('Configuring static file serving...');
const staticOptions = {
    dotfiles: 'deny',
    etag: true,
    maxAge: '1h',
    index: false,
    setHeaders: (res) => {
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
};

app.use('/uploads', express.static(config.storage.uploadDir, staticOptions));
app.use('/gifs', express.static(config.storage.gifDir, staticOptions));

// Debug middleware to log all requests
app.use((req, res, next) => {
    logger.info('Request received:', {
        method: req.method,
        path: req.path,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl
    });
    next();
});

// Health check endpoint at root level
app.get('/health', (req, res) => {
    logger.info('Health check accessed at root');
    res.json({
        status: 'success',
        data: {
            message: 'Service is healthy',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        }
    });
});

// Import and mount routes - after all middleware is set up
logger.info('Importing routes...');
const routes = require('./routes');

logger.info('Mounting routes...');
app.use('/api', routes);

// Log mounted routes in a readable format
const getRouteInfo = (stack, prefix = '') => {
    const routes = [];
    stack.forEach(middleware => {
        if (middleware.route) {
            // Routes directly on app
            const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
            routes.push({
                path: prefix + middleware.route.path,
                methods,
                type: 'endpoint'
            });
        } else if (middleware.name === 'router') {
            // Router middleware
            middleware.handle.stack.forEach(handler => {
                if (handler.route) {
                    const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase());
                    routes.push({
                        path: prefix + handler.route.path,
                        methods,
                        handler: handler.route.stack[0].name || '<anonymous>',
                        type: 'endpoint'
                    });
                }
            });
        }
    });
    return routes;
};

logger.info('Available routes:', {
    endpoints: [
        // Static routes
        { path: '/uploads/*', methods: ['GET'], type: 'static' },
        { path: '/gifs/*', methods: ['GET'], type: 'static' },
        // Health check
        { path: '/health', methods: ['GET'], type: 'endpoint' },
        // API routes
        ...getRouteInfo(app._router.stack, '/api')
    ]
});

// 404 Handler
app.use((req, res, next) => {
    logger.warn('Route not found:', {
        method: req.method,
        path: req.path,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl
    });
    next(new AppError('Route not found', 404));
});

// Error Handler
app.use((err, req, res, next) => {
    logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        path: req.path
    });

    if (err instanceof AppError) {
        return res.status(err.status).json({
            error: {
                message: err.message,
                status: err.status
            }
        });
    }

    const status = err.status || 500;
    res.status(status).json({
        error: {
            message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
            status: status
        }
    });
});

module.exports = app;
