/**
 * 开放数据域 - 排行榜
 * 注意：这里是纯 JS，不使用 TypeScript
 */

// 获取开放数据域的 Canvas
const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext('2d');

let rankData = [];
let displayMode = 'friend'; // 'friend' 或 'group'

// 监听主域发来的消息
wx.onMessage(data => {
  console.log('[OpenData] Received message:', data);
  
  if (data.command === 'fetchFriendRank') {
    fetchFriendRank(data.gameType);
  } else if (data.command === 'fetchGroupRank') {
    fetchGroupRank(data.gameType, data.shareTicket);
  } else if (data.command === 'updateScore') {
    updateScore(data.gameType, data.score);
  }
});

/**
 * 获取好友排行榜
 */
function fetchFriendRank(gameType) {
  displayMode = 'friend';
  
  wx.getUserCloudStorage({
    keyList: [gameType],
    success: res => {
      console.log('[OpenData] Friend rank data:', res);
      rankData = parseRankData(res.KVDataList);
      render();
    },
    fail: err => {
      console.error('[OpenData] Fetch friend rank failed:', err);
    }
  });
}

/**
 * 获取群排行榜
 */
function fetchGroupRank(gameType, shareTicket) {
  displayMode = 'group';
  
  if (!shareTicket) {
    console.warn('[OpenData] No shareTicket provided');
    return;
  }
  
  wx.getGroupCloudStorage({
    shareTicket: shareTicket,
    keyList: [gameType],
    success: res => {
      console.log('[OpenData] Group rank data:', res);
      rankData = parseRankData(res.data);
      render();
    },
    fail: err => {
      console.error('[OpenData] Fetch group rank failed:', err);
    }
  });
}

/**
 * 更新分数
 */
function updateScore(gameType, score) {
  wx.setUserCloudStorage({
    KVDataList: [{
      key: gameType,
      value: JSON.stringify({
        score: score,
        timestamp: Date.now()
      })
    }],
    success: () => {
      console.log('[OpenData] Score updated:', score);
      // 更新后重新拉取排行榜
      if (displayMode === 'friend') {
        fetchFriendRank(gameType);
      }
    },
    fail: err => {
      console.error('[OpenData] Update score failed:', err);
    }
  });
}

/**
 * 解析排行榜数据
 */
function parseRankData(kvDataList) {
  const parsed = kvDataList.map(item => {
    let scoreData = { score: 0, timestamp: 0 };
    
    try {
      scoreData = JSON.parse(item.KVData || item.value);
    } catch (e) {
      console.warn('[OpenData] Parse score data failed:', e);
    }
    
    return {
      nickname: item.nickname,
      avatarUrl: item.avatarUrl,
      score: scoreData.score || 0,
      timestamp: scoreData.timestamp || 0
    };
  });
  
  // 按分数排序
  parsed.sort((a, b) => b.score - a.score);
  
  return parsed;
}

/**
 * 渲染排行榜
 */
function render() {
  const { width, height } = sharedCanvas;
  
  // 清空画布
  ctx.clearRect(0, 0, width, height);
  
  if (rankData.length === 0) {
    renderEmpty();
    return;
  }
  
  // 标题
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('排行榜', width / 2, 40);
  
  // 渲染列表
  const itemHeight = 80;
  const startY = 80;
  
  rankData.forEach((item, index) => {
    if (index < 10) { // 最多显示前10名
      renderRankItem(item, index, startY + index * itemHeight, itemHeight);
    }
  });
}

/**
 * 渲染排行榜项
 */
function renderRankItem(item, rank, y, height) {
  const { width } = sharedCanvas;
  const padding = 20;
  
  // 背景
  if (rank % 2 === 0) {
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(padding, y, width - padding * 2, height - 10);
  }
  
  // 排名
  ctx.fillStyle = getRankColor(rank);
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((rank + 1).toString(), padding + 20, y + height / 2 + 10);
  
  // 头像（占位符，实际会由微信渲染）
  const avatarSize = 50;
  const avatarX = padding + 80;
  const avatarY = y + (height - avatarSize) / 2 - 5;
  
  if (item.avatarUrl) {
    const img = wx.createImage();
    img.src = item.avatarUrl;
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    };
  } else {
    // 默认头像
    ctx.fillStyle = '#cccccc';
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 昵称
  ctx.fillStyle = '#333333';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(item.nickname || '未知玩家', padding + 150, y + height / 2 + 5);
  
  // 分数
  ctx.fillStyle = '#666666';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(item.score.toString(), width - padding - 20, y + height / 2 + 5);
}

/**
 * 渲染空状态
 */
function renderEmpty() {
  const { width, height } = sharedCanvas;
  
  ctx.fillStyle = '#999999';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('暂无排行数据', width / 2, height / 2);
  ctx.fillText('快去玩游戏吧！', width / 2, height / 2 + 40);
}

/**
 * 获取排名颜色
 */
function getRankColor(rank) {
  if (rank === 0) return '#FFD700'; // 金色
  if (rank === 1) return '#C0C0C0'; // 银色
  if (rank === 2) return '#CD7F32'; // 铜色
  return '#666666';
}

// 初始渲染
render();

