@echo off
REM Temporarily remove Git from PATH to avoid link.exe conflict
set PATH=%PATH:C:\Program Files\Git\usr\bin;=%
set PATH=%PATH:C:\Program Files\Git\usr\bin=%

REM Navigate to the program directory
cd /d "F:\Andrius\flipCoin\programs\coin-flipper"

REM Build the project
echo Building Solana program...
cargo build --release

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Build successful!
    echo The compiled program is at: target\release\coin_flipper.dll
) else (
    echo.
    echo Build failed. Please ensure you have Visual Studio C++ Build Tools installed.
    echo You can install them from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
)