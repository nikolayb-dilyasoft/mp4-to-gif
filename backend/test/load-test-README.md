# Load Test Script for MP4 to GIF Service

This script performs comprehensive load testing and endpoint validation for the MP4 to GIF conversion service.

## Prerequisites

- Bash shell
- curl command-line tool
- A test MP4 file named `test.mp4` in the same directory (or update MP4_FILE variable in script)
- Optional: jq command-line tool for better JSON parsing

## What the Script Tests

1. Server Availability:
   - Checks if the server is running before starting tests

2. Basic Endpoint Functionality:
   - Upload endpoint (POST /api/upload)
   - Status endpoint (GET /api/status/:jobId)
   - Result endpoint (GET /api/result/:jobId)
   - Full conversion workflow with actual file

3. Rate Limiting:
   - Sends 20 rapid requests to test rate limiting
   - Counts successful and rate-limited responses

4. Error Cases:
   - Invalid job IDs
   - Missing file uploads
   - Non-existent jobs

## Usage

1. Start the backend server:
   ```bash
   cd ../
   npm run dev:all
   ```

2. Place a test MP4 file named `test.mp4` in the test directory
   - Or update the MP4_FILE variable in the script to point to your test file

3. Run the script:
   ```bash
   cd test
   ./load-test.sh
   ```

## Output

The script provides colored output for better readability:
- Green: Success messages and test section headers
- Yellow: Information and progress messages
- Red: Error messages and failed tests
- Normal: Test results and responses

## Test Flow

1. Server Check:
   - Verifies the server is running on http://localhost:3000

2. Upload Test:
   - Uploads test.mp4 file
   - Extracts and verifies job ID from response

3. Status Check:
   - Checks job status immediately after upload
   - Waits 10 seconds for conversion
   - Checks status again

4. Result Download:
   - Attempts to download converted GIF
   - Verifies file was created successfully

5. Rate Limit Test:
   - Sends 20 rapid requests
   - Reports success/failure counts

6. Error Cases:
   - Tests various error conditions
   - Verifies error responses

## Notes

- The script requires the backend service to be running on http://localhost:3000
- GIF files will be created in the test directory for successful conversions
- If jq is installed, it will be used for more reliable JSON parsing
- Rate limiting results may vary based on server configuration
