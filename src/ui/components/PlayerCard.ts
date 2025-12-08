import { UIComponent } from '../core/UIComponent';
import { Theme } from '../Theme';
import { Player } from '../../core/types';

export class PlayerCard extends UIComponent {
    public player: Player;
    private isLocal: boolean;

    constructor(player: Player, x: number, y: number, width: number, height: number, isLocal: boolean = false) {
        super(x, y, width, height);
        this.player = player;
        this.isLocal = isLocal;
    }

    protected onRender(ctx: CanvasRenderingContext2D): void {
        // 1. 卡片背景
        ctx.save();

        // 阴影
        ctx.shadowColor = Theme.shadows.small.color;
        ctx.shadowBlur = Theme.shadows.small.blur;
        ctx.shadowOffsetY = Theme.shadows.small.offsetY;

        // 自机玩家高亮
        if (this.isLocal) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = Theme.colors.primary.main;
        } else {
            ctx.fillStyle = Theme.colors.background.glass; // 半透明
        }

        this.roundRect(ctx, 0, 0, this.width, this.height, Theme.radius.medium);
        ctx.fill();

        if (this.isLocal) {
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();

        // 2. 头像
        const avatarSize = 50;
        const avatarX = 20;
        const avatarY = (this.height - avatarSize) / 2;

        // 头像背景/占位
        ctx.fillStyle = this.player.avatar ? '#eeeeee' : Theme.colors.primary.light;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // 如果有头像图片，通常这里需要 drawImage，暂且用首字母代替
        if (!this.player.avatar) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.player.nickname.substring(0, 1).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
        }

        // 3. 昵称
        ctx.fillStyle = Theme.colors.text.primary;
        ctx.font = `bold ${Theme.fonts.size.h3}px ${Theme.fonts.default}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.player.nickname, avatarX + avatarSize + 16, this.height / 2 - 10);

        // 4. 状态标签 (准备/未准备)
        const statusText = this.player.isReady ? '已准备' : '未准备';
        const statusColor = this.player.isReady ? Theme.colors.status.success : Theme.colors.text.disabled;

        this.drawTag(ctx, avatarX + avatarSize + 16, this.height / 2 + 10, statusText, statusColor);
    }

    private drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string): void {
        ctx.font = '12px sans-serif';
        const paddingX = 8;
        const height = 20;
        const textWidth = ctx.measureText(text).width;
        const width = textWidth + paddingX * 2;

        // 标签背景
        ctx.fillStyle = color + '20';
        this.roundRect(ctx, x, y, width, height, 4);
        ctx.fill();

        // 文字
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, x + paddingX, y + 4);
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
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
}
