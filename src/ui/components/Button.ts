import { UIComponent } from '../core/UIComponent';
import { Theme } from '../Theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export class Button extends UIComponent {
    public text: string;
    public variant: ButtonVariant;
    public fontSize: number;
    public radius: number;

    // 动画状态
    private currentScale: number = 1;
    private targetScale: number = 1;

    constructor(
        text: string,
        x: number,
        y: number,
        width: number = 200,
        height: number = 50,
        variant: ButtonVariant = 'primary'
    ) {
        super(x, y, width, height);
        this.text = text;
        this.variant = variant;
        this.fontSize = 18;
        this.radius = Theme.radius.medium;
        this.interactive = true; // 启用交互
    }

    protected onUpdate(dt: number): void {
        // 简单的缩放动画插值
        this.currentScale += (this.targetScale - this.currentScale) * 0.2;
        // 更新父类的scale属性，这样渲染时会自动应用
        this.scale = this.currentScale;
    }

    // 覆写按下事件，添加动画效果
    handleTouchStart(x: number, y: number): boolean {
        const handled = super.handleTouchStart(x, y);
        if (handled && this.isPressed) {
            this.targetScale = 0.95;
        }
        return handled;
    }

    handleTouchEnd(x: number, y: number): boolean {
        const handled = super.handleTouchEnd(x, y);
        this.targetScale = 1.0;
        return handled;
    }

    protected onRender(ctx: CanvasRenderingContext2D): void {
        const { width, height } = this;

        // 绘制阴影（仅Primary）
        if (this.variant === 'primary') {
            ctx.shadowColor = Theme.shadows.glow.color;
            ctx.shadowBlur = Theme.shadows.glow.blur;
            ctx.shadowOffsetY = 4;
        }

        // 绘制背景
        this.drawBackground(ctx);

        // 重置阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // 绘制文字
        this.drawText(ctx);
    }

    private drawBackground(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        this.roundRect(ctx, 0, 0, this.width, this.height, this.radius);

        switch (this.variant) {
            case 'primary': {
                const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
                gradient.addColorStop(0, Theme.colors.primary.start);
                gradient.addColorStop(1, Theme.colors.primary.end);
                ctx.fillStyle = gradient;
                ctx.fill();
                break;
            }
            case 'secondary': {
                ctx.fillStyle = Theme.colors.secondary.main;
                ctx.fill();
                break;
            }
            case 'outline': {
                ctx.strokeStyle = Theme.colors.primary.main;
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
            }
            case 'ghost': {
                // 无背景
                break;
            }
        }
    }

    private drawText(ctx: CanvasRenderingContext2D): void {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${this.fontSize}px ${Theme.fonts.default}`;

        switch (this.variant) {
            case 'primary':
            case 'secondary':
                ctx.fillStyle = '#ffffff';
                break;
            case 'outline':
            case 'ghost':
                ctx.fillStyle = Theme.colors.primary.main;
                break;
        }

        ctx.fillText(this.text, this.width / 2, this.height / 2);
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }
}
