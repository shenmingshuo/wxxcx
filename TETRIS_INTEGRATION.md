# 俄罗斯方块游戏集成文档

## 🎮 游戏概述

成功将经典的俄罗斯方块游戏集成到微信小游戏合集中，采用**手势控制方案**，提供流畅的移动端游戏体验。

## ✨ 核心特性

### 🎯 游戏功能
- ✅ **经典俄罗斯方块玩法**：7 种方块类型（I、O、T、S、Z、J、L）
- ✅ **完整的游戏逻辑**：旋转、移动、消除、得分、等级系统
- ✅ **手势控制**：点击旋转、滑动移动、下滑快速下落
- ✅ **操作提示弹窗**：进入游戏前显示操作说明
- ✅ **下一个方块预览**：右上角显示即将出现的方块
- ✅ **实时统计**：分数、消除行数、等级
- ✅ **暂停/继续**：随时暂停游戏
- ✅ **难度递增**：随等级提升，方块下落速度加快

### 🎨 UI/UX 设计
- **深色主题**：舒适的深色背景（#1a1a2e）
- **网格显示**：清晰的游戏区域网格线
- **彩色方块**：每种方块类型有独特的颜色
- **3D 效果**：方块带有高光和阴影，更立体
- **顶部信息栏**：
  - 左侧：返回按钮
  - 中间：分数、行数、等级
  - 右侧：暂停/继续按钮
- **下一个方块预览框**：右上角半透明黑色背景

## 📱 手势控制方案

### 操作说明

| 手势 | 功能 | 说明 |
|------|------|------|
| 👆 **点击屏幕** | 旋转方块 | 短促点击（< 200ms），方块顺时针旋转 90° |
| 👈 **左滑** | 向左移动 | 横向滑动距离 > 30px，方块向左移动一格 |
| 👉 **右滑** | 向右移动 | 横向滑动距离 > 30px，方块向右移动一格 |
| 👇 **下滑** | 快速下落 | 纵向向下滑动，方块瞬间落到底部 |

### 技术实现

```typescript
// 触摸检测逻辑
wx.onTouchStart((e) => {
  // 记录起始位置和时间
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
});

wx.onTouchEnd((e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const touchDuration = Date.now() - touchStartTime;
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  
  // 判断是点击还是滑动
  if (touchDuration < 200 && Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
    // 点击 - 旋转
    rotatePiece();
  } else if (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30) {
    // 滑动 - 移动
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 横向滑动
      deltaX > 0 ? moveRight() : moveLeft();
    } else {
      // 纵向滑动
      deltaY > 0 ? hardDrop() : null;
    }
  }
});
```

## 🎯 操作提示弹窗

### 功能说明
进入游戏时，自动显示操作提示弹窗，帮助玩家快速了解游戏操作。

### 弹窗内容
```
标题：🎮 游戏操作说明

内容：
👆 点击屏幕：旋转方块
👈 左滑：向左移动
👉 右滑：向右移动
👇 下滑：快速下落

准备好了吗？

按钮：[返回] [开始游戏]
```

### 实现代码
```typescript
private showTutorial(): void {
  wx.showModal({
    title: '🎮 游戏操作说明',
    content: '👆 点击屏幕：旋转方块\n👈 左滑：向左移动\n👉 右滑：向右移动\n👇 下滑：快速下落\n\n准备好了吗？',
    confirmText: '开始游戏',
    cancelText: '返回',
    success: (res) => {
      if (res.confirm) {
        this.showingTutorial = false;
        this.startGame();
      } else if (this.sceneManager) {
        this.sceneManager.switchTo('menu');
      }
    }
  });
}
```

## 🎲 方块类型与颜色

| 方块类型 | 形状 | 颜色 | 旋转状态 |
|---------|------|------|---------|
| **I** (直线) | ▮▮▮▮ | 青色 #00f0f0 | 2 种 |
| **O** (方块) | ▮▮<br>▮▮ | 黄色 #f0f000 | 1 种 |
| **T** (T形) | ▮▮▮<br>_▮_ | 紫色 #a000f0 | 4 种 |
| **S** (S形) | _▮▮<br>▮▮_ | 绿色 #00f000 | 2 种 |
| **Z** (Z形) | ▮▮_<br>_▮▮ | 红色 #f00000 | 2 种 |
| **J** (J形) | ▮__<br>▮▮▮ | 蓝色 #0000f0 | 4 种 |
| **L** (L形) | __▮<br>▮▮▮ | 橙色 #f0a000 | 4 种 |

## 📊 得分系统

### 消除行数奖励
- **1 行**：100 分 × 等级
- **2 行**：300 分 × 等级
- **3 行**：500 分 × 等级
- **4 行**：800 分 × 等级

### 等级系统
- 每消除 **10 行**升 1 级
- 等级越高，方块下落速度越快
- 下落间隔 = `max(100ms, 1000ms - (等级 - 1) × 100ms)`

### 示例
```
等级 1: 1000ms 间隔
等级 2: 900ms 间隔
等级 3: 800ms 间隔
...
等级 10+: 100ms 间隔（最快）
```

## 🎨 渲染细节

### 方块 3D 效果
```typescript
private renderBlock(ctx, x, y, color) {
  // 主体颜色
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  
  // 高光（顶部 1/3）
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(px + 2, py + 2, size - 4, size / 3);
  
  // 阴影（底部 1/3）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(px + 2, py + size - size / 3, size - 4, size / 3 - 2);
}
```

### 响应式布局
```typescript
// 根据屏幕尺寸动态计算方块大小
const availableHeight = windowHeight - 250;
const blockSizeByHeight = Math.floor(availableHeight / ROWS);
const blockSizeByWidth = Math.floor((windowWidth - 40) / COLS);
this.blockSize = Math.min(blockSizeByHeight, blockSizeByWidth);

// 居中显示
this.offsetX = (windowWidth - this.blockSize * COLS) / 2;
this.offsetY = 150;
```

## 🔧 核心算法

### 碰撞检测
```typescript
private checkCollision(x: number, y: number, shape: number[][]): boolean {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = x + col;
        const newY = y + row;
        
        // 检查边界
        if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
        
        // 检查已有方块
        if (newY >= 0 && this.board[newY][newX]) return true;
      }
    }
  }
  return false;
}
```

### 消除行
```typescript
private clearLines(): void {
  let linesCleared = 0;
  
  for (let row = ROWS - 1; row >= 0; row--) {
    // 检查该行是否已满
    if (this.board[row].every(cell => cell !== null)) {
      // 删除该行
      this.board.splice(row, 1);
      // 在顶部添加新的空行
      this.board.unshift(Array(COLS).fill(null));
      linesCleared++;
      row++; // 重新检查当前行
    }
  }
  
  // 更新分数和等级
  if (linesCleared > 0) {
    this.lines += linesCleared;
    this.score += [0, 100, 300, 500, 800][linesCleared] * this.level;
    this.level = Math.floor(this.lines / 10) + 1;
    this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
  }
}
```

### 旋转方块
```typescript
private rotatePiece(): void {
  if (!this.currentPiece) return;
  
  const shapes = SHAPES[this.currentPiece.type];
  const nextRotation = (this.currentPiece.rotation + 1) % shapes.length;
  const newShape = shapes[nextRotation];
  
  // 检查旋转后是否会碰撞
  if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y, newShape)) {
    this.currentPiece.shape = newShape;
    this.currentPiece.rotation = nextRotation;
  }
}
```

## 📁 文件结构

```
/Users/shuo/Downloads/Dev/wxapp/
├── src/
│   ├── games/
│   │   └── TetrisGame.ts          # 俄罗斯方块主逻辑（新增）
│   ├── scenes/
│   │   └── MenuScene.ts           # 主菜单（已更新）
│   └── game.ts                    # 主入口（已更新）
└── js/
    └── games/
        └── TetrisGame.js          # 编译后的文件
```

## 🎮 使用方法

### 启动游戏
1. 在主菜单中找到 "俄罗斯方块 🧱" 卡片
2. 点击"开始游戏"按钮
3. 阅读操作提示弹窗
4. 点击"开始游戏"进入游戏

### 游戏操作
- **点击屏幕**：旋转方块
- **左右滑动**：移动方块
- **下滑**：快速下落
- **暂停按钮**：暂停/继续游戏
- **返回按钮**：退出游戏（需确认）

### 游戏目标
- 消除尽可能多的行
- 获得更高的分数
- 挑战更高的等级

## 🆚 方案对比

### 方案 1：虚拟按键
**优点**：
- ✅ 操作精确，不会误触
- ✅ 适合快节奏游戏
- ✅ 视觉反馈明确

**缺点**：
- ❌ 占用屏幕空间
- ❌ 需要额外的 UI 设计

### 方案 2：手势控制（当前方案）⭐
**优点**：
- ✅ 全屏游戏体验
- ✅ 操作流畅自然
- ✅ 符合移动端习惯
- ✅ 界面简洁

**缺点**：
- ⚠️ 需要适应期
- ⚠️ 可能有误触（已通过阈值优化）

## 🔮 未来扩展

### 可以添加的功能：
1. **音效系统**：
   - 方块移动音效
   - 旋转音效
   - 消除行音效
   - 游戏结束音效
   - 背景音乐

2. **视觉效果**：
   - 消除行时的闪烁动画
   - 方块下落的轨迹预览（幽灵方块）
   - 等级提升的特效
   - 粒子效果

3. **游戏模式**：
   - 经典模式（当前）
   - 限时模式（2 分钟挑战）
   - 闯关模式（预设关卡）
   - 对战模式（双人 PK）

4. **排行榜**：
   - 集成开放数据域
   - 好友排行
   - 全球排行

5. **道具系统**：
   - 炸弹（消除一行）
   - 时间暂停
   - 重选方块
   - 撤销一步

6. **皮肤系统**：
   - 多种主题（霓虹、复古、简约等）
   - 自定义方块样式
   - 背景图片

## 📚 参考资源

- **原始项目**：https://github.com/Aerolab/blockrain.js
- **俄罗斯方块规则**：https://tetris.wiki/
- **微信小游戏文档**：https://developers.weixin.qq.com/minigame/dev/

## 🎉 总结

这次集成展示了如何将基于 jQuery 的 Canvas 游戏改造为适配微信小游戏的纯 JavaScript 版本，并创新性地使用**手势控制**替代传统键盘操作，提供了更好的移动端体验。

关键成就：
1. ✅ 完整实现俄罗斯方块核心逻辑
2. ✅ 创新的手势控制方案
3. ✅ 友好的操作提示系统
4. ✅ 精美的视觉效果
5. ✅ 完善的得分和等级系统

这个游戏可以作为其他手势控制游戏的参考模板！🎮✨

