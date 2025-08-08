@echo off
chcp 65001 > nul
title Temple Run - 本地游戏服务器

echo.
echo ================================================
echo 🎮 Temple Run 游戏服务器启动器
echo ================================================
echo.

REM 检查Python是否安装
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Python
    echo 💡 请先安装Python 3.x
    echo 🔗 下载地址：https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo ✅ Python已安装
echo 🚀 正在启动游戏服务器...
echo.

REM 启动Python服务器
python server.py

echo.
echo 🛑 服务器已停止
pause
