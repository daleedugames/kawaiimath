class HUD {
  draw(ctx, game, world, eq, player, isChallenge, timeLeft) {
    const W = game.WIDTH;
    const { a: ha, b: hb } = eq;
    const showHint = (world.operation === 'addition' || world.operation === 'subtraction')
      && ha != null && hb != null && ha <= 10 && hb <= 10;
    const hudH = (showHint || isChallenge) ? 74 : 54;

    // top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, hudH, [0, 0, 12, 12]);
    ctx.fill();

    // equation bubble
    const eqText = eq.display;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    const textW = ctx.measureText(eqText).width + 40;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(W/2 - textW/2, 7, textW, 38, 10);
    ctx.fill();
    ctx.fillStyle = '#1a0033';
    ctx.fillText(eqText, W/2, 33);

    // emoji hint
    if (showHint) {
      const FRUIT = ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🍈','🍐','🍌'];
      const fruit = FRUIT[game.state.currentWorld % FRUIT.length];
      const hintA = fruit.repeat(Math.min(ha, 10));
      const hintB = fruit.repeat(Math.min(hb, 10));
      const hintOp = world.operation === 'addition' ? '+' : '−';
      ctx.font = '13px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(`${hintA} ${hintOp} ${hintB}`, W / 2, 68);
    }

    // challenge timer
    if (isChallenge) {
      const tColor = timeLeft < 10 ? '#ff4444' : '#FFD700';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = tColor;
      if (timeLeft < 10 && Math.floor(timeLeft * 4) % 2 === 0) {
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8;
      }
      ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`, W / 2, 68);
      ctx.shadowBlur = 0;
    }

    // hearts
    ctx.textAlign = 'left';
    ctx.font = '22px serif';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < game.state.lives ? 1 : 0.2;
      ctx.fillText('❤️', 10 + i * 28, 36);
    }
    ctx.globalAlpha = 1;

    // stars
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`⭐ ${game.state.stars}`, W - 10, 35);

    // world/level
    ctx.font = '12px sans-serif';
    ctx.fillStyle = world.accentColor;
    ctx.textAlign = 'right';
    ctx.fillText(`${world.emoji} ${world.name}  L${game.state.currentLevel + 1}/10`, W - 10, 52);

    // active power-up indicators
    let puX = 10;
    ctx.font = '16px serif';
    ctx.textAlign = 'left';
    if (player.speedBoost) {
      ctx.fillStyle = '#fff';
      ctx.fillText(`🥾 ${player.speedBoostTimer.toFixed(1)}s`, puX, 52);
      puX += 85;
    }
    if (player.extraJumpsLeft > 0) { ctx.fillText('🍄', puX, 52); puX += 30; }
    if (player.shieldActive) { ctx.fillText('🛡️', puX, 52); puX += 30; }
    if (player.starMultiplierTimer > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`⭐×2 ${player.starMultiplierTimer.toFixed(1)}s`, puX, 52);
    }

    ctx.textAlign = 'left';
  }
}
