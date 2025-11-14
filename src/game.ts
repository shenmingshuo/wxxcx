/**
 * 游戏主入口
 */
import { SceneManager } from './core/SceneManager';
import { NetworkManager } from './core/NetworkManager';
import { GameBridge } from './core/GameBridge';

// 场景
import { MenuScene } from './scenes/MenuScene';
import { LobbyScene } from './scenes/LobbyScene';

// 游戏
import { Game2048 } from './games/Game2048';
import { TetrisGame } from './games/TetrisGame';
import { ShooterGame } from './games/ShooterGame';
import { FlappyBirdGame } from './games/FlappyBirdGame';

class Game {
  private sceneManager: SceneManager;
  private networkManager: NetworkManager;
  private gameBridge: GameBridge;

  constructor() {
    console.log('[Game] Initializing...');

    // 禁用触摸缩放效果
    try {
      wx.setEnableDebug({ enableDebug: false });
    } catch (e) {
      // 忽略错误
    }

    // 创建 Canvas
    const canvas = wx.createCanvas();
    
    // 设置 Canvas 样式，禁用用户缩放
    const systemInfo = wx.getSystemInfoSync();
    canvas.width = systemInfo.windowWidth;
    canvas.height = systemInfo.windowHeight;
    
    // 初始化管理器
    this.sceneManager = new SceneManager(canvas);
    this.networkManager = new NetworkManager();
    this.gameBridge = new GameBridge(this.networkManager);

    // 注册场景
    this.registerScenes();

    // 连接服务器
    this.connectServer();

    // 启动游戏
    this.sceneManager.start();
    this.sceneManager.switchTo('menu');

    console.log('[Game] Started');
  }

  /**
   * 注册所有场景
   */
  private registerScenes(): void {
    // 主菜单
    const menuScene = new MenuScene();
    menuScene.setSceneManager(this.sceneManager);
    this.sceneManager.register(menuScene);

    // 房间大厅
    const lobbyScene = new LobbyScene();
    lobbyScene.setSceneManager(this.sceneManager);
    lobbyScene.setGameBridge(this.gameBridge);
    this.sceneManager.register(lobbyScene);

    // 2048游戏
    const game2048 = new Game2048();
    game2048.setSceneManager(this.sceneManager);
    game2048.setGameBridge(this.gameBridge);
    this.sceneManager.register(game2048);

    // 俄罗斯方块游戏
    const tetrisGame = new TetrisGame();
    tetrisGame.setSceneManager(this.sceneManager);
    tetrisGame.setGameBridge(this.gameBridge);
    this.sceneManager.register(tetrisGame);

    // 射击游戏
    const shooterGame = new ShooterGame();
    shooterGame.setSceneManager(this.sceneManager);
    shooterGame.setGameBridge(this.gameBridge);
    this.sceneManager.register(shooterGame);

    // Flappy Bird 游戏
    const flappyBirdGame = new FlappyBirdGame();
    flappyBirdGame.setSceneManager(this.sceneManager);
    flappyBirdGame.setGameBridge(this.gameBridge);
    this.sceneManager.register(flappyBirdGame);

    console.log('[Game] All scenes registered');
  }

  /**
   * 连接服务器
   */
  private connectServer(): void {
    // TODO: 从配置文件读取服务器地址
    // 开发环境使用本地服务器
    const serverUrl = 'wss://your-server.com/ws'; // 需要替换为实际服务器地址
    
    // 注意：开发时需要先启动后端服务器
    // 为了演示，这里先不连接，等后端服务器准备好后再连接
    
    console.log('[Game] Server URL:', serverUrl);
    console.log('[Game] Note: Update server URL in src/game.ts');
    
    // 连接事件监听
    this.networkManager.on('connected', () => {
      console.log('[Game] Connected to server');
      wx.showToast({
        title: '已连接服务器',
        icon: 'success',
        duration: 2000
      });
    });

    this.networkManager.on('disconnected', () => {
      console.log('[Game] Disconnected from server');
    });

    this.networkManager.on('reconnect_failed', () => {
      console.log('[Game] Reconnect failed');
      wx.showToast({
        title: '连接失败',
        icon: 'error',
        duration: 2000
      });
    });

    // 取消注释以启用自动连接
    // this.networkManager.connect(serverUrl).catch(err => {
    //   console.error('[Game] Connect error:', err);
    // });
  }
}

// 启动游戏
new Game();

