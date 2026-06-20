class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.WIDTH = 800;
    this.HEIGHT = 500;
    this.scene = null;
    this.lastTime = 0;
    this.keys = {};
    const saved = window.Save ? window.Save.load() : { worldProgress: [0,0,0,0,0], levelStars: {} };
    this.state = {
      currentWorld: 0,
      currentLevel: 0,
      lives: 3,
      stars: 0,
      worldProgress: saved.worldProgress,
      levelStars: saved.levelStars,
      livesLostThisLevel: 0,
      levelStartTime: 0
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
    const loop = (timestamp) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;
      this.ctx.fillStyle = '#1a0033';
      this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
      if (this.scene) {
        this.scene.update(dt);
        this.scene.draw(this.ctx);
      }
      requestAnimationFrame(loop);
    };
    this.switchScene(new WorldMapScene(this));
    requestAnimationFrame(loop);
  }
}
