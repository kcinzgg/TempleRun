#!/usr/bin/env python3
"""
下载所有Three.js依赖文件的完整脚本
"""

import os
import urllib.request
import sys

def download_file(url, filename):
    """下载文件到指定路径"""
    try:
        print(f"🔄 正在下载: {os.path.basename(filename)}")
        
        # 创建目录（如果不存在）
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        # 下载文件
        urllib.request.urlretrieve(url, filename)
        
        # 检查文件大小
        file_size = os.path.getsize(filename)
        print(f"✅ 完成! ({file_size:,} 字节)")
        
        return True
        
    except Exception as e:
        print(f"❌ 失败: {e}")
        return False

def main():
    """主函数"""
    print("📦 Three.js依赖下载器")
    print("=" * 50)
    
    # 需要下载的文件列表
    files_to_download = [
        {
            'url': 'https://unpkg.com/three@0.166.1/build/three.module.js',
            'path': 'libs/three/three.module.js',
            'desc': 'Three.js核心库'
        },
        {
            'url': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/loaders/GLTFLoader.js',
            'path': 'libs/three/addons/loaders/GLTFLoader.js',
            'desc': 'GLTF模型加载器'
        },
        {
            'url': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/utils/BufferGeometryUtils.js',
            'path': 'libs/three/addons/utils/BufferGeometryUtils.js',
            'desc': '几何体工具类'
        },
        {
            'url': 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
            'path': 'models/RobotExpressive.glb',
            'desc': '机器人模型文件'
        }
    ]
    
    success_count = 0
    total_count = len(files_to_download)
    
    for file_info in files_to_download:
        print(f"\n📁 {file_info['desc']}")
        
        # 检查文件是否已存在
        if os.path.exists(file_info['path']):
            file_size = os.path.getsize(file_info['path'])
            print(f"📂 已存在 ({file_size:,} 字节)")
            success_count += 1
            continue
        
        # 下载文件
        if download_file(file_info['url'], file_info['path']):
            success_count += 1
    
    print(f"\n🎉 下载完成!")
    print(f"📊 成功: {success_count}/{total_count} 个文件")
    
    if success_count == total_count:
        print("✅ 所有依赖已准备就绪!")
        print("🎮 现在可以启动游戏了:")
        print("   • 双击 start_simple.bat")
        print("   • 或运行 python simple_server.py")
    else:
        print("⚠️  部分文件下载失败，请检查网络连接")

if __name__ == "__main__":
    main()
