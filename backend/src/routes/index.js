const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const statusController = require('../controllers/statusController');
const resultController = require('../controllers/resultController');
const healthController = require('../controllers/healthController');
const { validateJobId } = require('../middlewares/validation');
const logger = require('../utils/logger');

// Log route access - applied to all routes
const logRoute = (req, res, next) => {
    logger.info('Route accessed:', {
        method: req.method,
        path: req.path,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
};

// Apply logging middleware to all routes
router.use(logRoute);

// Register routes
const registerRoutes = () => {
    // Health Check Routes
    router.get('/', healthController.healthCheck);
    router.get('/health', healthController.healthCheck);

    // File Upload Route
    router.post('/upload', uploadController.uploadFile);

    // Job Status Route - with jobId validation
    router.get('/status/:jobId', validateJobId, statusController.getStatus);

    // Get GIF Result Route - with jobId validation
    router.get('/result/:jobId', validateJobId, resultController.getResult);

    // Log registered routes
    const registeredRoutes = router.stack
        .filter(r => r.route)
        .map(r => ({
            method: Object.keys(r.route.methods)[0].toUpperCase(),
            path: r.route.path,
            handler: r.route.stack[0].name || 'anonymous'
        }));

    logger.info('Routes registered in router:', { routes: registeredRoutes });
};

// Register routes
registerRoutes();

module.exports = router;
