const { getJobStatus } = require('../services/jobService');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

exports.getStatus = async (req, res, next) => {
    const jobId = req.params.jobId;

    try {
        logger.debug('Checking status for job:', { jobId });

        const status = await getJobStatus(jobId);
        if (!status) {
            logger.warn('Job not found:', { jobId });
            throw new NotFoundError(`Job with ID ${jobId} not found.`);
        }

        logger.info('Job status retrieved:', { jobId, status });

        res.status(200).json({
            status: 'success',
            data: {
                jobId: jobId,
                status: status
            }
        });
    } catch (error) {
        logger.error('Error retrieving job status:', {
            jobId,
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
};
