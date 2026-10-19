/**
 * Easington Sea Angling Club: results entry for the club's Google Sheet.
 *
 * Adds a "Club" menu to the sheet (on a computer) and a phone-friendly
 * page (deployed as a web app) for entering match results and anglers.
 * It writes to the "Results" and "Anglers" tabs; the club app reads them.
 *
 * Install: in the sheet, Extensions → Apps Script, replace everything with
 * this file, save, then reload the sheet. See apps-script/README.md.
 */

const RESULTS = 'Results';
const ANGLERS = 'Anglers';
const SPECIES = ['Dogfish', 'Whiting', 'Bass', 'Codling', 'Pouting', 'Flounder', 'Dab', 'Plaice', 'Coalfish', 'Pollack', 'Rockling', 'Gurnard', 'Mackerel', 'Thornback ray', 'Conger'];

// ---------- menu, sidebar and web app ----------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Club')
    .addItem('Add match results', 'showResultsForm')
    .addItem('Add an angler', 'showAnglerForm')
    .addSeparator()
    .addItem('Copy Enter Match to Results', 'copyEnterMatch')
    .addToUi();
}

// ---------- the "Enter Match" tab: copy a finished match onto Results ----------

const ENTER = 'Enter Match';
const ENTER_FIRST_ROW = 8, ENTER_LAST_ROW = 37, COLUMNS = 14; // A8:N37, same columns as Results

/** Copies every filled-in angler row on Enter Match to Results, then clears the typed entries. */
function copyEnterMatch() {
  const ui = SpreadsheetApp.getUi();
  const em = book_().getSheetByName(ENTER);
  if (!em) return ui.alert('There is no "' + ENTER + '" tab in this sheet.');
  const block = em.getRange(ENTER_FIRST_ROW, 1, ENTER_LAST_ROW - ENTER_FIRST_ROW + 1, COLUMNS);
  const rows = block.getValues().filter(x => text_(x[3]));
  if (!rows.length) return ui.alert('Enter Match has no anglers filled in yet.');

  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const r = table_(RESULTS);
    const problems = [], clashes = [];
    rows.forEach((x, i) => {
      const match = parseInt(x[0], 10), angler = text_(x[3]);
      if (!match || !text_(x[1])) problems.push(angler + ' (no match number or date)');
      if (r.rows.some(y => parseInt(y[r.col('match')], 10) === match && text_(y[r.col('angler')]).toLowerCase() === angler.toLowerCase())) clashes.push(angler);
    });
    if (problems.length) return ui.alert('Fill these in first:\n' + problems.join('\n'));
    if (clashes.length) return ui.alert('Already on Results for match ' + parseInt(rows[0][0], 10) + ':\n' + clashes.join('\n') + '\n\nNothing was copied. Remove those rows from Enter Match, or correct them on Results.');

    const ok = ui.alert('Copy ' + rows.length + ' result' + (rows.length === 1 ? '' : 's') + ' for match ' + parseInt(rows[0][0], 10) + ' to Results?', ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return;

    rows.forEach(x => ensureAngler_(tidy_(text_(x[3]))));
    const out = rows.map(x => x.map((v, c) => c === 1 ? "'" + text_(v) : (v instanceof Date ? iso_(v) : v)));
    r.sh.getRange(r.sh.getLastRow() + 1, 1, out.length, COLUMNS).setValues(out);

    // Clear only what was typed; formulas on the tab stay in place
    const formulas = block.getFormulas();
    formulas.forEach((row, i) => row.forEach((f, c) => { if (!f) block.getCell(i + 1, c + 1).clearContent(); }));
    ui.alert('Copied ' + rows.length + ' result' + (rows.length === 1 ? '' : 's') + ' to Results. The club app shows them within a couple of minutes.');
  } finally {
    lock.releaseLock();
  }
}

function showResultsForm() {
  SpreadsheetApp.getUi().showSidebar(page_('results').setTitle('Add match results'));
}

function showAnglerForm() {
  SpreadsheetApp.getUi().showModalDialog(page_('angler').setWidth(400).setHeight(380), 'Add an angler');
}

function doGet(e) {
  const which = e && e.parameter && e.parameter.page === 'angler' ? 'angler' : 'results';
  return page_(which)
    .setTitle('Easington SAC results')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function page_(which) {
  return HtmlService.createHtmlOutput(PAGE_.replace('__PAGE__', which).replace('__SPECIES__', JSON.stringify(SPECIES)));
}

// ---------- reading the sheet ----------

function book_() {
  // Works from the sheet's menu and from the web app
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
}

function table_(name) {
  const sh = book_().getSheetByName(name);
  if (!sh) throw new Error('The sheet has no "' + name + '" tab.');
  const values = sh.getDataRange().getValues();
  const head = values.shift().map(h => String(h).trim().toLowerCase());
  const col = h => {
    const i = head.indexOf(h);
    if (i < 0) throw new Error('The "' + name + '" tab has no "' + h + '" column.');
    return i;
  };
  return { sh, head, rows: values, col };
}

const iso_ = d => Utilities.formatDate(d, Session.getScriptTimeZone() || 'Europe/London', 'yyyy-MM-dd');
const text_ = v => (v instanceof Date ? iso_(v) : String(v == null ? '' : v)).trim();
const num_ = v => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; };

/** Everything the form needs when it opens. */
function getSetup() {
  const a = table_(ANGLERS), r = table_(RESULTS);
  const names = a.rows.map(x => text_(x[a.col('angler')])).filter(Boolean).sort((x, y) => x.localeCompare(y));
  const today = iso_(new Date());
  let latest = 0, latestDate = '', latestVenue = '';
  r.rows.forEach(x => {
    const no = parseInt(x[r.col('match')], 10);
    if (no >= latest) { latest = no; latestDate = text_(x[r.col('date')]); latestVenue = text_(x[r.col('venue')]); }
  });
  // Carry on with today's match if it's already started, otherwise start the next one
  const sameDay = latest && latestDate === today;
  // Use the Biggest fish dropdown already on the Results tab, if there is one
  let species = SPECIES;
  try {
    const rule = r.sh.getRange(2, r.col('biggest fish') + 1).getDataValidation();
    if (rule && rule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) species = rule.getCriteriaValues()[0];
  } catch (e) { /* keep the built-in list */ }
  return {
    names, today, species,
    match: sameDay ? latest : latest + 1,
    venue: sameDay ? latestVenue : '',
    entered: sameDay ? getMatch(latest) : []
  };
}

/** The rows already entered for one match, heaviest bag first. */
function getMatch(no) {
  const r = table_(RESULTS);
  return r.rows
    .filter(x => parseInt(x[r.col('match')], 10) === Number(no) && text_(x[r.col('angler')]))
    .map(x => ({ angler: text_(x[r.col('angler')]), oz: num_(x[r.col('bag lb')]) * 16 + num_(x[r.col('bag oz')]) }))
    .sort((a, b) => b.oz - a.oz);
}

// ---------- writing ----------

/** Adds (or replaces) one angler's result for a match. */
function saveResult(f) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const match = parseInt(f.match, 10);
    const angler = tidy_(f.angler);
    if (!match || match < 1) throw new Error('Give the match number.');
    if (!angler) throw new Error("Give the angler's name.");
    if (num_(f.bagOz) > 15 || num_(f.fishOz) > 15 || num_(f.codOz) > 15) throw new Error('Ounces go from 0 to 15. Put 16oz and over in the lb box.');

    const addedAngler = ensureAngler_(angler);
    const r = table_(RESULTS);
    const row = new Array(r.head.length).fill('');
    const put = (h, v) => { row[r.col(h)] = v; };
    put('match', match);
    put('date', "'" + (f.date || iso_(new Date())));
    put('venue', f.venue || '');
    put('angler', angler);
    put('bag lb', num_(f.bagLb));
    put('bag oz', num_(f.bagOz));
    put('biggest fish', num_(f.fishLb) + num_(f.fishOz) > 0 ? tidy_(f.fish || '') : '');
    put('fish lb', num_(f.fishLb) + num_(f.fishOz) > 0 ? num_(f.fishLb) : '');
    put('fish oz', num_(f.fishLb) + num_(f.fishOz) > 0 ? num_(f.fishOz) : '');
    put('cod caught', num_(f.cod) || '');
    put('cod lb', num_(f.cod) ? num_(f.codLb) : '');
    put('cod oz', num_(f.cod) ? num_(f.codOz) : '');
    put('flats', num_(f.flats) || '');
    put('notes', f.notes || '');

    // Same angler already entered for this match: replace that row
    const existing = r.rows.findIndex(x => parseInt(x[r.col('match')], 10) === match && text_(x[r.col('angler')]).toLowerCase() === angler.toLowerCase());
    if (existing >= 0) r.sh.getRange(existing + 2, 1, 1, row.length).setValues([row]);
    else r.sh.appendRow(row);

    return {
      message: (existing >= 0 ? 'Updated ' : 'Saved ') + angler + "'s result." + (addedAngler ? ' ' + angler + ' was new, so they have been added to the Anglers tab.' : ''),
      entered: getMatch(match)
    };
  } finally {
    lock.releaseLock();
  }
}

/** Adds an angler, or updates which challenges they have entered. */
function saveAngler(f) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const name = tidy_(f.name);
    if (!name) throw new Error("Give the angler's name.");
    const a = table_(ANGLERS);
    const i = a.rows.findIndex(x => text_(x[a.col('angler')]).toLowerCase() === name.toLowerCase());
    const silver = f.silver ? 'Yes' : '', cod = f.cod ? 'Yes' : '';
    if (i >= 0) {
      a.sh.getRange(i + 2, a.col('silverware challenge') + 1).setValue(silver);
      a.sh.getRange(i + 2, a.col('cod challenge') + 1).setValue(cod);
      return { message: 'Updated ' + text_(a.rows[i][a.col('angler')]) + '.' };
    }
    const row = new Array(a.head.length).fill('');
    row[a.col('angler')] = name;
    row[a.col('silverware challenge')] = silver;
    row[a.col('cod challenge')] = cod;
    a.sh.appendRow(row);
    return { message: 'Added ' + name + '.' };
  } finally {
    lock.releaseLock();
  }
}

function ensureAngler_(name) {
  const a = table_(ANGLERS);
  if (a.rows.some(x => text_(x[a.col('angler')]).toLowerCase() === name.toLowerCase())) return false;
  const row = new Array(a.head.length).fill('');
  row[a.col('angler')] = name;
  a.sh.appendRow(row);
  return true;
}

function tidy_(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

/** Run once from the editor so the phone page knows which sheet to use. */
function setUp() {
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId());
}

// ---------- the form ----------

const PAGE_ = `<!doctype html>
<html><head><base target="_top"><meta charset="utf-8">
<style>
  :root { --navy: #262f39; --gold: #e6c740; --ink: #17202a; --muted: #5b6774; --line: #d6dde5; --cod: #2f6bb0; --ok: #24704a; --err: #9a4b00; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.4 Arial, sans-serif; color: var(--ink); background: #eef1f4; }
  header { background: var(--navy); color: #fff; padding: 14px 16px; }
  header b { color: var(--gold); display: block; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; }
  header h1 { margin: 2px 0 0; font-size: 22px; }
  main { padding: 16px; display: grid; gap: 14px; max-width: 520px; margin: 0 auto; }
  fieldset { border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 12px; margin: 0; display: grid; gap: 10px; }
  legend { font-weight: bold; padding: 0 4px; }
  label { display: grid; gap: 4px; font-size: 14px; font-weight: bold; color: var(--muted); }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .row3 { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; }
  input { font: inherit; color: var(--ink); padding: 10px; border: 1px solid var(--line); border-radius: 6px; width: 100%; min-width: 0; background: #fff; }
  .check { display: flex; align-items: center; gap: 10px; font-size: 16px; color: var(--ink); font-weight: normal; }
  .check input { width: 22px; height: 22px; }
  button { font: inherit; font-weight: bold; padding: 12px 16px; border-radius: 6px; border: 0; background: var(--navy); color: #fff; cursor: pointer; }
  button.alt { background: #fff; color: var(--ink); border: 1px solid var(--line); }
  button:disabled { opacity: .6; }
  .msg { font-weight: bold; min-height: 1.4em; margin: 0; }
  .ok { color: var(--ok); } .err { color: var(--err); }
  ol { margin: 0; padding-left: 26px; } li { padding: 3px 0; } li span { float: right; font-variant-numeric: tabular-nums; }
  .hint { color: var(--muted); font-size: 14px; margin: 0; }
</style></head>
<body>
<header><b>Easington Sea Angling Club</b><h1 id="title">Match results</h1></header>
<main id="resultsPage" hidden>
  <fieldset><legend>Match</legend>
    <div class="row3">
      <label>Date<input type="date" id="date"></label>
      <label>Match<input type="number" id="match" min="1" inputmode="numeric"></label>
      <label>&nbsp;<button type="button" class="alt" id="newMatch">New</button></label>
    </div>
    <label>Venue (optional)<input id="venue" placeholder="e.g. Easington beach"></label>
  </fieldset>
  <form id="resultForm">
    <fieldset><legend>Angler's result</legend>
      <label>Angler<input id="angler" list="names" autocomplete="off" required placeholder="Start typing a name"></label>
      <div class="row"><label>Bag lb<input type="number" id="bagLb" min="0" inputmode="numeric" placeholder="0"></label><label>Bag oz<input type="number" id="bagOz" min="0" max="15" inputmode="numeric" placeholder="0"></label></div>
      <p class="hint">Fished but nothing to weigh? Leave the bag at 0 (1 point).</p>
      <label>Biggest fish (not cod)<input id="fish" list="species" placeholder="e.g. Dogfish"></label>
      <div class="row"><label>Fish lb<input type="number" id="fishLb" min="0" inputmode="numeric"></label><label>Fish oz<input type="number" id="fishOz" min="0" max="15" inputmode="numeric"></label></div>
      <div class="row3"><label>Cod caught<input type="number" id="cod" min="0" inputmode="numeric"></label><label>Cod lb<input type="number" id="codLb" min="0" inputmode="numeric"></label><label>Cod oz<input type="number" id="codOz" min="0" max="15" inputmode="numeric"></label></div>
      <div class="row"><label>Flats<input type="number" id="flats" min="0" inputmode="numeric"></label><label>Notes<input id="notes"></label></div>
      <button id="saveResult">Save result</button>
      <p class="msg" id="resultMsg" role="status"></p>
    </fieldset>
  </form>
  <fieldset><legend id="soFarTitle">Entered so far</legend><ol id="soFar"><li class="hint">Nothing yet for this match.</li></ol></fieldset>
</main>
<main id="anglerPage" hidden>
  <form id="anglerForm">
    <fieldset><legend>New angler</legend>
      <label>Name<input id="newName" required placeholder="e.g. Mike Coulman" autocomplete="off"></label>
      <label class="check"><input type="checkbox" id="silver"> Silverware Challenge (£20)</label>
      <label class="check"><input type="checkbox" id="codEntry"> Cod Challenge (£15)</label>
      <p class="hint">Already on the list? Saving updates which challenges they've entered.</p>
      <button id="saveAngler">Save angler</button>
      <p class="msg" id="anglerMsg" role="status"></p>
    </fieldset>
  </form>
</main>
<datalist id="names"></datalist><datalist id="species"></datalist>
<script>
  const PAGE = '__PAGE__', SPECIES = __SPECIES__;
  const $ = id => document.getElementById(id);
  const fmt = oz => oz < 16 ? oz + 'oz' : Math.floor(oz / 16) + 'lb ' + (oz % 16) + 'oz';
  const say = (id, t, ok) => { $(id).textContent = t; $(id).className = 'msg ' + (ok ? 'ok' : 'err'); };
  const fail = id => e => { say(id, e.message || String(e), false); document.querySelectorAll('button').forEach(b => b.disabled = false); };
  function showSoFar(list) {
    $('soFarTitle').textContent = 'Entered so far for match ' + $('match').value;
    $('soFar').innerHTML = list.length ? list.map(r => '<li>' + r.angler.replace(/</g, '&lt;') + '<span>' + fmt(r.oz) + '</span></li>').join('') : '<li class="hint">Nothing yet for this match.</li>';
  }
  $('species').innerHTML = SPECIES.map(s => '<option value="' + s + '">').join('');
  if (PAGE === 'angler') { $('anglerPage').hidden = false; $('title').textContent = 'Add an angler'; $('newName').focus(); }
  else {
    $('resultsPage').hidden = false;
    google.script.run.withSuccessHandler(s => {
      if (s.species && s.species.length) $('species').innerHTML = s.species.map(x => '<option value="' + String(x).replace(/"/g, '&quot;') + '">').join('');
      $('names').innerHTML = s.names.map(n => '<option value="' + n.replace(/"/g, '&quot;') + '">').join('');
      $('date').value = s.today; $('match').value = s.match; $('venue').value = s.venue;
      showSoFar(s.entered);
    }).withFailureHandler(fail('resultMsg')).getSetup();
  }
  $('newMatch').onclick = () => { $('match').value = Number($('match').value || 0) + 1; showSoFar([]); };
  $('match').onchange = () => google.script.run.withSuccessHandler(showSoFar).getMatch($('match').value);
  $('resultForm').onsubmit = e => {
    e.preventDefault();
    const f = {}; ['match', 'date', 'venue', 'angler', 'bagLb', 'bagOz', 'fish', 'fishLb', 'fishOz', 'cod', 'codLb', 'codOz', 'flats', 'notes'].forEach(k => f[k] = $(k).value);
    $('saveResult').disabled = true; say('resultMsg', 'Saving…', true);
    google.script.run.withSuccessHandler(r => {
      say('resultMsg', r.message, true); showSoFar(r.entered);
      ['angler', 'bagLb', 'bagOz', 'fish', 'fishLb', 'fishOz', 'cod', 'codLb', 'codOz', 'flats', 'notes'].forEach(k => $(k).value = '');
      $('saveResult').disabled = false; $('angler').focus();
    }).withFailureHandler(fail('resultMsg')).saveResult(f);
  };
  $('anglerForm').onsubmit = e => {
    e.preventDefault();
    $('saveAngler').disabled = true; say('anglerMsg', 'Saving…', true);
    google.script.run.withSuccessHandler(r => {
      say('anglerMsg', r.message, true); $('newName').value = ''; $('silver').checked = $('codEntry').checked = false;
      $('saveAngler').disabled = false; $('newName').focus();
    }).withFailureHandler(fail('anglerMsg')).saveAngler({ name: $('newName').value, silver: $('silver').checked, cod: $('codEntry').checked });
  };
</script>
</body></html>`;
