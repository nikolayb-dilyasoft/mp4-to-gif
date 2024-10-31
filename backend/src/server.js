const app = require('./app');
const config = require('./utils/config');
const logger = require('./utils/logger');
const redis = require('./utils/redis');

// Track active connections
let activeConnections = new Set();

const server = app.listen(config.port, () => {
    logger.info(`Express server listening on port ${config.port}`);
});

// Track connections
server.on('connection', (connection) => {
    activeConnections.add(connection);
    connection.on('close', () => {
        activeConnections.delete(connection);
    });
});

// Handle server errors
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof config.port === 'string'
        ? 'Pipe ' + config.port
        : 'Port ' + config.port;

    // Handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            logger.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});

// Graceful shutdown handler
const shutdown = async (signal) => {
    let exitCode = 0;
    let shutdownTimeout;

    try {
        logger.info(`Received ${signal}. Starting graceful shutdown...`);

        // Set a timeout for the shutdown process
        shutdownTimeout = setTimeout(() => {
            logger.error('Shutdown timeout reached. Forcing exit.');
            process.exit(1);
        }, 30000); // 30 seconds timeout

        // Stop accepting new connections
        server.close(async (err) => {
            if (err) {
                logger.error('Error closing server:', err);
                exitCode = 1;
            }
            logger.info('Server stopped accepting new connections');
        });

        // Wait for active connections to close
        if (activeConnections.size > 0) {
            logger.info(`Waiting for ${activeConnections.size} active connections to close...`);
            
            // Destroy all active connections after a short delay
            setTimeout(() => {
                activeConnections.forEach((conn) => {
                    try {
                        conn.destroy();
                    } catch (err) {
                        logger.error('Error destroying connection:', err);
                    }
                });
            }, 5000); // Give connections 5 seconds to finish naturally
        }

        // Close Redis connection
        try {
            logger.info('Closing Redis connection...');
            await redis.shutdown();
            logger.info('Redis connection closed');
        } catch (err) {
            logger.error('Error closing Redis connection:', err);
            exitCode = 1;
        }

        // Clear the shutdown timeout
        clearTimeout(shutdownTimeout);

        // Final cleanup
        logger.info('Shutdown completed successfully');
        process.exit(exitCode);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
};

// Handle different termination signals
const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
signals.forEach((signal) => {
    process.on(signal, () => shutdown(signal));
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
});
