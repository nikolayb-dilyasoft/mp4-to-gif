const logger = require('../utils/logger');

/**
 * Health check endpoint controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const healthCheck = (req, res) => {
    logger.info('Health check requested', {
        path: req.path,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl
    });

    res.json({
        status: 'success',
        data: {
            message: 'Service is healthy',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        }
    });
};

module.exports = {
    healthCheck
};
