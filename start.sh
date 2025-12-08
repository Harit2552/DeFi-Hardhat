#!/bin/bash
# Quick start script for DeFi Protocol
# This script helps set up and run the entire DeFi protocol

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Aave-Like DeFi Protocol - Quick Start                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📁 Working directory: $SCRIPT_DIR"
echo ""

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Check if hardhat is installed
if ! npx hardhat --version &> /dev/null; then
    echo "❌ Hardhat is not installed properly. Run: npm install"
    exit 1
fi

echo "🏗️  Starting Hardhat local node..."
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Keep this terminal open"
echo "2. Open a new PowerShell terminal"
echo "3. Run: npx hardhat run scripts/deployAll.js --network localhost"
echo "4. Copy the contract addresses to frontend/src/config.js"
echo "5. Open another terminal and run: npm start (in frontend folder)"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Start hardhat node
npx hardhat node
