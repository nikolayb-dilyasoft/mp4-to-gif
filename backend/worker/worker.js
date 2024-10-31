const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const jobService = require('../src/services/jobService');
const logger = require('../src/utils/logger');
const redis = require('../src/utils/redis');
const config = require('../src/utils/config');

let isShuttingDown = false;
let currentJob = null;

// Job Processing Function
const processJob = async (jobData) => {
    const { jobId, filePath } = jobData;
    const gifPath = path.join(config.storage.gifDir, path.basename(filePath, path.extname(filePath)) + '.gif');

    try {
        logger.info(`Starting job processing`, { jobId, filePath, gifPath });
        currentJob = jobId;

        // Update job status to 'processing'
        await jobService.updateJobStatus(jobId, 'processing');

        // Ensure output directory exists
        await fs.ensureDir(config.storage.gifDir);

        // Log FFmpeg version
        await new Promise((resolve, reject) => {
            ffmpeg.getAvailableFormats((err, formats) => {
                if (err) {
                    logger.error('FFmpeg format check failed:', err);
                    reject(err);
                } else {
                    logger.info('FFmpeg is available');
                    resolve();
                }
            });
        });

        // Perform conversion using FFmpeg
        await new Promise((resolve, reject) => {
            let ffmpegProcess = ffmpeg(filePath)
                .size('?x400') // Maintain aspect ratio with height 400px
                .fps(5)
                .output(gifPath)
                .on('start', (commandLine) => {
                    logger.info(`FFmpeg started with command: ${commandLine}`);
                })
                .on('progress', (progress) => {
                    logger.debug(`Processing: ${progress.percent}% done`);
                })
                .on('end', () => {
                    logger.info(`Job ${jobId} completed successfully`);
                    resolve();
                })
                .on('error', (err) => {
                    logger.error(`Job ${jobId} failed:`, err.message);
                    reject(err);
                });

            // Handle graceful shutdown during conversion
            if (isShuttingDown) {
                ffmpegProcess.kill('SIGTERM');
                reject(new Error('Worker is shutting down'));
            }

            ffmpegProcess.run();
        });

        // Update job status to 'completed'
        await jobService.updateJobStatus(jobId, 'completed');

        // Clean up the original MP4 file
        await fs.remove(filePath);
        logger.info(`Job completed successfully`, { jobId, gifPath });
    } catch (error) {
        logger.error(`Error processing job ${jobId}:`, error);
        // Update job status to 'failed'
        await jobService.updateJobStatus(jobId, 'failed');
        
        // Attempt to clean up any failed files
        try {
            await fs.remove(filePath);
            if (await fs.pathExists(gifPath)) {
                await fs.remove(gifPath);
            }
        } catch (cleanupError) {
            logger.error('Error during cleanup:', cleanupError);
        }
    } finally {
        currentJob = null;
    }
};

// Worker Loop
const startWorker = async () => {
    try {
        // Log worker startup
        logger.info('Starting MP4 to GIF conversion worker...', {
            config: {
                redisHost: config.redis.host,
                redisPort: config.redis.port,
                uploadDir: config.storage.uploadDir,
                gifDir: config.storage.gifDir
            }
        });

        // Connect to Redis
        await redis.connect();
        logger.info('Worker connected to Redis server');

        // Log worker ready
        logger.info('Worker is ready and listening for jobs on Redis queue: conversionQueue');
        
        while (!isShuttingDown) {
            try {
                // Use blocking dequeue with timeout
                const jobData = await redis.dequeue('conversionQueue', 0); // 0 means block indefinitely
                if (jobData && !isShuttingDown) {
                    logger.info('Processing new job:', { jobId: jobData.jobId });
                    await processJob(jobData);
                }
            } catch (error) {
                if (!isShuttingDown) {
                    logger.error('Error in worker loop:', error);
                    // Wait before retrying to prevent tight error loops
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
    } catch (error) {
        logger.error('Fatal error starting worker:', error);
        process.exit(1);
    }
};

// Graceful shutdown handler
const shutdown = async (signal) => {
    if (isShuttingDown) return;
    
    isShuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
        // Wait for current job to complete if any
        if (currentJob) {
            logger.info(`Waiting for current job ${currentJob} to complete...`);
            // Give the current job some time to complete
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Cleanup and disconnect
        logger.info('Closing Redis connection...');
        await redis.shutdown();
        
        logger.info('Worker shutdown complete');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle process termination
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
});

// Start the Worker
startWorker();
