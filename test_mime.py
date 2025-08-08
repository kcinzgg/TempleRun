#!/usr/bin/env python3
"""
测试不同HTTP服务器的MIME类型配置
"""

import mimetypes
import sys
import platform

def test_mime_types():
    """测试MIME类型配置"""
    print("🔍 MIME类型测试报告")
    print("=" * 50)
    
    # 系统信息
    print(f"🖥️  操作系统: {platform.system()} {platform.release()}")
    print(f"🐍 Python版本: {sys.version.split()[0]}")
    print()
    
    # 测试不同文件类型
    test_files = [
        ('test.js', 'JavaScript文件'),
        ('test.mjs', 'ES6模块文件'),
        ('test.css', 'CSS文件'),
        ('test.html', 'HTML文件'),
        ('test.json', 'JSON文件'),
    ]
    
    print("📋 Python内置mimetypes模块:")
    for filename, desc in test_files:
        mime_type, encoding = mimetypes.guess_type(filename)
        status = "✅" if mime_type and 'javascript' in mime_type else "❌" if filename.endswith('.js') else "ℹ️"
        print(f"  {status} {desc:15} -> {mime_type or 'None'}")
    
    print()
    print("🔧 问题分析:")
    
    js_mime = mimetypes.guess_type('test.js')[0]
    if js_mime == 'text/plain':
        print("  ❌ .js文件被识别为 'text/plain'")
        print("  💡 这就是Chrome报错的原因！")
        print("  🔧 Chrome需要 'application/javascript' 或 'text/javascript'")
    elif 'javascript' in js_mime:
        print("  ✅ .js文件MIME类型正确")
    
    print()
    print("🌍 平台差异说明:")
    print("  • Windows: Python内置服务器可能将.js识别为text/plain")
    print("  • macOS/Linux: 通常有更好的MIME类型配置")
    print("  • 解决方案: 使用自定义HTTP服务器")

if __name__ == "__main__":
    test_mime_types()
