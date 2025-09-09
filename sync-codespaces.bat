@echo off
REM Sync Script for Codespaces Deployment (Windows)
REM This script safely syncs smart contract deployment from Codespaces repo

echo =======================================
echo Syncing with Codespaces Deployment...
echo =======================================
echo.

REM 1. Fetch latest from codespaces
echo Fetching from codespaces repo...
git fetch codespaces
if errorlevel 1 (
    echo Error: Failed to fetch from codespaces
    pause
    exit /b 1
)

REM 2. Check specific important files
echo.
echo Checking deployment files from Codespaces...
echo.

REM Get the lib.rs file from codespaces
echo Syncing programs/coin-flipper/src/lib.rs...
git show codespaces/main:programs/coin-flipper/src/lib.rs > temp_lib.rs 2>nul
if exist temp_lib.rs (
    move /Y temp_lib.rs programs\coin-flipper\src\lib.rs >nul
    echo   [OK] Smart contract synced
) else (
    echo   [SKIP] Using existing smart contract
)

REM Get Anchor.toml
echo Syncing Anchor.toml...
git show codespaces/main:Anchor.toml > temp_anchor.toml 2>nul
if exist temp_anchor.toml (
    move /Y temp_anchor.toml Anchor.toml >nul
    echo   [OK] Anchor.toml synced
)

REM Get initialization scripts if they exist
echo Syncing initialization scripts...
git show codespaces/main:initialize-correct.js > temp_init.js 2>nul
if exist temp_init.js (
    move /Y temp_init.js initialize-correct.js >nul
    echo   [OK] Initialize script synced
)

echo.
echo =======================================
echo Deployment Information:
echo =======================================
echo Program ID: EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou
echo House Wallet: CaKigdJrq48nVebxGm4oWG2nck5kmdYA4JNPSkFt1tNp  
echo Global State: 51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed
echo Network: Solana Devnet
echo.
echo Next steps:
echo 1. Run: node verify-sync.js
echo 2. Start frontend: npm start
echo 3. Test the game on devnet
echo.
pause