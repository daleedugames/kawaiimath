class HUD {
  draw(ctx, game, world, eq, player, isChallenge, timeLeft) {
    const W = game.WIDTH;
    const { a: ha, b: hb } = eq;
    const showHint = (world.operation === 'addition' || world.operation === 'subtraction')
      && ha != null && hb != null && ha <= 10 && hb <= 10;
    const hudH = (showHint && isChallenge) ? 94 : (showHint || isChallenge) ? 74 : 54;

    // HUD background — gradient from world color
    const hudGrad = ctx.createLinearGradient(0, 0, 0, hudH);
    hudGrad.addColorStop(0, world.bgColor + 'ee');
    hudGrad.addColorStop(1, world.bgColor + '99');
    ctx.fillStyle = hudGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, hudH, [0, 0, 14, 14]);
    ctx.fill();

    // Accent border bottom
    ctx.beginPath();
    ctx.moveTo(0, hudH);
    ctx.lineTo(W, hudH);
    ctx.strokeStyle = world.accentColor + '66';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';

    // Equation bubble
    const eqText = eq.display;
    ctx.font = 'bold 24px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
    const textW = Math.max(ctx.measureText(eqText).width + 44, 120);
    // Bubble shadow
    ctx.shadowColor = world.accentColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(W / 2 - textW / 2, 6, textW, 38, 12);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = world.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#1a0033';
    ctx.font = 'bold 24px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
    ctx.fillText(eqText, W / 2, 33);

    // Emoji hint row
    if (showHint) {
      const FRUIT = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🍑', '🍈', '🍐', '🍌'];
      const fruit = FRUIT[game.state.currentWorld % FRUIT.length];
      const hintA = fruit.repeat(Math.min(ha, 10));
      const hintB = fruit.repeat(Math.min(hb, 10));
      const hintOp = world.operation === 'addition' ? '+' : '−';
      ctx.font = '13px serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(`${hintA} ${hintOp} ${hintB}`, W / 2, 68);
    }

    // Challenge timer
    if (isChallenge) {
      const tY = showHint ? 88 : 68;
      const urgent = timeLeft < 10;
      const tColor = urgent ? '#ff4444' : '#FFD700';
      ctx.font = 'bold 18px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = tColor;
      if (urgent && Math.floor(timeLeft * 4) % 2 === 0) {
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
      }
      ctx.fillText(`⏱ ${Math.ceil(timeLeft)}s`, W / 2, tY);
      ctx.shadowBlur = 0;
    }

    // Hearts (lives)
    ctx.textAlign = 'left';
    ctx.font = '22px serif';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < game.state.lives ? 1 : 0.18;
      ctx.shadowColor = '#ff4488';
      ctx.shadowBlur = i < game.state.lives ? 6 : 0;
      ctx.fillText('❤️', 10 + i * 28, 36);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Stars counter
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.fillText(`⭐ ${game.state.stars}`, W - 10, 36);
    ctx.shadowBlur = 0;

    // World / level label
    ctx.font = '11px sans-serif';
    ctx.fillStyle = world.accentColor + 'dd';
    ctx.fillText(`${world.emoji} ${world.name}  L${game.state.currentLevel + 1}/10`, W - 10, 50);

    // Power-up indicators
    let puX = 10;
    ctx.font = '14px "Fredoka One", "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'left';
    if (player.speedBoost) {
      ctx.fillStyle = '#00f5d4';
      ctx.shadowColor = '#00f5d4'; ctx.shadowBlur = 6;
      ctx.fillText(`🥾 ${Math.ceil(player.speedBoostTimer)}s`, puX, 52);
      ctx.shadowBlur = 0;
      puX += 80;
    }
    if (player.extraJumpsLeft > 0) { ctx.fillText('🍄', puX, 52); puX += 28; }
    if (player.shieldActive) {
      ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 6;
      ctx.fillText('🛡️', puX, 52);
      ctx.shadowBlur = 0;
      puX += 28;
    }
    if (player.starMultiplierTimer > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 6;
      ctx.fillText(`⭐×2 ${Math.ceil(player.starMultiplierTimer)}s`, puX, 52);
      ctx.shadowBlur = 0;
    }
    ctx.textAlign = 'left';
  }
}
