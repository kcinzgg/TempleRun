@echo off
chcp 65001 > nul
title Temple Run - 简单服务器

echo.
echo ================================================
echo 🎮 Temple Run - 简单HTTP服务器
echo ================================================
echo.

python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Python
    pause
    exit /b 1
)

echo ✅ 使用简单的HTTP服务器（修复MIME类型）
echo 🚀 正在启动服务器...
echo.

python simple_server.py

echo.
echo 🛑 服务器已停止
pause
