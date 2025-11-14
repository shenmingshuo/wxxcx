# 快速开始指南

5分钟快速体验微信小游戏合集！

## 📋 准备工作

1. **安装微信开发者工具**
   - 下载：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
   - 安装并打开

2. **安装 Node.js**
   - 下载：https://nodejs.org/ (推荐 LTS 版本)
   - 验证安装：`node --version`

## 🚀 第一步：启动前端

### 1. 安装依赖

```bash
cd /Users/shuo/Downloads/Dev/wxapp
npm install
```

### 2. 编译 TypeScript

```bash
npm run build

# 或者开启监听模式（推荐开发时使用）
npm run watch
```

### 3. 用微信开发者工具打开

1. 打开微信开发者工具
2. 选择「小游戏」
3. 点击「导入项目」
4. 选择目录：`/Users/shuo/Downloads/Dev/wxapp`
5. AppID：选择「测试号」或输入实际 AppID
6. 项目名称：随意填写
7. 点击「确定」

### 4. 体验单机模式

在开发者工具中，你现在可以：
- 看到游戏列表
- 点击任意游戏
- 选择「单机模式」
- 开始玩游戏！

## 🌐 第二步：启动后端（可选，用于联机对战）

如果你想体验联机对战功能，需要启动后端服务器。

### 1. 安装后端依赖

```bash
cd server
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

你应该看到：

```
[Server] Running on port 3000
[Server] WebSocket ready
```

### 3. 配置前端连接服务器

编辑 `src/game.ts`，找到以下代码并取消注释：

```typescript
// 找到这行（约在第 70 行）
const serverUrl = 'wss://your-server.com/ws';

// 改为本地地址
const serverUrl = 'ws://localhost:3000/ws';

// 找到这几行（约在第 95 行）并取消注释
this.networkManager.connect(serverUrl).catch(err => {
  console.error('[Game] Connect error:', err);
});
```

### 4. 关闭域名校验

在微信开发者工具中：
- 点击右上角「详情」
- 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」

### 5. 重新编译

```bash
cd ..
npm run build
```

在微信开发者工具中点击「编译」。

### 6. 体验联机对战

现在你可以：
1. 选择任意游戏
2. 点击「联机PK」
3. 创建房间
4. 用另一个设备/窗口加入房间
5. 双方准备后开始对战！

**如何开启第二个窗口？**
- 方法1：在工具栏点击「预览」，用手机扫码
- 方法2：再打开一个微信开发者工具实例

## 🎮 游戏说明

### 反应力PK ⚡
- 快速点击移动的彩色圆球
- 30秒内得分越高越好
- 每击中一个目标得 10 分

### 数字记忆 🧠
- 记住屏幕上依次出现的数字
- 按顺序输入这些数字
- 答对进入下一关，关卡越高难度越大

## 📱 在真机上测试

### 方法 1：扫码预览

1. 在开发者工具点击「预览」
2. 用微信扫描二维码
3. 在手机上体验

### 方法 2：上传体验版

1. 在开发者工具点击「上传」
2. 填写版本号和描述
3. 在微信公众平台设置体验者
4. 体验者在微信中搜索小游戏名称

## ❓ 常见问题

### Q: 编译失败？

```bash
# 清理并重新安装
rm -rf node_modules
npm install
npm run build
```

### Q: 开发者工具报错？

- 检查是否选择了「小游戏」类型（不是小程序）
- 确保已编译（运行 `npm run build`）
- 查看控制台的具体错误信息

### Q: 连接不上服务器？

- 确认后端服务器已启动（`cd server && npm run dev`）
- 确认关闭了域名校验
- 确认 `src/game.ts` 中的服务器地址正确
- 查看控制台的网络错误信息

### Q: 白屏？

- 检查控制台是否有报错
- 确认 TypeScript 已编译
- 尝试清除缓存并重新编译

### Q: 游戏卡顿？

- 在真机上测试性能会更好
- 开发者工具的性能不如真机
- 关闭不必要的日志输出

## 📚 下一步

现在你已经成功运行了项目！接下来可以：

1. **学习架构**：阅读 [README.md](./README.md) 了解项目结构
2. **添加游戏**：参考 [DEVELOPMENT.md](./DEVELOPMENT.md) 学习如何添加新游戏
3. **部署上线**：查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解如何部署到生产环境

## 🎯 开发模式推荐工作流

```bash
# 终端 1：监听前端代码变化
cd /Users/shuo/Downloads/Dev/wxapp
npm run watch

# 终端 2：启动后端服务器
cd /Users/shuo/Downloads/Dev/wxapp/server
npm run dev

# 微信开发者工具：
# - 保持打开状态
# - 代码改动后会自动重新编译
```

## 💡 提示

- **保存即编译**：watch 模式下，保存 `.ts` 文件会自动编译
- **自动刷新**：开发者工具会自动检测文件变化并刷新
- **调试工具**：使用开发者工具的 Console、Network 等标签调试
- **性能分析**：使用 Performance 标签分析性能

## 🎉 享受开发！

有任何问题，请查看：
- [完整文档 README.md](./README.md)
- [开发指南 DEVELOPMENT.md](./DEVELOPMENT.md)
- [部署指南 DEPLOYMENT.md](./DEPLOYMENT.md)
- [GitHub Issues](https://github.com/your-repo/issues)

祝你开发愉快！🚀

