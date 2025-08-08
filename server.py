#!/usr/bin/env python3
"""
简单的HTTP服务器，用于本地开发
支持正确的MIME类型设置，特别是JavaScript模块
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，确保正确的MIME类型"""
    
    def end_headers(self):
        # 设置CORS头部，允许本地开发
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def guess_type(self, path):
        """确保JavaScript文件有正确的MIME类型"""
        # 直接处理JavaScript文件，避免super()调用的兼容性问题
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'application/javascript'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.html') or path.endswith('.htm'):
            return 'text/html'
        elif path.endswith('.json'):
            return 'application/json'
        elif path.endswith('.mp3'):
            return 'audio/mpeg'
        elif path.endswith('.wav'):
            return 'audio/wav'
        elif path.endswith('.png'):
            return 'image/png'
        elif path.endswith('.jpg') or path.endswith('.jpeg'):
            return 'image/jpeg'
        elif path.endswith('.gif'):
            return 'image/gif'
        elif path.endswith('.svg'):
            return 'image/svg+xml'
        else:
            # 使用默认的guess_type，但处理可能的返回值差异
            try:
                result = super().guess_type(path)
                if isinstance(result, tuple) and len(result) >= 1:
                    return result[0] if result[0] else 'application/octet-stream'
                else:
                    return result if result else 'application/octet-stream'
            except:
                return 'application/octet-stream'

def start_server(port=8000):
    """启动本地HTTP服务器"""
    
    # 确保在正确的目录中
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print(f"🚀 服务器启动成功！")
            print(f"📍 本地地址: http://localhost:{port}")
            print(f"🌐 网络地址: http://127.0.0.1:{port}")
            print(f"📁 服务目录: {os.getcwd()}")
            print(f"🎮 在浏览器中打开 http://localhost:{port} 来运行游戏")
            print(f"⏹️  按 Ctrl+C 停止服务器")
            print("-" * 50)
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
    except OSError as e:
        if e.errno == 10048:  # Windows上的端口已被占用错误
            print(f"❌ 端口 {port} 已被占用，尝试使用端口 {port + 1}")
            start_server(port + 1)
        else:
            print(f"❌ 启动服务器时出错: {e}")
            print(f"💡 尝试使用不同的端口: python server.py [端口号]")

if __name__ == "__main__":
    # 允许通过命令行参数指定端口
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ 无效的端口号，使用默认端口 8000")
    
    start_server(port)
