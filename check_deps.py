#!/usr/bin/env python3
"""
检查Three.js依赖完整性的脚本
"""

import os
import re

def check_file_exists(path, desc):
    """检查文件是否存在"""
    if os.path.exists(path):
        size = os.path.getsize(path)
        print(f"✅ {desc}: {path} ({size:,} 字节)")
        return True
    else:
        print(f"❌ {desc}: {path} (缺失)")
        return False

def check_imports_in_file(file_path):
    """检查文件中的import语句"""
    if not os.path.exists(file_path):
        return []
    
    missing_deps = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 查找相对import语句
        import_pattern = r"import\s+.*?\s+from\s+['\"](\.\./[^'\"]+)['\"]"
        imports = re.findall(import_pattern, content)
        
        for imp in imports:
            # 构建完整路径
            base_dir = os.path.dirname(file_path)
            full_path = os.path.normpath(os.path.join(base_dir, imp))
            
            if not os.path.exists(full_path):
                missing_deps.append((imp, full_path))
                
    except Exception as e:
        print(f"⚠️  读取文件失败: {e}")
    
    return missing_deps

def main():
    """主函数"""
    print("🔍 Three.js依赖检查器")
    print("=" * 50)
    
    # 核心文件检查
    core_files = [
        ('libs/three/three.module.js', 'Three.js核心库'),
        ('libs/three/addons/loaders/GLTFLoader.js', 'GLTF加载器'),
        ('libs/three/addons/utils/BufferGeometryUtils.js', '几何体工具'),
        ('models/RobotExpressive.glb', '机器人模型'),
        ('index.html', 'HTML入口文件'),
        ('game.js', '游戏主文件'),
        ('server.py', '完整服务器'),
        ('simple_server.py', '简单服务器'),
    ]
    
    print("📁 核心文件检查:")
    all_files_exist = True
    for path, desc in core_files:
        if not check_file_exists(path, desc):
            all_files_exist = False
    
    print(f"\n🔗 依赖关系检查:")
    
    # 检查GLTFLoader的依赖
    print("📦 GLTFLoader.js 依赖:")
    gltf_deps = check_imports_in_file('libs/three/addons/loaders/GLTFLoader.js')
    if gltf_deps:
        for imp, full_path in gltf_deps:
            print(f"❌ 缺失依赖: {imp} -> {full_path}")
            all_files_exist = False
    else:
        print("✅ 所有依赖都已就位")
    
    print(f"\n📊 检查结果:")
    if all_files_exist:
        print("🎉 所有文件和依赖都已准备就绪!")
        print("🚀 可以启动游戏了:")
        print("   • python simple_server.py")
        print("   • 或双击 start_simple.bat")
    else:
        print("⚠️  发现缺失文件，请运行:")
        print("   python download_all_deps.py")

if __name__ == "__main__":
    main()
