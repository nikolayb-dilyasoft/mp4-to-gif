const path = require('path');
const fs = require('fs-extra');
const redisClient = require('../utils/redis');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { AppError } = require('../utils/errors');

// Enqueue a new job
exports.enqueueJob = async (jobData) => {
    try {
        logger.info('Enqueueing new job:', { jobId: jobData.jobId });

        // Save job status and metadata
        await redisClient.set(`job:${jobData.jobId}`, {
            status: jobData.status,
            filePath: jobData.filePath,
            createdAt: new Date().toISOString()
        });

        // Push job to queue
        await redisClient.enqueue('conversionQueue', jobData);
        
        logger.info('Job enqueued successfully:', { jobId: jobData.jobId });
        return true;
    } catch (error) {
        logger.error('Error enqueueing job:', { 
            jobId: jobData.jobId,
            error: error.message 
        });
        throw new AppError(`Failed to enqueue job: ${error.message}`, 500);
    }
};

// Get job status
exports.getJobStatus = async (jobId) => {
    try {
        logger.debug('Getting status for job:', { jobId });

        const jobData = await redisClient.get(`job:${jobId}`);
        if (!jobData) {
            logger.warn('Job not found:', { jobId });
            return null;
        }

        logger.debug('Retrieved job status:', { 
            jobId, 
            status: jobData.status 
        });
        return jobData.status;
    } catch (error) {
        logger.error('Error getting job status:', { 
            jobId, 
            error: error.message 
        });
        throw new AppError(`Failed to get job status: ${error.message}`, 500);
    }
};

// Get GIF file path
exports.getJobResultPath = async (jobId) => {
    try {
        logger.debug('Getting result path for job:', { jobId });

        const jobData = await redisClient.get(`job:${jobId}`);
        if (!jobData || !jobData.filePath) {
            logger.warn('Job data not found or incomplete:', { jobId });
            return null;
        }

        const gifPath = path.join(
            config.storage.gifDir,
            path.basename(jobData.filePath, path.extname(jobData.filePath)) + '.gif'
        );

        // Verify the path is within the configured GIF directory
        const absoluteGifPath = path.resolve(gifPath);
        if (!absoluteGifPath.startsWith(config.storage.gifDir)) {
            logger.error('Security: Attempted to access file outside GIF directory:', { 
                jobId, 
                gifPath,
                gifDir: config.storage.gifDir 
            });
            throw new AppError('Invalid file path', 400);
        }
            
        if (await fs.pathExists(gifPath)) {
            logger.debug('GIF file found:', { jobId, gifPath });
            return gifPath;
        }

        logger.warn('GIF file not found:', { jobId, gifPath });
        return null;
    } catch (error) {
        logger.error('Error getting job result path:', { 
            jobId, 
            error: error.message 
        });
        throw new AppError(`Failed to get job result path: ${error.message}`, 500);
    }
};

// Update job status
exports.updateJobStatus = async (jobId, status) => {
    try {
        logger.debug('Updating status for job:', { jobId, status });

        const jobData = await redisClient.get(`job:${jobId}`);
        if (!jobData) {
            logger.warn('Attempted to update non-existent job:', { jobId });
            throw new AppError('Job not found', 404);
        }

        // Update job data with new status
        jobData.status = status;
        jobData.updatedAt = new Date().toISOString();
        
        await redisClient.set(`job:${jobId}`, jobData);

        logger.info('Job status updated successfully:', { 
            jobId, 
            status,
            updatedAt: jobData.updatedAt
        });
        return true;
    } catch (error) {
        logger.error('Error updating job status:', { 
            jobId, 
            status,
            error: error.message 
        });
        throw new AppError(`Failed to update job status: ${error.message}`, 500);
    }
};

// Clean up job data
exports.cleanupJob = async (jobId) => {
    try {
        logger.info('Cleaning up job data:', { jobId });

        const exists = await redisClient.exists(`job:${jobId}`);
        if (!exists) {
            logger.warn('Attempted to cleanup non-existent job:', { jobId });
            return false;
        }

        await redisClient.del(`job:${jobId}`);
        logger.info('Job data cleaned up successfully:', { jobId });
        return true;
    } catch (error) {
        logger.error('Error cleaning up job:', { 
            jobId, 
            error: error.message 
        });
        throw new AppError(`Failed to cleanup job: ${error.message}`, 500);
    }
};
