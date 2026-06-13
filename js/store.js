/* ============================================================
   FIXLI — store.js
   Datalaag, prijsengine, statussen, notificaties.

   Dit bestand bevat alle "business logica" en data-toegang.
   Nu draait alles op localStorage zodat de webapp zonder
   server te testen is. Alles is bewust zo gestructureerd dat
   het later 1-op-1 vervangen kan worden door een echte backend.

   >> BACKEND-KOPPELING <<
   Vervang de functies in het blok STORE (lsGet/lsSet -> API-calls)
   en de functie sendEmail() (-> Resend/SendGrid/Mailgun) door
   echte implementaties. De rest van de app blijft hetzelfde werken.
   ============================================================ */

/* =====================================================
   UTILITIES
===================================================== */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* KRITIEK: escape alle gebruikersinvoer vóór innerHTML (XSS-preventie) */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Basisvalidatie */
const isEmail    = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || '');
const isPostcode = v => /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test((v || '').trim());
const isKvk      = v => /^[0-9]{8}$/.test((v || '').replace(/\s/g, ''));
const isTelefoon = v => /^[0-9+\-\s()]{8,}$/.test(v || '');

function euro(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '€ ' + Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function isWeekend(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr).getDay();
  return d === 0 || d === 6;
}

/* =====================================================
   STORE — localStorage wrapper
   >> BACKEND: vervang body door fetch() naar je API.
===================================================== */
const Store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

/* Tabellen */
const TBL = {
  klussen:    'fixli_klussen',
  vakmannen:  'fixli_vakmannen',
  users:      'fixli_users',
  reviews:    'fixli_reviews',
  klachten:   'fixli_klachten',
  facturen:   'fixli_facturen',
  extrakosten:'fixli_extrakosten',
  tarieven:   'fixli_tarieven',     // admin-overrides op klusprijzen/tarieftypes
  notif:      'fixli_notifications',
  auditlog:   'fixli_auditlog',
  settings:   'fixli_settings',
  curUser:    'fixli_current_user',
  curVakman:  'fixli_current_vakman',
  init:       'fixli_init_v3'
};

/* =====================================================
   INSTELLINGEN (instelbaar in admin)
===================================================== */
const DEFAULT_SETTINGS = {
  btwTarief: 0.21,
  servicekosten: 14.95,      // incl. btw, Fixli servicekosten per klus
  spoedtoeslag: 35,          // incl. btw
  avondtoeslag: 20,          // incl. btw (gewenste tijd 18:00 of later)
  weekendtoeslag: 25,        // incl. btw
  vakmanShare: 0.72,         // aandeel vakman van het werk (excl. btw)
  minUren: 1,                // minimale afname bij uurtarief
  antiOmzeilingMaanden: 24,
  boeteVakman: 2420,         // incl. btw
  boeteKlant: 149,           // incl. btw
  // Annuleringsregels (instelbaar in admin)
  annuleringBinnenUren: 48,  // binnen dit aantal uren vóór afspraak gelden servicekosten
  voorrijkosten: 45,         // incl. btw, bij annulering als vakman onderweg is / voor dichte deur
  // PLACEHOLDER: vervang door het echte admin-e-mailadres vóór livegang
  adminEmail: 'info@voorbeeld.nl',
  factuurTeller: 0
};

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(Store.get(TBL.settings, {})) };
}
function saveSettings(s) { Store.set(TBL.settings, s); }

/* =====================================================
   VAKGEBIEDEN + KLUSSEN + DYNAMISCHE VRAGEN + PRIJZEN
   (Klusjesman is verwijderd, Laadpaal installateur toegevoegd)
===================================================== */
const VAKGEBIED_ICONS = {
  'Elektricien': '⚡', 'Loodgieter': '🔧', 'CV / Verwarming': '🔥', 'Airco': '❄️',
  'Schilder': '🖌️', 'Stukadoor': '🧱', 'Timmerman': '🪚', 'Hovenier': '🌿',
  'Dakdekker': '🏠', 'Witgoed monteur': '🧺', 'Laadpaal installateur': '🔌'
};

/* Prijsdata per klus — drie tarieftypes:
   mode: 'vast'     = vaste prijs incl. btw die de klant vooraf ziet
         'uur'      = uurtarief incl. btw + minimale afname (standaard 1 uur);
                      eindprijs op basis van urenregistratie van de vakman
         'aanvraag' = prijs op aanvraag; admin maakt een prijsvoorstel
   Flags per klus (standaard true): meerwerk, materiaal, parkeren.
   Admin kan tarieven aanpassen; overrides staan in localStorage. */
const KLUSSEN_DEFAULT = {
  'Elektricien': [
    { naam: 'Stopcontact plaatsen',            mode: 'vast',     prijs: 95,  duur: '1 uur' },
    { naam: 'Groep bijplaatsen',               mode: 'vast',     prijs: 175, duur: '1,5 uur' },
    { naam: 'Groepenkast inspectie',           mode: 'vast',     prijs: 89,  duur: '1 uur' },
    { naam: 'Elektricien op uurtarief',        mode: 'uur',      uurtarief: 79, minUren: 1, duur: 'per uur' },
    { naam: 'Laadpaal installatie intake',     mode: 'vast',     prijs: 49,  duur: '30 min' },
    { naam: 'Perilex aansluiting',             mode: 'vast',     prijs: 189, duur: '2 uur' }
  ],
  'Loodgieter': [
    { naam: 'Lekkage inspectie',               mode: 'vast',     prijs: 99,  duur: '1 uur' },
    { naam: 'Kraan vervangen',                 mode: 'vast',     prijs: 115, duur: '1 uur' },
    { naam: 'Afvoer ontstoppen',               mode: 'vast',     prijs: 129, duur: '1 uur' },
    { naam: 'Toilet reparatie',                mode: 'vast',     prijs: 125, duur: '1 uur' },
    { naam: 'Loodgieter op uurtarief',         mode: 'uur',      uurtarief: 75, minUren: 1, duur: 'per uur' }
  ],
  'CV / Verwarming': [
    { naam: 'CV storing diagnose',             mode: 'vast',     prijs: 119, duur: '1 uur' },
    { naam: 'Radiator plaatsen',               mode: 'vast',     prijs: 149, duur: '1,5 uur' },
    { naam: 'Thermostaat vervangen',           mode: 'vast',     prijs: 99,  duur: '45 min' },
    { naam: 'CV-monteur op uurtarief',         mode: 'uur',      uurtarief: 82, minUren: 1, duur: 'per uur' }
  ],
  'Airco': [
    { naam: 'Airco onderhoud',                 mode: 'vast',     prijs: 129, duur: '1 uur' },
    { naam: 'Airco installatie intake',        mode: 'vast',     prijs: 49,  duur: '30 min' }
  ],
  'Schilder': [
    { naam: 'Kleine schilderklus intake',      mode: 'vast',     prijs: 49,  duur: '30 min' },
    { naam: 'Schilder op uurtarief',           mode: 'uur',      uurtarief: 58, minUren: 2, duur: 'per uur' },
    { naam: 'Binnenschilderwerk',              mode: 'aanvraag', prijs: null, duur: 'op aanvraag' }
  ],
  'Stukadoor': [
    { naam: 'Stucwerk intake',                 mode: 'vast',     prijs: 49,  duur: '30 min' },
    { naam: 'Stucwerk per m² (indicatie)',     mode: 'aanvraag', prijs: null, duur: 'per m²' }
  ],
  'Timmerman': [
    { naam: 'Deur afhangen',                   mode: 'vast',     prijs: 125, duur: '1 uur' },
    { naam: 'Kleine timmerklus',               mode: 'vast',     prijs: 95,  duur: '1 uur' },
    { naam: 'Timmerman op uurtarief',          mode: 'uur',      uurtarief: 68, minUren: 1, duur: 'per uur' }
  ],
  'Hovenier': [
    { naam: 'Tuinonderhoud',                   mode: 'vast',     prijs: 95,  duur: '2 uur' },
    { naam: 'Snoeiwerk',                       mode: 'vast',     prijs: 99,  duur: '2 uur' },
    { naam: 'Hovenier op uurtarief',           mode: 'uur',      uurtarief: 55, minUren: 2, duur: 'per uur' }
  ],
  'Dakdekker': [
    { naam: 'Dakinspectie',                    mode: 'vast',     prijs: 99,  duur: '1 uur' },
    { naam: 'Dakgoot reparatie',               mode: 'vast',     prijs: 125, duur: '1,5 uur' }
  ],
  'Witgoed monteur': [
    { naam: 'Wasmachine aansluiten',           mode: 'vast',     prijs: 79,  duur: '45 min' },
    { naam: 'Vaatwasser aansluiten',           mode: 'vast',     prijs: 89,  duur: '45 min' }
  ],
  'Laadpaal installateur': [
    { naam: 'Laadpaal intake/offerte',         mode: 'vast',     prijs: 49,  duur: '30 min' },
    { naam: 'Laadpaal installatie',            mode: 'aanvraag', prijs: null, duur: 'op aanvraag' }
  ]
};

/* Admin kan tarieven beheren: overrides per "vakgebied||klusnaam".
   Override-velden: mode, prijs, uurtarief, minUren, meerwerk, materiaal, parkeren. */
function getKlusOverrides() { return Store.get(TBL.tarieven, {}); }
function saveKlusOverride(vakgebied, klusNaam, patch) {
  const o = getKlusOverrides();
  const key = vakgebied + '||' + klusNaam;
  o[key] = { ...(o[key] || {}), ...patch };
  Store.set(TBL.tarieven, o);
}
function getKlusData(vakgebied, klusNaam) {
  const base = (KLUSSEN_DEFAULT[vakgebied] || []).find(k => k.naam === klusNaam);
  if (!base) return null;
  const ov = getKlusOverrides()[vakgebied + '||' + klusNaam] || {};
  const d = { meerwerk: true, materiaal: true, parkeren: true, minUren: getSettings().minUren, ...base, ...ov };
  if (d.mode === 'vanaf') d.mode = 'vast'; // legacy
  return d;
}
function getKlussenVoor(vakgebied) {
  return (KLUSSEN_DEFAULT[vakgebied] || []).map(k => getKlusData(vakgebied, k.naam));
}
// Compat: bestaande code itereert over KLUSSEN
const KLUSSEN = KLUSSEN_DEFAULT;

/* Dynamische vragen per klus (stap 3 van de flow).
   Fallback = generieke vragen als een klus geen eigen set heeft. */
const VRAGEN_GENERIEK = [
  { id: 'urgentie', label: 'Hoe snel moet het gebeuren?', type: 'select', opties: ['Geen haast', 'Binnen een week', 'Zo snel mogelijk'] },
  { id: 'toegang',  label: 'Is de locatie goed bereikbaar?', type: 'select', opties: ['Ja', 'Nee, beperkt', 'Weet ik niet'] }
];
const VRAGEN = {
  'Stopcontact plaatsen': [
    { id: 'aantal',   label: 'Hoeveel stopcontacten?', type: 'select', opties: ['1', '2', '3', '4 of meer'] },
    { id: 'wand',     label: 'Type wand', type: 'select', opties: ['Steen/beton', 'Gipsplaat', 'Hout', 'Weet ik niet'] },
    { id: 'aarding',  label: 'Is er een geaarde groep aanwezig?', type: 'select', opties: ['Ja', 'Nee', 'Weet ik niet'] }
  ],
  'Lekkage inspectie': [
    { id: 'locatie',  label: 'Waar lekt het?', type: 'select', opties: ['Keuken', 'Badkamer', 'Toilet', 'Anders'] },
    { id: 'duur',     label: 'Hoe lang speelt het al?', type: 'select', opties: ['Vandaag begonnen', 'Enkele dagen', 'Langer dan een week'] }
  ],
  'CV storing diagnose': [
    { id: 'merk',     label: 'Merk ketel', type: 'text', placeholder: 'Bijv. Intergas, Remeha' },
    { id: 'foutcode', label: 'Foutcode op display (indien zichtbaar)', type: 'text', placeholder: 'Bijv. F28' }
  ],
  'Radiator plaatsen': [
    { id: 'aantal',   label: 'Aantal radiatoren', type: 'select', opties: ['1', '2', '3 of meer'] },
    { id: 'aansluiting', label: 'Zijn er al aansluitpunten?', type: 'select', opties: ['Ja', 'Nee', 'Weet ik niet'] }
  ],
  'Wasmachine aansluiten': [
    { id: 'aanwezig', label: 'Zijn aan- en afvoer aanwezig?', type: 'select', opties: ['Ja', 'Nee', 'Weet ik niet'] }
  ]
};
function getVragen(klusNaam) { return VRAGEN[klusNaam] || VRAGEN_GENERIEK; }

/* =====================================================
   PRIJSENGINE
   Berekent een complete prijsopbouw met rolgebaseerde velden.
   - Klant ziet:  klusprijs, toeslagen, servicekosten, btw, totaal
   - Vakman ziet: alleen vergoedingVakmanExcl
   - Admin ziet:  alles incl. marge
===================================================== */
function isAvond(tijd) {
  if (!tijd) return false;
  const uur = parseInt(String(tijd).split(':')[0], 10);
  return !isNaN(uur) && uur >= 18;
}

/* Toeslagen op basis van spoed/datum/tijd (alle incl. btw) */
function berekenToeslagen(opties = {}) {
  const s = getSettings();
  return {
    spoedtoeslag:   opties.spoed ? s.spoedtoeslag : 0,
    avondtoeslag:   isAvond(opties.tijd) ? s.avondtoeslag : 0,
    weekendtoeslag: isWeekend(opties.datum) ? s.weekendtoeslag : 0
  };
}

/* Centrale verdeling van een werkbedrag (incl. btw) + servicekosten
   naar klanttotaal, btw, vakmanvergoeding excl. en Fixli-marge excl. */
function verdeelBedrag(werkIncl, servicekosten) {
  const s = getSettings();
  const totaal        = round2(werkIncl + servicekosten);
  const subtotaalExcl = round2(totaal / (1 + s.btwTarief));
  const btw           = round2(totaal - subtotaalExcl);
  const werkExcl      = round2(werkIncl / (1 + s.btwTarief));
  const vergoedingVakmanExcl = round2(werkExcl * s.vakmanShare);
  const margeFixliExcl       = round2(subtotaalExcl - vergoedingVakmanExcl);
  return { totaal, subtotaalExcl, btw, vergoedingVakmanExcl, margeFixliExcl };
}

/* Prijsberekening bij het aanvragen.
   - vast:     klant ziet vaste prijs incl. btw + servicekosten + totaal
   - uur:      klant ziet uurtarief incl. btw + minimale afname; eindprijs
               volgt uit de urenregistratie van de vakman
   - aanvraag: Fixli beoordeelt eerst; admin maakt een prijsvoorstel */
function berekenPrijs(vakgebied, klusNaam, opties = {}) {
  const s = getSettings();
  const data = getKlusData(vakgebied, klusNaam);
  const t = berekenToeslagen(opties);

  if (!data || data.mode === 'aanvraag') {
    return {
      mode: 'aanvraag', klusprijs: 0, uurtarief: 0, minUren: 0,
      ...t, spoedtoeslag: 0, avondtoeslag: 0, weekendtoeslag: 0,
      servicekosten: 0, btw: 0, totaal: 0, subtotaalExcl: 0,
      vergoedingVakmanExcl: 0, margeFixliExcl: 0,
      duur: data ? data.duur : 'op aanvraag',
      meerwerk: data ? data.meerwerk : true, materiaal: data ? data.materiaal : true, parkeren: data ? data.parkeren : true
    };
  }

  if (data.mode === 'uur') {
    // Indicatie/boeking o.b.v. minimale afname; afrekening volgt na urenregistratie.
    const minUren = data.minUren || s.minUren;
    const uurtarief = data.uurtarief;
    const werkIncl = round2(uurtarief * minUren + t.spoedtoeslag + t.avondtoeslag + t.weekendtoeslag);
    const v = verdeelBedrag(werkIncl, s.servicekosten);
    const vergoedingPerUurExcl = round2((uurtarief / (1 + s.btwTarief)) * s.vakmanShare);
    return {
      mode: 'uur', uurtarief, minUren, klusprijs: round2(uurtarief * minUren),
      ...t, servicekosten: s.servicekosten, ...v, vergoedingPerUurExcl,
      duur: data.duur, meerwerk: data.meerwerk, materiaal: data.materiaal, parkeren: data.parkeren
    };
  }

  // Vaste prijs
  const klusprijs = data.prijs;
  const werkIncl = round2(klusprijs + t.spoedtoeslag + t.avondtoeslag + t.weekendtoeslag);
  const v = verdeelBedrag(werkIncl, s.servicekosten);
  return {
    mode: 'vast', klusprijs, uurtarief: 0, minUren: 0,
    ...t, servicekosten: s.servicekosten, ...v,
    duur: data.duur, meerwerk: data.meerwerk, materiaal: data.materiaal, parkeren: data.parkeren
  };
}
function round2(n) { return Math.round(n * 100) / 100; }

function tariefLabel(mode) {
  return { vast: 'Vaste prijs', uur: 'Uurtarief', aanvraag: 'Prijs op aanvraag' }[mode] || mode;
}

/* =====================================================
   URENREGISTRATIE (bij uurtarief)
   Vakman vult start/eind/pauze in; systeem rekent automatisch
   met de minimale afname en werkt de klusprijs bij.
===================================================== */
function berekenUren(start, eind, pauzeMin = 0) {
  const [sh, sm] = String(start).split(':').map(Number);
  const [eh, em] = String(eind).split(':').map(Number);
  let min = (eh * 60 + em) - (sh * 60 + sm) - (Number(pauzeMin) || 0);
  if (isNaN(min) || min < 0) min = 0;
  return round2(min / 60);
}

function registreerUren(klusId, { start, eind, pauzeMin = 0, beschrijving = '' }) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === klusId);
  if (!k || k.prijs.mode !== 'uur') return null;
  const s = getSettings();
  const gewerkt = berekenUren(start, eind, pauzeMin);
  const minUren = k.prijs.minUren || s.minUren;
  const uren = Math.max(gewerkt, minUren); // minimale afname
  const t = { spoedtoeslag: k.prijs.spoedtoeslag || 0, avondtoeslag: k.prijs.avondtoeslag || 0, weekendtoeslag: k.prijs.weekendtoeslag || 0 };
  const werkIncl = round2(k.prijs.uurtarief * uren + t.spoedtoeslag + t.avondtoeslag + t.weekendtoeslag);
  const v = verdeelBedrag(werkIncl, s.servicekosten);
  k.uren = { start, eind, pauzeMin: Number(pauzeMin) || 0, gewerkt, berekend: uren, beschrijving, status: 'wacht_controle', ingevuld_op: new Date().toISOString() };
  k.prijs = { ...k.prijs, klusprijs: werkIncl, ...v };
  Store.set(TBL.klussen, klussen);
  audit('Uren geregistreerd', `${k.klus}: ${uren} uur (gewerkt ${gewerkt}, min. ${minUren})`);
  return k;
}

/* =====================================================
   EXTRA KOSTEN & MEERWERK
   Mogen nooit automatisch definitief worden: klant en/of
   admin moeten akkoord geven vóór facturatie.
===================================================== */
const EXTRA_TYPES = ['Materiaal', 'Parkeren', 'Meerwerk', 'Spoedmateriaal', 'Overige kosten'];
const EXTRA_STATUS = {
  concept:        { label: 'Concept',                badge: 'badge--gray' },
  wacht_klant:    { label: 'Wacht op akkoord klant', badge: 'badge--orange' },
  akkoord_klant:  { label: 'Akkoord klant',          badge: 'badge--green' },
  wacht_controle: { label: 'Wacht op controle Fixli',badge: 'badge--orange' },
  goedgekeurd:    { label: 'Goedgekeurd',            badge: 'badge--green' },
  afgewezen:      { label: 'Afgewezen',              badge: 'badge--red' },
  gefactureerd:   { label: 'Gefactureerd',           badge: 'badge--blue' }
};

function voegExtraKostToe(klusId, { type, omschrijving, bedragExcl, bewijs = '' }) {
  if (!omschrijving || !(bedragExcl > 0)) return null;
  const lijst = Store.get(TBL.extrakosten, []);
  const item = {
    id: uid('ek_'), klusId, type, omschrijving, bedragExcl: round2(+bedragExcl),
    bewijs, status: 'wacht_klant', aangemaakt: new Date().toISOString()
  };
  lijst.push(item);
  Store.set(TBL.extrakosten, lijst);
  return item;
}
function extraKostenVoorKlus(klusId) {
  return Store.get(TBL.extrakosten, []).filter(e => e.klusId === klusId);
}
function zetExtraKostStatus(id, status) {
  const lijst = Store.get(TBL.extrakosten, []);
  const e = lijst.find(x => x.id === id);
  if (!e) return;
  e.status = status;
  // Klant akkoord → daarna nog controle door Fixli
  if (status === 'akkoord_klant') e.status = 'wacht_controle';
  Store.set(TBL.extrakosten, lijst);
  return e;
}
/* Alleen goedgekeurde extra kosten tellen mee in de factuur */
function goedgekeurdeExtraKosten(klusId) {
  return extraKostenVoorKlus(klusId).filter(e => e.status === 'goedgekeurd' || e.status === 'gefactureerd');
}

/* =====================================================
   STATUSSEN (volledige levenscyclus uit de spec)
===================================================== */
const KLUS_STATUS = {
  concept:           { label: 'Concept',                    badge: 'badge--gray' },
  wacht_controle:    { label: 'Wacht op controle Fixli',    badge: 'badge--orange' },
  prijsvoorstel:     { label: 'Prijsvoorstel — wacht op klant', badge: 'badge--orange' },
  beschikbaar:       { label: 'Beschikbaar voor vakmannen', badge: 'badge--blue' },
  geaccepteerd:      { label: 'Geaccepteerd door vakman',   badge: 'badge--green' },
  ingepland:         { label: 'Ingepland',                  badge: 'badge--green' },
  onderweg:          { label: 'Onderweg',                   badge: 'badge--green' },
  uitgevoerd:        { label: 'Uitgevoerd',                 badge: 'badge--green' },
  wacht_betaling:    { label: 'Wacht op betaling',          badge: 'badge--orange' },
  factuur_verzonden: { label: 'Factuur verzonden',          badge: 'badge--blue' },
  betaald:           { label: 'Betaald',                    badge: 'badge--blue' },
  afgerond:          { label: 'Afgerond',                   badge: 'badge--blue' },
  afgewezen:         { label: 'Afgewezen',                  badge: 'badge--red' },
  geannuleerd:       { label: 'Geannuleerd',                badge: 'badge--gray' }
};
function statusLabel(s) { return (KLUS_STATUS[s] || { label: s }).label; }
function statusBadge(s) { return (KLUS_STATUS[s] || { badge: 'badge--gray' }).badge; }

const VAKMAN_STATUS = {
  nieuw:                { label: 'Nieuw',                badge: 'badge--gray' },
  wacht_op_goedkeuring: { label: 'Wacht op controle',   badge: 'badge--orange' },
  documenten_ontbreken: { label: 'Documenten ontbreken', badge: 'badge--orange' },
  goedgekeurd:          { label: 'Goedgekeurd',         badge: 'badge--green' },
  afgewezen:            { label: 'Afgewezen',           badge: 'badge--red' },
  gepauzeerd:           { label: 'Tijdelijk gepauzeerd', badge: 'badge--gray' },
  geblokkeerd:          { label: 'Geblokkeerd',         badge: 'badge--red' }
};

/* =====================================================
   NOTIFICATIES / E-MAIL (simulatie)
   >> BACKEND: vervang sendEmail() door echte mailservice
   (Resend / SendGrid / Mailgun) via je API.
===================================================== */
function sendEmail(to, email, subject, body, klusId = null) {
  const log = Store.get(TBL.notif, []);
  log.unshift({
    id: uid('mail_'), to, email, subject, body, klusId,
    time: new Date().toISOString()
  });
  Store.set(TBL.notif, log);
  // >> BACKEND: await fetch('/api/email', { method:'POST', body: JSON.stringify({to,email,subject,body}) })
}

/* Audit-log voor adminacties */
function audit(actie, detail = '') {
  const log = Store.get(TBL.auditlog, []);
  log.unshift({ id: uid('log_'), actie, detail, time: new Date().toISOString() });
  Store.set(TBL.auditlog, log);
}

/* =====================================================
   MATCHING
   Een klus is zichtbaar voor een vakman als:
   - klus status 'beschikbaar'
   - vakman goedgekeurd
   - vakgebied komt overeen
   - postcode valt binnen werkgebied (2-cijferige prefix)
===================================================== */
function postcodePrefix(pc) {
  return (pc || '').replace(/\s/g, '').slice(0, 2);
}
function vakmanMatchtKlus(vakman, klus) {
  if (!vakman || vakman.status !== 'goedgekeurd') return false;
  if (vakman.beschikbaar === false) return false; // vakman heeft zich op niet-beschikbaar gezet
  if (klus.status !== 'beschikbaar') return false;
  if (!(vakman.vakgebieden || []).includes(klus.vakgebied)) return false;
  const gebieden = (vakman.werkgebied || []).map(g => String(g).trim());
  if (!gebieden.length) return true; // geen werkgebied ingesteld = overal
  return gebieden.includes(postcodePrefix(klus.postcode));
}
/* Grove afstandsindicatie o.b.v. postcodecijfers (demo).
   >> BACKEND: echte afstand via geocoding/route-API. */
function afstandIndicatie(vakman, klus) {
  const a = parseInt((vakman.vestigingsPostcode || '').slice(0, 4) || postcodePrefix(vakman.werkgebied?.[0] || '38') + '11', 10);
  const b = parseInt(String(klus.postcode || '').replace(/\s/g, '').slice(0, 4), 10);
  if (isNaN(a) || isNaN(b)) return '< 25 km';
  const d = Math.abs(a - b);
  if (d === 0) return '< 5 km';
  if (d <= 10) return '± 5–15 km';
  if (d <= 50) return '± 15–35 km';
  return '> 35 km';
}
function beschikbareKlussenVoor(vakman) {
  return Store.get(TBL.klussen, []).filter(k => vakmanMatchtKlus(vakman, k));
}

/* =====================================================
   FACTUREN
===================================================== */
function maakFactuur(klus) {
  const facturen = Store.get(TBL.facturen, []);
  const bestaand = facturen.find(f => f.klusId === klus.id);
  if (bestaand) return bestaand; // al aangemaakt
  const s = getSettings();
  s.factuurTeller += 1;
  saveSettings(s);
  const nummer = 'FXL-2026-' + String(s.factuurTeller).padStart(6, '0');

  // Goedgekeurde extra kosten meenemen (klant + Fixli hebben akkoord gegeven)
  const extras = goedgekeurdeExtraKosten(klus.id);
  const extraExcl = round2(extras.reduce((t, e) => t + e.bedragExcl, 0));
  const extraIncl = round2(extraExcl * (1 + s.btwTarief));
  extras.forEach(e => zetExtraKostStatus(e.id, 'gefactureerd'));

  const totaal        = round2(klus.prijs.totaal + extraIncl);
  const subtotaalExcl = round2(totaal / (1 + s.btwTarief));
  const btw           = round2(totaal - subtotaalExcl);
  // Extra kosten zijn doorbelaste kosten van de vakman → volledig naar vakman
  const vakmanUitbetaling = round2(klus.prijs.vergoedingVakmanExcl + extraExcl);
  const margeFixli = round2(subtotaalExcl - vakmanUitbetaling);

  const factuur = {
    id: uid('fac_'), nummer, klusId: klus.id, datum: new Date().toISOString(),
    klant: { naam: klus.naam, email: klus.email, adres: klus.adres, postcode: klus.postcode, plaats: klus.plaats },
    klusomschrijving: `${klus.klus} — ${klus.vakgebied}`,
    tarieftype: klus.prijs.mode,
    uren: klus.uren ? klus.uren.berekend : null,
    regels: [
      { omschrijving: klus.prijs.mode === 'uur'
          ? `${klus.klus} (${klus.uren ? klus.uren.berekend : klus.prijs.minUren} uur × ${euro(klus.prijs.uurtarief)})`
          : klus.klus,
        bedragIncl: klus.prijs.klusprijs },
      ...(klus.prijs.spoedtoeslag ? [{ omschrijving: 'Spoedtoeslag', bedragIncl: klus.prijs.spoedtoeslag }] : []),
      ...(klus.prijs.avondtoeslag ? [{ omschrijving: 'Avondtoeslag', bedragIncl: klus.prijs.avondtoeslag }] : []),
      ...(klus.prijs.weekendtoeslag ? [{ omschrijving: 'Weekendtoeslag', bedragIncl: klus.prijs.weekendtoeslag }] : []),
      ...extras.map(e => ({ omschrijving: `${e.type}: ${e.omschrijving}`, bedragIncl: round2(e.bedragExcl * (1 + s.btwTarief)) })),
      { omschrijving: 'Servicekosten Fixli', bedragIncl: klus.prijs.servicekosten }
    ],
    bedragExcl: subtotaalExcl, btw, servicekosten: klus.prijs.servicekosten, totaal,
    betaalstatus: klus.betaalstatus === 'betaald' ? 'betaald' : 'open',
    betaallink: 'https://betaal.fixli.demo/' + nummer, // >> BACKEND: Stripe/iDEAL payment link of QR
    vakmanUitbetaling, margeFixli, uitbetaalstatus: 'wacht',
    accepted_by: klus.accepted_by
  };
  facturen.push(factuur);
  Store.set(TBL.facturen, facturen);
  return factuur;
}

/* Klant betaalt de factuur (simulatie van betaallink/QR).
   >> BACKEND: webhook van Stripe/Mollie zet betaalstatus → betaald. */
function betaalFactuur(factuurId) {
  const facturen = Store.get(TBL.facturen, []);
  const f = facturen.find(x => x.id === factuurId);
  if (!f) return null;
  f.betaalstatus = 'betaald';
  f.betaald_op = new Date().toISOString();
  Store.set(TBL.facturen, facturen);
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === f.klusId);
  if (k) { k.betaalstatus = 'betaald'; k.status = 'afgerond'; Store.set(TBL.klussen, klussen); }
  return f;
}

/* Uitbetaling vakman: pas mogelijk als de factuur betaald is
   én er geen open klacht op de klus staat. */
function kanUitbetalen(factuur) {
  if (factuur.betaalstatus !== 'betaald') return { ok: false, reden: 'Factuur nog niet betaald door klant' };
  const openKlacht = Store.get(TBL.klachten, []).find(kl =>
    kl.klusId === factuur.klusId && !['opgelost', 'gesloten'].includes(kl.status));
  if (openKlacht) return { ok: false, reden: 'Open klacht op deze klus' };
  return { ok: true, reden: '' };
}
function geefUitbetalingVrij(factuurId) {
  const facturen = Store.get(TBL.facturen, []);
  const f = facturen.find(x => x.id === factuurId);
  if (!f) return null;
  const check = kanUitbetalen(f);
  if (!check.ok) return check;
  f.uitbetaalstatus = 'uitbetaald';
  f.uitbetaald_op = new Date().toISOString();
  Store.set(TBL.facturen, facturen);
  return { ok: true };
}

/* =====================================================
   ANNULERING (regels instelbaar in admin)
   - vóór acceptatie: gratis
   - na acceptatie: servicekosten binnen X uur vóór afspraak
   - vakman onderweg: + voorrijkosten
===================================================== */
function annuleringsKosten(klus) {
  const s = getSettings();
  if (['concept', 'wacht_controle', 'prijsvoorstel', 'beschikbaar'].includes(klus.status)) {
    return { bedrag: 0, uitleg: 'Gratis annuleren — de klus is nog niet geaccepteerd.' };
  }
  let bedrag = 0; const delen = [];
  if (klus.status === 'onderweg') {
    bedrag += s.voorrijkosten; delen.push(`voorrijkosten ${euro(s.voorrijkosten)}`);
  }
  const afspraak = new Date(`${klus.datum}T${klus.tijd || '09:00'}`);
  const urenTot = (afspraak - new Date()) / 36e5;
  if (urenTot <= s.annuleringBinnenUren) {
    bedrag += s.servicekosten; delen.push(`servicekosten ${euro(s.servicekosten)} (binnen ${s.annuleringBinnenUren} uur vóór de afspraak)`);
  }
  return {
    bedrag: round2(bedrag),
    uitleg: bedrag > 0
      ? `Bij annuleren wordt in rekening gebracht: ${delen.join(' + ')}.`
      : 'Annuleren is op dit moment kosteloos.'
  };
}

/* =====================================================
   PRIJSVOORSTEL (bij "prijs op aanvraag")
   Admin beoordeelt de aanvraag en stelt een prijs voor;
   klant accepteert (→ beschikbaar) of annuleert.
===================================================== */
function maakPrijsvoorstel(klusId, bedragIncl, toelichting = '') {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === klusId);
  if (!k) return null;
  const s = getSettings();
  const werkIncl = round2(+bedragIncl);
  const v = verdeelBedrag(werkIncl, s.servicekosten);
  k.prijs = { ...k.prijs, mode: 'vast', klusprijs: werkIncl, servicekosten: s.servicekosten, ...v };
  k.prijsvoorstel = { bedragIncl: werkIncl, toelichting, gedaan_op: new Date().toISOString() };
  k.status = 'prijsvoorstel';
  Store.set(TBL.klussen, klussen);
  sendEmail('klant', k.email, 'Prijsvoorstel voor uw aanvraag',
    `Fixli heeft uw aanvraag "${k.klus}" beoordeeld. Voorgestelde prijs: ${euro(v.totaal)} incl. btw en servicekosten. Bekijk en accepteer het voorstel via uw boekingspagina.`, k.id);
  return k;
}
function reageerOpPrijsvoorstel(klusId, akkoord) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === klusId);
  if (!k || k.status !== 'prijsvoorstel') return null;
  k.status = akkoord ? 'beschikbaar' : 'geannuleerd';
  Store.set(TBL.klussen, klussen);
  sendEmail('admin', getSettings().adminEmail,
    akkoord ? 'Prijsvoorstel geaccepteerd' : 'Prijsvoorstel afgewezen',
    `Klant heeft het prijsvoorstel voor "${k.klus}" ${akkoord ? 'geaccepteerd; de klus staat nu open voor vakmannen' : 'afgewezen; de aanvraag is geannuleerd'}.`, k.id);
  return k;
}

/* =====================================================
   AANVRAAG VOLGEN ZONDER ACCOUNT
   Elke aanvraag krijgt een volgcode; klant kan met
   e-mailadres + volgcode de status bekijken.
===================================================== */
function maakVolgcode() {
  return 'FX-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}
function zoekKlusOpVolgcode(email, volgcode) {
  return Store.get(TBL.klussen, []).find(k =>
    k.email && k.email.toLowerCase() === String(email).toLowerCase().trim() &&
    k.volgcode === String(volgcode).toUpperCase().trim()) || null;
}

/* =====================================================
   DEMO DATA — vooraf gevuld zodat alle schermen tonen
   !! LET OP: wachtwoorden staan hier plain-text, alleen
   acceptabel voor deze lokale demo. In de live-versie:
   >> BACKEND: authenticatie via Supabase Auth / NextAuth,
   nooit zelf wachtwoorden in een database opslaan.
===================================================== */
function initDemoData() {
  if (Store.get(TBL.init)) return;

  const now = new Date().toISOString();
  const mk = (vg, kn, opts) => {
    const prijs = berekenPrijs(vg, kn, opts);
    return { id: uid('klus_'), vakgebied: vg, klus: kn, prijs, created_at: now, accepted_by: null, volgcode: maakVolgcode(), ...opts };
  };

  const klussen = [
    {
      ...mk('Loodgieter', 'Afvoer ontstoppen', { spoed: false, datum: '2026-07-10' }),
      status: 'beschikbaar', antwoorden: {},
      beschrijving: 'Afvoer in de keuken loopt slecht door, zelf doorspoelen helpt niet.',
      postcode: '3811 AB', plaats: 'Amersfoort', adres: 'Keizersgracht 12',
      tijd: '09:00', naam: 'Jan de Vries', telefoon: '06-12345678', email: 'jan@email.nl',
      betaalstatus: 'achteraf', goedgekeurd_op: now
    },
    {
      ...mk('Loodgieter', 'Loodgieter op uurtarief', { spoed: false, datum: '2026-07-09' }),
      status: 'beschikbaar', antwoorden: {},
      beschrijving: 'Meerdere kleine klusjes: kraan ontkalken, stortbak afstellen, sifon checken.',
      postcode: '3813 GH', plaats: 'Amersfoort', adres: 'Bergstraat 21',
      tijd: '10:00', naam: 'Jan de Vries', telefoon: '06-12345678', email: 'jan@email.nl',
      betaalstatus: 'achteraf', goedgekeurd_op: now
    },
    {
      ...mk('Loodgieter', 'Kraan vervangen', { spoed: true, datum: '2026-07-08' }),
      status: 'geaccepteerd', accepted_by: 'vakman_1', antwoorden: {},
      beschrijving: 'Keukenkraan lekt en moet vervangen worden.',
      postcode: '3812 CD', plaats: 'Amersfoort', adres: 'Langegracht 5',
      tijd: '13:00', naam: 'Maria Jansen', telefoon: '06-87654321', email: 'maria@email.nl',
      betaalstatus: 'achteraf'
    },
    {
      ...mk('Schilder', 'Binnenschilderwerk', { spoed: false, datum: '2026-07-20' }),
      status: 'wacht_controle', antwoorden: {},
      beschrijving: 'Woonkamer en gang schilderen, ca. 60 m² muur.',
      postcode: '3821 EF', plaats: 'Amersfoort', adres: 'Soesterweg 88',
      tijd: '', naam: 'Peter Smit', telefoon: '06-11223344', email: 'peter@email.nl',
      betaalstatus: 'achteraf'
    }
  ];

  const vakmannen = [
    {
      id: 'vakman_1', bedrijfsnaam: 'Loodgietersbedrijf Hendrix', naam: 'Rob Hendrix',
      email: 'rob@hendrix-loodgieter.nl', telefoon: '06-55667788', password: 'demo123',
      kvk: '12345678', btw: 'NL123456789B01', iban: 'NL12RABO0123456789',
      vestigingsadres: 'Stationsplein 4', plaats: 'Amersfoort', werkgebied: ['38', '35'],
      vakgebieden: ['Loodgieter', 'CV / Verwarming'], ervaring: 15, tarief: '65',
      beschikbaarheid: 'Ma-vr', beschikbaar: true,
      documenten: [
        { naam: 'KvK-uittreksel.pdf', verlooptOp: '2027-01-15' },
        { naam: 'VCA.pdf', verlooptOp: '2026-07-01' },          // verloopt binnenkort → waarschuwing
        { naam: 'AVB-verzekering.pdf', verlooptOp: '2026-12-31' }
      ],
      status: 'goedgekeurd', aangemeld: now
    },
    {
      id: 'vakman_2', bedrijfsnaam: 'Electra Pro BV', naam: 'Sven Willems',
      email: 'sven@electrapro.nl', telefoon: '06-44556677', password: 'demo123',
      kvk: '87654321', btw: 'NL987654321B01', iban: 'NL34INGB0987654321',
      vestigingsadres: 'Industrieweg 22', plaats: 'Amersfoort', werkgebied: ['38'],
      vakgebieden: ['Elektricien', 'Laadpaal installateur'], ervaring: 8, tarief: '70',
      beschikbaarheid: 'Ma-za', beschikbaar: true,
      documenten: [{ naam: 'KvK-uittreksel.pdf', verlooptOp: '2027-03-01' }],
      status: 'wacht_op_goedkeuring', aangemeld: now
    }
  ];

  const users = [
    { id: 'user_1', naam: 'Jan de Vries', email: 'jan@email.nl', telefoon: '06-12345678', password: 'demo123', type: 'klant' }
  ];

  Store.set(TBL.klussen, klussen);
  Store.set(TBL.vakmannen, vakmannen);
  Store.set(TBL.users, users);
  Store.set(TBL.reviews, []);
  Store.set(TBL.klachten, []);
  Store.set(TBL.facturen, []);
  Store.set(TBL.notif, []);
  Store.set(TBL.auditlog, []);
  saveSettings(DEFAULT_SETTINGS);
  Store.set(TBL.init, true);

  // Factuur voor de al-geaccepteerde demo-klus
  const accepted = Store.get(TBL.klussen, []).find(k => k.accepted_by === 'vakman_1');
  if (accepted) maakFactuur(accepted);
}

/* =====================================================
   DATA-MIGRATIE
   Bezoekers van een eerdere versie kunnen oude data in
   localStorage hebben staan (ander prijsschema, geen
   volgcode, documenten als strings). Dit normaliseert
   alles zodat de UI nooit breekt op oude data.
===================================================== */
function migreerData() {
  try {
    // Oude init-sleutels van eerdere versies opruimen
    ['fixli_init', 'fixli_init_v2'].forEach(k => localStorage.removeItem(k));

    let klussen = Store.get(TBL.klussen, []);
    if (!Array.isArray(klussen)) { localStorage.removeItem(TBL.klussen); localStorage.removeItem(TBL.init); initDemoData(); return; }
    let dirty = false;
    klussen.forEach(k => {
      if (!k.prijs || typeof k.prijs !== 'object') {
        k.prijs = berekenPrijs(k.vakgebied, k.klus, { spoed: k.spoed, datum: k.datum, tijd: k.tijd });
        dirty = true;
      }
      if (k.prijs.mode === 'vanaf') { k.prijs.mode = 'vast'; dirty = true; }
      if (!('avondtoeslag' in k.prijs)) { k.prijs.avondtoeslag = 0; dirty = true; }
      if (typeof k.prijs.vergoedingVakmanExcl !== 'number') { k.prijs.vergoedingVakmanExcl = 0; dirty = true; }
      if (typeof k.prijs.margeFixliExcl !== 'number') { k.prijs.margeFixliExcl = 0; dirty = true; }
      if (!k.volgcode) { k.volgcode = maakVolgcode(); dirty = true; }
      if (!k.betaalstatus) { k.betaalstatus = 'achteraf'; dirty = true; }
      if (!(k.status in KLUS_STATUS)) { k.status = 'wacht_controle'; dirty = true; }
    });
    if (dirty) Store.set(TBL.klussen, klussen);

    let vakmannen = Store.get(TBL.vakmannen, []);
    if (!Array.isArray(vakmannen)) { localStorage.removeItem(TBL.vakmannen); localStorage.removeItem(TBL.init); initDemoData(); return; }
    let vDirty = false;
    vakmannen.forEach(v => {
      if (typeof v.beschikbaar === 'undefined') { v.beschikbaar = true; vDirty = true; }
      if (Array.isArray(v.documenten) && v.documenten.some(d => typeof d === 'string')) {
        v.documenten = v.documenten.map(d => typeof d === 'string' ? { naam: d, verlooptOp: null } : d);
        vDirty = true;
      }
    });
    if (vDirty) Store.set(TBL.vakmannen, vakmannen);
  } catch (e) {
    // Onleesbare/corrupte data: opnieuw beginnen met verse demo-data
    console.error('Fixli datamigratie mislukt — opnieuw initialiseren', e);
    [TBL.klussen, TBL.vakmannen, TBL.users, TBL.facturen, TBL.extrakosten, TBL.init].forEach(k => localStorage.removeItem(k));
    initDemoData();
  }
}
