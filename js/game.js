class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.WIDTH = 800;
    this.HEIGHT = 500;
    this.scene = null;
    this.lastTime = 0;
    this.keys = {};
    this.state = {
      currentWorld: 0,
      currentLevel: 0,
      lives: 3,
      stars: 0,
      worldProgress: [0, 0, 0, 0, 0]
    };
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (this.scene) this.scene.onInput(e.code, 'down');
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (this.scene) this.scene.onInput(e.code, 'up');
    });
  }

  switchScene(scene) {
    this.scene = scene;
  }

  start() {
    // placeholder: show purple screen until scenes are built
    const loop = (timestamp) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;
      this.ctx.fillStyle = '#1a0033';
      this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
      if (this.scene) {
        this.scene.update(dt);
        this.scene.draw(this.ctx);
      } else {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 32px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading…', 400, 250);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
