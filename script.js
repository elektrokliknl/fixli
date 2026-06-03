/* ============================================================
   FIXLI — script.js
   Demo-functionaliteit met localStorage
   ============================================================ */

/* =====================================================
   UTILITIES
===================================================== */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/** Genereer een simpele unieke ID */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Lees uit localStorage (of geef fallback terug) */
function lsGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

/** Schrijf naar localStorage */
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* =====================================================
   DEMO DATA — vooraf gevulde data voor demo
===================================================== */
function initDemoData() {
  if (!lsGet('fixli_init')) {
    const klussen = [
      {
        id: uid(), status: 'open', vakgebied: 'Elektricien', klus: 'Nieuwe stopcontacten plaatsen',
        beschrijving: 'Graag 3 extra stopcontacten in woonkamer en slaapkamer.',
        postcode: '3811', plaats: 'Amersfoort', datum: '2025-07-10', tijd: '09:00',
        naam: 'Jan de Vries', telefoon: '06-12345678', email: 'jan@email.nl',
        adres: 'Keizersgracht 12', accepted_by: null, created_at: new Date().toISOString()
      },
      {
        id: uid(), status: 'geaccepteerd', vakgebied: 'Loodgieter', klus: 'Lekkende kraan repareren',
        beschrijving: 'Keukenafvoer lekt, al 2 weken last van.',
        postcode: '3812', plaats: 'Amersfoort', datum: '2025-07-08', tijd: '13:00',
        naam: 'Maria Jansen', telefoon: '06-87654321', email: 'maria@email.nl',
        adres: 'Langegracht 5', accepted_by: 'vakman_1', created_at: new Date().toISOString()
      },
      {
        id: uid(), status: 'open', vakgebied: 'Schilder', klus: 'Buitenschilderwerk woning',
        beschrijving: 'Voorgevel + kozijnen schilderen, huis uit 1985.',
        postcode: '3821', plaats: 'Amersfoort', datum: '2025-07-15', tijd: '08:00',
        naam: 'Peter Smit', telefoon: '06-11223344', email: 'peter@email.nl',
        adres: 'Soesterweg 88', accepted_by: null, created_at: new Date().toISOString()
      }
    ];
    const vakmannen = [
      {
        id: 'vakman_1', bedrijfsnaam: 'Loodgietersbedrijf Hendrix', naam: 'Rob Hendrix',
        email: 'rob@hendrix-loodgieter.nl', telefoon: '06-55667788', kvk: '12345678',
        btw: 'NL123456789B01', vestiging: 'Amersfoort', vakgebieden: ['Loodgieter'],
        ervaring: 15, tarief: '65', status: 'goedgekeurd', aangemeld: new Date().toISOString()
      },
      {
        id: 'vakman_2', bedrijfsnaam: 'Electra Pro BV', naam: 'Sven Willems',
        email: 'sven@electrapro.nl', telefoon: '06-44556677', kvk: '87654321',
        btw: 'NL987654321B01', vestiging: 'Utrecht', vakgebieden: ['Elektricien'],
        ervaring: 8, tarief: '70', status: 'wacht_op_goedkeuring', aangemeld: new Date().toISOString()
      }
    ];
    const users = [
      { id: 'user_1', naam: 'Jan de Vries', email: 'jan@email.nl', password: 'demo123', type: 'klant' }
    ];
    lsSet('fixli_klussen', klussen);
    lsSet('fixli_vakmannen', vakmannen);
    lsSet('fixli_users', users);
    lsSet('fixli_init', true);
  }
}

/* =====================================================
   NAVIGATIE — pagina's en hamburger menu
===================================================== */
function initNav() {
  const links = qsa('[data-page]');
  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
      // Sluit mobile menu
      qs('.navbar__mobile-menu')?.classList.remove('open');
    });
  });

  // Hamburger
  qs('.navbar__hamburger')?.addEventListener('click', () => {
    qs('.navbar__mobile-menu')?.classList.toggle('open');
  });
}

function navigateTo(page) {
  qsa('.page').forEach(p => p.classList.remove('active'));
  const target = qs(`#page-${page}`);
  if (target) { target.classList.add('active'); window.scrollTo(0,0); }
  // Update active nav links
  qsa('[data-page]').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
}

/* =====================================================
   HERO ZOEK — kies vakgebied en ga naar formulier
===================================================== */
function initHeroSearch() {
  const btn = qs('#hero-search-btn');
  const sel = qs('#hero-vakgebied');
  if (!btn || !sel) return;
  btn.addEventListener('click', () => {
    if (sel.value) {
      formState.vakgebied = sel.value;
      navigateTo('aanvragen');
      renderFormStep(1);
    } else {
      sel.focus();
    }
  });

  // Vakgebied cards op homepage
  qsa('.vakgebied-card').forEach(card => {
    card.addEventListener('click', () => {
      formState.vakgebied = card.dataset.vak;
      navigateTo('aanvragen');
      renderFormStep(1);
    });
  });
}

/* =====================================================
   MEERSTAPPEN FORMULIER — Klus aanvragen
===================================================== */
const formState = {
  vakgebied: '', klus: '', beschrijving: '', fotos: [],
  postcode: '', plaats: '', datum: '', tijd: '',
  naam: '', telefoon: '', email: ''
};

const vakgebiedKlussen = {
  'Elektricien':       ['Stopcontacten plaatsen', 'Groepenkast vervangen', 'Buitenverlichting installeren', 'Elektrische installatie keuring', 'Laadpaal installeren'],
  'Loodgieter':        ['Lekkage repareren', 'Toilet installeren', 'Douche installeren', 'CV-ketel repareren', 'Afvoer ontstoppen'],
  'CV / Verwarming':   ['CV-ketel onderhoud', 'CV-ketel vervangen', 'Vloerverwarming aanleggen', 'Radiatoren plaatsen', 'Thermostaatinstallatie'],
  'Laadpaal':          ['Laadpaal voor thuis', 'Laadpaal zakelijk', 'Slimme laadpaal', 'Laadpaal keuring'],
  'Airco':             ['Airco installeren (split)', 'Airco onderhoud', 'Airco vervangen', 'Airco keuring'],
  'Schilder':          ['Binnenschilderwerk', 'Buitenschilderwerk', 'Kozijnen schilderen', 'Behangen'],
  'Stukadoor':         ['Wanden stucen', 'Plafond stucen', 'Sierpleisters', 'Schuren en voorbehandelen'],
  'Timmerman':         ['Deur hangen', 'Vloer leggen', 'Keuken plaatsen', 'Zolder inrichten', 'Schutting plaatsen'],
  'Hovenier':          ['Tuin aanleggen', 'Grasveld aanleggen', 'Hagen snoeien', 'Bestrating leggen', 'Vijver aanleggen'],
  'Dakdekker':         ['Dak inspecteren', 'Dakpannen vervangen', 'Dakgoot repareren', 'Plat dak herstellen'],
  'Klusjesman':        ['Meubels monteren', 'Kleine reparaties', 'Wandmontage TV', 'Diverse klusjes'],
  'Witgoed monteur':   ['Wasmachine aansluiten', 'Vaatwasser aansluiten', 'Droger aansluiten', 'Apparaat repareren']
};

function initKlusForm() {
  if (!qs('#klus-form')) return;
  renderFormStep(1);

  qs('#form-prev')?.addEventListener('click', () => {
    if (currentStep > 1) renderFormStep(currentStep - 1);
  });
  qs('#form-next')?.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      if (currentStep < 7) renderFormStep(currentStep + 1);
    }
  });
  qs('#form-submit')?.addEventListener('click', submitKlus);
}

let currentStep = 1;
const totalSteps = 7;

function renderFormStep(step) {
  currentStep = step;
  qsa('.form-step').forEach(s => s.classList.remove('active'));
  qs(`.form-step[data-step="${step}"]`)?.classList.add('active');

  // Progress bar
  const pct = ((step - 1) / (totalSteps - 1)) * 100;
  const fill = qs('#progress-fill');
  if (fill) fill.style.width = pct + '%';

  // Progress labels
  qsa('.progress-labels span').forEach((s, i) => {
    s.classList.toggle('active', i + 1 === step);
  });

  // Buttons
  const prev = qs('#form-prev'), next = qs('#form-next'), submit = qs('#form-submit');
  if (prev) prev.style.display = step === 1 ? 'none' : 'inline-flex';
  if (next) next.style.display = step === 7 ? 'none' : 'inline-flex';
  if (submit) submit.style.display = step === 7 ? 'inline-flex' : 'none';

  // Stap-specifieke renders
  if (step === 1) renderVakgebiedStep();
  if (step === 2) renderKlusStep();
  if (step === 7) renderOverzicht();
}

function renderVakgebiedStep() {
  const grid = qs('#vakgebied-grid-form');
  if (!grid) return;
  const vaks = Object.keys(vakgebiedKlussen);
  const icons = {'Elektricien':'⚡','Loodgieter':'🔧','CV / Verwarming':'🔥','Laadpaal':'🔌','Airco':'❄️','Schilder':'🖌️','Stukadoor':'🏗️','Timmerman':'🪚','Hovenier':'🌿','Dakdekker':'🏠','Klusjesman':'🛠️','Witgoed monteur':'🧺'};
  grid.innerHTML = vaks.map(v => `
    <div class="vakgebied-card${formState.vakgebied===v?' selected':''}" onclick="selectVakgebied('${v}')">
      <div class="vakgebied-card__icon">${icons[v]||'🔧'}</div>
      <span>${v}</span>
    </div>
  `).join('');
}

function selectVakgebied(vak) {
  formState.vakgebied = vak;
  formState.klus = '';
  renderVakgebiedStep();
}

function renderKlusStep() {
  const container = qs('#klus-keuze');
  if (!container || !formState.vakgebied) return;
  const klussen = vakgebiedKlussen[formState.vakgebied] || [];
  const hdr = qs('#klus-stap-hdr');
  if (hdr) hdr.textContent = `Kies uw klus — ${formState.vakgebied}`;
  container.innerHTML = klussen.map(k => `
    <div class="vakgebied-card${formState.klus===k?' selected':''}" style="text-align:left;padding:14px 16px" onclick="selectKlus('${k}')">
      <span>${k}</span>
    </div>
  `).join('');
}

function selectKlus(klus) {
  formState.klus = klus;
  renderKlusStep();
}

function renderOverzicht() {
  const box = qs('#overzicht-box');
  if (!box) return;
  box.innerHTML = [
    ['Vakgebied', formState.vakgebied || '—'],
    ['Klus', formState.klus || '—'],
    ['Omschrijving', formState.beschrijving || '—'],
    ['Postcode', formState.postcode || '—'],
    ['Plaats', formState.plaats || '—'],
    ['Gewenste datum', formState.datum || '—'],
    ['Gewenste tijd', formState.tijd || '—'],
    ['Naam', formState.naam || '—'],
    ['Telefoonnummer', formState.telefoon || '—'],
    ['E-mailadres', formState.email || '—'],
  ].map(([k, v]) => `
    <div class="overzicht-item">
      <span>${k}</span>
      <span>${v}</span>
    </div>
  `).join('');
}

function validateStep(step) {
  if (step === 1) {
    if (!formState.vakgebied) { alert('Kies een vakgebied om door te gaan.'); return false; }
  }
  if (step === 2) {
    if (!formState.klus) { alert('Kies een klus om door te gaan.'); return false; }
  }
  if (step === 3) {
    const val = qs('#klus-beschrijving')?.value.trim();
    if (!val) { alert('Voer een omschrijving in.'); return false; }
    formState.beschrijving = val;
  }
  if (step === 5) {
    const pc = qs('#f-postcode')?.value.trim();
    const pl = qs('#f-plaats')?.value.trim();
    const dt = qs('#f-datum')?.value;
    if (!pc || !pl || !dt) { alert('Vul postcode, plaats en datum in.'); return false; }
    formState.postcode = pc;
    formState.plaats = pl;
    formState.datum = dt;
    formState.tijd = qs('#f-tijd')?.value || '';
  }
  if (step === 6) {
    const nm = qs('#f-naam')?.value.trim();
    const tel = qs('#f-telefoon')?.value.trim();
    const em = qs('#f-email')?.value.trim();
    if (!nm || !tel || !em) { alert('Vul naam, telefoonnummer en e-mailadres in.'); return false; }
    formState.naam = nm;
    formState.telefoon = tel;
    formState.email = em;
  }
  return true;
}

function submitKlus() {
  const klussen = lsGet('fixli_klussen', []);
  const nieuw = {
    id: uid(),
    ...formState,
    adres: '',
    status: 'open',
    accepted_by: null,
    created_at: new Date().toISOString()
  };
  klussen.push(nieuw);
  lsSet('fixli_klussen', klussen);

  // Verberg formulier, toon succes
  qs('#klus-form')?.classList.add('hidden');
  qs('#klus-success')?.classList.remove('hidden');
}

/* =====================================================
   AUTH MODAL
===================================================== */
function initAuth() {
  // Open modal
  qsa('[data-open-auth]').forEach(btn => {
    btn.addEventListener('click', () => {
      qs('#auth-modal')?.classList.add('open');
    });
  });
  // Sluit modal
  qs('#auth-modal-close')?.addEventListener('click', () => {
    qs('#auth-modal')?.classList.remove('open');
  });
  qs('#auth-modal')?.addEventListener('click', e => {
    if (e.target === qs('#auth-modal')) qs('#auth-modal').classList.remove('open');
  });
  // Tabs login / registreren
  qsa('.modal__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      qsa('.modal__tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      qsa('.modal__panel').forEach(p => p.classList.add('hidden'));
      qs(`#${target}`)?.classList.remove('hidden');
    });
  });

  // Inloggen
  qs('#btn-login')?.addEventListener('click', doLogin);
  // Registreren
  qs('#btn-register')?.addEventListener('click', doRegister);
}

function doLogin() {
  const email = qs('#login-email')?.value.trim();
  const pw    = qs('#login-pw')?.value;
  const users = lsGet('fixli_users', []);
  const user  = users.find(u => u.email === email && u.password === pw);
  if (!user) { showModalMsg('Onbekend e-mailadres of wachtwoord.', 'error'); return; }
  lsSet('fixli_current_user', user);
  qs('#auth-modal')?.classList.remove('open');
  updateAuthUI();
  if (user.type === 'klant') { navigateTo('klant-dashboard'); renderKlantDash(); }
}

function doRegister() {
  const naam  = qs('#reg-naam')?.value.trim();
  const email = qs('#reg-email')?.value.trim();
  const pw    = qs('#reg-pw')?.value;
  if (!naam || !email || !pw) { showModalMsg('Vul alle velden in.', 'error'); return; }
  const users = lsGet('fixli_users', []);
  if (users.find(u => u.email === email)) { showModalMsg('E-mailadres is al in gebruik.', 'error'); return; }
  const user = { id: uid(), naam, email, password: pw, type: 'klant' };
  users.push(user);
  lsSet('fixli_users', users);
  lsSet('fixli_current_user', user);
  qs('#auth-modal')?.classList.remove('open');
  updateAuthUI();
  navigateTo('klant-dashboard'); renderKlantDash();
}

function showModalMsg(msg, type) {
  const el = qs('#modal-msg');
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert--${type === 'error' ? 'danger' : 'success'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function updateAuthUI() {
  const user = lsGet('fixli_current_user');
  const loginBtns = qsa('[data-open-auth]');
  const logoutBtn = qs('#btn-logout');
  const userLabel = qs('#user-label');
  if (user) {
    loginBtns.forEach(b => b.classList.add('hidden'));
    logoutBtn?.classList.remove('hidden');
    if (userLabel) userLabel.textContent = user.naam;
  } else {
    loginBtns.forEach(b => b.classList.remove('hidden'));
    logoutBtn?.classList.add('hidden');
    if (userLabel) userLabel.textContent = '';
  }
}

function initLogout() {
  qs('#btn-logout')?.addEventListener('click', () => {
    lsSet('fixli_current_user', null);
    updateAuthUI();
    navigateTo('home');
  });
}

/* =====================================================
   KLANT DASHBOARD
===================================================== */
function renderKlantDash() {
  const user = lsGet('fixli_current_user');
  if (!user) { navigateTo('home'); return; }
  const klussen = lsGet('fixli_klussen', []).filter(k => k.email === user.email);
  const container = qs('#klant-klussen');
  if (!container) return;

  const statusLabel = { open: 'In behandeling', geaccepteerd: 'Geaccepteerd', afgerond: 'Afgerond', geannuleerd: 'Geannuleerd' };
  const badgeClass  = { open: 'badge--orange', geaccepteerd: 'badge--green', afgerond: 'badge--blue', geannuleerd: 'badge--gray' };

  if (!klussen.length) {
    container.innerHTML = `<div class="alert alert--info">U heeft nog geen aanvragen geplaatst. <a href="#" data-page="aanvragen" style="font-weight:600;color:inherit">Maak uw eerste aanvraag →</a></div>`;
    return;
  }

  container.innerHTML = klussen.map(k => `
    <div class="klus-card">
      <div class="klus-card__header">
        <h4>${k.klus} — ${k.vakgebied}</h4>
        <span class="badge ${badgeClass[k.status]||'badge--gray'}">${statusLabel[k.status]||k.status}</span>
      </div>
      <div class="klus-card__meta">
        <span class="klus-card__meta-item">📍 ${k.plaats}</span>
        <span class="klus-card__meta-item">📅 ${k.datum}</span>
        <span class="klus-card__meta-item">⏰ ${k.tijd||'Flexibel'}</span>
      </div>
      ${k.status === 'geaccepteerd' ? `
        <div class="alert alert--success" style="margin-bottom:0">
          ✅ Een vakman heeft uw klus geaccepteerd. U wordt zo snel mogelijk gecontacteerd.
        </div>
      ` : ''}
      ${k.status === 'open' ? `
        <div class="klus-card__actions">
          <button class="btn btn-sm btn-outline" onclick="annuleerKlus('${k.id}')">Annuleren</button>
        </div>
      ` : ''}
    </div>
  `).join('');

  // Reattach link listeners
  qsa('[data-page]', container).forEach(l => {
    l.addEventListener('click', e => { e.preventDefault(); navigateTo(l.dataset.page); });
  });
}

function annuleerKlus(id) {
  if (!confirm('Weet u zeker dat u deze aanvraag wilt annuleren?')) return;
  const klussen = lsGet('fixli_klussen', []);
  const k = klussen.find(k => k.id === id);
  if (k) { k.status = 'geannuleerd'; lsSet('fixli_klussen', klussen); }
  renderKlantDash();
}

/* =====================================================
   VAKMAN DASHBOARD
===================================================== */
let currentVakman = null;

function initVakmanDash() {
  // Demo login voor vakman
  qs('#vakman-demo-login')?.addEventListener('click', () => {
    const vakmannen = lsGet('fixli_vakmannen', []);
    currentVakman = vakmannen.find(v => v.status === 'goedgekeurd') || null;
    if (!currentVakman) { alert('Geen goedgekeurde vakman gevonden in demo data.'); return; }
    lsSet('fixli_current_vakman', currentVakman);
    qs('#vakman-login-screen')?.classList.add('hidden');
    qs('#vakman-dash-content')?.classList.remove('hidden');
    renderVakmanDash();
  });

  qs('#vakman-demo-pending')?.addEventListener('click', () => {
    const vakmannen = lsGet('fixli_vakmannen', []);
    currentVakman = vakmannen.find(v => v.status === 'wacht_op_goedkeuring') || null;
    if (!currentVakman) { alert('Geen wachtende vakman gevonden.'); return; }
    lsSet('fixli_current_vakman', currentVakman);
    qs('#vakman-login-screen')?.classList.add('hidden');
    qs('#vakman-dash-content')?.classList.remove('hidden');
    renderVakmanDash();
  });

  qs('#vakman-dash-logout')?.addEventListener('click', () => {
    currentVakman = null;
    lsSet('fixli_current_vakman', null);
    qs('#vakman-login-screen')?.classList.remove('hidden');
    qs('#vakman-dash-content')?.classList.add('hidden');
  });

  // Tabs
  qsa('.vakman-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      qsa('.vakman-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      qsa('.vakman-panel').forEach(p => p.classList.remove('active'));
      qs(`#vp-${tab.dataset.panel}`)?.classList.add('active');
    });
  });
}

function renderVakmanDash() {
  if (!currentVakman) return;
  const vm = currentVakman;
  const naam = qs('#vakman-naam');
  if (naam) naam.textContent = vm.bedrijfsnaam;

  const statusBanner = qs('#vakman-status-banner');
  if (statusBanner) {
    if (vm.status === 'wacht_op_goedkeuring') {
      statusBanner.innerHTML = `<div class="alert alert--warn">⏳ Uw account wacht op goedkeuring. U kunt nog geen klussen accepteren totdat uw gegevens zijn geverifieerd door Fixli.</div>`;
    } else if (vm.status === 'goedgekeurd') {
      statusBanner.innerHTML = `<div class="alert alert--success">✅ Uw account is goedgekeurd. U kunt klussen accepteren in uw regio.</div>`;
    }
  }

  renderBeschikbareKlussen();
  renderGeaccepteerdeKlussen();
}

function renderBeschikbareKlussen() {
  const container = qs('#beschikbare-klussen');
  if (!container || !currentVakman) return;
  const goedgekeurd = currentVakman.status === 'goedgekeurd';
  const klussen = lsGet('fixli_klussen', []).filter(k => k.status === 'open');

  if (!goedgekeurd) {
    container.innerHTML = `<div class="alert alert--warn">Uw account is nog niet goedgekeurd. Na goedkeuring kunt u hier beschikbare klussen zien en accepteren.</div>`;
    return;
  }
  if (!klussen.length) {
    container.innerHTML = `<div class="alert alert--info">Er zijn momenteel geen openstaande klussen in uw regio.</div>`;
    return;
  }

  container.innerHTML = klussen.map(k => `
    <div class="klus-card" id="klus-${k.id}">
      <div class="klus-card__header">
        <h4>${k.klus}</h4>
        <span class="badge badge--orange">Beschikbaar</span>
      </div>
      <div class="klus-card__meta">
        <span class="klus-card__meta-item">🔧 ${k.vakgebied}</span>
        <span class="klus-card__meta-item">📍 ${k.postcode} ${k.plaats}</span>
        <span class="klus-card__meta-item">📅 ${k.datum}</span>
        <span class="klus-card__meta-item">⏰ ${k.tijd||'Flexibel'}</span>
      </div>
      <p style="font-size:.875rem;color:var(--gray-600);margin-bottom:16px">${k.beschrijving.substring(0,100)}${k.beschrijving.length>100?'…':''}</p>
      <div class="alert alert--info" style="margin-bottom:16px;font-size:.82rem">
        🔒 Klantgegevens (naam, adres, telefoon) zijn zichtbaar na acceptatie.
      </div>
      <div class="klus-card__actions">
        <button class="btn btn-primary" onclick="accepteerKlus('${k.id}')">✓ Accepteer klus</button>
      </div>
    </div>
  `).join('');
}

function accepteerKlus(id) {
  if (!confirm('Weet u zeker dat u deze klus wilt accepteren? De volledige klantgegevens worden daarna getoond.')) return;
  const klussen = lsGet('fixli_klussen', []);
  const k = klussen.find(k => k.id === id);
  if (k) {
    k.status = 'geaccepteerd';
    k.accepted_by = currentVakman.id;
    lsSet('fixli_klussen', klussen);
  }
  renderBeschikbareKlussen();
  renderGeaccepteerdeKlussen();
}

function renderGeaccepteerdeKlussen() {
  const container = qs('#geaccepteerde-klussen');
  if (!container || !currentVakman) return;
  const klussen = lsGet('fixli_klussen', []).filter(k => k.status === 'geaccepteerd' && k.accepted_by === currentVakman.id);
  if (!klussen.length) {
    container.innerHTML = `<div class="alert alert--info">U heeft nog geen klussen geaccepteerd.</div>`;
    return;
  }
  container.innerHTML = klussen.map(k => `
    <div class="klus-card">
      <div class="klus-card__header">
        <h4>${k.klus} — ${k.vakgebied}</h4>
        <span class="badge badge--green">Geaccepteerd</span>
      </div>
      <div class="klus-card__meta">
        <span class="klus-card__meta-item">📍 ${k.adres||''} ${k.postcode} ${k.plaats}</span>
        <span class="klus-card__meta-item">📅 ${k.datum}</span>
      </div>
      <div class="card" style="background:var(--teal-light);border-color:var(--teal);margin-top:12px">
        <h4 style="color:var(--navy);margin-bottom:10px">📋 Klantgegevens</h4>
        <p style="font-size:.875rem"><strong>Naam:</strong> ${k.naam}</p>
        <p style="font-size:.875rem"><strong>Telefoon:</strong> ${k.telefoon}</p>
        <p style="font-size:.875rem"><strong>E-mail:</strong> ${k.email}</p>
        <p style="font-size:.875rem"><strong>Adres:</strong> ${k.adres||'Niet opgegeven'}, ${k.postcode} ${k.plaats}</p>
        <p style="font-size:.875rem;margin-top:8px"><strong>Omschrijving:</strong> ${k.beschrijving}</p>
      </div>
      <div class="klus-card__actions" style="margin-top:12px">
        <button class="btn btn-success btn-sm" onclick="markeerAfgerond('${k.id}')">✓ Markeer als afgerond</button>
      </div>
    </div>
  `).join('');
}

function markeerAfgerond(id) {
  const klussen = lsGet('fixli_klussen', []);
  const k = klussen.find(k => k.id === id);
  if (k) { k.status = 'afgerond'; lsSet('fixli_klussen', klussen); }
  renderGeaccepteerdeKlussen();
}

/* =====================================================
   VAKMAN AANMELDEN FORMULIER
===================================================== */
function initVakmanForm() {
  const form = qs('#vakman-aanmeld-form');
  if (!form) return;

  // Checkbox pills
  qsa('.checkbox-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('checked');
      const box = pill.querySelector('.box');
      if (box) box.textContent = pill.classList.contains('checked') ? '✓' : '';
    });
  });

  // Upload areas
  qsa('.upload-area').forEach(area => {
    area.addEventListener('click', () => area.querySelector('input[type=file]')?.click());
    const input = area.querySelector('input[type=file]');
    input?.addEventListener('change', () => {
      const p = area.querySelector('p');
      if (p && input.files[0]) p.textContent = `✓ ${input.files[0].name}`;
    });
  });

  qs('#vakman-submit')?.addEventListener('click', () => {
    const bedrijf = qs('#vm-bedrijf')?.value.trim();
    const email   = qs('#vm-email')?.value.trim();
    if (!bedrijf || !email) { alert('Vul minimaal bedrijfsnaam en e-mailadres in.'); return; }

    const vakmannen = lsGet('fixli_vakmannen', []);
    const nieuw = {
      id: uid(),
      bedrijfsnaam: bedrijf,
      naam: qs('#vm-naam')?.value.trim() || '',
      email,
      telefoon: qs('#vm-telefoon')?.value.trim() || '',
      kvk: qs('#vm-kvk')?.value.trim() || '',
      btw: qs('#vm-btw')?.value.trim() || '',
      vestiging: qs('#vm-vestiging')?.value.trim() || '',
      vakgebieden: qsa('.checkbox-pill.checked').map(p => p.textContent.replace('✓','').trim()),
      ervaring: qs('#vm-ervaring')?.value || '',
      tarief: qs('#vm-tarief')?.value || '',
      status: 'wacht_op_goedkeuring',
      aangemeld: new Date().toISOString()
    };
    vakmannen.push(nieuw);
    lsSet('fixli_vakmannen', vakmannen);

    qs('#vakman-aanmeld-form')?.classList.add('hidden');
    qs('#vakman-aanmeld-success')?.classList.remove('hidden');
  });
}

/* =====================================================
   ADMIN DASHBOARD
===================================================== */
let adminLoggedIn = false;

function initAdmin() {
  qs('#admin-login-btn')?.addEventListener('click', () => {
    const pw = qs('#admin-pw')?.value;
    if (pw === 'admin123') {
      adminLoggedIn = true;
      qs('#admin-login-screen')?.classList.add('hidden');
      qs('#admin-content')?.classList.remove('hidden');
      renderAdminDash();
    } else {
      alert('Onjuist wachtwoord. Demo-wachtwoord: admin123');
    }
  });

  qs('#admin-logout')?.addEventListener('click', () => {
    adminLoggedIn = false;
    qs('#admin-login-screen')?.classList.remove('hidden');
    qs('#admin-content')?.classList.add('hidden');
  });

  // Admin tabs
  qsa('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      qsa('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      qsa('.admin-panel').forEach(p => p.classList.remove('active'));
      qs(`#ap-${tab.dataset.panel}`)?.classList.add('active');
      if (tab.dataset.panel === 'klussen') renderAdminKlussen();
      if (tab.dataset.panel === 'vakmannen') renderAdminVakmannen();
      if (tab.dataset.panel === 'stats') renderAdminStats();
    });
  });
}

function renderAdminDash() {
  renderAdminStats();
  renderAdminKlussen();
  renderAdminVakmannen();
}

function renderAdminStats() {
  const klussen  = lsGet('fixli_klussen', []);
  const vakmannen = lsGet('fixli_vakmannen', []);
  const stats = {
    open:        klussen.filter(k => k.status === 'open').length,
    geaccepteerd: klussen.filter(k => k.status === 'geaccepteerd').length,
    actief:      vakmannen.filter(v => v.status === 'goedgekeurd').length,
    nieuw:       vakmannen.filter(v => v.status === 'wacht_op_goedkeuring').length
  };
  const container = qs('#admin-stats');
  if (!container) return;
  container.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--teal">📋</div><div><strong>${stats.open}</strong><span>Open aanvragen</span></div></div>
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--teal">✅</div><div><strong>${stats.geaccepteerd}</strong><span>Geaccepteerde klussen</span></div></div>
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--navy">👷</div><div><strong>${stats.actief}</strong><span>Actieve vakmannen</span></div></div>
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--navy">🆕</div><div><strong>${stats.nieuw}</strong><span>Nieuwe aanmeldingen</span></div></div>
    </div>
  `;
}

function renderAdminKlussen() {
  const container = qs('#admin-klussen-table');
  if (!container) return;
  const klussen = lsGet('fixli_klussen', []);
  const statusLabel = { open: 'Open', geaccepteerd: 'Geaccepteerd', afgerond: 'Afgerond', geannuleerd: 'Geannuleerd' };
  const badgeClass  = { open: 'badge--orange', geaccepteerd: 'badge--green', afgerond: 'badge--blue', geannuleerd: 'badge--gray' };
  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Klus</th><th>Vakgebied</th><th>Klant</th><th>Plaats</th><th>Datum</th><th>Status</th><th>Actie</th></tr>
        </thead>
        <tbody>
          ${klussen.map(k => `
            <tr>
              <td>${k.klus}</td>
              <td>${k.vakgebied}</td>
              <td>${k.naam}</td>
              <td>${k.plaats}</td>
              <td>${k.datum}</td>
              <td><span class="badge ${badgeClass[k.status]||'badge--gray'}">${statusLabel[k.status]||k.status}</span></td>
              <td>
                <select onchange="updateKlusStatus('${k.id}', this.value)" style="font-size:.8rem;padding:4px 8px;border-radius:6px;border:1px solid var(--gray-200)">
                  <option value="">Wijzig status</option>
                  <option value="open">Open</option>
                  <option value="geaccepteerd">Geaccepteerd</option>
                  <option value="afgerond">Afgerond</option>
                  <option value="geannuleerd">Geannuleerd</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function updateKlusStatus(id, status) {
  if (!status) return;
  const klussen = lsGet('fixli_klussen', []);
  const k = klussen.find(k => k.id === id);
  if (k) { k.status = status; lsSet('fixli_klussen', klussen); }
  renderAdminKlussen();
  renderAdminStats();
}

function renderAdminVakmannen() {
  const container = qs('#admin-vakmannen-table');
  if (!container) return;
  const vakmannen = lsGet('fixli_vakmannen', []);
  const statusLabel = { goedgekeurd: 'Goedgekeurd', wacht_op_goedkeuring: 'Wacht op goedkeuring', afgewezen: 'Afgewezen' };
  const badgeClass  = { goedgekeurd: 'badge--green', wacht_op_goedkeuring: 'badge--orange', afgewezen: 'badge--red' };
  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Bedrijf</th><th>Naam</th><th>E-mail</th><th>Vakgebied</th><th>Status</th><th>Actie</th></tr>
        </thead>
        <tbody>
          ${vakmannen.map(v => `
            <tr>
              <td>${v.bedrijfsnaam}</td>
              <td>${v.naam}</td>
              <td>${v.email}</td>
              <td>${(v.vakgebieden||[]).join(', ')||'—'}</td>
              <td><span class="badge ${badgeClass[v.status]||'badge--gray'}">${statusLabel[v.status]||v.status}</span></td>
              <td style="display:flex;gap:6px">
                <button class="btn btn-sm btn-success" onclick="updateVakmanStatus('${v.id}','goedgekeurd')">✓</button>
                <button class="btn btn-sm btn-danger" onclick="updateVakmanStatus('${v.id}','afgewezen')">✗</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function updateVakmanStatus(id, status) {
  const vakmannen = lsGet('fixli_vakmannen', []);
  const v = vakmannen.find(v => v.id === id);
  if (v) { v.status = status; lsSet('fixli_vakmannen', vakmannen); }
  renderAdminVakmannen();
  renderAdminStats();
}

/* =====================================================
   FAQ ACCORDEON
===================================================== */
function initFAQ() {
  qsa('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const isOpen = q.classList.contains('open');
      // Sluit alle
      qsa('.faq-question').forEach(x => { x.classList.remove('open'); x.nextElementSibling?.classList.remove('open'); });
      if (!isOpen) {
        q.classList.add('open');
        q.nextElementSibling?.classList.add('open');
      }
    });
  });
}

/* =====================================================
   CONTACT FORMULIER
===================================================== */
function initContact() {
  qs('#contact-submit')?.addEventListener('click', () => {
    const naam  = qs('#c-naam')?.value.trim();
    const email = qs('#c-email')?.value.trim();
    const bericht = qs('#c-bericht')?.value.trim();
    if (!naam || !email || !bericht) { alert('Vul naam, e-mail en bericht in.'); return; }
    qs('#contact-form-wrap')?.classList.add('hidden');
    qs('#contact-success')?.classList.remove('hidden');
  });
}

/* =====================================================
   TABS (generiek)
===================================================== */
function initTabs() {
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const target = btn.dataset.tab;
      qsa(`.tab-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      qsa(`.tab-panel[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
      qs(`.tab-panel[data-group="${group}"][data-tab="${target}"]`)?.classList.add('active');
    });
  });
}

/* =====================================================
   INITIALISATIE
===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initDemoData();
  initNav();
  initHeroSearch();
  initKlusForm();
  initAuth();
  initLogout();
  initVakmanDash();
  initVakmanForm();
  initAdmin();
  initFAQ();
  initContact();
  initTabs();
  updateAuthUI();
  navigateTo('home');
});
