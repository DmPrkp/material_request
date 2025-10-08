#!/bin/bash

# Material Request - Test Runner Script
# This script runs tests for order-server and ionic-client
# Note: calc-server has its own repository and CI

set -e  # Exit on any error

echo "🧪 Running Material Request Tests"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests for a service
run_service_tests() {
    local service_name=$1
    local service_path=$2
    
    echo -e "\n${YELLOW}Testing $service_name...${NC}"
    echo "----------------------------------------"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}❌ Service directory not found: $service_path${NC}"
        return 1
    fi
    
    cd "$service_path"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm ci
    fi
    
    # Run tests based on service type
    case $service_name in
        "calc-server"|"order-server")
            echo "🔧 Running unit tests..."
            npm run test
            
            echo "🔧 Running e2e tests..."
            npm run test:e2e
            ;;
        "ionic-client")
            echo "🔧 Running unit tests..."
            npm run test:unit
            
            echo "🔧 Running e2e tests..."
            npm run test:e2e
            ;;
    esac
    
    echo -e "${GREEN}✅ $service_name tests completed successfully${NC}"
    cd - > /dev/null
}

# Check if we're in the right directory
if [ ! -f "compose.dev.yaml" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Run tests for each service
run_service_tests "order-server" "./order-server" 
run_service_tests "ionic-client" "./ionic-client"

echo -e "\n${GREEN}🎉 All tests completed successfully!${NC}"
echo "================================="
