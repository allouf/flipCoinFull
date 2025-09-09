#!/bin/bash

# Sync Script for Codespaces Deployment
# This script safely syncs smart contract deployment from Codespaces repo

echo "🔄 Syncing with Codespaces Deployment..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}Warning: You're not on main branch. Current branch: $CURRENT_BRANCH${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 2. Save current work
echo "📝 Saving current work..."
git stash push -m "Auto-stash before codespaces sync $(date +%Y%m%d_%H%M%S)"

# 3. Fetch latest from codespaces
echo "⬇️ Fetching from codespaces repo..."
git fetch codespaces

# 4. Cherry-pick specific files we need
echo "🍒 Syncing deployment-related files..."

# Files to sync from codespaces
FILES_TO_SYNC=(
    "Anchor.toml"
    "programs/coin-flipper/src/lib.rs"
    "programs/coin-flipper/src/lib_production.rs"
    "initialize-correct.js"
    "initialize-manual.js"
    "deploy-production.sh"
    "codespace-deploy.sh"
)

# Create temporary branch for merge
git checkout -b temp-sync-codespaces

for file in "${FILES_TO_SYNC[@]}"; do
    if git show codespaces/main:"$file" > /dev/null 2>&1; then
        echo "  ✓ Syncing $file"
        git show codespaces/main:"$file" > "$file"
        git add "$file"
    else
        echo "  ⚠ File not found in codespaces: $file"
    fi
done

# 5. Check if there are changes to commit
if git diff --cached --quiet; then
    echo -e "${YELLOW}No changes to sync from codespaces${NC}"
    git checkout "$CURRENT_BRANCH"
    git branch -D temp-sync-codespaces
else
    # Commit the changes
    git commit -m "Sync: Import deployment files from Codespaces $(date +%Y-%m-%d)"
    
    # Merge back to original branch
    git checkout "$CURRENT_BRANCH"
    git merge temp-sync-codespaces --no-ff -m "Merge: Codespaces deployment sync"
    
    # Clean up
    git branch -D temp-sync-codespaces
    
    echo -e "${GREEN}✅ Successfully synced deployment files from Codespaces!${NC}"
fi

# 6. Restore stashed changes if any
if git stash list | grep -q "Auto-stash before codespaces sync"; then
    echo "📝 Restoring your previous work..."
    git stash pop
fi

echo ""
echo "📋 Deployment Information:"
echo "=========================="
echo "Program ID: EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou"
echo "House Wallet: CaKigdJrq48nVebxGm4oWG2nck5kmdYA4JNPSkFt1tNp"
echo "Global State: 51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed"
echo "Network: Solana Devnet"
echo ""
echo "Next steps:"
echo "1. Run: npm run verify-deployment"
echo "2. Start frontend: npm start"
echo "3. Test the game on devnet"