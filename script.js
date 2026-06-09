/* ============================================================
   FIXLI — script.js  (MVP)
   ------------------------------------------------------------
   Tijdelijke "database": localStorage.
   Structuur is voorbereid op backend-koppeling. Zoek op
   "BACKEND:" voor alle plekken waar later een echte API,
   database, Stripe-betaling of e-mailservice moet komen.
   ============================================================ */

/* =====================================================
   UTILITIES
===================================================== */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const euro = n => '€' + Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

/* =====================================================
   CONFIG — vakgebieden, iconen, klussen + prijzen
===================================================== */
const VAKGEBIEDEN = ['Elektricien','Loodgieter','CV / Verwarming','Airco','Schilder','Stukadoor','Timmerman','Hovenier','Dakdekker','Witgoed monteur','Laadpaal installateur'];

const ICONS = {
  'Elektricien':'⚡','Loodgieter':'🔧','CV / Verwarming':'🔥','Airco':'❄️','Schilder':'🖌️',
  'Stukadoor':'🧱','Timmerman':'🪚','Hovenier':'🌿','Dakdekker':'🏠','Witgoed monteur':'🧺','Laadpaal installateur':'🔌'
};

/* Elke klus: naam, type ('vanaf' of 'op_aanvraag'), prijs = vanaf-prijs incl. btw, duur (uren indicatie) */
const KLUSSEN = {
  'Elektricien': [
    { naam:'Stopcontact plaatsen', type:'vanaf', prijs:95, duur:1 },
    { naam:'Groep bijplaatsen', type:'vanaf', prijs:175, duur:1.5 },
    { naam:'Groepenkast inspectie', type:'vanaf', prijs:89, duur:1 },
    { naam:'Laadpaal installatie intake/offerte', type:'vanaf', prijs:49, duur:0.5 },
    { naam:'Perilex aansluiting', type:'vanaf', prijs:189, duur:1.5 },
  ],
  'Loodgieter': [
    { naam:'Lekkage inspectie', type:'vanaf', prijs:99, duur:1 },
    { naam:'Kraan vervangen', type:'vanaf', prijs:115, duur:1 },
    { naam:'Afvoer ontstoppen', type:'vanaf', prijs:129, duur:1 },
    { naam:'Toilet reparatie', type:'vanaf', prijs:125, duur:1 },
  ],
  'CV / Verwarming': [
    { naam:'CV storing diagnose', type:'vanaf', prijs:119, duur:1 },
    { naam:'Radiator plaatsen', type:'vanaf', prijs:149, duur:1.5 },
    { naam:'Thermostaat vervangen', type:'vanaf', prijs:99, duur:1 },
  ],
  'Airco': [
    { naam:'Airco onderhoud', type:'vanaf', prijs:129, duur:1 },
    { naam:'Airco installatie intake', type:'vanaf', prijs:49, duur:0.5 },
  ],
  'Schilder': [
    { naam:'Kleine schilderklus intake', type:'vanaf', prijs:49, duur:0.5 },
    { naam:'Binnenschilderwerk', type:'op_aanvraag', prijs:0, duur:0 },
  ],
  'Stukadoor': [
    { naam:'Stucwerk intake', type:'vanaf', prijs:49, duur:0.5 },
    { naam:'Stucwerk per m² (indicatie)', type:'op_aanvraag', prijs:0, duur:0 },
  ],
  'Timmerman': [
    { naam:'Deur afhangen', type:'vanaf', prijs:125, duur:1 },
    { naam:'Kleine timmerklus', type:'vanaf', prijs:95, duur:1 },
  ],
  'Hovenier': [
    { naam:'Tuinonderhoud', type:'vanaf', prijs:95, duur:1.5 },
    { naam:'Snoeiwerk', type:'vanaf', prijs:99, duur:1.5 },
  ],
  'Dakdekker': [
    { naam:'Dakinspectie', type:'vanaf', prijs:99, duur:1 },
    { naam:'Dakgoot reparatie', type:'vanaf', prijs:125, duur:1.5 },
  ],
  'Witgoed monteur': [
    { naam:'Wasmachine aansluiten', type:'vanaf', prijs:79, duur:0.5 },
    { naam:'Vaatwasser aansluiten', type:'vanaf', prijs:89, duur:0.5 },
  ],
  'Laadpaal installateur': [
    { naam:'Laadpaal intake/offerte', type:'vanaf', prijs:49, duur:0.5 },
    { naam:'Laadpaal installatie', type:'op_aanvraag', prijs:0, duur:0 },
  ],
};

function findKlus(vakgebied, naam) {
  return (KLUSSEN[vakgebied] || []).find(k => k.naam === naam) || null;
}

/* Dynamische vragen afhankelijk van klus. Specifiek waar zinvol, anders generiek per vakgebied. */
const VRAGEN_SPECIFIEK = {
  'Stopcontact plaatsen': [
    { id:'aantal', label:'Hoeveel stopcontacten?', type:'select', options:['1','2','3','4 of meer'] },
    { id:'type', label:'Type', type:'select', options:['Inbouw','Opbouw','Buiten/spatwaterdicht'] },
  ],
  'Kraan vervangen': [
    { id:'ruimte', label:'Welke ruimte?', type:'select', options:['Keuken','Badkamer','Toilet','Anders'] },
    { id:'meegeleverd', label:'Heeft u de kraan al?', type:'select', options:['Ja, in huis','Nee, graag advies'] },
  ],
  'Radiator plaatsen': [
    { id:'aantal', label:'Aantal radiatoren', type:'select', options:['1','2','3 of meer'] },
    { id:'bestaand', label:'Is er al een aansluiting?', type:'select', options:['Ja','Nee','Weet ik niet'] },
  ],
  'Airco onderhoud': [
    { id:'units', label:'Aantal binnenunits', type:'select', options:['1','2','3 of meer'] },
    { id:'merk', label:'Merk (indien bekend)', type:'text' },
  ],
};
const VRAGEN_GENERIEK = [
  { id:'situatie', label:'Wat is de situatie kort omschreven?', type:'select', options:['Nieuw plaatsen','Vervangen','Repareren','Onderhoud','Advies/inspectie'] },
  { id:'woning', label:'Type woning', type:'select', options:['Appartement','Eengezinswoning','Bedrijfspand','Anders'] },
];
function getVragen(vakgebied, klus) {
  return VRAGEN_SPECIFIEK[klus] || VRAGEN_GENERIEK;
}

/* =====================================================
   STATUSSEN
===================================================== */
const KLUS_STATUS = {
  concept:           { label:'Concept', badge:'badge--gray' },
  wacht_controle:    { label:'Wacht op controle Fixli', badge:'badge--orange' },
  goedgekeurd:       { label:'Beschikbaar voor vakmannen', badge:'badge--teal' },
  geaccepteerd:      { label:'Geaccepteerd door vakman', badge:'badge--green' },
  ingepland:         { label:'Ingepland', badge:'badge--blue' },
  onderweg:          { label:'Onderweg', badge:'badge--blue' },
  uitgevoerd:        { label:'Uitgevoerd', badge:'badge--purple' },
  factuur_verzonden: { label:'Factuur verzonden', badge:'badge--purple' },
  afgerond:          { label:'Afgerond', badge:'badge--green' },
  geannuleerd:       { label:'Geannuleerd', badge:'badge--red' },
};
const KLANT_STATUS_FLOW = ['wacht_controle','goedgekeurd','geaccepteerd','uitgevoerd','afgerond'];

const VAKMAN_STATUS = {
  nieuw:               { label:'Nieuw', badge:'badge--gray' },
  wacht_controle:      { label:'Wacht op controle', badge:'badge--orange' },
  documenten_ontbreken:{ label:'Documenten ontbreken', badge:'badge--orange' },
  goedgekeurd:         { label:'Goedgekeurd', badge:'badge--green' },
  afgekeurd:           { label:'Afgekeurd', badge:'badge--red' },
  gepauzeerd:          { label:'Gepauzeerd', badge:'badge--gray' },
  geblokkeerd:         { label:'Geblokkeerd', badge:'badge--red' },
};

const KLACHT_STATUS = ['Nieuw','In behandeling','Wacht op reactie klant','Wacht op reactie vakman','Opgelost','Gesloten'];

/* =====================================================
   INSTELLINGEN (instelbaar via admin)
===================================================== */
const DEFAULT_SETTINGS = {
  btwPct: 0.21,
  serviceFeePct: 0.12,   // servicekosten Fixli als % van subtotaal excl. btw
  margePct: 0.30,        // Fixli-marge op klusprijs (vakman ontvangt 1 - margePct)
  spoedToeslag: 35,      // incl. btw
  weekendToeslag: 25,    // incl. btw
  antiOmzeilingMaanden: 24,
  boeteVakman: 2420,     // incl. btw
  boeteKlant: 149,       // incl. btw
  adminEmail: 'info@elektroklik.nl',
};
function getSettings() { return { ...DEFAULT_SETTINGS, ...lsGet('fixli_settings', {}) }; }

/* =====================================================
   PRIJSENGINE
   Berekent volledige prijsopbouw vanuit de vanaf-prijs (incl. btw).
   Geeft per rol de juiste velden terug.
===================================================== */
function computePrijs(klus, { spoed = false, datum = null } = {}) {
  const s = getSettings();
  if (!klus || klus.type === 'op_aanvraag') {
    return { opAanvraag: true };
  }
  const weekend = datum ? [0,6].includes(new Date(datum).getDay()) : false;
  const spoedInclBtw   = spoed ? s.spoedToeslag : 0;
  const weekendInclBtw = weekend ? s.weekendToeslag : 0;

  const totaalIncl   = klus.prijs + spoedInclBtw + weekendInclBtw;
  const subtotaalExcl = totaalIncl / (1 + s.btwPct);
  const btw          = totaalIncl - subtotaalExcl;
  const servicekostenExcl = subtotaalExcl * s.serviceFeePct;
  const klusprijsExcl     = subtotaalExcl - servicekostenExcl;
  const vergoedingVakmanExcl = klusprijsExcl * (1 - s.margePct);
  const fixliMarge   = subtotaalExcl - vergoedingVakmanExcl; // marge + servicekosten

  const r = x => Math.round(x * 100) / 100;
  return {
    opAanvraag: false,
    weekend, spoed,
    spoedExcl: r(spoedInclBtw / (1 + s.btwPct)),
    weekendExcl: r(weekendInclBtw / (1 + s.btwPct)),
    klusprijsExcl: r(klusprijsExcl),
    servicekostenExcl: r(servicekostenExcl),
    subtotaalExcl: r(subtotaalExcl),
    btw: r(btw),
    totaalIncl: r(totaalIncl),
    vergoedingVakmanExcl: r(vergoedingVakmanExcl),
    fixliMarge: r(fixliMarge),
  };
}

/* Klantweergave van prijsopbouw (ziet NOOIT marge/vergoeding) */
function renderPrijsKlant(p) {
  if (p.opAanvraag) return `<div class="prijs-line total"><span>Prijs</span><span>Op aanvraag</span></div><p style="font-size:.85rem;color:var(--gray-600);margin-top:8px">De vakman stelt op basis van uw gegevens en foto's een passende prijs of offerte voor.</p>`;
  let html = `<div class="prijs-line"><span>Klusprijs</span><span>${euro(p.klusprijsExcl)}</span></div>`;
  if (p.spoedExcl) html += `<div class="prijs-line"><span>Spoedtoeslag</span><span>${euro(p.spoedExcl)}</span></div>`;
  if (p.weekendExcl) html += `<div class="prijs-line"><span>Weekendtoeslag</span><span>${euro(p.weekendExcl)}</span></div>`;
  html += `<div class="prijs-line"><span>Servicekosten Fixli</span><span>${euro(p.servicekostenExcl)}</span></div>`;
  html += `<div class="prijs-line"><span>Subtotaal (excl. btw)</span><span>${euro(p.subtotaalExcl)}</span></div>`;
  html += `<div class="prijs-line"><span>Btw 21%</span><span>${euro(p.btw)}</span></div>`;
  html += `<div class="prijs-line total"><span>Totaal incl. btw</span><span>${euro(p.totaalIncl)}</span></div>`;
  return html;
}

/* =====================================================
   NOTIFICATIES & E-MAIL (gesimuleerd)
   BACKEND: koppel notify() later aan Resend/SendGrid/Mailgun.
===================================================== */
const EMAIL_TEMPLATES = {
  klant_account:        () => ({ subject:'Welkom bij Fixli', body:'Uw account is aangemaakt. U kunt nu uw aanvragen volgen.' }),
  klant_aanvraag:       () => ({ subject:'Aanvraag ontvangen', body:'Uw aanvraag is ontvangen. Fixli controleert uw aanvraag en zet deze daarna door naar passende vakmannen.' }),
  klant_goedgekeurd:    () => ({ subject:'Aanvraag goedgekeurd', body:'Uw aanvraag is goedgekeurd en staat nu open voor passende vakmannen.' }),
  klant_geaccepteerd:   d => ({ subject:'Vakman gevonden', body:`Goed nieuws! ${d.bedrijf||'Een vakman'} heeft uw klus geaccepteerd en neemt contact met u op.` }),
  klant_afgerond:       () => ({ subject:'Klus afgerond', body:'Uw klus is afgerond. U kunt nu een beoordeling achterlaten.' }),
  klant_factuur:        d => ({ subject:'Factuur beschikbaar', body:`Uw factuur ${d.nummer} staat klaar in uw dashboard.` }),
  vakman_account:       () => ({ subject:'Aanmelding ontvangen', body:'Uw aanmelding is ontvangen en wordt door Fixli gecontroleerd.' }),
  vakman_goedgekeurd:   () => ({ subject:'Account goedgekeurd', body:'Uw account is goedgekeurd. U kunt nu passende klussen accepteren.' }),
  vakman_afgewezen:     () => ({ subject:'Account afgewezen', body:'Uw aanmelding is helaas afgewezen. Neem contact op voor meer informatie.' }),
  vakman_nieuwe_klus:   d => ({ subject:'Nieuwe passende klus', body:`Er staat een nieuwe ${d.vakgebied}-klus open in uw werkgebied (${d.plaats}).` }),
  vakman_geaccepteerd:  () => ({ subject:'Klus geaccepteerd', body:'U heeft de klus geaccepteerd. De klantgegevens zijn nu zichtbaar in uw dashboard.' }),
  vakman_uitbetaling:   () => ({ subject:'Uitbetaling gepland', body:'Uw uitbetaling voor de afgeronde klus is ingepland.' }),
  admin_aanvraag:       d => ({ subject:'Nieuwe aanvraag', body:`Nieuwe aanvraag: ${d.klus} (${d.plaats}). Wacht op controle.` }),
  admin_vakman:         d => ({ subject:'Nieuwe vakman-aanmelding', body:`${d.bedrijf} heeft zich aangemeld en wacht op controle.` }),
  admin_betaling:       d => ({ subject:'Betaling ontvangen', body:`Betaling ontvangen voor aanvraag ${d.klus}.` }),
  admin_klacht:         () => ({ subject:'Klacht ingediend', body:'Er is een nieuwe klacht ingediend.' }),
  admin_annulering:     d => ({ subject:'Klus geannuleerd', body:`Aanvraag "${d.klus}" is geannuleerd.` }),
};

function notify(to, type, data = {}) {
  const tpl = EMAIL_TEMPLATES[type] ? EMAIL_TEMPLATES[type](data) : { subject:type, body:'' };
  const notifs = lsGet('fixli_notificaties', []);
  const settings = getSettings();
  const toEmail = to === 'admin' ? settings.adminEmail : (data.email || '');
  notifs.push({ id: uid(), to, toEmail, vakmanId: data.vakmanId || null, type, subject: tpl.subject, body: tpl.body, created_at: new Date().toISOString(), read: false });
  lsSet('fixli_notificaties', notifs);
  // BACKEND: hier echte e-mail versturen via API.
  toast(tpl.subject, `${to === 'admin' ? '→ ' + settings.adminEmail : 'E-mail naar ' + (to==='klant'?'klant':'vakman')}: ${tpl.body}`, 'email');
}

function toast(title, body = '', kind = '') {
  const c = qs('#toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.innerHTML = `<div>📧</div><div><strong>${esc(title)}</strong>${body ? `<span>${esc(body)}</span>` : ''}</div>`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; setTimeout(() => el.remove(), 300); }, 5200);
}

/* Auditlog voor adminacties */
function audit(actie, details = '') {
  const log = lsGet('fixli_auditlog', []);
  log.unshift({ id: uid(), actie, details, door: 'admin', created_at: new Date().toISOString() });
  lsSet('fixli_auditlog', log.slice(0, 200));
}

/* =====================================================
   NAVIGATIE
===================================================== */
function initNav() {
  document.body.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (link) {
      e.preventDefault();
      navigateTo(link.dataset.page);
      qs('.navbar__mobile-menu')?.classList.remove('open');
    }
  });
  qs('.navbar__hamburger')?.addEventListener('click', () => qs('.navbar__mobile-menu')?.classList.toggle('open'));
}

function navigateTo(page) {
  qsa('.page').forEach(p => p.classList.remove('active'));
  const target = qs(`#page-${page}`);
  if (target) { target.classList.add('active'); window.scrollTo(0, 0); }
  qsa('.navbar__nav [data-page]').forEach(l => l.classList.toggle('active', l.dataset.page === page));

  // Pagina-specifieke render-hooks
  if (page === 'klant-dashboard') renderKlantDash();
  if (page === 'vakman-dashboard') openVakmanDash();
  if (page === 'admin') openAdmin();
  if (page === 'prijzen') renderPrijsgids();
}

/* =====================================================
   DEMO DATA (eenmalig vullen)
   BACKEND: vervang door echte database + seed.
===================================================== */
function initDemoData() {
  if (lsGet('fixli_init')) return;

  const klant = { id:'user_1', naam:'Jan de Vries', email:'jan@email.nl', telefoon:'06-12345678', password:'demo123', type:'klant' };

  const mkKlus = (over) => {
    const klus = findKlus(over.vakgebied, over.klusNaam);
    const prijs = computePrijs(klus, { spoed: over.spoed, datum: over.datum });
    return {
      id: uid(), status: over.status, vakgebied: over.vakgebied, klus: over.klusNaam,
      antwoorden: over.antwoorden || {}, beschrijving: over.beschrijving || '',
      postcode: over.postcode, plaats: over.plaats, straat: over.straat || '', huisnr: over.huisnr || '',
      datum: over.datum, tijd: over.tijd || '', spoed: !!over.spoed, fotoToestemming: true,
      naam: klant.naam, telefoon: klant.telefoon, email: klant.email,
      prijs, betaalstatus: 'betaald', accepted_by: over.accepted_by || null,
      review: null, created_at: new Date().toISOString(),
    };
  };

  const klussen = [
    mkKlus({ status:'goedgekeurd', vakgebied:'Loodgieter', klusNaam:'Kraan vervangen', postcode:'3812 AB', plaats:'Amersfoort', straat:'Langegracht', huisnr:'5', datum:'2026-07-08', tijd:'13:00', antwoorden:{ruimte:'Keuken',meegeleverd:'Nee, graag advies'}, beschrijving:'Keukenkraan lekt al twee weken.' }),
    mkKlus({ status:'wacht_controle', vakgebied:'Elektricien', klusNaam:'Stopcontact plaatsen', postcode:'3811 KL', plaats:'Amersfoort', straat:'Keizersgracht', huisnr:'12', datum:'2026-07-10', tijd:'09:00', antwoorden:{aantal:'3',type:'Inbouw'}, beschrijving:'Drie extra stopcontacten in woonkamer.' }),
    mkKlus({ status:'geaccepteerd', vakgebied:'Loodgieter', klusNaam:'Afvoer ontstoppen', postcode:'3821 GH', plaats:'Amersfoort', straat:'Soesterweg', huisnr:'88', datum:'2026-07-05', tijd:'10:00', accepted_by:'vakman_1', spoed:true, beschrijving:'Doucheafvoer verstopt.' }),
  ];

  const vakmannen = [
    { id:'vakman_1', bedrijfsnaam:'Loodgietersbedrijf Hendrix', naam:'Rob Hendrix', email:'rob@hendrix-loodgieter.nl', telefoon:'06-55667788', password:'demo123', kvk:'12345678', btw:'NL123456789B01', iban:'NL12 RABO 0123 4567 89', adres:'Werkstraat 1', vestiging:'Amersfoort', werkgebied:['38','35','34'], vakgebieden:['Loodgieter'], ervaring:15, tarief:'65', beschikbaarheid:'ma-vr 08:00-17:00', status:'goedgekeurd', aangemeld:new Date().toISOString() },
    { id:'vakman_2', bedrijfsnaam:'Electra Pro BV', naam:'Sven Willems', email:'sven@electrapro.nl', telefoon:'06-44556677', password:'demo123', kvk:'87654321', btw:'NL987654321B01', iban:'NL98 INGB 0009 8765 43', adres:'Voltweg 9', vestiging:'Utrecht', werkgebied:['30','35'], vakgebieden:['Elektricien'], ervaring:8, tarief:'70', beschikbaarheid:'ma-za 07:00-18:00', status:'wacht_controle', aangemeld:new Date().toISOString() },
  ];

  lsSet('fixli_klussen', klussen);
  lsSet('fixli_vakmannen', vakmannen);
  lsSet('fixli_users', [klant]);
  lsSet('fixli_facturen', []);
  lsSet('fixli_klachten', []);
  lsSet('fixli_notificaties', []);
  lsSet('fixli_auditlog', []);
  lsSet('fixli_factuur_teller', 1);
  lsSet('fixli_settings', DEFAULT_SETTINGS);
  lsSet('fixli_init', true);
}

/* =====================================================
   HOME — vakgebieden, faq-preview, hero zoek
===================================================== */
function renderHome() {
  // Hero select
  const sel = qs('#hero-vakgebied');
  if (sel && sel.options.length <= 1) {
    VAKGEBIEDEN.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
  }
  // Vakgebieden grid (home)
  const grid = qs('#home-vakgebieden-grid');
  if (grid) grid.innerHTML = VAKGEBIEDEN.map(v => `
    <div class="vakgebied-card" data-vak="${esc(v)}">
      <div class="vakgebied-card__icon">${ICONS[v]||'🔧'}</div><span>${esc(v)}</span>
    </div>`).join('');
  // FAQ preview
  const fq = qs('#home-faq');
  if (fq) fq.innerHTML = renderFaqItems(FAQ_KLANT.slice(0, 3));
}

function initHeroSearch() {
  qs('#hero-search-btn')?.addEventListener('click', () => {
    const sel = qs('#hero-vakgebied');
    if (sel?.value) { formState.vakgebied = sel.value; navigateTo('aanvragen'); renderFormStep(1); }
    else sel?.focus();
  });
  // Vakgebied-kaarten (home + waar dan ook)
  document.body.addEventListener('click', e => {
    const card = e.target.closest('.vakgebied-card[data-vak]');
    if (card && card.closest('#home-vakgebieden-grid')) {
      formState.vakgebied = card.dataset.vak;
      navigateTo('aanvragen'); renderFormStep(1);
    }
  });
}

/* =====================================================
   PRIJSGIDS
===================================================== */
function renderPrijsgids() {
  const c = qs('#prijsgids');
  if (!c) return;
  c.innerHTML = VAKGEBIEDEN.map(v => `
    <div class="prijsgids-card">
      <h3>${ICONS[v]||'🔧'} ${esc(v)}</h3>
      ${KLUSSEN[v].map(k => `
        <div class="prijsgids-row">
          <span>${esc(k.naam)}</span>
          <span>${k.type === 'op_aanvraag' ? 'Op aanvraag' : 'vanaf ' + euro(k.prijs)}</span>
        </div>`).join('')}
    </div>`).join('');
}

/* =====================================================
   AANVRAAGFLOW — 12 stappen
===================================================== */
const formState = {
  vakgebied:'', klus:'', antwoorden:{}, beschrijving:'', fotoToestemming:true, fotos:[],
  postcode:'', huisnr:'', straat:'', plaats:'', datum:'', tijd:'', spoed:null,
  naam:'', telefoon:'', email:'', akkoordVw:false, akkoordBetaling:false, betaalmethode:'ideal',
};
let currentStep = 1;
const TOTAL_STEPS = 12;
const STEP_TITLES = ['Kies vakgebied','Kies klus','Vragen','Foto\'s','Adres','Datum & tijd','Spoed','Contact','Prijs','Voorwaarden','Betalen','Overzicht'];

function initKlusForm() {
  if (!qs('#klus-form')) return;
  renderFormStep(1);
  qs('#form-prev')?.addEventListener('click', () => { if (currentStep > 1) renderFormStep(currentStep - 1); });
  qs('#form-next')?.addEventListener('click', () => { if (validateStep(currentStep)) renderFormStep(Math.min(currentStep + 1, TOTAL_STEPS)); });
  qs('#form-submit')?.addEventListener('click', submitKlus);

  // Spoedkeuze
  qsa('#spoed-keuze .choice-card').forEach(c => c.addEventListener('click', () => {
    qsa('#spoed-keuze .choice-card').forEach(x => x.classList.remove('selected'));
    c.classList.add('selected');
    formState.spoed = c.dataset.spoed === 'ja';
  }));
  // Betaalmethode
  qsa('.betaal-method').forEach(m => m.addEventListener('click', () => {
    qsa('.betaal-method').forEach(x => x.classList.remove('selected'));
    m.classList.add('selected'); formState.betaalmethode = m.dataset.method;
  }));
  // Upload (demo)
  const up = qs('#klus-upload');
  up?.addEventListener('click', () => up.querySelector('input')?.click());
  up?.querySelector('input')?.addEventListener('change', e => {
    formState.fotos = [...e.target.files].map(f => f.name);
    up.querySelector('p').textContent = formState.fotos.length ? `✓ ${formState.fotos.length} foto('s) toegevoegd` : 'Klik om foto\'s toe te voegen.';
  });
  // Spoedbedrag tonen
  const sb = qs('#spoed-bedrag');
  if (sb) sb.textContent = '+ ' + euro(getSettings().spoedToeslag) + ' incl. btw';
}

function renderFormStep(step) {
  currentStep = step;
  qsa('.form-step').forEach(s => s.classList.remove('active'));
  qs(`.form-step[data-step="${step}"]`)?.classList.add('active');
  qs('#step-current').textContent = step;
  qs('#step-total').textContent = TOTAL_STEPS;
  qs('#step-title').textContent = STEP_TITLES[step - 1];
  qs('#progress-fill').style.width = ((step - 1) / (TOTAL_STEPS - 1)) * 100 + '%';

  const prev = qs('#form-prev'), next = qs('#form-next'), submit = qs('#form-submit');
  prev.style.display = step === 1 ? 'none' : 'inline-flex';
  next.style.display = step === TOTAL_STEPS ? 'none' : 'inline-flex';
  submit.style.display = step === TOTAL_STEPS ? 'inline-flex' : 'none';

  if (step === 1) renderVakgebiedStep();
  if (step === 2) renderKlusStep();
  if (step === 3) renderVragenStep();
  if (step === 7) syncSpoed();
  if (step === 9) qs('#prijs-overzicht').innerHTML = renderPrijsKlant(huidigePrijs());
  if (step === 11) { qs('#betaal-overzicht').innerHTML = renderPrijsKlant(huidigePrijs()); }
  if (step === 12) renderOverzicht();
  window.scrollTo(0, 0);
}

function huidigePrijs() {
  return computePrijs(findKlus(formState.vakgebied, formState.klus), { spoed: !!formState.spoed, datum: formState.datum });
}

function renderVakgebiedStep() {
  const grid = qs('#vakgebied-grid-form');
  grid.innerHTML = VAKGEBIEDEN.map(v => `
    <div class="vakgebied-card${formState.vakgebied === v ? ' selected' : ''}" data-pickvak="${esc(v)}">
      <div class="vakgebied-card__icon">${ICONS[v]||'🔧'}</div><span>${esc(v)}</span>
    </div>`).join('');
  qsa('[data-pickvak]', grid).forEach(c => c.addEventListener('click', () => {
    formState.vakgebied = c.dataset.pickvak; formState.klus = ''; formState.antwoorden = {};
    renderVakgebiedStep();
  }));
}

function renderKlusStep() {
  const c = qs('#klus-keuze');
  if (!formState.vakgebied) { c.innerHTML = '<div class="empty">Kies eerst een vakgebied.</div>'; return; }
  qs('#klus-stap-hdr').textContent = `Kies uw klus — ${formState.vakgebied}`;
  c.innerHTML = (KLUSSEN[formState.vakgebied] || []).map(k => `
    <div class="klus-row${formState.klus === k.naam ? ' selected' : ''}" data-pickklus="${esc(k.naam)}">
      <span class="klus-row__name">${esc(k.naam)}</span>
      <span class="klus-row__price">${k.type === 'op_aanvraag' ? 'Op aanvraag' : 'vanaf ' + euro(k.prijs)}</span>
    </div>`).join('');
  qsa('[data-pickklus]', c).forEach(r => r.addEventListener('click', () => {
    formState.klus = r.dataset.pickklus; renderKlusStep();
  }));
}

function renderVragenStep() {
  const c = qs('#dynamische-vragen');
  const vragen = getVragen(formState.vakgebied, formState.klus);
  c.innerHTML = vragen.map(v => {
    const val = formState.antwoorden[v.id] || '';
    if (v.type === 'select') {
      return `<div class="form-group"><label>${esc(v.label)}</label><select data-q="${v.id}"><option value="">Maak een keuze</option>${v.options.map(o => `<option ${val===o?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
    }
    return `<div class="form-group"><label>${esc(v.label)}</label><input data-q="${v.id}" value="${esc(val)}" type="${v.type==='number'?'number':'text'}"></div>`;
  }).join('');
  qsa('[data-q]', c).forEach(el => el.addEventListener('input', () => { formState.antwoorden[el.dataset.q] = el.value; }));
}

function syncSpoed() {
  qsa('#spoed-keuze .choice-card').forEach(c => c.classList.toggle('selected', (c.dataset.spoed === 'ja') === (formState.spoed === true)));
}

function renderOverzicht() {
  const p = huidigePrijs();
  const rows = [
    ['Vakgebied', formState.vakgebied],
    ['Klus', formState.klus],
    ['Toelichting', formState.beschrijving || '—'],
    ['Adres', `${formState.straat} ${formState.huisnr}, ${formState.postcode} ${formState.plaats}`],
    ['Datum / tijd', `${formState.datum || '—'} ${formState.tijd || ''}`],
    ['Spoed', formState.spoed ? 'Ja' : 'Nee'],
    ['Naam', formState.naam],
    ['Telefoon', formState.telefoon],
    ['E-mail', formState.email],
    ['Totaal incl. btw', p.opAanvraag ? 'Op aanvraag' : euro(p.totaalIncl)],
  ];
  qs('#overzicht-box').innerHTML = rows.map(([k, v]) => `<div class="overzicht-item"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('');
}

function validateStep(step) {
  const a = (m) => { toast('Even checken', m); return false; };
  if (step === 1 && !formState.vakgebied) return a('Kies een vakgebied.');
  if (step === 2 && !formState.klus) return a('Kies een klus.');
  if (step === 3) {
    formState.beschrijving = qs('#klus-beschrijving')?.value.trim() || '';
    const vragen = getVragen(formState.vakgebied, formState.klus);
    for (const v of vragen) if (v.type === 'select' && !formState.antwoorden[v.id]) return a(`Beantwoord: ${v.label}`);
  }
  if (step === 4) formState.fotoToestemming = qs('#foto-toestemming')?.checked;
  if (step === 5) {
    formState.postcode = qs('#f-postcode')?.value.trim();
    formState.huisnr = qs('#f-huisnr')?.value.trim();
    formState.straat = qs('#f-straat')?.value.trim();
    formState.plaats = qs('#f-plaats')?.value.trim();
    if (!formState.postcode || !formState.plaats) return a('Vul minimaal postcode en plaats in.');
  }
  if (step === 6) {
    formState.datum = qs('#f-datum')?.value; formState.tijd = qs('#f-tijd')?.value;
    if (!formState.datum) return a('Kies een gewenste datum.');
  }
  if (step === 7 && formState.spoed === null) return a('Geef aan of het spoed is.');
  if (step === 8) {
    formState.naam = qs('#f-naam')?.value.trim();
    formState.telefoon = qs('#f-telefoon')?.value.trim();
    formState.email = qs('#f-email')?.value.trim();
    if (!formState.naam || !formState.telefoon || !formState.email) return a('Vul naam, telefoon en e-mail in.');
  }
  if (step === 10) {
    formState.akkoordVw = qs('#akkoord-vw')?.checked;
    formState.akkoordBetaling = qs('#akkoord-betaling')?.checked;
    if (!formState.akkoordVw || !formState.akkoordBetaling) return a('Accepteer beide voorwaarden om door te gaan.');
  }
  return true;
}

function submitKlus() {
  const p = huidigePrijs();
  // BACKEND: hier Stripe-betaling afronden vóór opslaan. Nu: gesimuleerd "betaald".
  const klussen = lsGet('fixli_klussen', []);
  const nieuw = {
    id: uid(), status: 'wacht_controle',
    vakgebied: formState.vakgebied, klus: formState.klus, antwoorden: formState.antwoorden,
    beschrijving: formState.beschrijving, postcode: formState.postcode, plaats: formState.plaats,
    straat: formState.straat, huisnr: formState.huisnr, datum: formState.datum, tijd: formState.tijd,
    spoed: !!formState.spoed, fotoToestemming: formState.fotoToestemming, fotos: formState.fotos,
    naam: formState.naam, telefoon: formState.telefoon, email: formState.email,
    prijs: p, betaalstatus: p.opAanvraag ? 'nvt' : 'betaald',
    accepted_by: null, review: null, created_at: new Date().toISOString(),
  };
  klussen.push(nieuw);
  lsSet('fixli_klussen', klussen);

  // Notificaties
  notify('klant', 'klant_aanvraag', { email: formState.email });
  notify('admin', 'admin_aanvraag', { klus: formState.klus, plaats: formState.plaats });
  if (!p.opAanvraag) notify('admin', 'admin_betaling', { klus: formState.klus });

  // Account-prompt indien niet ingelogd
  const user = lsGet('fixli_current_user');
  const promptEl = qs('#success-account-prompt');
  if (promptEl) {
    promptEl.innerHTML = user ? '' :
      `<div class="alert alert--info" style="text-align:left">Maak een account aan met <strong>${esc(formState.email)}</strong> om uw aanvraag te volgen. <a href="#" data-open-auth="register" style="font-weight:600">Account maken →</a></div>`;
  }
  qs('#klus-form')?.classList.add('hidden');
  qs('#klus-success')?.classList.remove('hidden');

  // Reset form voor volgende keer
  Object.assign(formState, { klus:'', antwoorden:{}, beschrijving:'', spoed:null, akkoordVw:false, akkoordBetaling:false });
}

/* =====================================================
   DEEL 3 — FAQ-CONTENT, AUTH, SESSIES, DASHBOARDS,
   ADMIN, FACTUREN, CONTACT, JURIDISCHE TEKSTEN, INIT
===================================================== */

/* =====================================================
   FAQ-CONTENT
===================================================== */
const FAQ_KLANT = [
  { v: 'Hoe werkt het aanvragen van een klus?', a: 'U kiest een vakgebied en klus, beantwoordt een paar vragen en ziet direct de vanaf-prijs inclusief btw. U betaalt via Fixli en plaatst de aanvraag. Fixli controleert de aanvraag en zet deze door naar passende, gescreende vakmannen.' },
  { v: 'Kan ik zelf een vakman uitkiezen?', a: 'Nee. Fixli toont geen profielen van vakmannen. Uw goedgekeurde aanvraag wordt aangeboden aan vakmannen die qua vakgebied én werkgebied passen. De eerste die accepteert, voert de klus uit.' },
  { v: 'Is de getoonde prijs de eindprijs?', a: 'De getoonde prijs is een vanaf-prijs voor de standaardklus, inclusief btw en servicekosten. Is er extra werk of materiaal nodig, dan stemt de vakman dat altijd vooraf met u af voordat het wordt uitgevoerd.' },
  { v: 'Wanneer ziet de vakman mijn gegevens?', a: 'Uw volledige adres en contactgegevens worden pas gedeeld nadat een vakman de klus heeft geaccepteerd. Daarvoor ziet de vakman alleen het type klus, de regio en de globale informatie.' },
  { v: 'Hoe betaal ik?', a: 'U betaalt veilig via het platform (in de live-versie via iDEAL of creditcard). Betalen buiten Fixli om is niet toegestaan en valt buiten elke bescherming en garantie.' },
  { v: 'Kan ik mijn aanvraag annuleren?', a: 'Zolang nog geen vakman heeft geaccepteerd, kunt u kosteloos annuleren via uw dashboard. Na acceptatie kunnen annuleringskosten gelden, omdat de vakman dan al tijd heeft gereserveerd.' },
  { v: 'Wat als ik niet tevreden ben?', a: 'U kunt na afronding een beoordeling achterlaten en bij problemen een klacht indienen via uw dashboard of de contactpagina. Fixli bemiddelt tussen u en de vakman.' },
];
const FAQ_VAKMAN = [
  { v: 'Hoe meld ik me aan als vakman?', a: 'Vul het aanmeldformulier in met uw bedrijfsgegevens, KvK, btw-nummer, IBAN, vakgebieden en werkgebied. Na controle van uw gegevens door Fixli krijgt u toegang tot passende klussen.' },
  { v: 'Welke klussen zie ik?', a: 'U ziet uitsluitend goedgekeurde klussen die passen bij uw vakgebied én binnen uw opgegeven werkgebied vallen. Zo krijgt u geen irrelevante aanvragen.' },
  { v: 'Hoe krijg ik een klus toegewezen?', a: 'Er is geen biedoorlog. De eerste gescreende vakman die een passende klus accepteert, krijgt de opdracht. Daarna verdwijnt de klus bij de andere vakmannen.' },
  { v: 'Wanneer zie ik de klantgegevens?', a: 'Pas nadat u de klus accepteert. Daarvóór ziet u alleen het type klus, de regio en uw vergoeding, zodat u een weloverwogen keuze kunt maken.' },
  { v: 'Hoe en wanneer word ik uitbetaald?', a: 'Fixli int de betaling van de klant en betaalt uw vergoeding (klusprijs minus de Fixli-marge) uit nadat de klus is afgerond. Uw uitbetaling ziet u terug in uw dashboard.' },
  { v: 'Wat is het anti-omzeilingsbeding?', a: 'Klanten die via Fixli zijn aangebracht, mogen niet buiten het platform om worden gefactureerd. Dit beschermt het platform en geldt gedurende de in de vakmanvoorwaarden genoemde periode. Overtreding kan leiden tot een boete.' },
];

function renderFaqItems(arr) {
  return arr.map(item => `
    <div class="faq-item">
      <button class="faq-question">${esc(item.v)}<span class="arrow">▾</span></button>
      <div class="faq-answer">${esc(item.a)}</div>
    </div>`).join('');
}

function renderFaqPages() {
  const k = qs('#faq-klant'), v = qs('#faq-vakman');
  if (k) k.innerHTML = renderFaqItems(FAQ_KLANT);
  if (v) v.innerHTML = renderFaqItems(FAQ_VAKMAN);
}

/* FAQ-accordion (delegatie, werkt ook voor home-preview) */
function initFaqAccordion() {
  document.body.addEventListener('click', e => {
    const q = e.target.closest('.faq-question');
    if (!q) return;
    const ans = q.nextElementSibling;
    const open = q.classList.contains('open');
    q.classList.toggle('open', !open);
    ans?.classList.toggle('open', !open);
  });
}

/* =====================================================
   SESSIE-HELPERS
===================================================== */
function currentUser()   { return lsGet('fixli_current_user'); }
function currentVakman() { return lsGet('fixli_current_vakman'); }

function updateUserLabel() {
  const u = currentUser(), v = currentVakman();
  const label = qs('#user-label'), logout = qs('#btn-logout');
  if (u) {
    if (label) label.textContent = 'Hallo, ' + u.naam.split(' ')[0];
    logout?.classList.remove('hidden');
  } else if (v) {
    if (label) label.textContent = v.bedrijfsnaam;
    logout?.classList.remove('hidden');
  } else {
    if (label) label.textContent = '';
    logout?.classList.add('hidden');
  }
}

/* =====================================================
   AUTHENTICATIE (modal)
   BACKEND: vervang door echte auth (JWT/sessions) + wachtwoord-hashing.
===================================================== */
let authContext = 'klant'; // 'klant' | 'vakman'

function initAuth() {
  // Openen via knoppen met data-open-auth
  document.body.addEventListener('click', e => {
    const t = e.target.closest('[data-open-auth]');
    if (t) { e.preventDefault(); openAuth(t.dataset.openAuth); }
  });
  qs('#auth-modal-close')?.addEventListener('click', closeAuth);
  qs('#auth-modal')?.addEventListener('click', e => { if (e.target.id === 'auth-modal') closeAuth(); });

  // Modal-tabs (inloggen / registreren)
  qsa('#auth-tabs .modal__tab').forEach(tab => tab.addEventListener('click', () => {
    qsa('#auth-tabs .modal__tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    qs('#login-panel')?.classList.toggle('hidden', target !== 'login-panel');
    qs('#register-panel')?.classList.toggle('hidden', target !== 'register-panel');
    hideModalMsg();
  }));

  qs('#btn-login')?.addEventListener('click', () => authContext === 'vakman' ? loginVakman() : loginKlant());
  qs('#btn-register')?.addEventListener('click', registerKlant);
  qs('#btn-logout')?.addEventListener('click', logout);
}

function openAuth(mode) {
  const modal = qs('#auth-modal');
  if (!modal) return;
  const title = qs('#auth-modal-title'), sub = qs('#auth-modal-sub'), tabs = qs('#auth-tabs');
  hideModalMsg();

  if (mode === 'vakman-login') {
    authContext = 'vakman';
    title.textContent = 'Vakman inloggen';
    sub.textContent = 'Log in op uw vakman-account.';
    tabs.style.display = 'none';
    qs('#login-panel')?.classList.remove('hidden');
    qs('#register-panel')?.classList.add('hidden');
    const em = qs('#login-email'); if (em && !em.value) em.value = 'rob@hendrix-loodgieter.nl';
  } else {
    authContext = 'klant';
    title.textContent = 'Mijn Fixli';
    sub.textContent = 'Log in of maak een klantaccount aan.';
    tabs.style.display = 'flex';
    const showRegister = mode === 'register';
    qsa('#auth-tabs .modal__tab').forEach(t => t.classList.toggle('active', t.dataset.tab === (showRegister ? 'register-panel' : 'login-panel')));
    qs('#login-panel')?.classList.toggle('hidden', showRegister);
    qs('#register-panel')?.classList.toggle('hidden', !showRegister);
  }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeAuth() {
  const modal = qs('#auth-modal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
}

function showModalMsg(msg, kind = 'danger') {
  const el = qs('#modal-msg');
  if (!el) return;
  el.className = 'alert alert--' + kind;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideModalMsg() { qs('#modal-msg')?.classList.add('hidden'); }

function loginKlant() {
  const email = qs('#login-email').value.trim().toLowerCase();
  const pw = qs('#login-pw').value;
  const users = lsGet('fixli_users', []);
  const user = users.find(u => u.email.toLowerCase() === email && u.password === pw);
  if (!user) return showModalMsg('Onjuiste inloggegevens. Probeer jan@email.nl / demo123.');
  lsSet('fixli_current_user', user);
  lsSet('fixli_current_vakman', null);
  closeAuth(); updateUserLabel(); navigateTo('klant-dashboard');
  toast('Ingelogd', 'Welkom terug, ' + user.naam.split(' ')[0] + '.', 'email');
}

function registerKlant() {
  const naam = qs('#reg-naam').value.trim();
  const email = qs('#reg-email').value.trim().toLowerCase();
  const pw = qs('#reg-pw').value;
  if (!naam || !email || !pw) return showModalMsg('Vul naam, e-mail en wachtwoord in.');
  const users = lsGet('fixli_users', []);
  if (users.some(u => u.email.toLowerCase() === email)) return showModalMsg('Er bestaat al een account met dit e-mailadres.');
  const user = { id: uid(), naam, email, telefoon: '', password: pw, type: 'klant' };
  users.push(user); lsSet('fixli_users', users);
  lsSet('fixli_current_user', user);
  lsSet('fixli_current_vakman', null);
  notify('klant', 'klant_account', { email });
  closeAuth(); updateUserLabel(); navigateTo('klant-dashboard');
}

function loginVakman() {
  const email = qs('#login-email').value.trim().toLowerCase();
  const pw = qs('#login-pw').value;
  const vakmannen = lsGet('fixli_vakmannen', []);
  const v = vakmannen.find(x => x.email.toLowerCase() === email && x.password === pw);
  if (!v) return showModalMsg('Onjuiste inloggegevens. Probeer rob@hendrix-loodgieter.nl / demo123.');
  lsSet('fixli_current_vakman', v);
  lsSet('fixli_current_user', null);
  closeAuth(); updateUserLabel(); navigateTo('vakman-dashboard');
  toast('Ingelogd', 'Welkom, ' + v.bedrijfsnaam + '.', 'email');
}

function logout() {
  lsSet('fixli_current_user', null);
  lsSet('fixli_current_vakman', null);
  lsSet('fixli_admin_unlocked', false);
  updateUserLabel(); navigateTo('home');
  toast('Uitgelogd', 'U bent uitgelogd.', '');
}

/* =====================================================
   GENERIEKE TABS (dashboards + FAQ)
===================================================== */
function initTabs() {
  document.body.addEventListener('click', e => {
    const tb = e.target.closest('.tab-btn');
    if (!tb) return;

    // FAQ-tabs (data-group="faq")
    if (tb.dataset.group === 'faq') {
      qsa('.tab-btn[data-group="faq"]').forEach(b => b.classList.toggle('active', b === tb));
      qsa('.tab-panel[data-group="faq"]').forEach(p => p.classList.toggle('active', p.dataset.tab === tb.dataset.tab));
      return;
    }

    // Dashboard-tabs (data-panel)
    if (tb.dataset.panel) {
      const group = tb.classList.contains('klant-tab') ? 'klant'
                  : tb.classList.contains('vakman-tab') ? 'vakman'
                  : tb.classList.contains('admin-tab') ? 'admin' : null;
      if (!group) return;
      const prefix = group === 'klant' ? 'kp' : group === 'vakman' ? 'vp' : 'ap';
      qsa('.' + group + '-tab').forEach(b => b.classList.toggle('active', b === tb));
      qsa('.' + group + '-panel').forEach(p => p.classList.remove('active'));
      qs('#' + prefix + '-' + tb.dataset.panel)?.classList.add('active');
    }
  });
}

/* =====================================================
   STATUS-HELPERS
===================================================== */
function statusBadge(status, map = KLUS_STATUS) {
  const s = map[status] || { label: status, badge: 'badge--gray' };
  return `<span class="badge ${s.badge}">${esc(s.label)}</span>`;
}

function statusTimeline(status) {
  if (status === 'geannuleerd') return `<div class="status-timeline"><span class="status-pill current">Geannuleerd</span></div>`;
  const idx = KLANT_STATUS_FLOW.indexOf(status);
  return `<div class="status-timeline">` + KLANT_STATUS_FLOW.map((st, i) => {
    const cls = i < idx ? 'done' : i === idx ? 'current' : '';
    return `<span class="status-pill ${cls}">${esc(KLUS_STATUS[st].label)}</span>`;
  }).join('') + `</div>`;
}

function postcodePrefix(pc) { return String(pc || '').replace(/\s/g, '').slice(0, 2); }

/* Matching: welke klus mag een vakman zien? */
function klusMatchtVakman(klus, vakman) {
  return vakman.status === 'goedgekeurd'
    && (vakman.vakgebieden || []).includes(klus.vakgebied)
    && (vakman.werkgebied || []).includes(postcodePrefix(klus.postcode))
    && klus.status === 'goedgekeurd'
    && !klus.accepted_by;
}

function emptyState(icon, tekst) {
  return `<div class="empty"><div class="empty__icon">${icon}</div><p>${esc(tekst)}</p></div>`;
}

/* =====================================================
   KLANT-DASHBOARD
===================================================== */
function renderKlantDash() {
  const u = currentUser();
  const prompt = qs('#klant-login-prompt'), content = qs('#klant-dash-content');
  if (!u) { prompt?.classList.remove('hidden'); content?.classList.add('hidden'); return; }
  prompt?.classList.add('hidden'); content?.classList.remove('hidden');
  renderKlantKlussen(u);
  renderKlantFacturen(u);
  renderKlantNotificaties(u);
  renderKlantProfiel(u);
}

function klantKlussen(u) {
  return lsGet('fixli_klussen', []).filter(k => (k.email || '').toLowerCase() === u.email.toLowerCase());
}

function renderKlantKlussen(u) {
  const c = qs('#klant-klussen');
  if (!c) return;
  const klussen = klantKlussen(u).sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!klussen.length) {
    c.innerHTML = emptyState('📋', 'U heeft nog geen aanvragen. Vraag een klus aan om te beginnen.');
    return;
  }
  c.innerHTML = klussen.map(k => {
    const p = k.prijs || {};
    const prijsTekst = p.opAanvraag ? 'Op aanvraag' : euro(p.totaalIncl);
    let acties = '';
    if (k.status === 'wacht_controle' || k.status === 'goedgekeurd') {
      acties += `<button class="btn btn-sm btn-danger" data-annuleer="${k.id}">Annuleren</button>`;
    } else if (k.status === 'geaccepteerd') {
      acties += `<button class="btn btn-sm btn-outline" data-annuleer="${k.id}">Annuleren (kosten mogelijk)</button>`;
    }
    let reviewBlok = '';
    if (k.status === 'afgerond') {
      reviewBlok = k.review
        ? `<div class="detail-box"><h4>Uw beoordeling</h4><div class="review-card__stars">${'★'.repeat(k.review.rating)}${'☆'.repeat(5 - k.review.rating)}</div><p>${esc(k.review.tekst || '')}</p></div>`
        : reviewForm(k.id);
    }
    return `
      <div class="klus-card">
        <div class="klus-card__header">
          <h4>${ICONS[k.vakgebied] || '🔧'} ${esc(k.klus)} <span style="font-weight:400;color:var(--gray-400)">— ${esc(k.vakgebied)}</span></h4>
          ${statusBadge(k.status)}
        </div>
        ${statusTimeline(k.status)}
        <div class="klus-card__meta">
          <span class="klus-card__meta-item">📍 ${esc(k.plaats)} (${esc(k.postcode)})</span>
          <span class="klus-card__meta-item">📅 ${esc(k.datum || 'n.t.b.')} ${esc(k.tijd || '')}</span>
          <span class="klus-card__meta-item">💶 ${prijsTekst}</span>
          ${k.spoed ? '<span class="klus-card__meta-item">🚨 Spoed</span>' : ''}
        </div>
        ${k.beschrijving ? `<p style="font-size:.88rem;color:var(--gray-600)">${esc(k.beschrijving)}</p>` : ''}
        ${k.status === 'geaccepteerd' || k.status === 'afgerond' ? `<div class="detail-box"><h4>Vakman gekoppeld</h4><p>Een gescreende vakman heeft uw klus opgepakt en neemt contact met u op.</p></div>` : ''}
        ${acties ? `<div class="klus-card__actions">${acties}</div>` : ''}
        ${reviewBlok}
      </div>`;
  }).join('');
}

function reviewForm(id) {
  return `
    <div class="detail-box" data-reviewform="${id}">
      <h4>Laat een beoordeling achter</h4>
      <div class="review-stars-input" style="font-size:1.6rem;color:#f5a623;cursor:pointer;margin:6px 0">
        ${[1,2,3,4,5].map(n => `<span data-star="${n}">☆</span>`).join('')}
      </div>
      <textarea class="review-text" placeholder="Hoe verliep de klus?" style="width:100%;margin:8px 0"></textarea>
      <button class="btn btn-sm btn-primary" data-review-submit="${id}">Beoordeling versturen</button>
    </div>`;
}

function renderKlantFacturen(u) {
  const c = qs('#klant-facturen');
  if (!c) return;
  const facturen = lsGet('fixli_facturen', []).filter(f => (f.klantEmail || '').toLowerCase() === u.email.toLowerCase());
  if (!facturen.length) { c.innerHTML = emptyState('🧾', 'Er zijn nog geen facturen. Facturen verschijnen nadat een klus is afgerond.'); return; }
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Factuurnr.</th><th>Omschrijving</th><th>Datum</th><th>Bedrag incl. btw</th><th>Status</th></tr></thead>
    <tbody>${facturen.map(f => `<tr>
      <td>${esc(f.nummer)}</td><td>${esc(f.omschrijving)}</td>
      <td>${new Date(f.datum).toLocaleDateString('nl-NL')}</td>
      <td>${euro(f.totaalIncl)}</td>
      <td><span class="badge badge--green">Betaald</span></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function renderKlantNotificaties(u) {
  const c = qs('#klant-notificaties');
  if (!c) return;
  const notifs = lsGet('fixli_notificaties', []).filter(n => n.to === 'klant' && (n.toEmail || '').toLowerCase() === u.email.toLowerCase());
  renderNotifList(c, notifs);
}

function renderKlantProfiel(u) {
  const c = qs('#klant-profiel');
  if (!c) return;
  c.innerHTML = `<div class="card">
    <h3>Profiel</h3>
    <div class="form-group"><label>Naam</label><input value="${esc(u.naam)}" id="kp-naam"></div>
    <div class="form-group"><label>E-mailadres</label><input value="${esc(u.email)}" disabled></div>
    <div class="form-group"><label>Telefoonnummer</label><input value="${esc(u.telefoon || '')}" id="kp-tel"></div>
    <button class="btn btn-primary" id="kp-save">Opslaan</button>
  </div>`;
  qs('#kp-save')?.addEventListener('click', () => {
    u.naam = qs('#kp-naam').value.trim() || u.naam;
    u.telefoon = qs('#kp-tel').value.trim();
    const users = lsGet('fixli_users', []).map(x => x.id === u.id ? u : x);
    lsSet('fixli_users', users); lsSet('fixli_current_user', u);
    updateUserLabel(); toast('Opgeslagen', 'Uw profiel is bijgewerkt.', '');
  });
}

function renderNotifList(c, notifs) {
  if (!notifs.length) { c.innerHTML = emptyState('🔔', 'Geen notificaties.'); return; }
  c.innerHTML = notifs.slice().reverse().map(n => `
    <div class="notif-item">
      <div class="notif-item__icon">📧</div>
      <div class="notif-item__body"><strong>${esc(n.subject)}</strong><span>${esc(n.body)}</span></div>
      <div class="notif-item__time">${new Date(n.created_at).toLocaleString('nl-NL')}</div>
    </div>`).join('');
}

/* Klant-acties: annuleren + review (delegatie) */
function initKlantActions() {
  document.body.addEventListener('click', e => {
    const ann = e.target.closest('[data-annuleer]');
    if (ann) {
      if (!confirm('Weet u zeker dat u deze aanvraag wilt annuleren?')) return;
      const id = ann.dataset.annuleer;
      const klussen = lsGet('fixli_klussen', []);
      const k = klussen.find(x => x.id === id);
      if (k) { k.status = 'geannuleerd'; lsSet('fixli_klussen', klussen); notify('admin', 'admin_annulering', { klus: k.klus }); renderKlantDash(); }
      return;
    }
    const star = e.target.closest('.review-stars-input [data-star]');
    if (star) {
      const wrap = star.closest('.review-stars-input');
      const n = +star.dataset.star;
      wrap.dataset.rating = n;
      qsa('[data-star]', wrap).forEach(s => s.textContent = +s.dataset.star <= n ? '★' : '☆');
      return;
    }
    const rev = e.target.closest('[data-review-submit]');
    if (rev) {
      const box = rev.closest('[data-reviewform]');
      const rating = +(box.querySelector('.review-stars-input').dataset.rating || 0);
      const tekst = box.querySelector('.review-text').value.trim();
      if (!rating) return toast('Kies een score', 'Geef minimaal één ster.', '');
      const id = rev.dataset.reviewSubmit;
      const klussen = lsGet('fixli_klussen', []);
      const k = klussen.find(x => x.id === id);
      if (k) { k.review = { rating, tekst, datum: new Date().toISOString() }; lsSet('fixli_klussen', klussen); toast('Bedankt!', 'Uw beoordeling is opgeslagen.', ''); renderKlantDash(); }
    }
  });
}

/* =====================================================
   VAKMAN-AANMELDING
===================================================== */
function initVakmanForm() {
  const grid = qs('#vm-vakgebieden');
  if (grid) grid.innerHTML = VAKGEBIEDEN.map(v => `
    <label class="checkbox-pill"><input type="checkbox" value="${esc(v)}"> ${ICONS[v] || '🔧'} ${esc(v)}</label>`).join('');

  qs('#vakman-submit')?.addEventListener('click', () => {
    const val = id => qs('#' + id)?.value.trim() || '';
    const bedrijf = val('vm-bedrijf'), naam = val('vm-naam'), email = val('vm-email').toLowerCase();
    const telefoon = val('vm-telefoon'), pw = val('vm-pw'), kvk = val('vm-kvk'), btw = val('vm-btw'), iban = val('vm-iban');
    const vakgebieden = qsa('#vm-vakgebieden input:checked').map(i => i.value);
    const werkgebied = val('vm-werkgebied').split(',').map(s => s.trim().slice(0, 2)).filter(Boolean);

    if (!bedrijf || !naam || !email || !telefoon || !pw || !kvk || !btw || !iban) return toast('Niet compleet', 'Vul alle verplichte velden in.', '');
    if (!vakgebieden.length) return toast('Vakgebied', 'Kies minimaal één vakgebied.', '');
    if (!werkgebied.length) return toast('Werkgebied', 'Geef uw werkgebied op (postcodecijfers).', '');
    if (!qs('#vm-akkoord-vw').checked || !qs('#vm-akkoord-betaling').checked || !qs('#vm-akkoord-anti').checked) return toast('Voorwaarden', 'Accepteer alle voorwaarden.', '');
    const vakmannen = lsGet('fixli_vakmannen', []);
    if (vakmannen.some(v => v.email.toLowerCase() === email)) return toast('Bestaat al', 'Er is al een account met dit e-mailadres.', '');

    const v = {
      id: uid(), bedrijfsnaam: bedrijf, naam, email, telefoon, password: pw, kvk, btw, iban,
      adres: val('vm-adres'), vestiging: val('vm-vestiging'), werkgebied, vakgebieden,
      ervaring: val('vm-ervaring'), tarief: val('vm-tarief'), beschikbaarheid: val('vm-beschikbaarheid'),
      status: 'wacht_controle', aangemeld: new Date().toISOString(),
    };
    vakmannen.push(v); lsSet('fixli_vakmannen', vakmannen);
    notify('admin', 'admin_vakman', { bedrijf });
    notify('vakman', 'vakman_account', { email, vakmanId: v.id });
    qs('#vakman-aanmeld-form')?.classList.add('hidden');
    qs('#vakman-aanmeld-success')?.classList.remove('hidden');
    window.scrollTo(0, 0);
  });
}

/* =====================================================
   VAKMAN-DASHBOARD
===================================================== */
function openVakmanDash() {
  const v = currentVakman();
  const login = qs('#vakman-login-screen'), content = qs('#vakman-dash-content');
  if (!v) { login?.classList.remove('hidden'); content?.classList.add('hidden'); return; }
  // verse kopie uit opslag (status kan door admin gewijzigd zijn)
  const fresh = lsGet('fixli_vakmannen', []).find(x => x.id === v.id) || v;
  lsSet('fixli_current_vakman', fresh);
  login?.classList.add('hidden'); content?.classList.remove('hidden');
  qs('#vakman-naam').textContent = fresh.bedrijfsnaam;
  const banner = qs('#vakman-status-banner');
  if (banner) {
    const s = VAKMAN_STATUS[fresh.status] || VAKMAN_STATUS.nieuw;
    const kind = fresh.status === 'goedgekeurd' ? 'success' : fresh.status === 'afgekeurd' || fresh.status === 'geblokkeerd' ? 'danger' : 'warn';
    banner.innerHTML = `<div class="alert alert--${kind}">Accountstatus: <strong>${esc(s.label)}</strong>. ${fresh.status === 'goedgekeurd' ? 'U kunt passende klussen accepteren.' : 'Zodra Fixli uw account goedkeurt, ziet u beschikbare klussen.'}</div>`;
  }
  renderVakmanBeschikbaar(fresh);
  renderVakmanGeaccepteerd(fresh);
  renderVakmanVerdiensten(fresh);
  renderVakmanDocumenten(fresh);
  renderVakmanReviews(fresh);
  renderVakmanNotificaties(fresh);
  qs('#vakman-dash-logout')?.addEventListener('click', logout, { once: true });
}

function renderVakmanBeschikbaar(v) {
  const c = qs('#beschikbare-klussen');
  if (!c) return;
  if (v.status !== 'goedgekeurd') { c.innerHTML = emptyState('🔒', 'Uw account moet eerst door Fixli worden goedgekeurd voordat u klussen kunt zien.'); return; }
  const klussen = lsGet('fixli_klussen', []).filter(k => klusMatchtVakman(k, v));
  if (!klussen.length) { c.innerHTML = emptyState('📭', 'Er staan op dit moment geen passende klussen open in uw werkgebied.'); return; }
  c.innerHTML = klussen.map(k => {
    const p = k.prijs || {};
    const fee = p.opAanvraag ? 'Op aanvraag' : euro(p.vergoedingVakmanExcl);
    return `
      <div class="klus-card">
        <div class="klus-card__header">
          <h4>${ICONS[k.vakgebied] || '🔧'} ${esc(k.klus)}</h4>
          ${k.spoed ? '<span class="badge badge--red">Spoed</span>' : '<span class="badge badge--teal">Nieuw</span>'}
        </div>
        <div class="klus-card__meta">
          <span class="klus-card__meta-item">🏷️ ${esc(k.vakgebied)}</span>
          <span class="klus-card__meta-item">📍 Regio ${esc(k.plaats)} (${esc(postcodePrefix(k.postcode))}xx)</span>
          <span class="klus-card__meta-item">📅 ${esc(k.datum || 'n.t.b.')} ${esc(k.tijd || '')}</span>
        </div>
        ${k.beschrijving ? `<p style="font-size:.85rem;color:var(--gray-600)">${esc(k.beschrijving)}</p>` : ''}
        ${renderVragenLijst(k)}
        <div class="alert alert--info" style="margin-top:10px">🔒 Volledige naam, adres en contactgegevens ziet u pas ná acceptatie.</div>
        <div class="klus-card__actions">
          <span class="klus-card__fee">Uw vergoeding: ${fee}</span>
          <button class="btn btn-sm btn-primary" data-accept="${k.id}">Klus accepteren</button>
        </div>
      </div>`;
  }).join('');
}

function renderVragenLijst(k) {
  const ant = k.antwoorden || {};
  const keys = Object.keys(ant);
  if (!keys.length) return '';
  return `<div class="qa-list">${keys.map(key => `<div><strong>${esc(key)}:</strong> ${esc(ant[key])}</div>`).join('')}</div>`;
}

function renderVakmanGeaccepteerd(v) {
  const c = qs('#geaccepteerde-klussen');
  if (!c) return;
  const klussen = lsGet('fixli_klussen', []).filter(k => k.accepted_by === v.id);
  if (!klussen.length) { c.innerHTML = emptyState('🧰', 'U heeft nog geen geaccepteerde klussen.'); return; }
  c.innerHTML = klussen.map(k => {
    const p = k.prijs || {};
    const afgerond = k.status === 'afgerond';
    return `
      <div class="klus-card">
        <div class="klus-card__header">
          <h4>${ICONS[k.vakgebied] || '🔧'} ${esc(k.klus)}</h4>
          ${statusBadge(k.status)}
        </div>
        <div class="detail-box">
          <h4>Klantgegevens</h4>
          <p><strong>Naam:</strong> ${esc(k.naam)}</p>
          <p><strong>Telefoon:</strong> ${esc(k.telefoon)}</p>
          <p><strong>E-mail:</strong> ${esc(k.email)}</p>
          <p><strong>Adres:</strong> ${esc(k.straat)} ${esc(k.huisnr)}, ${esc(k.postcode)} ${esc(k.plaats)}</p>
          <p><strong>Datum:</strong> ${esc(k.datum || 'n.t.b.')} ${esc(k.tijd || '')}</p>
        </div>
        ${renderVragenLijst(k)}
        ${k.beschrijving ? `<p style="font-size:.85rem;color:var(--gray-600);margin-top:8px">${esc(k.beschrijving)}</p>` : ''}
        <div class="klus-card__actions">
          <span class="klus-card__fee">Vergoeding: ${p.opAanvraag ? 'Op aanvraag' : euro(p.vergoedingVakmanExcl)}</span>
          ${afgerond ? '<span class="badge badge--green">Afgerond</span>' : `<button class="btn btn-sm btn-success" data-afronden="${k.id}">Klus afronden</button>`}
        </div>
        ${k.review ? `<div class="detail-box"><h4>Beoordeling klant</h4><div class="review-card__stars">${'★'.repeat(k.review.rating)}${'☆'.repeat(5 - k.review.rating)}</div><p>${esc(k.review.tekst || '')}</p></div>` : ''}
      </div>`;
  }).join('');
}

function renderVakmanVerdiensten(v) {
  const c = qs('#vakman-verdiensten');
  if (!c) return;
  const facturen = lsGet('fixli_facturen', []).filter(f => f.vakmanId === v.id);
  const totaal = facturen.reduce((s, f) => s + (f.vergoedingVakmanExcl || 0), 0);
  c.innerHTML = `
    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--green">💶</div><div><strong>${euro(totaal)}</strong><span>Totaal verdiend (excl. btw)</span></div></div>
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--teal">✅</div><div><strong>${facturen.length}</strong><span>Afgeronde klussen</span></div></div>
    </div>
    ${facturen.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Factuurnr.</th><th>Klus</th><th>Datum</th><th>Uw vergoeding</th><th>Uitbetaling</th></tr></thead>
      <tbody>${facturen.map(f => `<tr>
        <td>${esc(f.nummer)}</td><td>${esc(f.omschrijving)}</td>
        <td>${new Date(f.datum).toLocaleDateString('nl-NL')}</td>
        <td>${euro(f.vergoedingVakmanExcl)}</td>
        <td><span class="badge badge--blue">Gepland</span></td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('💶', 'Nog geen verdiensten. Rond een klus af om uw vergoeding te zien.')}`;
}

function renderVakmanDocumenten(v) {
  const c = qs('#vakman-documenten');
  if (!c) return;
  const docs = [
    ['KvK-uittreksel', v.kvk ? 'Aangeleverd' : 'Ontbreekt', v.kvk ? 'badge--green' : 'badge--orange'],
    ['Btw-registratie', v.btw ? 'Aangeleverd' : 'Ontbreekt', v.btw ? 'badge--green' : 'badge--orange'],
    ['IBAN voor uitbetaling', v.iban ? 'Aangeleverd' : 'Ontbreekt', v.iban ? 'badge--green' : 'badge--orange'],
    ['Aansprakelijkheidsverzekering', 'Te controleren', 'badge--gray'],
    ['Vakcertificering', 'Te controleren', 'badge--gray'],
  ];
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Document</th><th>Status</th></tr></thead>
    <tbody>${docs.map(d => `<tr><td>${d[0]}</td><td><span class="badge ${d[2]}">${d[1]}</span></td></tr>`).join('')}</tbody>
  </table></div>
  <p style="font-size:.82rem;color:var(--gray-400);margin-top:12px">BACKEND: hier echte documentupload en verificatie koppelen.</p>`;
}

function renderVakmanReviews(v) {
  const c = qs('#vakman-reviews');
  if (!c) return;
  const reviews = lsGet('fixli_klussen', []).filter(k => k.accepted_by === v.id && k.review);
  if (!reviews.length) { c.innerHTML = emptyState('⭐', 'Nog geen beoordelingen ontvangen.'); return; }
  c.innerHTML = `<div class="reviews-grid">${reviews.map(k => `
    <div class="review-card">
      <div class="review-card__stars">${'★'.repeat(k.review.rating)}${'☆'.repeat(5 - k.review.rating)}</div>
      <p>${esc(k.review.tekst || 'Geen toelichting.')}</p>
      <div class="review-card__author">— ${esc(k.naam)} · ${esc(k.klus)}</div>
    </div>`).join('')}</div>`;
}

function renderVakmanNotificaties(v) {
  const c = qs('#vakman-notificaties');
  if (!c) return;
  const notifs = lsGet('fixli_notificaties', []).filter(n => n.to === 'vakman' && (n.vakmanId === v.id || (n.toEmail || '').toLowerCase() === v.email.toLowerCase()));
  renderNotifList(c, notifs);
}

/* Vakman-acties: accepteren + afronden */
function initVakmanActions() {
  document.body.addEventListener('click', e => {
    const acc = e.target.closest('[data-accept]');
    if (acc) {
      const v = currentVakman(); if (!v) return;
      const klussen = lsGet('fixli_klussen', []);
      const k = klussen.find(x => x.id === acc.dataset.accept);
      if (!k || k.accepted_by || k.status !== 'goedgekeurd') { toast('Niet meer beschikbaar', 'Deze klus is al opgepakt.', ''); openVakmanDash(); return; }
      k.accepted_by = v.id; k.status = 'geaccepteerd';
      lsSet('fixli_klussen', klussen);
      notify('klant', 'klant_geaccepteerd', { email: k.email, bedrijf: v.bedrijfsnaam });
      notify('vakman', 'vakman_geaccepteerd', { email: v.email, vakmanId: v.id });
      audit('Klus geaccepteerd', `${v.bedrijfsnaam} → ${k.klus}`);
      openVakmanDash();
      return;
    }
    const af = e.target.closest('[data-afronden]');
    if (af) {
      const v = currentVakman(); if (!v) return;
      const klussen = lsGet('fixli_klussen', []);
      const k = klussen.find(x => x.id === af.dataset.afronden);
      if (!k) return;
      k.status = 'afgerond'; lsSet('fixli_klussen', klussen);
      const f = maakFactuur(k);
      notify('klant', 'klant_afgerond', { email: k.email });
      notify('klant', 'klant_factuur', { email: k.email, nummer: f.nummer });
      notify('vakman', 'vakman_uitbetaling', { email: v.email, vakmanId: v.id });
      audit('Klus afgerond + factuur', `${f.nummer} — ${k.klus}`);
      openVakmanDash();
    }
  });
}

/* =====================================================
   FACTUREN
===================================================== */
function maakFactuur(klus) {
  const teller = lsGet('fixli_factuur_teller', 1);
  const nummer = 'FXL-2026-' + String(teller).padStart(6, '0');
  lsSet('fixli_factuur_teller', teller + 1);
  const facturen = lsGet('fixli_facturen', []);
  const p = klus.prijs || {};
  const f = {
    id: uid(), nummer, klusId: klus.id, datum: new Date().toISOString(),
    klantNaam: klus.naam, klantEmail: klus.email,
    omschrijving: `${klus.klus} — ${klus.vakgebied}`,
    bedragExcl: p.klusprijsExcl || 0, btw: p.btw || 0, servicekosten: p.servicekostenExcl || 0,
    totaalIncl: p.totaalIncl || 0, betaalstatus: klus.betaalstatus || 'betaald',
    vakmanId: klus.accepted_by, vergoedingVakmanExcl: p.vergoedingVakmanExcl || 0,
    uitbetaalstatus: 'gepland', fixliMarge: p.fixliMarge || 0,
  };
  facturen.push(f); lsSet('fixli_facturen', facturen);
  return f;
}

/* =====================================================
   ADMIN-DASHBOARD
   BACKEND: beveilig met echte authenticatie + rollen.
===================================================== */
function openAdmin() {
  const login = qs('#admin-login-screen'), content = qs('#admin-content');
  if (!lsGet('fixli_admin_unlocked')) {
    login?.classList.remove('hidden'); content?.classList.add('hidden');
    qs('#admin-login-btn')?.addEventListener('click', () => {
      if (qs('#admin-pw').value === 'admin123') { lsSet('fixli_admin_unlocked', true); openAdmin(); }
      else toast('Onjuist', 'Verkeerd wachtwoord (demo: admin123).', '');
    }, { once: true });
    qs('#admin-pw')?.addEventListener('keydown', e => { if (e.key === 'Enter') qs('#admin-login-btn').click(); }, { once: true });
    return;
  }
  login?.classList.add('hidden'); content?.classList.remove('hidden');
  qs('#admin-logout')?.addEventListener('click', () => { lsSet('fixli_admin_unlocked', false); navigateTo('home'); }, { once: true });
  renderAdminStats();
  renderAdminKlussen();
  renderAdminVakmannen();
  renderAdminKlachten();
  renderAdminReviews();
  renderAdminInstellingen();
  renderAdminAuditlog();
}

function renderAdminStats() {
  const c = qs('#admin-stats');
  if (!c) return;
  const facturen = lsGet('fixli_facturen', []);
  const klussen = lsGet('fixli_klussen', []);
  const vakmannen = lsGet('fixli_vakmannen', []);
  const omzet = facturen.reduce((s, f) => s + (f.totaalIncl || 0), 0);
  const marge = facturen.reduce((s, f) => s + (f.fixliMarge || 0), 0);
  const uitbetaald = facturen.reduce((s, f) => s + (f.vergoedingVakmanExcl || 0), 0);
  const open = klussen.filter(k => k.status === 'wacht_controle').length;
  const beschikbaar = klussen.filter(k => k.status === 'goedgekeurd').length;
  const wachtVakman = vakmannen.filter(v => v.status === 'wacht_controle').length;
  const card = (icon, kleur, waarde, label) => `<div class="stat-card"><div class="stat-card__icon stat-card__icon--${kleur}">${icon}</div><div><strong>${waarde}</strong><span>${label}</span></div></div>`;
  c.innerHTML = `<div class="stat-grid">
    ${card('💰', 'green', euro(omzet), 'Omzet (incl. btw)')}
    ${card('📈', 'teal', euro(marge), 'Fixli-marge + servicekosten')}
    ${card('👷', 'navy', euro(uitbetaald), 'Uit te betalen aan vakmannen')}
    ${card('🆕', 'navy', open, 'Aanvragen wacht op controle')}
    ${card('📋', 'teal', beschikbaar, 'Beschikbaar voor vakmannen')}
    ${card('🔍', 'navy', wachtVakman, 'Vakmannen wacht op controle')}
    ${card('🧰', 'green', klussen.length, 'Totaal aanvragen')}
    ${card('🛠️', 'teal', vakmannen.length, 'Geregistreerde vakmannen')}
  </div>`;
}

function renderAdminKlussen() {
  const c = qs('#admin-klussen-table');
  if (!c) return;
  const klussen = lsGet('fixli_klussen', []).slice().reverse();
  if (!klussen.length) { c.innerHTML = emptyState('📋', 'Nog geen aanvragen.'); return; }
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Klus</th><th>Vakgebied</th><th>Regio</th><th>Totaal</th><th>Status</th><th>Acties</th></tr></thead>
    <tbody>${klussen.map(k => {
      const p = k.prijs || {};
      let acties = '';
      if (k.status === 'wacht_controle') {
        acties = `<button class="btn btn-sm btn-success" data-admin-goedkeur="${k.id}">Goedkeuren</button>
                  <button class="btn btn-sm btn-danger" data-admin-afkeur="${k.id}">Afkeuren</button>
                  <button class="btn btn-sm btn-outline" data-admin-prijs="${k.id}">Prijs</button>`;
      } else if (k.status === 'goedgekeurd') {
        acties = '<span class="badge badge--teal">Open voor vakmannen</span>';
      } else acties = '—';
      return `<tr>
        <td>${esc(k.klus)}</td><td>${esc(k.vakgebied)}</td>
        <td>${esc(k.plaats)} (${esc(k.postcode)})</td>
        <td>${p.opAanvraag ? 'Op aanvraag' : euro(p.totaalIncl)}</td>
        <td>${statusBadge(k.status)}</td>
        <td><div style="display:flex;gap:6px;flex-wrap:wrap">${acties}</div></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function renderAdminVakmannen() {
  const c = qs('#admin-vakmannen-table');
  if (!c) return;
  const vakmannen = lsGet('fixli_vakmannen', []);
  if (!vakmannen.length) { c.innerHTML = emptyState('🛠️', 'Nog geen vakmannen.'); return; }
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Bedrijf</th><th>Vakgebieden</th><th>Werkgebied</th><th>Status</th><th>Acties</th></tr></thead>
    <tbody>${vakmannen.map(v => `<tr>
      <td>${esc(v.bedrijfsnaam)}<br><span style="font-size:.78rem;color:var(--gray-400)">${esc(v.email)}</span></td>
      <td>${esc((v.vakgebieden || []).join(', '))}</td>
      <td>${esc((v.werkgebied || []).join(', '))}</td>
      <td>${statusBadge(v.status, VAKMAN_STATUS)}</td>
      <td><div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm btn-success" data-vm-status="goedgekeurd" data-vm-id="${v.id}">Goedkeuren</button>
        <button class="btn btn-sm btn-danger" data-vm-status="afgekeurd" data-vm-id="${v.id}">Afkeuren</button>
        <button class="btn btn-sm btn-outline" data-vm-status="gepauzeerd" data-vm-id="${v.id}">Pauzeren</button>
        <button class="btn btn-sm btn-outline" data-vm-status="geblokkeerd" data-vm-id="${v.id}">Blokkeren</button>
      </div></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function renderAdminKlachten() {
  const c = qs('#admin-klachten');
  if (!c) return;
  const klachten = lsGet('fixli_klachten', []);
  if (!klachten.length) { c.innerHTML = emptyState('🗂️', 'Geen openstaande klachten.'); return; }
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Van</th><th>Onderwerp</th><th>Bericht</th><th>Status</th></tr></thead>
    <tbody>${klachten.map(k => `<tr>
      <td>${esc(k.naam || '')}<br><span style="font-size:.78rem;color:var(--gray-400)">${esc(k.email || '')}</span></td>
      <td>${esc(k.onderwerp || '')}</td><td>${esc(k.bericht || '')}</td>
      <td><span class="badge badge--orange">${esc(k.status || 'Nieuw')}</span></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function renderAdminReviews() {
  const c = qs('#admin-reviews');
  if (!c) return;
  const reviews = lsGet('fixli_klussen', []).filter(k => k.review);
  if (!reviews.length) { c.innerHTML = emptyState('⭐', 'Nog geen beoordelingen.'); return; }
  c.innerHTML = `<div class="reviews-grid">${reviews.map(k => `
    <div class="review-card">
      <div class="review-card__stars">${'★'.repeat(k.review.rating)}${'☆'.repeat(5 - k.review.rating)}</div>
      <p>${esc(k.review.tekst || 'Geen toelichting.')}</p>
      <div class="review-card__author">— ${esc(k.naam)} · ${esc(k.klus)} (${esc(k.vakgebied)})</div>
    </div>`).join('')}</div>`;
}

function renderAdminInstellingen() {
  const c = qs('#admin-instellingen');
  if (!c) return;
  const s = getSettings();
  const row = (id, label, val, hint) => `<div class="form-group"><label>${label}</label><input id="set-${id}" value="${val}"><span class="field-hint">${hint}</span></div>`;
  c.innerHTML = `<div class="card"><h3>Platforminstellingen</h3>
    <div class="form-row">
      ${row('btw', 'Btw-percentage', (s.btwPct * 100), 'bijv. 21')}
      ${row('service', 'Servicekosten %', (s.serviceFeePct * 100), '% van subtotaal excl. btw')}
    </div>
    <div class="form-row">
      ${row('marge', 'Fixli-marge %', (s.margePct * 100), 'marge op klusprijs')}
      ${row('spoed', 'Spoedtoeslag (incl. btw)', s.spoedToeslag, 'in euro')}
    </div>
    <div class="form-row">
      ${row('weekend', 'Weekendtoeslag (incl. btw)', s.weekendToeslag, 'in euro')}
      ${row('anti', 'Anti-omzeiling (maanden)', s.antiOmzeilingMaanden, 'looptijd beding')}
    </div>
    <div class="form-row">
      ${row('boetevak', 'Boete vakman (incl. btw)', s.boeteVakman, 'in euro')}
      ${row('boeteklant', 'Boete klant (incl. btw)', s.boeteKlant, 'in euro')}
    </div>
    ${row('email', 'Admin e-mailadres', esc(s.adminEmail), 'ontvangt platformnotificaties')}
    <button class="btn btn-primary mt-4" id="set-save">Instellingen opslaan</button>
  </div>`;
  qs('#set-save')?.addEventListener('click', () => {
    const num = id => parseFloat(qs('#set-' + id).value) || 0;
    const nieuw = {
      btwPct: num('btw') / 100, serviceFeePct: num('service') / 100, margePct: num('marge') / 100,
      spoedToeslag: num('spoed'), weekendToeslag: num('weekend'), antiOmzeilingMaanden: num('anti'),
      boeteVakman: num('boetevak'), boeteKlant: num('boeteklant'), adminEmail: qs('#set-email').value.trim(),
    };
    lsSet('fixli_settings', nieuw);
    audit('Instellingen gewijzigd', `marge ${num('marge')}%, service ${num('service')}%`);
    toast('Opgeslagen', 'Platforminstellingen bijgewerkt. Nieuwe aanvragen gebruiken deze waarden.', '');
    renderAdminStats();
  });
}

function renderAdminAuditlog() {
  const c = qs('#admin-auditlog');
  if (!c) return;
  const log = lsGet('fixli_auditlog', []);
  if (!log.length) { c.innerHTML = emptyState('📝', 'Nog geen acties geregistreerd.'); return; }
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Tijd</th><th>Actie</th><th>Details</th></tr></thead>
    <tbody>${log.map(l => `<tr>
      <td>${new Date(l.created_at).toLocaleString('nl-NL')}</td>
      <td>${esc(l.actie)}</td><td>${esc(l.details)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

/* Admin-acties (delegatie) */
function initAdminActions() {
  document.body.addEventListener('click', e => {
    // Aanvraag goedkeuren
    const g = e.target.closest('[data-admin-goedkeur]');
    if (g) {
      const klussen = lsGet('fixli_klussen', []);
      const k = klussen.find(x => x.id === g.dataset.adminGoedkeur);
      if (!k) return;
      k.status = 'goedgekeurd'; lsSet('fixli_klussen', klussen);
      notify('klant', 'klant_goedgekeurd', { email: k.email });
      // Notificeer passende vakmannen
      lsGet('fixli_vakmannen', []).forEach(v => {
        if (v.status === 'goedgekeurd' && (v.vakgebieden || []).includes(k.vakgebied) && (v.werkgebied || []).includes(postcodePrefix(k.postcode))) {
          notify('vakman', 'vakman_nieuwe_klus', { email: v.email, vakmanId: v.id, vakgebied: k.vakgebied, plaats: k.plaats });
        }
      });
      audit('Aanvraag goedgekeurd', k.klus + ' (' + k.plaats + ')');
      openAdmin();
      return;
    }
    // Aanvraag afkeuren
    const af = e.target.closest('[data-admin-afkeur]');
    if (af) {
      if (!confirm('Aanvraag afkeuren en annuleren?')) return;
      const klussen = lsGet('fixli_klussen', []);
      const k = klussen.find(x => x.id === af.dataset.adminAfkeur);
      if (!k) return;
      k.status = 'geannuleerd'; lsSet('fixli_klussen', klussen);
      audit('Aanvraag afgekeurd', k.klus);
      openAdmin();
      return;
    }
    // Prijs aanpassen
    const pr = e.target.closest('[data-admin-prijs]');
    if (pr) {
      const klussen = lsGet('fixli_klussen', []);
      const k = klussen.find(x => x.id === pr.dataset.adminPrijs);
      if (!k || (k.prijs || {}).opAanvraag) { toast('Niet mogelijk', 'Deze klus is op aanvraag.', ''); return; }
      const huidig = k.prijs.totaalIncl;
      const inp = prompt('Nieuw totaalbedrag incl. btw (€):', huidig);
      if (inp === null) return;
      const totaal = parseFloat(inp);
      if (!totaal || totaal <= 0) return toast('Ongeldig', 'Voer een geldig bedrag in.', '');
      k.prijs = buildPrijsVanTotaal(totaal, k.prijs);
      lsSet('fixli_klussen', klussen);
      audit('Prijs aangepast', `${k.klus}: ${euro(huidig)} → ${euro(totaal)}`);
      openAdmin();
      return;
    }
    // Vakman-status
    const vm = e.target.closest('[data-vm-status]');
    if (vm) {
      const vakmannen = lsGet('fixli_vakmannen', []);
      const v = vakmannen.find(x => x.id === vm.dataset.vmId);
      if (!v) return;
      const nieuw = vm.dataset.vmStatus;
      v.status = nieuw; lsSet('fixli_vakmannen', vakmannen);
      if (nieuw === 'goedgekeurd') notify('vakman', 'vakman_goedgekeurd', { email: v.email, vakmanId: v.id });
      if (nieuw === 'afgekeurd') notify('vakman', 'vakman_afgewezen', { email: v.email, vakmanId: v.id });
      audit('Vakman-status: ' + nieuw, v.bedrijfsnaam);
      openAdmin();
    }
  });
}

/* Bouw een volledige prijs-breakdown op basis van een nieuw totaalbedrag (incl. btw) */
function buildPrijsVanTotaal(totaalIncl, oud = {}) {
  const s = getSettings();
  const subtotaalExcl = totaalIncl / (1 + s.btwPct);
  const btw = totaalIncl - subtotaalExcl;
  const spoedExcl = oud.spoedExcl || 0;
  const weekendExcl = oud.weekendExcl || 0;
  const servicekostenExcl = subtotaalExcl * s.serviceFeePct;
  const klusprijsExcl = subtotaalExcl - servicekostenExcl - spoedExcl - weekendExcl;
  const vergoedingVakmanExcl = klusprijsExcl * (1 - s.margePct);
  const fixliMarge = subtotaalExcl - vergoedingVakmanExcl;
  const r = x => Math.round(x * 100) / 100;
  return {
    opAanvraag: false, weekend: !!weekendExcl, spoed: !!spoedExcl,
    spoedExcl: r(spoedExcl), weekendExcl: r(weekendExcl), klusprijsExcl: r(klusprijsExcl),
    servicekostenExcl: r(servicekostenExcl), subtotaalExcl: r(subtotaalExcl), btw: r(btw),
    totaalIncl: r(totaalIncl), vergoedingVakmanExcl: r(vergoedingVakmanExcl), fixliMarge: r(fixliMarge),
  };
}

/* =====================================================
   CONTACT
===================================================== */
function initContact() {
  qs('#contact-submit')?.addEventListener('click', () => {
    const naam = qs('#c-naam').value.trim();
    const email = qs('#c-email').value.trim();
    const bericht = qs('#c-bericht').value.trim();
    if (!naam || !email || !bericht) return toast('Niet compleet', 'Vul naam, e-mail en bericht in.', '');
    const type = qs('#c-type').value;
    const onderwerp = qs('#c-onderwerp').value.trim();
    // Bewaar als klacht/bericht voor admin
    const klachten = lsGet('fixli_klachten', []);
    klachten.push({ id: uid(), naam, email, telefoon: qs('#c-tel').value.trim(), type, onderwerp, bericht, status: 'Nieuw', created_at: new Date().toISOString() });
    lsSet('fixli_klachten', klachten);
    notify('admin', 'admin_klacht', {});
    qs('#contact-form-wrap')?.classList.add('hidden');
    qs('#contact-success')?.classList.remove('hidden');
  });
}

/* =====================================================
   JURIDISCHE TEKSTEN (concept)
   BACKEND/JURIDISCH: laat definitieve teksten opstellen door een jurist.
===================================================== */
function legalDisclaimer() {
  return `<div class="alert alert--warn">⚖️ Dit is een conceptversie voor demonstratiedoeleinden. Laat definitieve juridische teksten opstellen of controleren door een jurist voordat u live gaat.</div>`;
}

function renderLegal() {
  const set = getSettings();
  const blocks = {
    'legal-voorwaarden': {
      titel: 'Algemene voorwaarden (klanten)',
      secties: [
        ['1. Over Fixli', 'Fixli is een bemiddelingsplatform dat klanten in contact brengt met zelfstandige, gescreende vakmannen. Fixli voert zelf geen werkzaamheden uit en is geen partij bij de uitvoeringsovereenkomst tussen klant en vakman.'],
        ['2. Aanvraag en prijs', 'De klant kiest een klus en ziet vooraf een vanaf-prijs inclusief btw en servicekosten. Extra werk of materialen worden altijd vooraf met de klant afgestemd. De definitieve prijs kan afwijken van de vanaf-prijs indien de klus afwijkt van de standaardomschrijving.'],
        ['3. Betaling via het platform', 'Betalingen verlopen uitsluitend via Fixli. Betalen buiten het platform is niet toegestaan en valt buiten elke bescherming, garantie of geschillenregeling.'],
        ['4. Annulering', 'Zolang nog geen vakman heeft geaccepteerd, kan de klant kosteloos annuleren. Na acceptatie kunnen annuleringskosten in rekening worden gebracht.'],
        ['5. Aansprakelijkheid', 'De vakman is verantwoordelijk voor de uitvoering en kwaliteit van het werk. Fixli bemiddelt en is niet aansprakelijk voor de uitgevoerde werkzaamheden, behoudens dwingend recht.'],
        ['6. Klachten', 'Klachten kunnen worden ingediend via het dashboard of de contactpagina. Fixli bemiddelt tussen klant en vakman om tot een oplossing te komen.'],
      ],
    },
    'legal-vakmanvoorwaarden': {
      titel: 'Vakmanvoorwaarden',
      secties: [
        ['1. Toelating', 'Vakmannen worden toegelaten na controle van onder meer KvK-inschrijving, btw-nummer en IBAN. Fixli kan een account weigeren, pauzeren of blokkeren.'],
        ['2. Klussen accepteren', 'Een vakman ziet uitsluitend goedgekeurde klussen die passen bij zijn vakgebied en werkgebied. De eerste vakman die accepteert, krijgt de opdracht. Volledige klantgegevens worden pas ná acceptatie zichtbaar.'],
        ['3. Uitbetaling', 'Fixli int de betaling van de klant en betaalt de vergoeding (klusprijs minus Fixli-marge) uit na afronding van de klus.'],
        [`4. Anti-omzeilingsbeding (${set.antiOmzeilingMaanden} maanden)`, `Klanten die via Fixli zijn aangebracht, mogen gedurende ${set.antiOmzeilingMaanden} maanden niet buiten het platform om worden gefactureerd. Overtreding kan leiden tot een boete van ${euro(set.boeteVakman)} per geval.`],
        ['5. Kwaliteit en gedrag', 'De vakman levert vakkundig werk, communiceert tijdig met de klant en houdt zich aan geldende wet- en regelgeving.'],
      ],
    },
    'legal-privacy': {
      titel: 'Privacybeleid',
      secties: [
        ['1. Welke gegevens', 'Fixli verwerkt gegevens die nodig zijn voor bemiddeling: contactgegevens, klusgegevens, adres en betaalgegevens.'],
        ['2. Bescherming klantgegevens', 'Volledige klantgegevens (naam, adres, telefoon, e-mail) worden pas gedeeld met een vakman nadat deze de klus heeft geaccepteerd. Klanten kunnen niet door vakmannen worden doorzocht.'],
        ['3. Doel en grondslag', 'Gegevens worden verwerkt voor de uitvoering van de overeenkomst, betalingen, fraudepreventie en wettelijke verplichtingen.'],
        ['4. Bewaartermijn', 'Gegevens worden niet langer bewaard dan nodig of wettelijk verplicht.'],
        ['5. Uw rechten', 'U heeft recht op inzage, correctie en verwijdering van uw gegevens. Neem hiervoor contact op via de contactpagina.'],
      ],
    },
    'legal-cookies': {
      titel: 'Cookiebeleid',
      secties: [
        ['1. Functionele cookies', 'Deze demo gebruikt uitsluitend lokale opslag (localStorage) om uw sessie en aanvragen te bewaren. Er worden geen trackingcookies geplaatst.'],
        ['2. Analytische cookies', 'In de live-versie kunnen analytische cookies worden gebruikt om het platform te verbeteren. Hiervoor wordt toestemming gevraagd.'],
        ['3. Beheer', 'U kunt lokale opslag wissen via uw browserinstellingen.'],
      ],
    },
    'legal-klachten': {
      titel: 'Klachtenprocedure',
      secties: [
        ['1. Indienen', 'Klachten kunt u indienen via uw dashboard of de contactpagina, met een omschrijving van het probleem en de betreffende klus.'],
        ['2. Behandeling', 'Fixli neemt de klacht in behandeling en bemiddelt tussen klant en vakman om tot een passende oplossing te komen.'],
        ['3. Terugkoppeling', 'U ontvangt terugkoppeling over de status en uitkomst van uw klacht.'],
      ],
    },
    'legal-annulering': {
      titel: 'Annuleringsvoorwaarden',
      secties: [
        ['1. Vóór acceptatie', 'Zolang nog geen vakman de klus heeft geaccepteerd, kunt u kosteloos annuleren via uw dashboard. Het betaalde bedrag wordt teruggestort.'],
        ['2. Ná acceptatie', `Na acceptatie heeft de vakman tijd gereserveerd. Bij annulering kunnen annuleringskosten gelden van maximaal ${euro(set.boeteKlant)}.`],
        ['3. Annulering door vakman', 'Annuleert een vakman onverwacht, dan wordt de klus opnieuw aangeboden aan andere passende vakmannen of wordt uw betaling teruggestort.'],
      ],
    },
  };
  Object.entries(blocks).forEach(([id, data]) => {
    const c = qs('#' + id);
    if (!c) return;
    c.innerHTML = `<h1>${esc(data.titel)}</h1>${legalDisclaimer()}` +
      data.secties.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join('');
  });
}

/* =====================================================
   INIT
===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initDemoData();
  initNav();
  initTabs();
  initFaqAccordion();
  initAuth();
  initKlusForm();
  initHeroSearch();
  initVakmanForm();
  initVakmanActions();
  initKlantActions();
  initAdminActions();
  initContact();
  renderLegal();
  renderFaqPages();
  renderHome();
  updateUserLabel();
  navigateTo('home');
});
