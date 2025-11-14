# 部署指南

本文档详细说明如何将微信小游戏合集部署到生产环境。

## 📋 前置要求

### 1. 微信小游戏账号

- 注册微信小游戏账号：https://mp.weixin.qq.com/
- 完成账号认证
- 获取 AppID

### 2. 服务器要求

- **操作系统**: Linux (推荐 Ubuntu 20.04+)
- **Node.js**: 16.x 或更高版本
- **内存**: 至少 512MB（推荐 1GB+）
- **带宽**: 稳定的网络连接
- **域名**: 已备案的域名（微信要求）
- **SSL证书**: HTTPS/WSS 必需

### 3. 域名和SSL

- 购买域名并完成备案
- 申请 SSL 证书（可使用 Let's Encrypt 免费证书）
- 配置 DNS 解析到服务器 IP

## 🚀 后端部署

### 步骤 1: 连接服务器

```bash
ssh root@your-server-ip
```

### 步骤 2: 安装 Node.js

```bash
# 使用 nvm 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 16
nvm use 16

# 验证安装
node --version
npm --version
```

### 步骤 3: 安装 PM2

```bash
npm install -g pm2
```

### 步骤 4: 上传代码

**方式 1: 使用 Git**

```bash
cd /var/www
git clone your-repo-url wxgame
cd wxgame/server
```

**方式 2: 使用 SCP**

```bash
# 在本地执行
cd server
npm run build
scp -r dist package.json root@your-server-ip:/var/www/wxgame/server/
```

### 步骤 5: 安装依赖并启动

```bash
cd /var/www/wxgame/server
npm install --production

# 启动服务
pm2 start dist/server.js --name wxgame-server

# 查看状态
pm2 status

# 查看日志
pm2 logs wxgame-server

# 设置开机自启
pm2 startup
pm2 save
```

### 步骤 6: 配置 Nginx

**安装 Nginx**

```bash
sudo apt update
sudo apt install nginx
```

**配置 Nginx**

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/wxgame
```

添加以下内容：

```nginx
# WebSocket 升级配置
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书配置
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # WebSocket 配置
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # HTTP API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000;
    }
}
```

**启用配置**

```bash
sudo ln -s /etc/nginx/sites-available/wxgame /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 步骤 7: 申请 SSL 证书（使用 Let's Encrypt）

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期（certbot 会自动设置）
sudo certbot renew --dry-run
```

### 步骤 8: 配置防火墙

```bash
# 使用 ufw
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
sudo ufw status
```

## 📱 前端配置

### 步骤 1: 更新服务器地址

编辑 `src/game.ts`：

```typescript
// 将这行
const serverUrl = 'wss://your-server.com/ws';

// 改为实际域名
const serverUrl = 'wss://your-domain.com/ws';
```

### 步骤 2: 配置微信小游戏后台

1. 登录微信公众平台：https://mp.weixin.qq.com/
2. 进入 **开发 → 开发管理 → 开发设置**
3. 配置服务器域名：

**request 合法域名**:
```
https://your-domain.com
```

**uploadFile 合法域名**:
```
https://your-domain.com
```

**downloadFile 合法域名**:
```
https://your-domain.com
```

**socket 合法域名**:
```
wss://your-domain.com
```

**注意**：
- 域名必须是 HTTPS/WSS
- 域名必须已备案
- 配置后需要等待生效（通常几分钟）

### 步骤 3: 编译项目

```bash
# 在项目根目录
npm install
npm run build
```

### 步骤 4: 使用微信开发者工具上传

1. 打开微信开发者工具
2. 导入项目（选择 `wxapp` 文件夹）
3. 输入实际的 AppID（替换测试号）
4. 点击右上角 **上传**
5. 填写版本号和描述
6. 上传成功

### 步骤 5: 提交审核

1. 在微信公众平台，进入 **版本管理**
2. 找到刚上传的版本
3. 点击 **提交审核**
4. 填写审核信息（游戏类型、功能说明等）
5. 等待审核通过（通常 1-7 天）

### 步骤 6: 发布上线

审核通过后，点击 **发布** 即可上线。

## 🔍 测试验证

### 1. 测试服务器连接

```bash
# 测试 HTTP
curl https://your-domain.com/health

# 测试 WebSocket（需要安装 wscat）
npm install -g wscat
wscat -c wss://your-domain.com/ws
```

### 2. 测试小游戏

1. 使用微信开发者工具预览
2. 扫码在真机上测试
3. 测试单机模式和联机模式
4. 测试断线重连
5. 测试排行榜

## 📊 监控和维护

### 1. 查看日志

```bash
# PM2 日志
pm2 logs wxgame-server

# Nginx 日志
sudo tail -f /var/nginx/access.log
sudo tail -f /var/nginx/error.log
```

### 2. 性能监控

```bash
# PM2 监控
pm2 monit

# 系统资源
htop
```

### 3. 定期维护

```bash
# 更新代码
cd /var/www/wxgame/server
git pull
npm install --production
npm run build
pm2 restart wxgame-server

# 清理日志
pm2 flush

# 备份数据（如果有数据库）
# mysqldump -u user -p database > backup.sql
```

## 🔐 安全建议

1. **定期更新系统**

```bash
sudo apt update
sudo apt upgrade
```

2. **禁用 root SSH 登录**

编辑 `/etc/ssh/sshd_config`：

```
PermitRootLogin no
```

3. **使用 SSH 密钥认证**

4. **限制 WebSocket 连接频率**

在代码中添加速率限制。

5. **定期备份**

设置自动备份脚本。

## 🆘 常见问题

### Q: WebSocket 连接失败？

- 检查 Nginx 配置是否正确
- 确认 SSL 证书有效
- 检查防火墙规则
- 查看 Nginx 和 Node.js 日志

### Q: 域名配置被拒？

- 确保域名已备案
- 确保域名解析正确
- 等待配置生效（可能需要几分钟）

### Q: 审核不通过？

- 完善游戏说明和截图
- 确保没有违规内容
- 测试所有功能正常
- 根据反馈修改后重新提交

### Q: 服务器宕机？

```bash
# 查看状态
pm2 status

# 重启服务
pm2 restart wxgame-server

# 查看日志找原因
pm2 logs wxgame-server --err
```

## 📞 技术支持

遇到问题？

1. 查看本文档和 README.md
2. 查看微信官方文档：https://developers.weixin.qq.com/minigame/dev/guide/
3. 提交 Issue
4. 查看服务器日志排查问题

## 🎉 部署完成

恭喜！您的微信小游戏已成功部署上线！

下一步可以考虑：
- 添加更多游戏
- 优化性能
- 添加数据统计
- 接入支付功能
- 添加社交分享

