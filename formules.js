// formulas.js
(function () {
  'use strict';

  const num = v => {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === null || v === undefined || v === '') return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const eq = (a, b) => {
    const az = a === null || a === undefined || a === '';
    const bz = b === null || b === undefined || b === '';
    if (az && bz) return true;
    if (az) return num(b) === 0;
    if (bz) return num(a) === 0;
    if (typeof a === 'number' || typeof b === 'number') return num(a) === num(b);
    return String(a) === String(b);
  };

  const maxRowOf = s => {
    let m = 0;
    for (const k in s) {
      const n = k.match(/\d+$/);
      if (n && +n[0] > m) m = +n[0];
    }
    return m;
  };

  const lastDataRow = s => {
    let last = 0;
    for (const k in s) {
      const m = k.match(/^A(\d+)$/);
      if (m && s[k] !== '' && s[k] !== undefined && s[k] !== null) {
        if (+m[1] > last) last = +m[1];
      }
    }
    return last;
  };

  const sumif = (all, refSheet, refCol, crit, sumSheet, sumCol) => {
    const ref = all[refSheet];
    if (!ref) return 0;
    const sm = all[sumSheet] || ref;
    const max = maxRowOf(ref);
    let total = 0;
    for (let r = 2; r <= max; r++)
      if (eq(ref[refCol + r], crit)) total += num(sm[sumCol + r]);
    return total;
  };

  window.Formulas = {

    // ═════════════ Хср персы ═════════════
    'Хср персы': {
      F: (row, s) => {
        const E = num(s['E' + row]), C = num(s['C' + row]);
        if (E <= 2 && C === 5) return 65;
        if (E === 3 && C === 5) return 62;
        if (E === 4 && C === 5) return 55;
        if (E === 5 && C === 5) return 35;
        if (E === 6) return 0;
        if (E <= 2 && C === 4) return 50;
        if (E === 3 && C === 4) return 48;
        if (E === 4 && C === 4) return 43;
        if (E === 5 && C === 4) return 28;
        return 0;
      },
    },

    // ═════════════ Хср боссы ═════════════
    'Хср боссы': {
      C: (row, s, all) => sumif(all, 'Хср персы', 'G', s['A' + row], 'Хср персы', 'F'),
      D: (row, s) => num(s['C' + row]) - num(s['B' + row]),
      E: (row, s) => {
        const d = num(s['D' + row]);
        return d % 5 === 0 ? d / 5 : Math.floor(d / 5) + 1;
      },
      F: (row, s) => num(s['E' + row]) * 30,
      G: (row, s) => {
        let total = 0;
        for (let r = 2; r <= row; r++) total += num(s['F' + r]);
        return total;
      },
      H: (row, s) => num(s['E' + row]) * 5 - num(s['D' + row]),
      I: (row, s) => {
        if (row !== lastDataRow(s)) return '';
        let total = 0;
        for (let r = 2; r <= row; r++) total += num(s['F' + r]);
        return total;
      },
      J: (row, s) => {
        if (row !== lastDataRow(s)) return '';
        const i = num(s['I' + row]);
        return Math.ceil(i / 240);
      },
      K: (row, s) => {
        if (row !== lastDataRow(s)) return '';
        return num(s['I' + row]) / 30;
      },
    },

    // ═════════════ боссы следов ═════════════
    'боссы следов': {
      B: (row, s, all) => sumif(all, 'Хср персы', 'J', s['A' + row], 'Хср персы', 'F'),
    },

    // ═════════════ геншин персы ═════════════
    'геншин персы': {
      I: (row, s) => num(s['E' + row]) === 6 ? 0 : 6,
      J: (row, s) => {
        const E = num(s['E' + row]);
        return E <= 3 ? 9 : E === 4 ? 6 : 0;
      },
      K: (row, s) => {
        const E = num(s['E' + row]);
        return E <= 1 ? 9 : E === 2 ? 6 : 0;
      },
      L: (row, s) => num(s['E' + row]) === 0 ? 1 : 0,
      M: (row, s) => [46, 46, 44, 40, 32, 20][num(s['E' + row])] ?? 0,
      O: (row, s) => {
        const E = num(s['E' + row]);
        const eVal = E <= 4 ? 36 : E === 5 ? 24 : 0;
        const t = l => l <= 6 ? 31 : l === 7 ? 27 : l === 8 ? 21 : l === 9 ? 12 : 0;
        return eVal + t(num(s['F' + row])) + t(num(s['G' + row])) + t(num(s['H' + row]));
      },
      P: (row, s) => {
        const E = num(s['E' + row]);
        const eVal = E <= 2 ? 30 : E === 3 ? 18 : 0;
        const t = l => l <= 2 ? 22 : l === 3 ? 19 : l === 4 ? 15 : l === 5 ? 9 : 0;
        const tG = l => l <= 5 ? 31 : 0;
        return eVal + t(num(s['F' + row])) + tG(num(s['G' + row])) + t(num(s['H' + row]));
      },
      Q: (row, s) => {
        const E = num(s['E' + row]);
        const eVal = E === 0 ? 18 : E === 1 ? 15 : 0;
        const t = l => (l === 0 || l === 1) ? 6 : 0;
        return eVal + t(num(s['F' + row])) + t(num(s['G' + row])) + t(num(s['H' + row]));
      },
      S: (row, s) => {
        const t = l => l <= 6 ? 6 : l === 7 ? 5 : l === 8 ? 4 : l === 9 ? 2 : 0;
        return t(num(s['F' + row])) + t(num(s['G' + row])) + t(num(s['H' + row]));
      },
      U: (row, s) =>
        (num(s['F' + row]) !== 10 ? 1 : 0) +
        (num(s['G' + row]) !== 10 ? 1 : 0) +
        (num(s['H' + row]) !== 10 ? 1 : 0),
      V: (row, s) => {
        const t = l => l <= 6 ? 38 : l === 7 ? 34 : l === 8 ? 28 : l === 9 ? 16 : 0;
        return t(num(s['F' + row])) + t(num(s['G' + row])) + t(num(s['H' + row]));
      },
      W: (row, s) => {
        const tF = l => l <= 2 ? 21 : l === 3 ? 19 : l === 4 ? 15 : l === 5 ? 9 : 0;
        const tG = l => l <= 2 ? 21 : l === 3 ? 19 : l === 4 ? 15 : l === 5 ? 21 : 0;
        return tF(num(s['F' + row])) + tG(num(s['G' + row])) + tF(num(s['H' + row]));
      },
      X: (row, s) => {
        const t = l => (l === 0 || l === 1) ? 3 : 0;
        return t(num(s['F' + row])) + t(num(s['G' + row])) + t(num(s['H' + row]));
      },
      Z: (row, s) => [168, 165, 155, 135, 105, 60][num(s['E' + row])] ?? 0,
    },

    // ═════════════ материалы прокачки ═════════════
    'материалы прокачки': {
      C: (row, s, all) => sumif(all, 'геншин персы', 'R', s['A' + row], 'геншин персы', 'Q'),
      D: (row, s) => Math.max(0, num(s['C' + row]) - num(s['B' + row])),
      E: (row, s) => num(s['D' + row]) === 0 ? num(s['B' + row]) - num(s['C' + row]) : 0,
      G: (row, s) => num(s['F' + row]) + Math.floor(num(s['E' + row]) / 3),
      H: (row, s, all) => sumif(all, 'геншин персы', 'R', s['A' + row], 'геншин персы', 'P'),
      I: (row, s) => Math.max(0, num(s['H' + row]) - num(s['G' + row])),
      J: (row, s) => num(s['I' + row]) === 0 ? num(s['F' + row]) - num(s['H' + row]) : 0,
      L: (row, s) => num(s['K' + row]) + Math.floor(num(s['J' + row]) / 3),
      M: (row, s, all) => sumif(all, 'геншин персы', 'R', s['A' + row], 'геншин персы', 'O'),
      N: (row, s) => Math.max(0, num(s['M' + row]) - num(s['L' + row])),
    },

    // ═════════════ диковинки ═════════════
    'диковинки': {
      D: (row, s, all) => sumif(all, 'геншин персы', 'AA', s['A' + row], 'геншин персы', 'Z'),
      E: (row, s) => Math.max(0, num(s['D' + row]) - num(s['C' + row])),
      G: (row, s) => num(s['F' + row]) ? Math.ceil(num(s['E' + row]) / num(s['F' + row])) : 0,
    },

    // ═════════════ Кристалы ═════════════
    'Кристалы': {
      C: (row, s, all) => sumif(all, 'геншин персы', 'D', s['A' + row], 'геншин персы', 'L'),
      D: (row, s) => Math.max(0, num(s['C' + row]) - num(s['B' + row])),
      E: (row, s) => num(s['D' + row]) === 0 ? num(s['B' + row]) - num(s['C' + row]) : 0,
      G: (row, s) => num(s['F' + row]) + Math.floor(num(s['E' + row]) / 3),
      H: (row, s, all) => sumif(all, 'геншин персы', 'D', s['A' + row], 'геншин персы', 'K'),
      I: (row, s) => Math.max(0, num(s['H' + row]) - num(s['G' + row])),
      J: (row, s) => num(s['I' + row]) === 0 ? num(s['F' + row]) - num(s['H' + row]) : 0,
      K: (row, s) => num(s['K' + row]) + Math.floor(num(s['J' + row]) / 3),
      M: (row, s, all) => sumif(all, 'геншин персы', 'D', s['A' + row], 'геншин персы', 'J'),
      N: (row, s) => Math.max(0, num(s['M' + row]) - num(s['L' + row])),
      O: (row, s) => num(s['N' + row]) === 0 ? num(s['K' + row]) - num(s['M' + row]) : 0,
      Q: (row, s) => num(s['P' + row]) + Math.floor(num(s['O' + row]) / 3),
      R: (row, s, all) => sumif(all, 'геншин персы', 'D', s['A' + row], 'геншин персы', 'I'),
      S: (row, s) => Math.max(0, num(s['R' + row]) - num(s['Q' + row])),
    },

    // ═════════════ еженед боссы ═════════════
    'еженед боссы': {
      C: (row, s, all) => sumif(all, 'геншин персы', 'T', s['A' + row], 'геншин персы', 'S'),
      D: (row, s) => Math.max(0, num(s['C' + row]) - num(s['B' + row])),
    },

    // ═════════════ боссы ═════════════
    'боссы': {
      C: (row, s, all) => sumif(all, 'геншин персы', 'N', s['A' + row], 'геншин персы', 'M'),
      D: (row, s) => Math.max(0, num(s['C' + row]) - num(s['B' + row])),
    },

    // ═════════════ Книги талантов ═════════════
    'Книги талантов': {
      C: (row, s, all) => sumif(all, 'геншин персы', 'Y', s['A' + row], 'геншин персы', 'X'),
      D: (row, s) => Math.max(0, num(s['C' + row]) - num(s['B' + row])),
      E: (row, s) => num(s['D' + row]) === 0 ? num(s['B' + row]) - num(s['C' + row]) : 0,
      G: (row, s) => num(s['F' + row]) + Math.floor(num(s['E' + row]) / 3),
      H: (row, s, all) => sumif(all, 'геншин персы', 'Y', s['A' + row], 'геншин персы', 'W'),
      I: (row, s) => Math.max(0, num(s['H' + row]) - num(s['G' + row])),
      J: (row, s) => num(s['I' + row]) === 0 ? num(s['F' + row]) - num(s['H' + row]) : 0,
      L: (row, s) => num(s['K' + row]) + Math.floor(num(s['J' + row]) / 3),
      M: (row, s, all) => sumif(all, 'геншин персы', 'Y', s['A' + row], 'геншин персы', 'V'),
      N: (row, s) => Math.max(0, num(s['M' + row]) - num(s['L' + row])),
    },

    // ═════════════ Рыбалка ═════════════
    'Рыбалка': {
      C: (row, s) => {
        let t = 0;
        for (const c of 'FGHIJKLMNOPQRS') t += num(s[c + row]);
        return t;
      },
      E: (row, s) => num(s['C' + row]) - num(s['D' + row]),
    },
  };
})();