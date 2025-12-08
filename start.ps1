# Quick start script for DeFi Protocol (Windows PowerShell)
# This script helps set up and run the entire DeFi protocol

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Aave-Like DeFi Protocol - Quick Start                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Get script directory and navigate there
$scriptDir = Get-Location
Write-Host "📁 Working directory: $scriptDir" -ForegroundColor Yellow
Write-Host ""

# Install dependencies if not already installed
if (-not (Test-Path ".\node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# Check if hardhat is installed
$hardhatCheck = npx hardhat --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Hardhat is not installed properly. Run: npm install" -ForegroundColor Red
    exit 1
}

Write-Host "🏗️  Starting Hardhat local node..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Magenta
Write-Host "1. Keep this terminal open" -ForegroundColor White
Write-Host "2. Open a new PowerShell terminal" -ForegroundColor White
Write-Host "3. Run: npx hardhat run scripts/deployAll.js --network localhost" -ForegroundColor White
Write-Host "4. Copy the contract addresses to frontend/src/config.js" -ForegroundColor White
Write-Host "5. Open another terminal and run deployment:" -ForegroundColor White
Write-Host "   `$env:NETWORK='localhost'" -ForegroundColor Gray
Write-Host "   `$env:ORACLE_ADDRESS='<from-step-3>'" -ForegroundColor Gray
Write-Host "   `$env:PRIVATE_KEY='0xac0974bec39a17e36ba4a6b4d238ff944bacb476caded87391dda1db2a067b74'" -ForegroundColor Gray
Write-Host "   npx hardhat run scripts/updatePrices.js --network localhost" -ForegroundColor Gray
Write-Host "6. In frontend folder: npm start" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Start hardhat node
npx hardhat node
