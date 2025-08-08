#!/usr/bin/env python3
"""
下载机器人模型文件的脚本
"""

import os
import urllib.request
import sys

def download_file(url, filename):
    """下载文件到指定路径"""
    try:
        print(f"🔄 正在下载: {url}")
        print(f"📁 保存到: {filename}")
        
        # 创建目录（如果不存在）
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        # 下载文件
        urllib.request.urlretrieve(url, filename)
        
        # 检查文件大小
        file_size = os.path.getsize(filename)
        print(f"✅ 下载完成! 文件大小: {file_size:,} 字节")
        
        return True
        
    except Exception as e:
        print(f"❌ 下载失败: {e}")
        return False

def main():
    """主函数"""
    print("🤖 机器人模型下载器")
    print("=" * 40)
    
    # 机器人模型URL
    model_url = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb"
    model_path = "models/RobotExpressive.glb"
    
    # 检查文件是否已存在
    if os.path.exists(model_path):
        file_size = os.path.getsize(model_path)
        print(f"📂 文件已存在: {model_path} ({file_size:,} 字节)")
        
        response = input("是否重新下载? (y/N): ").strip().lower()
        if response not in ['y', 'yes', '是']:
            print("⏭️  跳过下载")
            return
    
    # 下载模型文件
    success = download_file(model_url, model_path)
    
    if success:
        print("\n🎉 模型下载完成!")
        print(f"📍 模型位置: {os.path.abspath(model_path)}")
        print("🎮 现在可以运行游戏了!")
    else:
        print("\n💥 下载失败，请检查网络连接")
        sys.exit(1)

if __name__ == "__main__":
    main()
