import { Scene } from '../core/SceneManager';
import { GameBridge } from '../core/GameBridge';
import { Button } from '../ui/components/Button';

export class GobangGame implements Scene {
    name: string = 'gobang';
    private canvas: WechatMinigame.Canvas;
    private ctx: CanvasRenderingContext2D;
    private gameBridge: GameBridge | null = null;
    private sceneManager: any = null;
    private isRunning: boolean = false;

    // Game Constants
    private readonly BOARD_SIZE = 15;
    private readonly CELL_SIZE = 40; // Will be calculated based on screen width
    private readonly BOARD_PADDING = 20;
    private readonly AI_THINKING_DELAY = 2000; // ms

    // Game State
    private board: number[][] = []; // 0=Empty, 1=Black (Player), 2=White (AI)
    private currentPlayer: number = 1; // 1 or 2
    private gameOver: boolean = false;
    private winner: number = 0;
    private lastMove: { row: number, col: number } | null = null;
    private userPlayer: number = 1; // 1=Black, 2=White
    private difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    private winningLine: { row: number, col: number }[] | null = null;
    private winLinePulse: number = 0;

    // UI
    private boardX: number = 0;
    private boardY: number = 0;
    private boardWidth: number = 0;

    // Buttons
    private restartBtn: Button | null = null;
    private backBtn: Button | null = null;

    private audioContext: any = null;
    private aiMoveTimer: ReturnType<typeof setTimeout> | null = null;

    init(): void {
        const { windowWidth, windowHeight } = wx.getSystemInfoSync();

        // Audio Init
        this.audioContext = wx.createInnerAudioContext();
        this.audioContext.src = 'assets/watermelon/audio/knock.mp3'; // borrowing from watermelon

        // Calculate board dimensions
        const maxSize = windowWidth - (this.BOARD_PADDING * 2);
        const cellSize = Math.floor(maxSize / 14);

        // Recalculate board width based on clean cell size
        this.boardWidth = cellSize * 14;

        // Center the board
        this.boardX = (windowWidth - this.boardWidth) / 2;
        this.boardY = (windowHeight - this.boardWidth) / 2;

        // Buttons
        this.restartBtn = new Button('重新开始', windowWidth / 2 - 110, this.boardY + this.boardWidth + 50, 100, 40, 'primary');
        this.restartBtn.onClick = () => this.resetGame();

        this.backBtn = new Button('返回主页', windowWidth / 2 + 10, this.boardY + this.boardWidth + 50, 100, 40, 'secondary');
        this.backBtn.onClick = () => this.sceneManager.switchTo('menu');

        this.resetGame();
    }

    resetGame() {
        this.clearAIMoveTimer();
        this.board = Array(this.BOARD_SIZE).fill(0).map(() => Array(this.BOARD_SIZE).fill(0));
        this.currentPlayer = 1; // Black always starts
        this.gameOver = false;
        this.winner = 0;
        this.lastMove = null;
        this.winningLine = null;
        this.winLinePulse = 0;

        // Randomize User Side (50/50)
        this.userPlayer = Math.random() < 0.5 ? 1 : 2;
        console.log(`[Gobang] User is ${this.userPlayer === 1 ? 'Black' : 'White'}`);
    }

    enter(data?: any): void {
        console.log('[Gobang] Game starting...', data);
        this.isRunning = true;
        this.difficulty = data?.difficulty || 'medium';
        this.resetGame();
    }

    exit(): void {
        console.log('[Gobang] Game exiting...');
        this.isRunning = false;
        this.clearAIMoveTimer();
    }

    update(deltaTime: number): void {
        if (this.restartBtn) this.restartBtn.update(deltaTime);
        if (this.backBtn) this.backBtn.update(deltaTime);
        if (this.gameOver && this.winningLine) {
            this.winLinePulse += deltaTime;
        }

        // AI Turn Logic: If it's NOT user's turn (and game running), AI moves
        if (!this.gameOver && this.currentPlayer !== this.userPlayer && this.isRunning) {
            this.scheduleAIMove();
        } else {
            this.clearAIMoveTimer();
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.isRunning) return;

        this.drawBackground(ctx);
        this.drawBoard(ctx);
        this.drawStones(ctx);

        // Draw UI (Buttons & Status) normally
        this.drawUI(ctx);

        const shouldHighlightWin = this.gameOver && this.winningLine;

        if (this.gameOver) {
            this.drawGameOver(ctx);
        }

        if (shouldHighlightWin && this.winningLine) {
            this.drawWinningLine(ctx);
        }
    }

    private drawBackground(ctx: CanvasRenderingContext2D) {
        const { width, height } = ctx.canvas;
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
    }

    private drawBoard(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#e3c497';
        const padding = 15;
        ctx.fillRect(this.boardX - padding, this.boardY - padding, this.boardWidth + padding * 2, this.boardWidth + padding * 2);

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Grid Lines
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cellSize = this.boardWidth / 14;

        for (let i = 0; i < this.BOARD_SIZE; i++) {
            const y = this.boardY + i * cellSize;
            ctx.moveTo(this.boardX, y);
            ctx.lineTo(this.boardX + this.boardWidth, y);

            const x = this.boardX + i * cellSize;
            ctx.moveTo(x, this.boardY);
            ctx.lineTo(x, this.boardY + this.boardWidth);
        }
        ctx.stroke();

        // Star Points
        const starPoints = [3, 7, 11];
        ctx.fillStyle = '#000';
        for (let r of starPoints) {
            for (let c of starPoints) {
                const x = this.boardX + c * cellSize;
                const y = this.boardY + r * cellSize;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private drawStones(ctx: CanvasRenderingContext2D) {
        const cellSize = this.boardWidth / 14;
        const radius = cellSize * 0.45;

        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                const val = this.board[r][c];
                if (val !== 0) {
                    const x = this.boardX + c * cellSize;
                    const y = this.boardY + r * cellSize;

                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;

                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);

                    const grad = ctx.createRadialGradient(
                        x - radius / 3, y - radius / 3, radius / 10,
                        x, y, radius
                    );

                    if (val === 1) { // Black
                        grad.addColorStop(0, '#555');
                        grad.addColorStop(1, '#000');
                    } else { // White
                        grad.addColorStop(0, '#fff');
                        grad.addColorStop(1, '#ddd');
                    }

                    ctx.fillStyle = grad;
                    ctx.fill();

                    // Reset shadow
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;

                    // Highlight last move
                    if (this.lastMove && this.lastMove.row === r && this.lastMove.col === c) {
                        ctx.strokeStyle = '#f00';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([]);
                        ctx.beginPath();
                        ctx.moveTo(x - 5, y);
                        ctx.lineTo(x + 5, y);
                        ctx.moveTo(x, y - 5);
                        ctx.lineTo(x, y + 5);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    private drawWinningLine(ctx: CanvasRenderingContext2D) {
        if (!this.winningLine || this.winningLine.length === 0) return;

        const cellSize = this.boardWidth / 14;
        const pulse = (Math.sin(this.winLinePulse / 250) + 1) / 2;
        const start = this.winningLine[0];
        const end = this.winningLine[this.winningLine.length - 1];
        const startX = this.boardX + start.col * cellSize;
        const startY = this.boardY + start.row * cellSize;
        const endX = this.boardX + end.col * cellSize;
        const endY = this.boardY + end.row * cellSize;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = cellSize * (0.15 + pulse * 0.1);
        ctx.strokeStyle = `rgba(255, 87, 34, ${0.65 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = `rgba(255, 235, 59, ${0.4 + pulse * 0.4})`;
        const glowRadius = cellSize * (0.25 + pulse * 0.1);
        for (const pos of this.winningLine) {
            const cx = this.boardX + pos.col * cellSize;
            const cy = this.boardY + pos.row * cellSize;
            ctx.beginPath();
            ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    private drawUI(ctx: CanvasRenderingContext2D) {
        if (this.restartBtn) this.restartBtn.render(ctx);
        if (this.backBtn) this.backBtn.render(ctx);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';

        // Only show status text if game NOT over (Game Over screen handles it otherwise)
        if (!this.gameOver) {
            const isUserTurn = this.currentPlayer === this.userPlayer;
            const turnStr = this.currentPlayer === 1 ? '黑棋' : '白棋';
            const text = `轮到${turnStr} ${isUserTurn ? '(你)' : '(AI)'}`;

            ctx.fillText(text, ctx.canvas.width / 2, this.boardY - 40);

            // Subtitle for User Color
            ctx.font = '16px Arial';
            ctx.fillStyle = '#666';
            const userColorStr = this.userPlayer === 1 ? '黑棋 (先手)' : '白棋 (后手)';
            ctx.fillText(`你是: ${userColorStr} - 难度: ${this.difficulty.toUpperCase()}`, ctx.canvas.width / 2, this.boardY - 10);
        }
    }

    private drawGameOver(ctx: CanvasRenderingContext2D) {
        const { width, height } = ctx.canvas;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Prefer using the free area above or below the board so the winning line stays visible
        const panelWidth = Math.min(width * 0.75, this.boardWidth);
        const panelHeight = 150;
        const spaceTop = this.boardY;
        const spaceBottom = height - (this.boardY + this.boardWidth);
        let my: number;

        if (spaceTop > spaceBottom) {
            my = Math.max(20, (spaceTop - panelHeight) / 2);
        } else {
            my = Math.min(height - panelHeight - 20, this.boardY + this.boardWidth + Math.max(10, (spaceBottom - panelHeight) / 2));
        }

        const mx = (width - panelWidth) / 2;

        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 12;
        ctx.fillRect(mx, my, panelWidth, panelHeight);
        ctx.shadowBlur = 0;

        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';

        let title = '平局';
        let color = '#666';

        if (this.winner !== 0) {
            if (this.winner === this.userPlayer) {
                title = '恭喜获胜!';
                color = '#2e7d32';
            } else {
                title = '遗憾落败';
                color = '#d32f2f';
            }
        }

        ctx.fillStyle = color;
        ctx.fillText(title, width / 2, my + 55);

        ctx.fillStyle = '#333';
        ctx.font = '22px Arial';
        const reason = this.winner === 1 ? '黑棋连成五子' : (this.winner === 2 ? '白棋连成五子' : '双方和棋');
        ctx.fillText(reason, width / 2, my + 100);

        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.fillText('使用下方按钮重新开始或退出', width / 2, my + 130);
    }

    onTouchStart(x: number, y: number): void {
        if (this.restartBtn && this.restartBtn.handleTouchStart(x, y)) return;
        if (this.backBtn && this.backBtn.handleTouchStart(x, y)) return;

        // Only allow move if it's user's turn
        if (this.gameOver || this.currentPlayer !== this.userPlayer) return;

        const cellSize = this.boardWidth / 14;
        const relX = x - this.boardX;
        const relY = y - this.boardY;

        const col = Math.round(relX / cellSize);
        const row = Math.round(relY / cellSize);

        if (row >= 0 && row < this.BOARD_SIZE && col >= 0 && col < this.BOARD_SIZE) {
            const gridX = col * cellSize;
            const gridY = row * cellSize;
            const dist = Math.sqrt((relX - gridX) ** 2 + (relY - gridY) ** 2);

            if (dist < cellSize * 0.6) {
                this.makeMove(row, col);
            }
        }
    }

    onTouchEnd(x: number, y: number): void {
        if (this.restartBtn) this.restartBtn.handleTouchEnd(x, y);
        if (this.backBtn) this.backBtn.handleTouchEnd(x, y);
    }

    private makeMove(row: number, col: number) {
        if (this.board[row][col] !== 0) return;

        this.board[row][col] = this.currentPlayer;
        this.lastMove = { row, col };

        // Play Sound
        if (this.audioContext) {
            this.audioContext.stop();
            this.audioContext.play();
        }

        const winLine = this.getWinningLine(row, col, this.currentPlayer);
        if (winLine) {
            this.gameOver = true;
            this.winner = this.currentPlayer;
            this.winningLine = winLine;
            this.winLinePulse = 0;
        } else {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        }
    }

    private makeAIMove() {
        if (this.gameOver) return;
        this.clearAIMoveTimer();

        let bestMove: { row: number, col: number } | null = null;

        if (this.difficulty === 'easy') {
            bestMove = this.getEasyMove();
        } else if (this.difficulty === 'medium') {
            bestMove = this.getMediumMove();
        } else {
            bestMove = this.getHardMove();
        }

        if (bestMove) {
            this.makeMove(bestMove.row, bestMove.col);
        }
    }

    private getEasyMove(): { row: number, col: number } | null {
        const candidates = [];
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                if (this.board[r][c] === 0 && this.hasNeighbor(r, c)) {
                    candidates.push({ r, c });
                }
            }
        }
        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        return this.getRandomMove();
    }

    private getMediumMove(): { row: number, col: number } | null {
        return this.getHeuristicMove(1.0, 0.8);
    }

    private getHardMove(): { row: number, col: number } | null {
        return this.getHeuristicMove(1.0, 1.5);
    }

    private getHeuristicMove(attackWeight: number, defenseWeight: number): { row: number, col: number } | null {
        const moves = [];
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                if (this.board[r][c] === 0) {
                    if (this.hasNeighbor(r, c)) {
                        const score = this.evaluatePoint(r, c, attackWeight, defenseWeight);
                        moves.push({ r, c, score });
                    }
                }
            }
        }

        if (moves.length === 0) return this.getRandomMove();

        moves.sort((a, b) => b.score - a.score);
        const bestScore = moves[0].score;
        const candidates = moves.filter(m => m.score >= bestScore * 0.9);
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];

        return { row: chosen.r, col: chosen.c };
    }

    private getRandomMove(): { row: number, col: number } {
        let r = 7, c = 7;
        while (this.board[r][c] !== 0) {
            r = Math.floor(Math.random() * this.BOARD_SIZE);
            c = Math.floor(Math.random() * this.BOARD_SIZE);
        }
        return { row: r, col: c };
    }

    private hasNeighbor(row: number, col: number): boolean {
        for (let r = row - 2; r <= row + 2; r++) {
            for (let c = col - 2; c <= col + 2; c++) {
                if (r >= 0 && r < this.BOARD_SIZE && c >= 0 && c < this.BOARD_SIZE) {
                    if (this.board[r][c] !== 0) return true;
                }
            }
        }
        return true;
    }

    private evaluatePoint(row: number, col: number, attackWeight: number, defenseWeight: number): number {
        let score = 0;

        // Logical "AI Player" is essentially "whoever is current turn" because makeAIMove is only called when AI is moving
        // But let's be safe and use this.userPlayer to derive AI color
        const aiColor = (this.userPlayer === 1) ? 2 : 1;
        const userColor = this.userPlayer;

        // AI Attack Score (placing stone for itself)
        score += this.evaluateDirectionScore(row, col, aiColor, attackWeight);
        // AI Defense Score (blocking user)
        score += this.evaluateDirectionScore(row, col, userColor, defenseWeight);

        return score;
    }

    private evaluateDirectionScore(row: number, col: number, player: number, weight: number): number {
        let total = 0;
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dr, dc] of dirs) {
            let count = 1;
            let blockedEnds = 0;

            // Check +Direction
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r < this.BOARD_SIZE && c >= 0 && c < this.BOARD_SIZE && this.board[r][c] == player) {
                count++;
                r += dr;
                c += dc;
            }
            if (r < 0 || r >= this.BOARD_SIZE || c < 0 || c >= this.BOARD_SIZE || this.board[r][c] !== 0) {
                blockedEnds++;
            }

            // Check -Direction
            r = row - dr;
            c = col - dc;
            while (r >= 0 && r < this.BOARD_SIZE && c >= 0 && c < this.BOARD_SIZE && this.board[r][c] == player) {
                count++;
                r -= dr;
                c -= dc;
            }
            if (r < 0 || r >= this.BOARD_SIZE || c < 0 || c >= this.BOARD_SIZE || this.board[r][c] !== 0) {
                blockedEnds++;
            }

            // Scoring logic
            if (count >= 5) total += 100000;
            else if (count === 4) {
                if (blockedEnds === 0) total += 10000;
                else if (blockedEnds === 1) total += 1000;
            } else if (count === 3) {
                if (blockedEnds === 0) total += 1000;
                else if (blockedEnds === 1) total += 100;
            } else if (count === 2) {
                if (blockedEnds === 0) total += 100;
            }
        }
        return total * weight;
    }

    private getWinningLine(row: number, col: number, player: number): { row: number, col: number }[] | null {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dr, dc] of dirs) {
            const sequence = [{ row, col }];

            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r < this.BOARD_SIZE && c >= 0 && c < this.BOARD_SIZE && this.board[r][c] === player) {
                sequence.push({ row: r, col: c });
                r += dr;
                c += dc;
            }

            r = row - dr;
            c = col - dc;
            while (r >= 0 && r < this.BOARD_SIZE && c >= 0 && c < this.BOARD_SIZE && this.board[r][c] === player) {
                sequence.unshift({ row: r, col: c });
                r -= dr;
                c -= dc;
            }

            if (sequence.length >= 5) {
                if (sequence.length > 5) {
                    const currentIndex = sequence.findIndex(p => p.row === row && p.col === col);
                    const startIndex = Math.                                                                                                                                                                                                                                                                                                                              max(0, Math.min(currentIndex - 2, sequence.length - 5));
                    return sequence.slice(startIndex, startIndex + 5);
                }
                return sequence;
            }
        }
        return null;
    }

    setGameBridge(bridge: GameBridge): void {
        this.gameBridge = bridge;
    }

    setSceneManager(manager: any): void {
        this.sceneManager = manager;
    }

    private scheduleAIMove() {
        if (this.aiMoveTimer !== null) return;
        this.aiMoveTimer = setTimeout(() => {
            this.aiMoveTimer = null;
            if (this.isRunning && !this.gameOver && this.currentPlayer !== this.userPlayer) {
                this.makeAIMove();
            }
        }, this.AI_THINKING_DELAY);
    }

    private clearAIMoveTimer() {
        if (this.aiMoveTimer !== null) {
            clearTimeout(this.aiMoveTimer);
            this.aiMoveTimer = null;
        }
    }
}
