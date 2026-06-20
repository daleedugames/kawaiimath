function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateDistractors(answer, rand, count = 3) {
  const offsets = [-3, -2, -1, 1, 2, 3, 5, -5, 10, -10];
  const distractors = new Set();
  const shuffled = offsets.slice();
  // Fisher-Yates shuffle
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
  // fallback if not enough unique distractors
  let fallback = answer + 7;
  while (distractors.size < count) {
    if (fallback !== answer) distractors.add(fallback);
    fallback++;
  }
  return Array.from(distractors);
}

window.generateEquation = function(worldIndex, levelIndex) {
  const seed = worldIndex * 100 + levelIndex + 1;
  const rand = seededRand(seed);
  const world = WORLDS[worldIndex];
  const op = world.operation;
  let a, b, answer, display;

  if (op === 'addition') {
    a = Math.floor(rand() * 50) + 10;
    b = Math.floor(rand() * 50) + 10;
    answer = a + b;
    display = `${a} + ${b} = ?`;
  } else if (op === 'subtraction') {
    a = Math.floor(rand() * 50) + 30;
    b = Math.floor(rand() * (a - 1)) + 1;
    answer = a - b;
    display = `${a} − ${b} = ?`;
  } else if (op === 'multiplication') {
    a = Math.floor(rand() * 12) + 1;
    b = Math.floor(rand() * 12) + 1;
    answer = a * b;
    display = `${a} × ${b} = ?`;
  } else if (op === 'division') {
    b = Math.floor(rand() * 9) + 2;
    answer = Math.floor(rand() * 10) + 2;
    a = b * answer;
    display = `${a} ÷ ${b} = ?`;
  } else {
    // mixed: (a × b) + c  or  a × b − c
    a = Math.floor(rand() * 9) + 2;
    b = Math.floor(rand() * 9) + 2;
    const c = Math.floor(rand() * 20) + 1;
    const useAdd = rand() > 0.5;
    answer = useAdd ? (a * b) + c : (a * b) - c;
    display = useAdd ? `(${a} × ${b}) + ${c} = ?` : `(${a} × ${b}) − ${c} = ?`;
    // Ensure answer is positive before generating distractors
    if (answer <= 0) {
      answer = a * b + c;
      display = `(${a} × ${b}) + ${c} = ?`;
    }
  }

  return { display, answer, distractors: generateDistractors(answer, rand) };
};
