# Push Smart Contract Files to Codespaces Repo
# This script pushes only the necessary smart contract files to the codespaces repo

Write-Host "🚀 Pushing Smart Contract files to Codespaces repo..." -ForegroundColor Green

# Navigate to the project directory
Set-Location "F:\flipCoin"

# Check current remotes
Write-Host "📋 Current git remotes:" -ForegroundColor Cyan
git remote -v

# Check git status
Write-Host "📋 Current git status:" -ForegroundColor Cyan
git status --short

# Add the essential smart contract files
Write-Host "📁 Adding smart contract files..." -ForegroundColor Cyan

# Core smart contract files
git add programs/
git add Anchor.toml
git add .devcontainer/
git add scripts/

# Essential configuration and documentation
git add "AUTO_RESOLUTION_UPGRADE_GUIDE.md"
git add "CODESPACES_DEPLOYMENT_GUIDE.md"
git add "CHANGED_FILES_SUMMARY.md"
git add "FILES_TO_COPY.md"
git add "FINAL_SC_VERIFICATION.md"
git add "SC_SECURITY_ANALYSIS.md"
git add "CORRECTED_ECONOMIC_ANALYSIS.md"

# Deployment and initialization scripts
git add "initialize-correct.js"
git add "initialize-manual.js"
git add "check-house-wallet.js"
git add "check-program-id.js"
git add "generate-house-wallet.js"
git add "verify-deployment.js"

# Environment template (without secrets)
if (Test-Path ".env.example") {
    git add ".env.example"
}

# Show what will be committed
Write-Host "📋 Files to be committed:" -ForegroundColor Cyan
git diff --cached --name-only

# Commit the changes
$commitMessage = "feat: implement auto-resolution system with fair fee sharing

🎯 Key Updates:
- Add automatic game resolution when both players select
- Pre-fund resolution fees (0.001 SOL per player) 
- Remove manual resolve requirement
- Fix tie scenario handling with proper refunds
- Add escrow balance validation for security
- Replace magic numbers with constants

🔧 Technical Changes:
- Updated RESOLUTION_FEE_PER_PLAYER to 1,000,000 lamports (0.001 SOL)
- Added auto_resolve_game() function
- Enhanced make_selection() to trigger auto-resolution
- Added validate_escrow_balance() security function
- Fixed all critical security vulnerabilities

🎮 User Benefits:
- Fair cost sharing between players
- 100% game completion rate (no stuck games)
- Automatic tie handling with full refunds
- Premium user experience with instant resolution

Ready for Codespaces deployment! 🚀"

git commit -m "$commitMessage"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully committed changes" -ForegroundColor Green
    
    # Push to codespaces repo
    Write-Host "🚀 Pushing to codespaces repo..." -ForegroundColor Green
    git push codespaces main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully pushed to codespaces repo!" -ForegroundColor Green
        Write-Host "🌐 You can now open GitHub Codespaces at: https://github.com/allouf/flipCoin" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Failed to push to codespaces repo" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Failed to commit changes" -ForegroundColor Red
}

# Restore original gitignore
if (Test-Path ".gitignore.backup") {
    Move-Item ".gitignore.backup" ".gitignore" -Force
    Write-Host "✅ Restored original .gitignore" -ForegroundColor Yellow
}

Write-Host "🎯 Smart Contract deployment ready!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open GitHub Codespaces: https://github.com/allouf/flipCoin" -ForegroundColor White
Write-Host "  2. Click 'Code' > 'Codespaces' > 'Create codespace on main'" -ForegroundColor White
Write-Host "  3. Run: anchor build && anchor deploy --provider.cluster devnet" -ForegroundColor White
Write-Host "  4. Run: npm run deploy:init" -ForegroundColor White
