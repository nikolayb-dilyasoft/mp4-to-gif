const Redis = require('redis');
const logger = require('./logger');
const config = require('./config');
const { AppError } = require('./errors');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = config.redis.maxRetries;
        this.retryDelay = config.redis.retryDelay;
        this.setupClient();
    }

    setupClient() {
        // Create Redis client with modern configuration
        this.client = Redis.createClient({
            url: `redis://${config.redis.host}:${config.redis.port}`,
            password: config.redis.password,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries >= this.maxReconnectAttempts) {
                        logger.error('Max reconnection attempts reached, giving up');
                        return new Error('Max reconnection attempts reached');
                    }
                    
                    const delay = Math.min(this.retryDelay * Math.pow(2, retries), 30000);
                    logger.info('Attempting to reconnect to Redis:', {
                        attempt: retries + 1,
                        maxAttempts: this.maxReconnectAttempts,
                        delay
                    });
                    return delay;
                }
            }
        });

        // Handle Redis events
        this.client.on('connect', () => {
            logger.info('Connected to Redis server');
            this.reconnectAttempts = 0;
            this.isConnecting = false;
        });

        this.client.on('error', (err) => {
            logger.error('Redis client error:', { error: err.message });
        });

        this.client.on('end', () => {
            logger.warn('Redis connection closed');
        });

        this.client.on('reconnecting', () => {
            logger.info('Attempting to reconnect to Redis');
            this.reconnectAttempts++;
        });

        // Connect to Redis
        this.connect();
    }

    async connect() {
        if (this.isConnecting) return;

        this.isConnecting = true;
        try {
            await this.client.connect();
        } catch (error) {
            logger.error('Failed to connect to Redis:', { error: error.message });
            this.isConnecting = false;
            throw new AppError(`Redis connection failed: ${error.message}`, 500);
        }
    }

    // Helper method to ensure client is connected
    ensureConnection() {
        if (!this.client?.isOpen) {
            throw new AppError('Redis client is not connected', 500);
        }
    }

    // Redis operations with error handling
    async set(key, value, options = {}) {
        try {
            this.ensureConnection();
            await this.client.set(key, JSON.stringify(value), options);
            logger.debug('Redis SET:', { key: key.split(':')[0] + ':***' });
        } catch (error) {
            logger.error('Redis SET failed:', { key: key.split(':')[0] + ':***', error: error.message });
            throw new AppError(`Failed to set Redis key: ${error.message}`, 500);
        }
    }

    async get(key) {
        try {
            this.ensureConnection();
            const value = await this.client.get(key);
            logger.debug('Redis GET:', { key: key.split(':')[0] + ':***' });
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Redis GET failed:', { key: key.split(':')[0] + ':***', error: error.message });
            throw new AppError(`Failed to get Redis key: ${error.message}`, 500);
        }
    }

    async del(key) {
        try {
            this.ensureConnection();
            await this.client.del(key);
            logger.debug('Redis DEL:', { key: key.split(':')[0] + ':***' });
        } catch (error) {
            logger.error('Redis DEL failed:', { key: key.split(':')[0] + ':***', error: error.message });
            throw new AppError(`Failed to delete Redis key: ${error.message}`, 500);
        }
    }

    async exists(key) {
        try {
            this.ensureConnection();
            const result = await this.client.exists(key);
            logger.debug('Redis EXISTS:', { key: key.split(':')[0] + ':***' });
            return result === 1;
        } catch (error) {
            logger.error('Redis EXISTS failed:', { key: key.split(':')[0] + ':***', error: error.message });
            throw new AppError(`Failed to check Redis key: ${error.message}`, 500);
        }
    }

    // Queue operations with blocking support
    async enqueue(queueName, data) {
        try {
            this.ensureConnection();
            await this.client.lPush(queueName, JSON.stringify(data));
            logger.debug('Redis ENQUEUE:', { queue: queueName });
        } catch (error) {
            logger.error('Redis ENQUEUE failed:', { queue: queueName, error: error.message });
            throw new AppError(`Failed to enqueue data: ${error.message}`, 500);
        }
    }

    async dequeue(queueName, timeout = 0) {
        try {
            this.ensureConnection();
            // Use BRPOP for blocking dequeue with timeout
            const result = await this.client.brPop(queueName, timeout);
            if (result) {
                logger.debug('Redis DEQUEUE:', { queue: queueName });
                return JSON.parse(result.element);
            }
            return null;
        } catch (error) {
            logger.error('Redis DEQUEUE failed:', { queue: queueName, error: error.message });
            throw new AppError(`Failed to dequeue data: ${error.message}`, 500);
        }
    }

    // Graceful shutdown
    async shutdown() {
        if (this.client?.isOpen) {
            logger.info('Shutting down Redis client');
            try {
                await this.client.quit();
                logger.info('Redis client shutdown complete');
            } catch (error) {
                logger.error('Error during Redis shutdown:', { error: error.message });
                // Force close if quit fails
                await this.client.disconnect();
            }
        }
    }
}

// Create and export a singleton instance
const redisClient = new RedisClient();
module.exports = redisClient;
