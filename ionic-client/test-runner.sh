#!/bin/bash

# Ionic Client Test Runner
# This script runs tests for the ionic-client

set -e  # Exit on any error

echo "🧪 Running Ionic Client Tests"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the ionic-client directory${NC}"
    exit 1
fi


if [ ! -d "node_modules" ]; then
    echo "Remove package-lock.json"
    rm package-lock.json
    echo "📦 Installing dependencies..."
    npm i
fi

echo -e "\n${YELLOW}Running unit tests...${NC}"
echo "----------------------------------------"
npm run test:unit

echo -e "\n${GREEN}✅ Unit tests completed successfully${NC}"

echo -e "\n${YELLOW}Running e2e tests...${NC}"
echo "----------------------------------------"
# Note: e2e tests require the app to be running
# For CI, we'll skip e2e tests if the app isn't running
if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
    npm run test:e2e
    echo -e "${GREEN}✅ E2E tests completed successfully${NC}"
else
    echo -e "${YELLOW}⚠️  App not running on localhost:5173, skipping e2e tests${NC}"
    echo -e "${YELLOW}   To run e2e tests, start the app with: npm run dev${NC}"
fi

echo -e "\n${GREEN}🎉 All available tests completed!${NC}"
echo "============================="
