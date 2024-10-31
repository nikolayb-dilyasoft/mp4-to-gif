class AppError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

class NotFoundError extends AppError {
    constructor(message) {
        super(message || 'Resource not found', 404);
    }
}

class FileProcessingError extends AppError {
    constructor(message) {
        super(message, 422);
    }
}

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    FileProcessingError
};
