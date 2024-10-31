# MP4 to GIF Conversion Service

A full-stack web application that allows users to convert MP4 videos to GIF animations. Built with Angular, Express.js, Redis, and FFmpeg.

## Prerequisites

Before running the application, make sure you have the following installed:

- Node.js (v14 or higher)
- FFmpeg
- Angular CLI (`npm install -g @angular/cli`)
- Redis Server (see Redis Installation instructions below)

### Redis Installation on Windows

You have two options for running Redis on Windows:

#### Option 1: Using Memurai (Recommended for Windows)

1. Download Memurai from <https://www.memurai.com/get-memurai>
2. Run the installer
3. Memurai will start automatically and run as a Windows service
4. Verify installation by opening PowerShell and running:

  ```powershell
  telnet localhost 6379
  ```

   If you see a blank screen with a cursor, Redis is running (press Ctrl+] and then 'q' to exit)

#### Option 2: Using Windows Subsystem for Linux (WSL)

1. Enable WSL by opening PowerShell as Administrator and running:

  ```powershell
  wsl --install
  ```

2. Restart your computer

3. Install Redis in WSL:

  ```bash
  wsl
  sudo apt update
  sudo apt install redis-server
  ```

4. Start Redis server:

  ```bash
  sudo service redis-server start
  ```

5. Verify Redis is running:

  ```bash
  redis-cli ping
  ```

  Should return "PONG"

## Project Structure

```
.
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── app.js         # Express app setup
│   │   └── server.js      # Server entry point
│   ├── worker/            # Conversion worker process
│   ├── uploads/           # Temporary MP4 storage
│   └── gifs/             # Converted GIF storage
│
└── frontend/              # Angular frontend
    ├── src/
    │   ├── app/
    │   │   ├── upload/    # Upload component
    │   │   ├── status/    # Status component
    │   │   ├── result/    # Result component
    │   │   └── services/  # API services
    │   ├── styles.css
    │   └── index.html
    ├── angular.json       # Angular configuration
    ├── package.json       # Frontend dependencies
    └── tsconfig.json      # TypeScript configuration
```

## Setup Instructions

### 1\. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your configuration
# Edit the .env file with your preferred settings
```

### 2\. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# If you encounter any TypeScript errors after installation
npm install --save-dev @types/node
```

### 3\. Redis Setup

Ensure Redis server is running:

#### For Memurai:

- It should be running automatically as a Windows service
- Verify in Windows Services (services.msc) that Memurai is running

#### For WSL Redis:

```bash
wsl
sudo service redis-server start
```

### 4\. Start the Application

#### Start Backend Server and Worker:

```bash
# In backend directory
npm run dev:all
```

#### Start Frontend Development Server:

```bash
# In frontend directory
ng serve
```

The application will be available at:

- Frontend: <http://localhost:4200>
- Backend API: <http://localhost:3000>

## API Endpoints

### POST /api/upload

- Upload an MP4 file for conversion
- Returns a job ID for status tracking

### GET /api/status/:jobId

- Get the status of a conversion job
- Returns: pending, processing, completed, or failed

### GET /api/result/:jobId

- Download the converted GIF file
- Only available for completed jobs

## Environment Variables

```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
UPLOAD_DIR=uploads
GIF_DIR=gifs
MAX_FILE_SIZE=50
```

## Troubleshooting

### Redis Connection Issues

If you see "Redis connection refused" errors:

1. Verify Redis is running:

  - For Memurai: Check Windows Services
  - For WSL Redis: Run `redis-cli ping` in WSL

2. Check Redis port:

  ```bash
  # In PowerShell
  netstat -an | findstr "6379"
  ```

  Should show LISTENING state

3. Ensure firewall isn't blocking Redis port 6379

4. Try connecting manually:

  ```bash
  # For Memurai
  telnet localhost 6379

  # For WSL Redis
  wsl redis-cli ping
  ```

## Error Handling

The application includes comprehensive error handling for:

- Invalid file types
- File size limits
- Conversion failures
- Server errors
- Network issues

## Performance Considerations

- Files are processed through a Redis queue to handle high traffic
- Temporary files are automatically cleaned up
- Conversion process is optimized for quality and file size
- Status updates are provided in real-time

## Security Measures

- File type validation
- File size limits
- Sanitized file paths
- Secure file storage
- Input validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
