// 下部分铅笔
import { Sprite } from '../base/sprite';
import { Pencil } from './pencil';

export class BelowPencil extends Pencil {
  constructor(top) {
    const image = Sprite.getImage('pencilDown');
    super(image, top);
  }

  draw() {
    // 上下铅笔之间的间距是屏幕高度的五分之一
    const gap = this.dataStore.canvas.height / 5;
    this.y = this.top + gap;
    super.draw();

    // Fix: Draw extension below if screen is taller than pencil image
    const canvasHeight = this.dataStore.canvas.height;
    if (this.y + this.height < canvasHeight) {
      const ctx = this.dataStore.ctx;
      const remainingHeight = canvasHeight - (this.y + this.height);

      // Strategy: Draw the bottom slice of the pencil image repeatedly or stretched
      // Since we know this is a pipe, the 'body' is uniform.
      // Let's draw the image again, but cropped to just the body part if possible, 
      // or just draw the *bottom-most* pixel row stretched.

      // Ideally we'd use a pattern, but createPattern needs a loaded image object which might be async or complex here.
      // Simple solution: Draw the bottom 10px of the image, stretched to cover the gap.
      // This preserves the gradient/shading of the pipe body.

      ctx.drawImage(
        this.img,
        0, this.img.height - 10,  // Source X, Y (Bottom 10px)
        this.img.width, 10,       // Source Width, Height
        this.x, this.y + this.height, // Dest X, Y
        this.width, remainingHeight + 2 // Dest Width, Height (add 2px overlap)
      );
    }
  }
}