/**
 * UI Component Base Class
 * 所有UI组件的基类，提供基础的变换、渲染和事件处理能力
 */

export interface UIBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export abstract class UIComponent {
    // 变换属性
    public x: number = 0;
    public y: number = 0;
    public width: number = 0;
    public height: number = 0;

    // 视觉属性
    public visible: boolean = true;
    public alpha: boolean | number = 1; // 支持透明度
    public scale: number = 1;

    // 交互属性
    public interactive: boolean = false;
    protected isPressed: boolean = false;
    protected isHovered: boolean = false;

    // 父子关系
    public parent: UIComponent | null = null;
    public children: UIComponent[] = [];

    constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     * 添加子组件
     */
    addChild(child: UIComponent): void {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
    }

    /**
     * 移除子组件
     */
    removeChild(child: UIComponent): void {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            child.parent = null;
            this.children.splice(index, 1);
        }
    }

    /**
     * 核心渲染方法
     * 负责处理透明度、缩放和子组件的渲染
     */
    render(ctx: CanvasRenderingContext2D): void {
        if (!this.visible || this.alpha === 0) return;

        ctx.save();

        // 应用变换
        // 注意：这里简单的处理平移，对于缩放通常需要基于中心点，这里简化处理
        ctx.translate(this.x, this.y);

        if (this.scale !== 1) {
            // 默认基于中心缩放
            const centerX = this.width / 2;
            const centerY = this.height / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(this.scale, this.scale);
            ctx.translate(-centerX, -centerY);
        }

        if (this.alpha !== 1 && typeof this.alpha === 'number') {
            ctx.globalAlpha *= this.alpha;
        }

        // 绘制自身内容
        this.onRender(ctx);

        // 绘制子组件
        // 子组件位置是相对于父组件的
        for (const child of this.children) {
            child.render(ctx);
        }

        ctx.restore();
    }

    /**
     * 子类实现具体的绘制逻辑
     */
    protected abstract onRender(ctx: CanvasRenderingContext2D): void;

    /**
     * 更新逻辑
     */
    update(deltaTime: number): void {
        if (!this.visible) return;

        this.onUpdate(deltaTime);

        for (const child of this.children) {
            child.update(deltaTime);
        }
    }

    protected onUpdate(deltaTime: number): void {
        // 默认空实现
    }

    /**
     * 触摸事件处理
     * 返回 true 表示事件被处理，不再向后传递
     */
    handleTouchStart(x: number, y: number): boolean {
        if (!this.visible || !this.interactive) return false;

        // 转换坐标到本地空间
        const localX = x - this.x;
        const localY = y - this.y;

        // 先检测子组件（反向遍历，渲染在上面的先响应）
        for (let i = this.children.length - 1; i >= 0; i--) {
            if (this.children[i].handleTouchStart(localX, localY)) {
                return true;
            }
        }

        // 检测自身
        if (this.hitTest(localX, localY)) {
            this.isPressed = true;
            this.onTouchStart && this.onTouchStart(localX, localY);
            return true;
        }

        return false;
    }

    handleTouchEnd(x: number, y: number): boolean {
        // 即使不可见，如果之前被按下了，也要处理抬起事件
        const localX = x - this.x;
        const localY = y - this.y;

        let handled = false;

        // 先传递给子组件
        for (let i = this.children.length - 1; i >= 0; i--) {
            if (this.children[i].handleTouchEnd(localX, localY)) {
                handled = true;
                // 注意：不要立即 break，可能需要处理多个状态释放，但通常 UI 只响应一个
                break;
            }
        }

        if (this.isPressed) {
            this.isPressed = false;
            // 只有在松开时还在范围内，才触发点击
            if (this.hitTest(localX, localY)) {
                this.onClick && this.onClick();
            }
            this.onTouchEnd && this.onTouchEnd(localX, localY);
            handled = true;
        }

        return handled;
    }

    handleTouchMove(x: number, y: number): boolean {
        if (!this.visible) return false;

        const localX = x - this.x;
        const localY = y - this.y;

        for (let i = this.children.length - 1; i >= 0; i--) {
            if (this.children[i].handleTouchMove(localX, localY)) return true;
        }

        return false;
    }

    /**
     * 简单的矩形碰撞检测
     */
    protected hitTest(localX: number, localY: number): boolean {
        return localX >= 0 && localX <= this.width && localY >= 0 && localY <= this.height;
    }

    // 事件回调接口
    public onTouchStart?: (x: number, y: number) => void;
    public onTouchEnd?: (x: number, y: number) => void;
    public onClick?: () => void;
}
