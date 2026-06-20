function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateDistractors(answer, rand, count) {
  const offsets = [-3, -2, -1, 1, 2, 3, 5, -5, 10, -10];
  const distractors = new Set();
  const shuffled = offsets.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (const off of shuffled) {
    const candidate = answer + off;
    if (candidate > 0 && candidate !== answer && !distractors.has(candidate)) {
      distractors.add(candidate);
      if (distractors.size === count) break;
    }
  }
  let fallback = answer + 7;
  while (distractors.size < count) {
    if (fallback !== answer) distractors.add(fallback);
    fallback++;
  }
  return Array.from(distractors);
}

// t = 0..1 within a world's 10 levels (levelIndex / 9)
function _diffScale(rand, min1, max1, min2, max2, t) {
  const mn = min1 + (min2 - min1) * t;
  const mx = max1 + (max2 - max1) * t;
  return Math.floor(rand() * (mx - mn + 1)) + mn;
}

window.generateEquation = function(worldIndex, levelIndex) {
  const seed = worldIndex * 100 + levelIndex + 1;
  const rand = seededRand(seed);
  const world = WORLDS[worldIndex];
  const op = world.operation;
  const isChallenge = levelIndex % 5 === 4; // 5th and 10th levels
  const portalCount = isChallenge ? 6 : 4;
  const distractorCount = portalCount - 1;
  const t = Math.min(levelIndex / 9, 1); // 0=easy, 1=hard

  let a, b, answer, display;

  if (op === 'addition') {
    // easy: 1–20 + 1–20; hard: 20–99 + 20–99
    a = _diffScale(rand, 1, 20, 20, 99, t);
    b = _diffScale(rand, 1, 20, 20, 99, t);
    answer = a + b;
    display = `${a} + ${b} = ?`;
  } else if (op === 'subtraction') {
    // easy: minuend 10–30; hard: 40–99
    a = _diffScale(rand, 10, 30, 40, 99, t);
    b = Math.floor(rand() * (a - 1)) + 1;
    answer = a - b;
    display = `${a} − ${b} = ?`;
  } else if (op === 'multiplication') {
    // easy: ×2–×5; hard: ×7–×12
    a = _diffScale(rand, 2, 5, 7, 12, t);
    b = _diffScale(rand, 2, 5, 7, 12, t);
    answer = a * b;
    display = `${a} × ${b} = ?`;
  } else if (op === 'division') {
    // easy: divisor 2–5; hard: 6–12
    b = _diffScale(rand, 2, 5, 6, 12, t);
    answer = _diffScale(rand, 2, 9, 2, 12, t);
    a = b * answer;
    display = `${a} ÷ ${b} = ?`;
  } else if (op === 'mixed') {
    // keep existing mixed logic, vary c range
    a = Math.floor(rand() * 9) + 2;
    b = Math.floor(rand() * 9) + 2;
    const cMax = Math.floor(10 + t * 30);
    const c = Math.floor(rand() * cMax) + 1;
    const useAdd = rand() > 0.5;
    answer = useAdd ? (a * b) + c : (a * b) - c;
    if (answer <= 0) { answer = a * b + c; display = `(${a} × ${b}) + ${c} = ?`; }
    else display = useAdd ? `(${a} × ${b}) + ${c} = ?` : `(${a} × ${b}) − ${c} = ?`;
  }

  // Variant display for addition/subtraction at higher difficulty
  const useVariant = (op === 'addition' || op === 'subtraction') && rand() < (t * 0.5);
  if (useVariant) {
    const variantType = rand() < 0.5 ? 'missing-number' : 'missing-operator';
    if (variantType === 'missing-number' && op === 'addition') {
      const showLeft = rand() < 0.5;
      display = showLeft ? `? + ${b} = ${answer}` : `${a} + ? = ${answer}`;
    } else if (variantType === 'missing-operator') {
      display = `${a} □ ${b} = ${answer}`;
    }
  }

  return { display, answer, distractors: generateDistractors(answer, rand, distractorCount), portalCount, a, b };
};
