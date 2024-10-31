const { getJobStatus, getJobResultPath } = require('../services/jobService');
const path = require('path');
const { NotFoundError, ValidationError, FileProcessingError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../utils/config');

exports.getResult = async (req, res, next) => {
    const jobId = req.params.jobId;

    try {
        logger.debug('Retrieving result for job:', { jobId });

        const status = await getJobStatus(jobId);
        if (!status) {
            logger.warn('Job not found when retrieving result:', { jobId });
            throw new NotFoundError(`Job with ID ${jobId} not found.`);
        }

        if (status !== 'completed') {
            logger.warn('Attempted to retrieve result for incomplete job:', { jobId, status });
            throw new ValidationError(`Job ${jobId} is not completed yet. Current status: ${status}`);
        }

        const gifPath = await getJobResultPath(jobId);
        if (!gifPath) {
            logger.error('GIF result not found for completed job:', { jobId });
            throw new NotFoundError(`GIF result for job ${jobId} not found.`);
        }

        // Verify the file exists and is within the configured GIF directory using path.relative
        const absoluteGifPath = path.resolve(gifPath);
        const relativePath = path.relative(config.storage.gifDir, absoluteGifPath);
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            logger.error('Security: Attempted to access file outside GIF directory:', { 
                jobId, 
                gifPath,
                gifDir: config.storage.gifDir 
            });
            throw new ValidationError('Invalid file path.');
        }

        logger.info('Sending GIF result:', { jobId, gifPath });

        // Send the file with proper headers
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Content-Disposition', `attachment; filename="converted-${jobId}.gif"`);
        res.sendFile(absoluteGifPath, (err) => {
            if (err) {
                logger.error('Error sending GIF file:', {
                    jobId,
                    gifPath,
                    error: err.message
                });
                next(new FileProcessingError(`Error sending GIF file: ${err.message}`));
            } else {
                logger.info('GIF file sent successfully:', { jobId });
            }
        });
    } catch (error) {
        logger.error('Error retrieving result:', {
            jobId,
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
};
