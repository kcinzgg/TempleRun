#!/usr/bin/env python3
"""
调试Chrome模块警告的脚本
"""

import http.server
import socketserver
import os
import sys
import urllib.parse

class DebugHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """调试用的HTTP请求处理器"""
    
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
    
    def do_GET(self):
        """处理GET请求并记录详细信息"""
        parsed_path = urllib.parse.urlparse(self.path)
        file_path = parsed_path.path
        
        print(f"📥 请求: {file_path}")
        
        # 检查文件类型
        if file_path.endswith('.js') or file_path.endswith('.mjs'):
            mime_type = self.guess_type(file_path)
            print(f"🔧 JavaScript文件 -> MIME: {mime_type}")
        
        # 调用父类方法处理请求
        super().do_GET()
    
    def end_headers(self):
        """添加调试响应头"""
        # 添加CORS头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # 对于JavaScript文件，添加特殊头部
        if hasattr(self, 'path') and (self.path.endswith('.js') or self.path.endswith('.mjs')):
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Cache-Control', 'no-cache')
            print(f"🔧 为 {self.path} 添加了JavaScript特殊头部")
        
        super().end_headers()

def start_debug_server(port=8802):
    """启动调试服务器"""
    try:
        with socketserver.TCPServer(("", port), DebugHTTPRequestHandler) as httpd:
            print(f"🔍 调试HTTP服务器启动成功！")
            print(f"📍 地址: http://localhost:{port}")
            print(f"📁 目录: {os.getcwd()}")
            print(f"🔧 调试模式：会显示所有请求详情")
            print(f"⏹️  按 Ctrl+C 停止服务器")
            print("-" * 50)
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 调试服务器已停止")
    except OSError as e:
        if e.errno == 10048:
            print(f"❌ 端口 {port} 已被占用，尝试使用端口 {port + 1}")
            start_debug_server(port + 1)
        else:
            print(f"❌ 启动服务器时出错: {e}")

if __name__ == "__main__":
    port = 8802
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ 无效的端口号，使用默认端口 8802")
    
    print("🔍 Chrome警告调试器")
    print("=" * 50)
    print("这个服务器会显示所有请求的详细信息，")
    print("帮助诊断Chrome的模块警告问题。")
    print()
    
    start_debug_server(port)
