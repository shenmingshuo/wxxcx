import { UIComponent } from '../core/UIComponent';
import { Theme } from '../Theme';
import { GameConfig } from '../../core/types';
import { Button } from './Button';

export class GameCard extends UIComponent {
    public config: GameConfig;
    private startButton: Button;
    private bgImage: any = null; // WechatMinigame.Image might not be available in types
    private imageLoaded: boolean = false;

    // 动画状态
    private hoverScale: number = 1.0;

    constructor(config: GameConfig, x: number, y: number, width: number, height: number) {
        super(x, y, width, height);
        this.config = config;
        this.interactive = true;

        // 加载背景图
        this.loadBgImage();

        // 按钮 (右下角，霓虹风格)
        const btnWidth = 100;
        const btnHeight = 36;
        this.startButton = new Button(
            'START',
            width - btnWidth - 16,
            height - btnHeight - 16,
            btnWidth,
            btnHeight,
            'primary'
        );
        this.startButton.fontSize = 14;
        // 按钮文字改成黑色以匹配霓虹按钮
        // Button组件内部需要根据Variant适配文字颜色，我们在Theme里已经调整了primary.text

        // 不拦截点击，卡片整体可点
        this.startButton.interactive = false;
        this.addChild(this.startButton);
        console.log(`[GameCard] Created for ${config.name}, interactive=${this.interactive}, x=${x}, y=${y}, w=${width}, h=${height}`);
    }

    private loadBgImage(): void {
        // 尝试加载对应游戏的封面图
        // 命名规则: game_cover_{id}.png (id如果在 config 里不一致需要映射，这里假设 config.id 对应)
        // 注意: config.id 可能包含中文，最好有个映射表。目前暂时用 config.id (如果是中文需要 encode?)
        // 简单起见，我们假设 assets/covers/game_cover_{id}.png 存在
        // 由于之前生成图片失败，这里可能加载不到，需要优雅降级

        const bg = wx.createImage();
        // 直接使用 ID (已统一为英文小写)
        const fileId = this.config.id.toLowerCase();

        bg.src = `assets/covers/game_cover_${fileId}.png`;

        bg.onload = () => {
            this.bgImage = bg;
            this.imageLoaded = true;
        };
        bg.onerror = () => {
            // 加载失败，使用默认或纯色
            this.imageLoaded = false;
        };
    }

    protected onUpdate(dt: number): void {
        super.onUpdate(dt);

        // 按压缩放
        const targetScale = this.isPressed ? 0.95 : 1.0;
        this.hoverScale += (targetScale - this.hoverScale) * 0.2;
        // 不直接修改 this.scale 因为父类的 scale 处理，我们这里只影响内部绘制大小或者...
        // 实际上 UIComponent 的 scale 是应用在 transform 上的
        this.scale = this.hoverScale;
    }

    protected onRender(ctx: CanvasRenderingContext2D): void {
        const { width, height } = this;
        const radius = Theme.radius.large;

        // 1. 卡片主体背景
        ctx.save();

        // 剪切圆角
        this.roundRectPath(ctx, 0, 0, width, height, radius);
        ctx.clip();

        // 绘制背景 (图片 或 回退渐变)
        if (this.imageLoaded && this.bgImage) {
            // 保持比例填充
            const imgRatio = this.bgImage.width / this.bgImage.height;
            const cardRatio = width / height;

            let rw = width;
            let rh = height;
            let rx = 0;
            let ry = 0;

            if (imgRatio > cardRatio) {
                // 图片更宽，裁两边
                rh = height;
                rw = height * imgRatio;
                rx = (width - rw) / 2;
            } else {
                // 图片更高，裁上下
                rw = width;
                rh = width / imgRatio;
                ry = (height - rh) / 2;
            }

            ctx.drawImage(this.bgImage, rx, ry, rw, rh);

            // 添加遮罩使文字清晰
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(0,0,0,0.1)');
            gradient.addColorStop(0.5, 'rgba(0,0,0,0.4)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

        } else {
            // 回退：深色科技背景
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, Theme.colors.background.paper);
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // 绘制一个装饰性的大图标/文字作为背景
            ctx.globalAlpha = 0.1;
            ctx.font = 'bold 80px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = Theme.colors.primary.main;
            ctx.fillText(this.config.icon, width - 20, height - 20);
            ctx.globalAlpha = 1.0;
        }

        // 2. 边框发光 (Neon Glow)
        if (this.isPressed) {
            ctx.strokeStyle = Theme.colors.primary.main;
            ctx.lineWidth = 2;
            this.roundRectPath(ctx, 1, 1, width - 2, height - 2, radius);
            ctx.stroke();
        } else {
            // 顶部微弱高光
            ctx.strokeStyle = Theme.colors.border.light;
            ctx.lineWidth = 1;
            this.roundRectPath(ctx, 0, 0, width, height, radius);
            ctx.stroke();
        }

        ctx.restore();

        // 3. 内容层 (Icon + Text)
        // 现在的设计是 Hero 风格，Icon 可以小一点放在左上角，或者是标题的一部分

        const padding = 20;

        // 图标 (左上角，带发光背景)
        const iconSize = 40;
        this.drawIcon(ctx, padding, padding, iconSize);

        // 标题 (左下偏上)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        // 游戏名
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.font = `bold ${Theme.fonts.size.h2}px ${Theme.fonts.default}`;
        ctx.fillText(this.config.name, padding, height - 50);

        // 描述 (小字)
        ctx.fillStyle = Theme.colors.text.secondary;
        ctx.font = `${Theme.fonts.size.small}px ${Theme.fonts.default}`;
        ctx.shadowBlur = 2;
        let desc = this.config.description;
        if (desc.length > 18) desc = desc.substring(0, 18) + '...';
        ctx.fillText(desc, padding, height - 28);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // 标签 (右上角)
        if (this.config.supportMultiplayer) {
            this.drawTag(ctx, width - padding - 50, padding, '多人', Theme.colors.primary.main);
        }
    }

    private drawIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        // 半透明背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, x, y, size, size, 8);
        ctx.fill();

        // 边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        // Icon Image
        // 我们假设 config.icon 是一个路径 "assets/icons/..."
        // 如果是 emoji (旧配置)，则回退到文字绘制，或者我们假设早已更新了配置
        if (this.config.icon.startsWith('assets/')) {
            const iconImg = wx.createImage();
            iconImg.src = this.config.icon;
            // 由于是实时加载，可能闪烁。理想情况应该预加载。
            // 这里简单处理：如果已加载则绘制，否则监听加载。
            // 但 draw 是每帧调用的，不能在这里 create image。
            // 应该在 constructor 或 init 里加载 iconImage。
            // 暂时 hack: 我们在 GameCard 类里加一个 iconImage 属性
            if (!this['iconImage']) {
                this['iconImage'] = wx.createImage();
                this['iconImage'].src = this.config.icon;
            }
            if (this['iconImage'].complete) {
                // 绘制图标，留一点 padding
                const p = 6;
                ctx.drawImage(this['iconImage'], x + p, y + p, size - p * 2, size - p * 2);
            }
        } else {
            // Emoji Fallback
            ctx.font = `${size * 0.6}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(this.config.icon, x + size / 2, y + size / 2 + 2);
        }
    }

    private drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string): void {
        // 霓虹胶囊
        ctx.font = 'bold 10px sans-serif';
        const textWidth = ctx.measureText(text).width;
        const paddingX = 8;
        const h = 20;
        const w = textWidth + paddingX * 2;

        // 对齐右上角，x 传入的是右边界
        const leftX = x - w + 50; // Hacky fix based on usage: 传入的是 width - padding - 50? 
        // 让 drawTag 接收 左上角 更合理，这里改为传入 rightX
        const rx = this.width - 20;

        // 修正: 重新计算位置，右上角
        const actualX = x; // 假设调用方传的是左上角

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        this.roundRect(ctx, actualX, y, w, h, 10);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000'; // 黑色文字对比度高
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, actualX + w / 2, y + h / 2 + 1);
    }

    private roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // 兼容旧方法
    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
        this.roundRectPath(ctx, x, y, width, height, radius);
    }
}
