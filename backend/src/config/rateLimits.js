const validateNumber = (value, defaultValue, min, max) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return defaultValue;
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    return num;
};

// Rate Limiter Configuration
const rateLimits = {
    api: {
        windowMs: validateNumber(process.env.API_RATE_LIMIT_WINDOW, 15 * 60 * 1000, 1000, 3600000), // Default: 15 minutes
        max: validateNumber(process.env.API_RATE_LIMIT_MAX, 100, 1, 1000), // Default: 100 requests
        message: 'Too many requests from this IP, please try again later'
    },
    upload: {
        windowMs: validateNumber(process.env.UPLOAD_RATE_LIMIT_WINDOW, 60 * 60 * 1000, 1000, 24 * 3600000), // Default: 1 hour
        max: validateNumber(process.env.UPLOAD_RATE_LIMIT_MAX, 10, 1, 100), // Default: 10 uploads
        message: 'Upload limit exceeded, please try again later'
    },
    status: {
        windowMs: validateNumber(process.env.STATUS_RATE_LIMIT_WINDOW, 60 * 1000, 1000, 3600000), // Default: 1 minute
        max: validateNumber(process.env.STATUS_RATE_LIMIT_MAX, 30, 1, 300), // Default: 30 requests
        message: 'Too many status checks, please slow down'
    }
};

module.exports = rateLimits;
