@echo off
chcp 65001 > nul
title Temple Run - Node.js服务器

echo.
echo ================================================
echo 🎮 Temple Run - Node.js HTTP服务器
echo ================================================
echo.

node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Node.js
    echo 💡 请先安装Node.js或使用Python版本
    echo 🔗 Node.js下载：https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js已安装
echo 🚀 正在启动Node.js服务器...
echo.

node server.js

echo.
echo 🛑 服务器已停止
pause
