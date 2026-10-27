// app.js
const DATA = './data';
const STORAGE_KEY = 'tracker-edits-v1';

// Порядок важен: сначала листы без зависимостей, потом те, что читают из них
const COMPUTE_ORDER = [
  'Хср персы', 'геншин персы', 'Рыбалка',
  'Хср боссы', 'боссы следов',
  'материалы прокачки', 'диковинки', 'Кристалы',
  'еженед боссы', 'боссы', 'Книги талантов',
];

const DEPS = {
  'Хср персы':    ['Хср боссы', 'боссы следов'],
  'геншин персы': ['материалы прокачки', 'диковинки', 'Кристалы',
                   'еженед боссы', 'боссы', 'Книги талантов'],
};

const SHEET_META = {
  'Хср персы':          { icon: '👤', desc: 'Персонажи HSR · возвышение, следы, таланты' },
  'Хср боссы':          { icon: '💀', desc: 'Боссы HSR · материалы и следы' },
  'боссы следов':       { icon: '🌌', desc: 'Сводка по боссам следов' },
  'геншин персы':       { icon: '🎮', desc: 'Персонажи Genshin' },
  'материалы прокачки': { icon: '📈', desc: 'Материалы возвышения · крафт' },
  'диковинки':          { icon: '🌸', desc: 'Региональные диковинки' },
  'Кристалы':           { icon: '💎', desc: 'Кристаллы по стихиям' },
  'еженед боссы':       { icon: '🐉', desc: 'Материалы еженедельных боссов' },
  'боссы':              { icon: '🗡️', desc: 'Материалы боссов мира' },
  'Книги талантов':     { icon: '📖', desc: 'Книги талантов · крафт' },
  'Рыбалка':            { icon: '🎣', desc: 'Учёт улова' },
};

let manifest = {};
let sheets = {};
let computed = {};
let currentSheet = null;

const $nav     = document.getElementById('nav');
const $content = document.getElementById('content');
const $title   = document.getElementById('title');
const $desc    = document.getElementById('desc');
const $status  = document.getElementById('status');
const $saveBtn = document.getElementById('save-btn');
const $resetBtn= document.getElementById('reset-btn');

/* ───── CSV parser ───── */
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], cell = '', i = 0, q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        q = false; i++; continue;
      }
      cell += c; i++;
    } else {
      if (c === '"') { q = true; i++; continue; }
      if (c === ',') { row.push(cell); cell = ''; i++; continue; }
      if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell);
        if (row.some(x => x !== '')) rows.push(row);
        row = []; cell = ''; i++;
        continue;
      }
      cell += c; i++;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some(x => x !== '')) rows.push(row);
  }
  return rows;
}

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = (n - 1 - r) / 26;
  }
  return s;
}

function csvToSheet(text) {
  const rows = parseCSV(text);
  const sheet = {};
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const v = rows[r][c];
      if (v === '' || v == null) continue;
      const n = parseFloat(v);
      sheet[colLetter(c + 1) + (r + 1)] = (String(n) === v.trim()) ? n : v;
    }
  }
  return sheet;
}

/* ───── Компьют ───── */
function computeSheet(name) {
  const fns = Formulas[name];
  const s = sheets[name];
  if (!fns || !s) return;
  let maxR = 0;
  for (const k in s) {
    const m = k.match(/\d+$/);
    if (m && +m[0] > maxR) maxR = +m[0];
  }
  for (let r = 2; r <= maxR; r++) {
    for (const col in fns) {
      s[col + r] = fns[col](r, s, sheets);
    }
  }
}

function computeAll() {
  for (const name of COMPUTE_ORDER) {
    if (computed[name]) continue;
    computeSheet(name);
    computed[name] = true;
  }
}

/* ───── Правки пользователя ───── */
function applyUserEdits() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  let edits;
  try { edits = JSON.parse(raw); } catch { return; }
  for (const name in edits) {
    if (!sheets[name]) continue;
    for (const addr in edits[name]) {
      sheets[name][addr] = edits[name][addr];
    }
  }
}

function collectUserEdits() {
  const out = {};
  for (const name in manifest) {
    const cols = manifest[name].editable || [];
    if (!cols.length) continue;
    const s = sheets[name];
    for (const addr in s) {
      const m = addr.match(/^([A-Z]+)(\d+)$/);
      if (!m || +m[2] < 2) continue;
      if (!cols.includes(m[1])) continue;
      if (s[addr] === undefined || s[addr] === '') continue;
      if (Formulas[name] && Formulas[name][m[1]]) continue;
      if (!out[name]) out[name] = {};
      out[name][addr] = s[addr];
    }
  }
  return out;
}

let saveTimer;
function saveUserEdits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectUserEdits()));
  setStatus('✓ Сохранено (сессия)', 'ok');
}

/* ───── UI ───── */
function setStatus(text, type = '') {
  $status.textContent = text;
  $status.className = 'status ' + type;
}

function renderNav() {
  $nav.innerHTML = '';
  for (const name of Object.keys(sheets)) {
    const meta = SHEET_META[name] || { icon: '📄' };
    const el = document.createElement('div');
    el.className = 'nav-item' + (name === currentSheet ? ' active' : '');
    el.innerHTML = `<span class="name">${meta.icon} ${name}</span>`;
    el.onclick = () => selectSheet(name);
    $nav.appendChild(el);
  }
}

function selectSheet(name) {
  currentSheet = name;
  const meta = SHEET_META[name] || { icon: '📄', desc: '' };
  $title.textContent = `${meta.icon} ${name}`;
  $desc.textContent = meta.desc || '';
  renderNav();
  renderSheet(name);
  const $ms = document.getElementById('mobile-sheet-select');
  if ($ms) $ms.value = name;
}

function fmt(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(2).replace(/\.?0+$/, '');
  }
  return String(v);
}

function renderSheet(name) {
  const s = sheets[name];
  if (!s) { $content.innerHTML = '<div class="center-msg"><h2>Пусто</h2></div>'; return; }

  const editable = new Set((manifest[name]?.editable) || []);
  const fns = Formulas[name] || {};

  const cols = new Set();
  let maxR = 0;
  for (const a in s) {
    const m = a.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    cols.add(m[1]);
    if (+m[2] > maxR) maxR = +m[2];
  }
  if (!cols.size) { $content.innerHTML = '<div class="center-msg"><h2>Пусто</h2></div>'; return; }
  const sortedCols = [...cols].sort((a, b) => {
    const na = a.split('').reduce((acc, c) => acc * 26 + (c.charCodeAt(0) - 64), 0);
    const nb = b.split('').reduce((acc, c) => acc * 26 + (c.charCodeAt(0) - 64), 0);
    return na - nb;
  });

  const tbl = document.createElement('table');
  tbl.className = 'sheet-table';

  const thead = document.createElement('thead');
  const htr = document.createElement('tr');
  htr.innerHTML = '<th></th>';
  for (const c of sortedCols) {
    const th = document.createElement('th');
    const hv = s[c + 1];
    th.textContent = (hv === '' || hv === undefined || hv === null) ? c : hv;
    th.title = 'Колонка ' + c;
    htr.appendChild(th);
  }
  thead.appendChild(htr);
  tbl.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let r = 2; r <= maxR; r++) {
    const tr = document.createElement('tr');
    const rth = document.createElement('th');
    rth.textContent = r;
    tr.appendChild(rth);

    let rowHasData = false;
    const cells = [];
    for (const c of sortedCols) {
      const addr = c + r;
      const val = s[addr];
      if (val !== '' && val !== null && val !== undefined) rowHasData = true;
      cells.push({ c, addr, val });
    }
    if (!rowHasData) continue;

    for (const { c, addr, val } of cells) {
      const td = document.createElement('td');
      const isFormula = fns[c] !== undefined;
      const isEditable = editable.has(c) && r >= 2 && !isFormula;

      if (isEditable) {
        td.className = 'editable';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = (val === undefined || val === null) ? '' : val;
        inp.dataset.sheet = name;
        inp.dataset.addr = addr;
        inp.addEventListener('change', onCellChange);
        td.appendChild(inp);
      } else if (isFormula) {
        td.className = 'formula num';
        td.textContent = fmt(val);
        td.title = `Формула: ${c}${r}`;
      } else {
        td.textContent = fmt(val);
        if (typeof val === 'number') td.className = 'num';
        else if (val === '' || val === null || val === undefined) td.className = 'empty';
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tbl.appendChild(tbody);
  $content.innerHTML = '';
  $content.appendChild(tbl);
}

/* ───── Правка ───── */
function onCellChange(e) {
  const inp = e.target;
  const sheet = inp.dataset.sheet;
  const addr = inp.dataset.addr;
  const raw = inp.value.trim();

  if (raw === '') {
    sheets[sheet][addr] = '';
  } else {
    const n = Number(raw);
    sheets[sheet][addr] = isNaN(n) ? raw : n;
  }

  // сброс кеша этого листа и всех его зависимостей
  computed[sheet] = false;
  for (const dep of (DEPS[sheet] || [])) computed[dep] = false;

  computeAll();
  renderSheet(sheet);

  setStatus('● Не сохранено', 'warn');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveUserEdits, 400);
}

/* ───── Загрузка ───── */
async function loadAll() {
  manifest = await fetch(`${DATA}/manifest.json`, { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error(`manifest.json: HTTP ${r.status}`); return r.json(); });

  const names = Object.keys(manifest);
  const texts = await Promise.all(
    names.map(n =>
      fetch(`${DATA}/${manifest[n].file}`, { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error(`${manifest[n].file}: HTTP ${r.status}`); return r.text(); })
    )
  );

  sheets = {};
  computed = {};
  names.forEach((n, i) => { sheets[n] = csvToSheet(texts[i]); });

  applyUserEdits();
  computeAll();
}

/* ───── Мобильный селектор ───── */
function renderMobileSelect() {
  const $ms = document.getElementById('mobile-sheet-select');
  if (!$ms) return;
  $ms.innerHTML = '';
  for (const name of Object.keys(sheets)) {
    const meta = SHEET_META[name] || { icon: '📄' };
    const o = document.createElement('option');
    o.value = name;
    o.textContent = `${meta.icon} ${name}`;
    if (name === currentSheet) o.selected = true;
    $ms.appendChild(o);
  }
}

/* ───── Init ───── */
async function init() {
  $saveBtn.disabled = true;
  $resetBtn.disabled = true;
  $content.innerHTML = '<div class="center-msg"><div class="spinner"></div><p>Загружаем таблицу…</p></div>';
  setStatus('Загрузка…');

  try {
    await loadAll();
    $saveBtn.disabled = false;
    $resetBtn.disabled = false;
    setStatus('✓ Готово', 'ok');

    const first = Object.keys(sheets).find(n => Object.keys(sheets[n]).length > 0);
    if (!first) throw new Error('Все листы пустые');

    renderMobileSelect();
    selectSheet(first);
  } catch (e) {
    console.error(e);
    setStatus('✗ ' + e.message, 'err');
    $content.innerHTML = `
      <div class="center-msg">
        <h2>Ошибка загрузки</h2>
        <p>${e.message}<br><br>
        Запустите локальный сервер в папке проекта:<br>
        <code style="color:#f0c060">python -m http.server 8000</code><br>
        и откройте <code style="color:#f0c060">http://localhost:8000</code></p>
      </div>`;
  }
}

/* ───── Кнопки ───── */
$saveBtn.onclick = () => {
  const blob = new Blob(
    [JSON.stringify(collectUserEdits(), null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'edits.json';
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus('✓ Скачано edits.json', 'ok');
};

$resetBtn.onclick = () => {
  if (!confirm('Сбросить все правки? Данные из CSV останутся.')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
};

document.getElementById('mobile-sheet-select')?.addEventListener('change', e => {
  selectSheet(e.target.value);
});
document.getElementById('mobile-save')?.addEventListener('click', () => $saveBtn.click());
document.getElementById('mobile-reset')?.addEventListener('click', () => $resetBtn.click());

init();