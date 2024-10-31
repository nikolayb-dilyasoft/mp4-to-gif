# MP4 to GIF Conversion Service - Backend

A robust Node.js backend service that converts MP4 videos to GIF format with comprehensive error handling, security measures, and monitoring capabilities.

## Features

- MP4 to GIF conversion with FFmpeg
- Video validation (dimensions, duration, format)
- Secure file upload handling
- Real-time conversion status updates
- Redis-based job queue system
- Comprehensive error handling
- Detailed logging system
- Rate limiting and security measures
- Input validation and sanitization

## Prerequisites

- Node.js >= 14.0.0
- Redis Server
- FFmpeg installed on the system
- Git (for version control)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mp4-to-gif-converter
cd mp4-to-gif-converter/backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env` file (see Environment Variables section below)

5. Create required directories:
```bash
mkdir uploads gifs logs
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port number | 3000 | No |
| REDIS_HOST | Redis server host | localhost | Yes |
| REDIS_PORT | Redis server port | 6379 | Yes |
| REDIS_PASSWORD | Redis password | null | No |
| UPLOAD_DIR | Directory for uploaded videos | uploads | Yes |
| GIF_DIR | Directory for converted GIFs | gifs | Yes |
| MAX_FILE_SIZE | Maximum file size in MB | 50 | No |
| LOG_LEVEL | Logging level | info | No |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:4200 | No |
| MAX_CONCURRENT_JOBS | Maximum concurrent conversion jobs | 5 | No |
| JOB_TIMEOUT | Job timeout in milliseconds | 300000 | No |

## Running the Application

### Development Mode

1. Start the main server:
```bash
npm run dev
```

2. Start the worker process:
```bash
npm run dev:worker
```

Or run both simultaneously:
```bash
npm run dev:all
```

### Production Mode

1. Start the main server:
```bash
npm start
```

2. Start the worker process:
```bash
npm run worker
```

## API Endpoints

### POST /api/upload
Upload an MP4 file for conversion.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: 
  - file: MP4 file (required)

**Response:**
```json
{
    "status": "success",
    "data": {
        "jobId": "uuid-string",
        "message": "File uploaded successfully and queued for processing"
    }
}
```

### GET /api/status/:jobId
Get the status of a conversion job.

**Request:**
- Method: GET
- Parameters:
  - jobId: UUID string (required)

**Response:**
```json
{
    "status": "success",
    "data": {
        "jobId": "uuid-string",
        "status": "pending|processing|completed|failed"
    }
}
```

### GET /api/result/:jobId
Get the converted GIF file.

**Request:**
- Method: GET
- Parameters:
  - jobId: UUID string (required)

**Response:**
- Content-Type: image/gif
- Content-Disposition: attachment; filename="converted-{jobId}.gif"

## Error Handling

The API uses standard HTTP status codes and returns errors in the following format:

```json
{
    "error": {
        "message": "Error description",
        "status": 400
    }
}
```

Common status codes:
- 400: Bad Request (invalid input)
- 404: Not Found
- 415: Unsupported Media Type
- 429: Too Many Requests
- 500: Internal Server Error

## Security Features

- Input validation and sanitization
- Rate limiting on all endpoints
- Secure headers with Helmet
- CORS protection
- File type validation
- Path traversal prevention
- Request size limiting
- Content-Type validation

## Development Tools

- ESLint for code linting
- Prettier for code formatting
- Nodemon for development
- Morgan for HTTP logging
- Winston for application logging

### Code Quality Scripts

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check

# Run all code quality checks
npm run code:check

# Fix all code quality issues
npm run code:fix
```

## Logging

Logs are stored in the `logs` directory:
- error.log: Error-level logs
- combined.log: All logs

Log levels:
- error: Error conditions
- warn: Warning conditions
- info: Informational messages
- http: HTTP request logs
- debug: Debug messages

## Testing

```bash
# Run tests (when implemented)
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run code quality checks
4. Commit your changes
5. Push to the branch
6. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
