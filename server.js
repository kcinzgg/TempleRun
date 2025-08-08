#!/usr/bin/env node
/**
 * Node.js HTTP服务器 - 完美的MIME类型支持
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json'
};

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

function createServer(port = 8800) {
    const server = http.createServer((req, res) => {
        // 解析URL
        const parsedUrl = url.parse(req.url);
        let pathname = parsedUrl.pathname;
        
        // 默认文件
        if (pathname === '/') {
            pathname = '/index.html';
        }
        
        // 构建文件路径
        const filePath = path.join(process.cwd(), pathname);
        
        // 安全检查 - 防止目录遍历攻击
        if (!filePath.startsWith(process.cwd())) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('403 Forbidden');
            return;
        }
        
        // 检查文件是否存在
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                return;
            }
            
            // 获取文件信息
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Internal Server Error');
                    return;
                }
                
                // 如果是目录，返回404
                if (stats.isDirectory()) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                    return;
                }
                
                // 设置响应头
                const contentType = getContentType(filePath);
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Length': stats.size,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                
                // 发送文件
                const readStream = fs.createReadStream(filePath);
                readStream.pipe(res);
                
                readStream.on('error', (err) => {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Internal Server Error');
                });
            });
        });
    });
    
    server.listen(port, () => {
        console.log('🚀 Node.js HTTP服务器启动成功！');
        console.log(`📍 地址: http://localhost:${port}`);
        console.log(`📁 目录: ${process.cwd()}`);
        console.log('🔧 完美的MIME类型支持');
        console.log('⏹️  按 Ctrl+C 停止服务器');
        console.log('-'.repeat(50));
    });
    
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`❌ 端口 ${port} 已被占用，尝试使用端口 ${port + 1}`);
            createServer(port + 1);
        } else {
            console.error('❌ 服务器启动失败:', err.message);
        }
    });
    
    // 优雅关闭
    process.on('SIGINT', () => {
        console.log('\n🛑 服务器已停止');
        server.close(() => {
            process.exit(0);
        });
    });
}

// 启动服务器
const port = process.argv[2] ? parseInt(process.argv[2]) : 8800;
createServer(port);
