#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Base URL
BASE_URL="http://localhost:3000/api"

# Test file path - replace with actual MP4 file path
MP4_FILE="test.mp4"

# Check if server is running using health check endpoint
check_server() {
    echo -e "${YELLOW}Checking if server is running...${NC}"
    RESPONSE=$(curl -s "${BASE_URL}/health")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Server is not running on http://localhost:3000${NC}"
        echo "Please start the server first with 'npm run dev:all' in the backend directory"
        exit 1
    fi
    
    # Parse response to verify it's healthy
    if command -v jq >/dev/null 2>&1; then
        STATUS=$(echo $RESPONSE | jq -r '.status // empty')
        MESSAGE=$(echo $RESPONSE | jq -r '.data.message // empty')
        TIMESTAMP=$(echo $RESPONSE | jq -r '.data.timestamp // empty')
        
        if [ "$STATUS" = "success" ] && [ "$MESSAGE" = "Service is healthy" ]; then
            echo -e "${GREEN}Server is healthy${NC}"
            echo -e "${YELLOW}Health check timestamp:${NC} $TIMESTAMP"
            return 0
        fi
    else
        # Simple string check if jq is not available
        if echo "$RESPONSE" | grep -q "Service is healthy"; then
            echo -e "${GREEN}Server is healthy${NC}"
            return 0
        fi
    fi
    
    echo -e "${RED}Error: Server is not responding with healthy status${NC}"
    echo "Raw response: $RESPONSE"
    exit 1
}

# Function to test upload endpoint
test_upload() {
    echo -e "\n${GREEN}Testing upload endpoint with valid MP4 file${NC}"
    
    if [ ! -f "$MP4_FILE" ]; then
        echo -e "${RED}Error: Test MP4 file not found at $MP4_FILE${NC}"
        return 1
    fi
    
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: multipart/form-data" \
        -F "file=@$MP4_FILE" \
        "${BASE_URL}/upload")
    
    echo -e "${YELLOW}Raw Response:${NC} $RESPONSE"
    
    # Extract jobId from response using proper JSON parsing
    if command -v jq >/dev/null 2>&1; then
        # If jq is available, use it for proper JSON parsing
        JOB_ID=$(echo $RESPONSE | jq -r '.data.jobId // empty')
    else
        # Fallback to grep (less reliable)
        JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)
    fi
    
    if [ -z "$JOB_ID" ]; then
        echo -e "${RED}Error: Could not extract jobId from response${NC}"
        return 1
    else
        echo -e "${GREEN}Successfully extracted Job ID:${NC} $JOB_ID"
    fi
    
    echo $JOB_ID
}

# Function to test status endpoint
test_status() {
    local job_id=$1
    echo -e "\n${GREEN}Testing status endpoint for job: $job_id${NC}"
    
    RESPONSE=$(curl -s -H "Accept: application/json" "${BASE_URL}/status/$job_id")
    echo -e "${YELLOW}Status Response:${NC} $RESPONSE"
    
    # Extract status from response
    if command -v jq >/dev/null 2>&1; then
        STATUS=$(echo $RESPONSE | jq -r '.data.status // empty')
    else
        STATUS=$(echo $RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    fi
    
    if [ ! -z "$STATUS" ]; then
        echo -e "${GREEN}Job Status:${NC} $STATUS"
    else
        echo -e "${RED}Error: Could not extract status from response${NC}"
    fi
}

# Function to test result endpoint
test_result() {
    local job_id=$1
    echo -e "\n${GREEN}Testing result endpoint for job: $job_id${NC}"
    
    HTTP_CODE=$(curl -s -w "%{http_code}" "${BASE_URL}/result/$job_id" -o "result_$job_id.gif")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}Successfully downloaded result_$job_id.gif${NC}"
        # Check if file exists and has size greater than 0
        if [ -f "result_$job_id.gif" ] && [ -s "result_$job_id.gif" ]; then
            echo -e "${GREEN}Verified: GIF file was created successfully${NC}"
        else
            echo -e "${RED}Error: GIF file is empty or was not created${NC}"
        fi
    else
        echo -e "${RED}Error: Failed to download GIF. HTTP Status: $HTTP_CODE${NC}"
    fi
}

# Function to test rate limiting
test_rate_limit() {
    echo -e "\n${GREEN}Testing rate limiting (sending 20 requests rapidly)${NC}"
    
    SUCCESS_COUNT=0
    RATE_LIMITED_COUNT=0
    
    for i in {1..20}; do
        echo -e "${YELLOW}Request $i:${NC}"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/status/test-job-id")
        
        if [ "$HTTP_CODE" = "200" ]; then
            ((SUCCESS_COUNT++))
            echo -e "${GREEN}Success (200)${NC}"
        elif [ "$HTTP_CODE" = "429" ]; then
            ((RATE_LIMITED_COUNT++))
            echo -e "${RED}Rate Limited (429)${NC}"
        else
            echo -e "${RED}Unexpected Status: $HTTP_CODE${NC}"
        fi
    done
    
    echo -e "\n${YELLOW}Rate Limit Test Results:${NC}"
    echo "Successful requests: $SUCCESS_COUNT"
    echo "Rate limited requests: $RATE_LIMITED_COUNT"
}

# Function to test error cases
test_errors() {
    echo -e "\n${GREEN}Testing error cases${NC}"
    
    echo -e "\n${YELLOW}1. Testing invalid job ID:${NC}"
    RESPONSE=$(curl -s "${BASE_URL}/status/invalid-id")
    echo "Response: $RESPONSE"
    
    echo -e "\n${YELLOW}2. Testing upload without file:${NC}"
    RESPONSE=$(curl -s -X POST "${BASE_URL}/upload")
    echo "Response: $RESPONSE"
    
    echo -e "\n${YELLOW}3. Testing result with non-existent job:${NC}"
    RESPONSE=$(curl -s "${BASE_URL}/result/non-existent-id")
    echo "Response: $RESPONSE"
}

# Main test sequence
echo "=== Starting MP4 to GIF Service Load Test ==="

# Check if server is running first
check_server

echo "=== Starting Basic Endpoint Tests ==="

# Run upload test and capture job ID
JOB_ID=$(test_upload)

if [ ! -z "$JOB_ID" ]; then
    # Test status endpoint with real job ID
    test_status "$JOB_ID"
    
    # Wait for conversion
    echo -e "\n${YELLOW}Waiting 10 seconds for conversion...${NC}"
    sleep 10
    
    # Check status again
    test_status "$JOB_ID"
    
    # Test result endpoint with real job ID
    test_result "$JOB_ID"
else
    echo -e "${RED}Skipping status and result tests due to upload failure${NC}"
fi

echo -e "\n${GREEN}=== Starting Rate Limit Tests ===${NC}"
test_rate_limit

echo -e "\n${GREEN}=== Starting Error Case Tests ===${NC}"
test_errors

echo -e "\n${GREEN}Load test completed!${NC}"
