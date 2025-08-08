#!/usr/bin/env python3
"""
简单的HTTP服务器 - 修复MIME类型问题的最小版本
"""

import http.server
import socketserver
import os
import sys

class FixedHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """修复MIME类型的HTTP请求处理器"""
    
    def guess_type(self, path):
        """确保JavaScript文件有正确的MIME类型"""
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'application/javascript'
        elif path.endswith('.glb'):
            return 'model/gltf-binary'
        elif path.endswith('.gltf'):
            return 'model/gltf+json'
        else:
            return super().guess_type(path)
    
    def end_headers(self):
        """添加额外的响应头"""
        # 确保ES6模块的正确处理
        if hasattr(self, 'path') and (self.path.endswith('.js') or self.path.endswith('.mjs')):
            self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

def start_server(port=8800):
    """启动HTTP服务器"""
    try:
        with socketserver.TCPServer(("", port), FixedHTTPRequestHandler) as httpd:
            print(f"🚀 简单HTTP服务器启动成功！")
            print(f"📍 地址: http://localhost:{port}")
            print(f"📁 目录: {os.getcwd()}")
            print(f"🔧 已修复JavaScript MIME类型问题")
            print(f"⏹️  按 Ctrl+C 停止服务器")
            print("-" * 50)
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 服务器已停止")
    except OSError as e:
        if e.errno == 10048:
            print(f"❌ 端口 {port} 已被占用，尝试使用端口 {port + 1}")
            start_server(port + 1)
        else:
            print(f"❌ 启动服务器时出错: {e}")

if __name__ == "__main__":
    port = 8800
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ 无效的端口号，使用默认端口 8800")
    
    start_server(port)
