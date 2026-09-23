/**
 * Детерминированный генератор (mulberry32): с тем же --seed повторный прогон строит
 * те же связи — кто владелец, кто участник, какие позиции, — и находит уже заведённое,
 * а не плодит второй набор.
 */
export function createRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  const float = (min, max, digits = 2) => Number((min + next() * (max - min)).toFixed(digits));
  const pick = (list) => list[Math.floor(next() * list.length)];
  const chance = (p) => next() < p;

  /** n разных элементов списка (или все, если их меньше). */
  const sample = (list, n) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(n, copy.length));
  };

  return { next, int, float, pick, chance, sample };
}
