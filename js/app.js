/* ============================================================
   FIXLI — app.js
   UI-laag: navigatie, aanvraagflow, klant/vakman/admin dashboards,
   reviews, klachten, facturen, notificaties.
   Leunt op store.js voor data en business logica.
   ============================================================ */

/* =====================================================
   NAVIGATIE — echte losse pagina's
   navigateTo() en data-page blijven werken voor JS-calls,
   maar leiden nu naar aparte HTML-bestanden.
===================================================== */
const PAGE_URLS = {
  'home':                 'index.html',
  'aanvragen':            'klus-aanvragen.html',
  'klant-dashboard':      'mijn-aanvragen.html',
  'vakman':               'voor-vakmannen.html',
  'vakman-aanmelden':     'vakman-aanmelden.html',
  'vakman-dashboard':     'vakman-dashboard.html',
  'admin':                'admin.html',
  'hoe-werkt-het':        'hoe-werkt-het.html',
  'over':                 'over-ons.html',
  'faq':                  'faq.html',
  'contact':              'contact.html',
  'voorwaarden':          'algemene-voorwaarden.html',
  'vakmanvoorwaarden':    'vakmanvoorwaarden.html',
  'privacy':              'privacybeleid.html',
  'cookies':              'cookiebeleid.html',
  'klachtenprocedure':    'klachtenprocedure.html',
  'annulering':           'annuleringsvoorwaarden.html'
};
function navigateTo(page) {
  const url = PAGE_URLS[page];
  if (url) window.location.href = url;
}

function initNav() {
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (link) { e.preventDefault(); navigateTo(link.dataset.page); }
  });
  qs('.navbar__hamburger')?.addEventListener('click', () =>
    qs('.navbar__mobile-menu')?.classList.toggle('open'));
  // Markeer actieve pagina in de navigatie
  const here = location.pathname.split('/').pop() || 'index.html';
  qsa('.navbar__nav a, .navbar__mobile-menu a').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === here);
  });
}

/* =====================================================
   HOME — hero zoek + vakgebied cards
===================================================== */
function initHome() {
  qs('#hero-search-btn')?.addEventListener('click', () => {
    const sel = qs('#hero-vakgebied');
    if (sel?.value) { startFlow(sel.value); }
    else sel?.focus();
  });
  // Vakgebied cards op home
  qs('#home-vakgebieden')?.addEventListener('click', e => {
    const card = e.target.closest('.vakgebied-card');
    if (card) startFlow(card.dataset.vak);
  });
  renderHomeVakgebieden();
  // Vul hero dropdown
  const sel = qs('#hero-vakgebied');
  if (sel) sel.innerHTML = '<option value="">Kies een vakgebied</option>' +
    Object.keys(KLUSSEN).map(v => `<option>${v}</option>`).join('');
}

function renderHomeVakgebieden() {
  const grid = qs('#home-vakgebieden');
  if (!grid) return;
  grid.innerHTML = Object.keys(KLUSSEN).map(v => `
    <div class="vakgebied-card" data-vak="${v}">
      <div class="vakgebied-card__icon">${VAKGEBIED_ICONS[v] || '🔧'}</div>
      <span>${v}</span>
    </div>`).join('');
}

/* =====================================================
   AANVRAAGFLOW (12 stappen, in JS gerenderd)
===================================================== */
const TOTAL_STEPS = 12;
const STEP_LABELS = ['Vakgebied', 'Klus', 'Vragen', "Foto's", 'Adres', 'Planning',
  'Spoed', 'Contact', 'Prijs', 'Voorwaarden', 'Betalen', 'Indienen'];

let flowState = {};
let flowStep = 1;

function resetFlow() {
  flowState = {
    vakgebied: '', klus: '', antwoorden: {}, fotos: [],
    postcode: '', plaats: '', adres: '', datum: '', tijd: '',
    spoed: false, naam: '', telefoon: '', email: '', akkoord: false, betaald: false
  };
  flowStep = 1;
}

function startFlow(vakgebied) {
  // Vanaf een andere pagina: vakgebied onthouden en naar de aanvraagpagina
  if (!qs('#flow-wrap')) {
    if (vakgebied) sessionStorage.setItem('fixli_start_vak', vakgebied);
    navigateTo('aanvragen');
    return;
  }
  resetFlow();
  if (vakgebied) flowState.vakgebied = vakgebied;
  // Prefill contact als ingelogd
  const u = Store.get(TBL.curUser);
  if (u) { flowState.naam = u.naam; flowState.email = u.email; flowState.telefoon = u.telefoon || ''; }
  qs('#flow-wrap')?.classList.remove('hidden');
  qs('#flow-success')?.classList.add('hidden');
  renderFlow(vakgebied ? 2 : 1);
}

function initFlow() {
  if (!qs('#flow-wrap')) return;
  qs('#flow-prev')?.addEventListener('click', () => { if (flowStep > 1) renderFlow(flowStep - 1); });
  qs('#flow-next')?.addEventListener('click', () => {
    if (saveStep(flowStep) && flowStep < TOTAL_STEPS) renderFlow(flowStep + 1);
  });
  qs('#flow-submit')?.addEventListener('click', submitAanvraag);
  // Vakgebied dat op de homepage gekozen is overnemen
  const startVak = sessionStorage.getItem('fixli_start_vak');
  sessionStorage.removeItem('fixli_start_vak');
  startFlow(startVak || '');
}

function renderFlow(step) {
  flowStep = step;
  // Progress
  const pct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  qs('#flow-fill') && (qs('#flow-fill').style.width = pct + '%');
  qs('#flow-step-label') && (qs('#flow-step-label').textContent = `Stap ${step} van ${TOTAL_STEPS} — ${STEP_LABELS[step - 1]}`);

  // Knoppen
  qs('#flow-prev').style.display = step === 1 ? 'none' : 'inline-flex';
  qs('#flow-next').style.display = step === TOTAL_STEPS ? 'none' : 'inline-flex';
  qs('#flow-submit').style.display = step === TOTAL_STEPS ? 'inline-flex' : 'none';

  qs('#flow-body').innerHTML = stepHTML(step);
  wireStep(step);
}

function stepHTML(step) {
  const f = flowState;
  switch (step) {
    case 1:
      return head('Kies een vakgebied', 'Waar heeft u hulp bij nodig?') +
        `<div class="vakgebieden-grid" id="flow-vak-grid">${Object.keys(KLUSSEN).map(v => `
          <div class="vakgebied-card${f.vakgebied === v ? ' selected' : ''}" data-vak="${v}">
            <div class="vakgebied-card__icon">${VAKGEBIED_ICONS[v]}</div><span>${v}</span>
          </div>`).join('')}</div>`;
    case 2: {
      const klussen = getKlussenVoor(f.vakgebied);
      const prijsTekst = k => {
        if (k.mode === 'aanvraag') return 'Prijs op aanvraag';
        if (k.mode === 'uur') return `${euro(k.uurtarief)} /uur · min. ${k.minUren} uur`;
        return 'vaste prijs ' + euro(k.prijs);
      };
      return head(`Kies uw klus — ${f.vakgebied}`, 'Selecteer wat het beste past. Alle prijzen zijn incl. btw.') +
        `<div class="klus-keuze" id="flow-klus-list">${klussen.map(k => `
          <button class="klus-keuze__item${f.klus === k.naam ? ' selected' : ''}" data-klus="${k.naam}">
            <span>${k.naam}<br><span style="font-size:.75rem;color:var(--gray-400)">${tariefLabel(k.mode)}</span></span>
            <span class="klus-keuze__prijs">${prijsTekst(k)}</span>
          </button>`).join('')}</div>`;
    }
    case 3: {
      const vragen = getVragen(f.klus);
      return head('Een paar korte vragen', 'Hoe duidelijker, hoe sneller een vakman kan accepteren.') +
        vragen.map(v => `
          <div class="form-group">
            <label>${v.label}</label>
            ${v.type === 'select'
              ? `<select data-vraag="${v.id}">${['<option value="">Maak een keuze</option>']
                  .concat(v.opties.map(o => `<option ${f.antwoorden[v.id] === o ? 'selected' : ''}>${o}</option>`)).join('')}</select>`
              : `<input data-vraag="${v.id}" placeholder="${v.placeholder || ''}" value="${esc(f.antwoorden[v.id] || '')}">`}
          </div>`).join('') +
        `<div class="form-group"><label>Korte omschrijving</label>
          <textarea id="flow-beschrijving" placeholder="Vertel kort wat er moet gebeuren...">${esc(f.beschrijving || '')}</textarea></div>`;
    }
    case 4:
      return head("Foto's uploaden", "Optioneel. Foto's helpen de vakman de klus goed in te schatten.") +
        `<div class="upload-area" id="flow-upload">
          <div class="upload-area__icon">📷</div>
          <p id="flow-upload-text">${f.fotos.length ? `✓ ${f.fotos.length} foto(\u2019s) toegevoegd` : "Klik om foto's toe te voegen (demo)"}</p>
          <input type="file" multiple accept="image/*">
        </div>`;
    case 5:
      return head('Adres', 'Het volledige adres wordt pas na acceptatie aan de vakman getoond.') +
        `<div class="form-row">
          <div class="form-group"><label>Postcode</label><input id="f-postcode" value="${esc(f.postcode)}" placeholder="3811 AB"></div>
          <div class="form-group"><label>Plaats</label><input id="f-plaats" value="${esc(f.plaats)}" placeholder="Amersfoort"></div>
        </div>
        <div class="form-group"><label>Straat en huisnummer</label><input id="f-adres" value="${esc(f.adres)}" placeholder="Keizersgracht 12"></div>`;
    case 6:
      return head('Gewenste datum en tijd', 'Wanneer komt het u het beste uit?') +
        `<div class="form-row">
          <div class="form-group"><label>Datum</label><input id="f-datum" type="date" value="${f.datum}"></div>
          <div class="form-group"><label>Tijd</label><input id="f-tijd" type="time" value="${f.tijd}"></div>
        </div>`;
    case 7:
      return head('Spoed?', 'Bij spoed proberen we zo snel mogelijk een vakman te koppelen. Hiervoor geldt een toeslag.') +
        `<div class="choice-row">
          <button class="choice${!f.spoed ? ' selected' : ''}" data-spoed="0"><strong>Nee, geen spoed</strong><span>Plan op gewenste datum</span></button>
          <button class="choice${f.spoed ? ' selected' : ''}" data-spoed="1"><strong>Ja, spoed</strong><span>+ ${euro(getSettings().spoedtoeslag)} toeslag</span></button>
        </div>`;
    case 8:
      return head('Uw contactgegevens', 'Deze worden pas gedeeld nadat een vakman de klus accepteert.') +
        `<div class="form-group"><label>Naam</label><input id="f-naam" value="${esc(f.naam)}" placeholder="Voor- en achternaam"></div>
        <div class="form-row">
          <div class="form-group"><label>Telefoonnummer</label><input id="f-telefoon" value="${esc(f.telefoon)}" placeholder="06..."></div>
          <div class="form-group"><label>E-mailadres</label><input id="f-email" type="email" value="${esc(f.email)}" placeholder="naam@email.nl"></div>
        </div>`;
    case 9: {
      const p = berekenPrijs(f.vakgebied, f.klus, { spoed: f.spoed, datum: f.datum, tijd: f.tijd });
      return head('Prijsopbouw', 'Zo is de prijs opgebouwd.') + prijsKaartKlant(p);
    }
    case 10:
      return head('Voorwaarden', 'Lees en accepteer de voorwaarden om door te gaan.') +
        `<div class="alert alert--info">Fixli is een bemiddelingsplatform. De vakman voert de werkzaamheden uit en is zelf verantwoordelijk voor de uitvoering. Betaling verloopt altijd via Fixli; betalingen buiten het platform om zijn niet toegestaan.</div>
        <label class="check-line"><input type="checkbox" id="f-akkoord" ${f.akkoord ? 'checked' : ''}>
          <span>Ik ga akkoord met de <a href="algemene-voorwaarden.html" target="_blank">algemene voorwaarden</a>, het <a href="privacybeleid.html" target="_blank">privacybeleid</a> en het anti-omzeilingsbeding.</span></label>`;
    case 11: {
      const p = berekenPrijs(f.vakgebied, f.klus, { spoed: f.spoed, datum: f.datum, tijd: f.tijd });
      if (p.mode === 'aanvraag') {
        return head('Betaling', 'Voor deze klus beoordeelt Fixli eerst uw aanvraag.') +
          `<div class="alert alert--info">U betaalt nu niets. Fixli beoordeelt uw aanvraag en stuurt een prijsvoorstel. Pas na uw akkoord wordt de klus ingepland en ontvangt u na afloop de factuur.</div>`;
      }
      if (p.mode === 'uur') {
        return head('Betaling', 'Bij uurtarief betaalt u na afloop op basis van de gewerkte uren.') +
          `<div class="pay-box">
            <div class="pay-box__row"><span>Indicatie (min. ${p.minUren} uur)</span><strong>${euro(p.totaal)}</strong></div>
            <div class="alert alert--info" style="margin-bottom:0">Na de klus vult de vakman de gewerkte uren in. U ontvangt dan een factuur met beveiligde betaallink en betaalt veilig via Fixli (iDEAL).</div>
          </div>`;
      }
      // Vaste prijs: standaard achteraf via betaallink; direct betalen kan ook
      return head('Betaling', 'U betaalt altijd veilig via Fixli — nooit rechtstreeks aan de vakman.') +
        `<div class="pay-box">
          <div class="pay-box__row"><span>Totaal incl. btw</span><strong>${euro(p.totaal)}</strong></div>
          <div class="choice-row" id="f-betaalwijze">
            <button class="choice${!f.betaald ? ' selected' : ''}" data-betaal="achteraf"><strong>Betaal na afloop</strong><span>Factuur met betaallink na de klus</span></button>
            <button class="choice${f.betaald ? ' selected' : ''}" data-betaal="vooraf"><strong>Direct betalen</strong><span>iDEAL · Bancontact · Creditcard</span></button>
          </div>
          <p class="pay-note">💳 Demo: er wordt geen echte betaling gedaan. <code>// BACKEND: Stripe/iDEAL koppelen</code></p>
        </div>`;
    }
    case 12: {
      const p = berekenPrijs(f.vakgebied, f.klus, { spoed: f.spoed, datum: f.datum, tijd: f.tijd });
      const prijsTekst = p.mode === 'aanvraag' ? 'Volgt na prijsvoorstel'
        : p.mode === 'uur' ? `${euro(p.uurtarief)} /uur (indicatie ${euro(p.totaal)})`
        : euro(p.totaal);
      return head('Controleer en dien in', 'Klopt alles? Verstuur dan uw aanvraag.') +
        `<div class="overzicht">
          ${ovItem('Vakgebied', esc(f.vakgebied))}
          ${ovItem('Klus', esc(f.klus) + ' · ' + tariefLabel(p.mode))}
          ${ovItem('Omschrijving', esc(f.beschrijving || '—'))}
          ${ovItem('Adres', esc(`${f.adres}, ${f.postcode} ${f.plaats}`))}
          ${ovItem('Datum / tijd', `${fmtDate(f.datum)} ${esc(f.tijd || '')}`)}
          ${ovItem('Spoed', f.spoed ? 'Ja' : 'Nee')}
          ${ovItem('Contact', esc(`${f.naam} · ${f.telefoon} · ${f.email}`))}
          ${ovItem('Prijs', prijsTekst)}
          ${ovItem('Betaling', p.mode === 'aanvraag' ? 'Na prijsvoorstel' : (f.betaald ? 'Vooraf betaald (demo)' : 'Na afloop via betaallink'))}
        </div>`;
    }
  }
  return '';
}

function head(t, s) { return `<h3>${t}</h3><p class="flow-sub">${s}</p>`; }
function ovItem(k, v) { return `<div class="overzicht-item"><span>${k}</span><span>${v}</span></div>`; }

function prijsKaartKlant(p) {
  if (p.mode === 'aanvraag') {
    return `<div class="prijs-kaart">
      <div class="prijs-kaart__aanvraag">Prijs op aanvraag</div>
      <p>Fixli beoordeelt uw aanvraag eerst. U ontvangt daarna een prijsvoorstel dat u kunt accepteren of annuleren — pas na uw akkoord wordt de klus ingepland.</p>
    </div>`;
  }
  if (p.mode === 'uur') {
    return `<div class="prijs-kaart">
      <div class="prijs-row"><span>Uurtarief</span><span>${euro(p.uurtarief)} /uur incl. btw</span></div>
      <div class="prijs-row"><span>Minimale afname</span><span>${p.minUren} uur</span></div>
      ${p.spoedtoeslag ? `<div class="prijs-row"><span>Spoedtoeslag</span><span>${euro(p.spoedtoeslag)}</span></div>` : ''}
      ${p.avondtoeslag ? `<div class="prijs-row"><span>Avondtoeslag</span><span>${euro(p.avondtoeslag)}</span></div>` : ''}
      ${p.weekendtoeslag ? `<div class="prijs-row"><span>Weekendtoeslag</span><span>${euro(p.weekendtoeslag)}</span></div>` : ''}
      <div class="prijs-row"><span>Servicekosten Fixli</span><span>${euro(p.servicekosten)}</span></div>
      <div class="prijs-row prijs-row--total"><span>Indicatie bij ${p.minUren} uur</span><span>${euro(p.totaal)}</span></div>
      <p class="prijs-note">De eindprijs hangt af van de werkelijk gewerkte uren en door u goedgekeurde extra kosten. U betaalt na afloop via een beveiligde betaallink.</p>
    </div>`;
  }
  return `<div class="prijs-kaart">
    <div class="prijs-row"><span>Vaste prijs</span><span>${euro(p.klusprijs)}</span></div>
    ${p.spoedtoeslag ? `<div class="prijs-row"><span>Spoedtoeslag</span><span>${euro(p.spoedtoeslag)}</span></div>` : ''}
    ${p.avondtoeslag ? `<div class="prijs-row"><span>Avondtoeslag</span><span>${euro(p.avondtoeslag)}</span></div>` : ''}
    ${p.weekendtoeslag ? `<div class="prijs-row"><span>Weekendtoeslag</span><span>${euro(p.weekendtoeslag)}</span></div>` : ''}
    <div class="prijs-row"><span>Servicekosten Fixli</span><span>${euro(p.servicekosten)}</span></div>
    <div class="prijs-row prijs-row--sub"><span>waarvan btw (21%)</span><span>${euro(p.btw)}</span></div>
    <div class="prijs-row prijs-row--total"><span>Totaal incl. btw</span><span>${euro(p.totaal)}</span></div>
    <p class="prijs-note">Geschatte duur: ${p.duur}. Extra werk of materialen worden altijd vooraf besproken.</p>
  </div>`;
}

function wireStep(step) {
  if (step === 1) {
    qs('#flow-vak-grid')?.addEventListener('click', e => {
      const c = e.target.closest('.vakgebied-card');
      if (c) { flowState.vakgebied = c.dataset.vak; flowState.klus = ''; renderFlow(1); }
    });
  }
  if (step === 2) {
    qs('#flow-klus-list')?.addEventListener('click', e => {
      const b = e.target.closest('[data-klus]');
      if (b) { flowState.klus = b.dataset.klus; renderFlow(2); }
    });
  }
  if (step === 4) {
    const area = qs('#flow-upload');
    const input = area?.querySelector('input');
    area?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', () => {
      flowState.fotos = [...input.files].map(f => f.name);
      qs('#flow-upload-text').textContent = flowState.fotos.length
        ? `✓ ${flowState.fotos.length} foto('s) toegevoegd` : "Klik om foto's toe te voegen (demo)";
    });
  }
  if (step === 7) {
    qsa('[data-spoed]').forEach(b => b.addEventListener('click', () => {
      flowState.spoed = b.dataset.spoed === '1'; renderFlow(7);
    }));
  }
  if (step === 11) {
    qs('#f-betaalwijze')?.addEventListener('click', e => {
      const b = e.target.closest('[data-betaal]');
      if (b) { flowState.betaald = b.dataset.betaal === 'vooraf'; renderFlow(11); }
    });
  }
}

function saveStep(step) {
  const f = flowState;
  if (step === 1 && !f.vakgebied) return warn('Kies een vakgebied.');
  if (step === 2 && !f.klus) return warn('Kies een klus.');
  if (step === 3) {
    getVragen(f.klus).forEach(v => {
      const el = qs(`[data-vraag="${v.id}"]`); if (el) f.antwoorden[v.id] = el.value;
    });
    f.beschrijving = qs('#flow-beschrijving')?.value.trim() || '';
    if (!f.beschrijving) return warn('Voer een korte omschrijving in.');
  }
  if (step === 5) {
    f.postcode = qs('#f-postcode')?.value.trim();
    f.plaats = qs('#f-plaats')?.value.trim();
    f.adres = qs('#f-adres')?.value.trim();
    if (!f.postcode || !f.plaats || !f.adres) return warn('Vul postcode, plaats en adres in.');
    if (!isPostcode(f.postcode)) return warn('Voer een geldige Nederlandse postcode in (bijv. 3811 AB).');
  }
  if (step === 6) {
    f.datum = qs('#f-datum')?.value; f.tijd = qs('#f-tijd')?.value;
    if (!f.datum) return warn('Kies een gewenste datum.');
    if (new Date(f.datum) < new Date(new Date().toDateString())) return warn('De gewenste datum kan niet in het verleden liggen.');
  }
  if (step === 8) {
    f.naam = qs('#f-naam')?.value.trim();
    f.telefoon = qs('#f-telefoon')?.value.trim();
    f.email = qs('#f-email')?.value.trim();
    if (!f.naam || !f.telefoon || !f.email) return warn('Vul naam, telefoon en e-mail in.');
    if (!isTelefoon(f.telefoon)) return warn('Voer een geldig telefoonnummer in.');
    if (!isEmail(f.email)) return warn('Voer een geldig e-mailadres in.');
  }
  if (step === 10) {
    f.akkoord = qs('#f-akkoord')?.checked;
    if (!f.akkoord) return warn('Accepteer de voorwaarden om door te gaan.');
  }
  // Stap 11: betaalwijze — achteraf is standaard en altijd geldig
  return true;
}
function warn(msg) { alert(msg); return false; }

function submitAanvraag() {
  const f = flowState;
  const prijs = berekenPrijs(f.vakgebied, f.klus, { spoed: f.spoed, datum: f.datum, tijd: f.tijd });
  const klussen = Store.get(TBL.klussen, []);
  const volgcode = maakVolgcode();
  const klus = {
    id: uid('klus_'), vakgebied: f.vakgebied, klus: f.klus, antwoorden: f.antwoorden,
    beschrijving: f.beschrijving, fotos: f.fotos, postcode: f.postcode, plaats: f.plaats,
    adres: f.adres, datum: f.datum, tijd: f.tijd, spoed: f.spoed,
    naam: f.naam, telefoon: f.telefoon, email: f.email, volgcode,
    prijs, status: 'wacht_controle',
    betaalstatus: prijs.mode === 'aanvraag' ? 'wacht_op_prijs' : (f.betaald ? 'betaald' : 'achteraf'),
    accepted_by: null, created_at: new Date().toISOString()
  };
  klussen.push(klus);
  Store.set(TBL.klussen, klussen);

  // Notificaties (simulatie). Klant kan met volgcode de status volgen zonder account.
  sendEmail('klant', f.email, 'Uw aanvraag is ontvangen',
    `Beste ${f.naam}, we hebben uw aanvraag (${f.klus}) ontvangen. Fixli controleert deze en zet hem daarna door naar passende vakmannen. Volg uw aanvraag zonder account met volgcode ${volgcode} op de pagina Mijn aanvragen.`, klus.id);
  sendEmail('admin', getSettings().adminEmail, 'Nieuwe aanvraag ter controle',
    `Nieuwe aanvraag: ${f.klus} (${f.vakgebied}) in ${f.plaats}. Status: wacht op controle.`, klus.id);

  qs('#flow-wrap')?.classList.add('hidden');
  qs('#flow-success')?.classList.remove('hidden');
  const vc = qs('#flow-volgcode'); if (vc) vc.textContent = volgcode;

  // Account-aanbod als nog niet ingelogd
  const u = Store.get(TBL.curUser);
  const acc = qs('#flow-success-account');
  if (acc) acc.style.display = u ? 'none' : 'block';
  const em = qs('#sa-email'); if (em) em.value = f.email;
}

function maakAccountNaAanvraag() {
  const naam = flowState.naam, email = qs('#sa-email')?.value.trim(), pw = qs('#sa-pw')?.value;
  if (!email || !pw) return alert('Vul e-mail en wachtwoord in.');
  const users = Store.get(TBL.users, []);
  if (users.find(x => x.email === email)) return alert('Er bestaat al een account met dit e-mailadres. Log in.');
  const user = { id: uid('user_'), naam, email, telefoon: flowState.telefoon, password: pw, type: 'klant' };
  users.push(user); Store.set(TBL.users, users);
  Store.set(TBL.curUser, user);
  sendEmail('klant', email, 'Account aangemaakt', `Welkom bij Fixli, ${naam}. Uw account is aangemaakt.`);
  updateAuthUI();
  navigateTo('klant-dashboard');
}

/* =====================================================
   AUTH (klant) — modal
===================================================== */
function initAuth() {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-auth]')) qs('#auth-modal')?.classList.add('open');
  });
  qs('#auth-modal-close')?.addEventListener('click', () => qs('#auth-modal').classList.remove('open'));
  qs('#auth-modal')?.addEventListener('click', e => { if (e.target === qs('#auth-modal')) qs('#auth-modal').classList.remove('open'); });
  qsa('.modal__tab').forEach(tab => tab.addEventListener('click', () => {
    qsa('.modal__tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
    qsa('.modal__panel').forEach(p => p.classList.add('hidden'));
    qs(`#${tab.dataset.tab}`)?.classList.remove('hidden');
  }));
  qs('#btn-login')?.addEventListener('click', doLogin);
  qs('#btn-register')?.addEventListener('click', doRegister);
  qs('#btn-logout')?.addEventListener('click', () => {
    Store.set(TBL.curUser, null); updateAuthUI(); navigateTo('home');
  });
}

function doLogin() {
  const email = qs('#login-email')?.value.trim(), pw = qs('#login-pw')?.value;
  const user = Store.get(TBL.users, []).find(u => u.email === email && u.password === pw);
  if (!user) return modalMsg('Onbekend e-mailadres of wachtwoord.', 'danger');
  if (user.geblokkeerd) return modalMsg('Dit account is geblokkeerd. Neem contact op met Fixli.', 'danger');
  Store.set(TBL.curUser, user); qs('#auth-modal').classList.remove('open');
  updateAuthUI(); navigateTo('klant-dashboard');
}
function doRegister() {
  const naam = qs('#reg-naam')?.value.trim(), email = qs('#reg-email')?.value.trim(),
    tel = qs('#reg-tel')?.value.trim(), pw = qs('#reg-pw')?.value;
  if (!naam || !email || !pw) return modalMsg('Vul alle verplichte velden in.', 'danger');
  if (!isEmail(email)) return modalMsg('Voer een geldig e-mailadres in.', 'danger');
  if (pw.length < 6) return modalMsg('Kies een wachtwoord van minimaal 6 tekens.', 'danger');
  const users = Store.get(TBL.users, []);
  if (users.find(u => u.email === email)) return modalMsg('E-mailadres is al in gebruik.', 'danger');
  const user = { id: uid('user_'), naam, email, telefoon: tel, password: pw, type: 'klant' };
  users.push(user); Store.set(TBL.users, users); Store.set(TBL.curUser, user);
  sendEmail('klant', email, 'Account aangemaakt', `Welkom bij Fixli, ${naam}.`);
  qs('#auth-modal').classList.remove('open'); updateAuthUI(); navigateTo('klant-dashboard');
}
function modalMsg(msg, type) {
  const el = qs('#modal-msg'); if (!el) return;
  el.textContent = msg; el.className = `alert alert--${type}`; el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}
function updateAuthUI() {
  const user = Store.get(TBL.curUser);
  qsa('[data-open-auth]').forEach(b => b.classList.toggle('hidden', !!user));
  qs('#btn-logout')?.classList.toggle('hidden', !user);
  const label = qs('#user-label'); if (label) label.textContent = user ? user.naam : '';
}

/* =====================================================
   KLANT DASHBOARD
===================================================== */
function renderKlantDash() {
  const user = Store.get(TBL.curUser);
  const wrap = qs('#klant-klussen'); if (!wrap) return;

  // Zonder account: volgen via e-mail + volgcode
  if (!user) {
    const gevolgd = sessionStorage.getItem('fixli_volg_klus');
    wrap.innerHTML = `
      <div class="card" style="max-width:480px;margin:0 auto 24px">
        <h4 style="margin-bottom:6px">Aanvraag volgen zonder account</h4>
        <p style="font-size:.875rem;margin-bottom:14px">Vul uw e-mailadres en de volgcode uit de bevestiging in.</p>
        <div class="form-group"><label>E-mailadres</label><input id="volg-email" type="email"></div>
        <div class="form-group"><label>Volgcode</label><input id="volg-code" placeholder="FX-XXXXXX"></div>
        <button class="btn btn-primary" id="volg-btn" style="width:100%;justify-content:center">Aanvraag opzoeken</button>
        <p style="font-size:.82rem;margin-top:14px">Of <button class="btn btn-sm btn-outline" data-open-auth>log in</button> voor al uw aanvragen.</p>
      </div>
      <div id="volg-resultaat">${gevolgd ? '' : ''}</div>`;
    qs('#volg-btn')?.addEventListener('click', () => {
      const k = zoekKlusOpVolgcode(qs('#volg-email')?.value, qs('#volg-code')?.value);
      const res = qs('#volg-resultaat');
      if (!k) { res.innerHTML = `<div class="alert alert--danger">Geen aanvraag gevonden met deze combinatie van e-mail en volgcode.</div>`; return; }
      res.innerHTML = klantKlusKaart(k);
    });
    if (gevolgd) {
      const k = Store.get(TBL.klussen, []).find(x => x.id === gevolgd);
      if (k) qs('#volg-resultaat').innerHTML = klantKlusKaart(k);
    }
    return;
  }

  qs('#klant-naam') && (qs('#klant-naam').textContent = user.naam);
  const klussen = Store.get(TBL.klussen, []).filter(k => k.email === user.email);
  if (!klussen.length) {
    wrap.innerHTML = `<div class="alert alert--info">U heeft nog geen aanvragen. <a href="klus-aanvragen.html" style="font-weight:600;color:inherit">Maak uw eerste aanvraag →</a></div>`;
    return;
  }
  wrap.innerHTML = klussen.map(klantKlusKaart).join('');
}

/* Persoonlijke boekingskaart per aanvraag (punt 10 uit de spec) */
function klantKlusKaart(k) {
  const vakman = k.accepted_by ? Store.get(TBL.vakmannen, []).find(v => v.id === k.accepted_by) : null;
  const factuur = Store.get(TBL.facturen, []).find(f => f.klusId === k.id);
  const review = Store.get(TBL.reviews, []).find(r => r.klusId === k.id);
  const extras = extraKostenVoorKlus(k.id);
  const annulering = annuleringsKosten(k);
  const magAnnuleren = !['uitgevoerd', 'wacht_betaling', 'factuur_verzonden', 'betaald', 'afgerond', 'geannuleerd', 'afgewezen'].includes(k.status);
  const magWijzigen = ['wacht_controle', 'prijsvoorstel', 'beschikbaar'].includes(k.status);
  const prijsTekst = k.prijs.mode === 'aanvraag' ? 'Op aanvraag'
    : k.prijs.mode === 'uur' ? `${euro(k.prijs.uurtarief)}/uur (min. ${k.prijs.minUren} u)` : euro(k.prijs.totaal);

  return `<div class="klus-card">
    <div class="klus-card__header">
      <h4>${esc(k.klus)} — ${esc(k.vakgebied)}</h4>
      <span class="badge ${statusBadge(k.status)}">${statusLabel(k.status)}</span>
    </div>
    <div class="klus-card__meta">
      <span class="klus-card__meta-item">🏷️ ${tariefLabel(k.prijs.mode)}</span>
      <span class="klus-card__meta-item">💶 ${prijsTekst}</span>
      <span class="klus-card__meta-item">📍 ${esc(k.plaats)}</span>
      <span class="klus-card__meta-item">📅 ${fmtDate(k.datum)} ${esc(k.tijd || '')}</span>
      <span class="klus-card__meta-item">🔑 ${esc(k.volgcode || '')}</span>
    </div>
    ${k.status === 'wacht_controle' ? `<div class="alert alert--warn" style="margin-bottom:12px">⏳ Fixli controleert uw aanvraag en zet deze daarna door naar passende vakmannen.</div>` : ''}
    ${k.status === 'prijsvoorstel' ? `
      <div class="alert alert--info" style="margin-bottom:12px;display:block">
        💶 <strong>Prijsvoorstel van Fixli:</strong> ${euro(k.prijs.totaal)} incl. btw en servicekosten.
        ${k.prijsvoorstel?.toelichting ? '<br>' + esc(k.prijsvoorstel.toelichting) : ''}
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn btn-sm btn-primary" onclick="klantPrijsvoorstel('${k.id}', true)">✓ Accepteren</button>
          <button class="btn btn-sm btn-outline" onclick="klantPrijsvoorstel('${k.id}', false)">Annuleren</button>
        </div>
      </div>` : ''}
    ${vakman && !['geannuleerd', 'afgewezen'].includes(k.status) ? `<div class="alert alert--success" style="margin-bottom:12px">✅ Geaccepteerd door <strong>${esc(vakman.bedrijfsnaam)}</strong> · ${esc(vakman.telefoon)} · ${esc(vakman.email)}</div>` : ''}
    ${k.uren ? `<div class="alert alert--info" style="margin-bottom:12px">⏱️ Gewerkte uren: ${k.uren.berekend} uur (${esc(k.uren.start)}–${esc(k.uren.eind)}${k.uren.pauzeMin ? ', ' + k.uren.pauzeMin + ' min pauze' : ''}). Bijgewerkt totaal: <strong>${euro(k.prijs.totaal)}</strong></div>` : ''}
    ${extras.filter(e => e.status === 'wacht_klant').map(e => `
      <div class="alert alert--warn" style="margin-bottom:12px;display:block">
        ➕ <strong>Extra kosten ter goedkeuring:</strong> ${esc(e.type)} — ${esc(e.omschrijving)} (${euro(e.bedragExcl)} excl. btw)
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn btn-sm btn-primary" onclick="klantExtraKost('${e.id}', true)">✓ Akkoord</button>
          <button class="btn btn-sm btn-outline" onclick="klantExtraKost('${e.id}', false)">Afwijzen</button>
        </div>
      </div>`).join('')}
    ${extras.filter(e => !['wacht_klant', 'concept'].includes(e.status)).map(e => `
      <p style="font-size:.82rem;color:var(--gray-600);margin-bottom:6px">➕ ${esc(e.type)}: ${esc(e.omschrijving)} (${euro(e.bedragExcl)} excl.) — <span class="badge ${EXTRA_STATUS[e.status]?.badge || 'badge--gray'}">${EXTRA_STATUS[e.status]?.label || e.status}</span></p>`).join('')}
    ${factuur && factuur.betaalstatus === 'open' ? `
      <div class="alert alert--warn" style="margin-bottom:12px;display:block">
        💳 <strong>Factuur ${esc(factuur.nummer)}:</strong> ${euro(factuur.totaal)} — nog te betalen.
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="klantBetaal('${factuur.id}')">Betaal via betaallink (demo iDEAL)</button>
          <button class="btn btn-sm btn-outline" onclick="toonFactuur('${factuur.id}')">📄 Bekijk factuur</button>
        </div>
      </div>` : ''}
    <div class="klus-card__actions">
      ${factuur && factuur.betaalstatus !== 'open' ? `<button class="btn btn-sm btn-outline" onclick="toonFactuur('${factuur.id}')">📄 Factuur</button>` : ''}
      ${magWijzigen ? `<button class="btn btn-sm btn-outline" onclick="wijzigAfspraak('${k.id}')">📅 Afspraak wijzigen</button>` : ''}
      ${magAnnuleren ? `<button class="btn btn-sm btn-outline" onclick="annuleerKlus('${k.id}')" title="${esc(annulering.uitleg)}">Annuleren</button>` : ''}
      ${(['betaald', 'afgerond'].includes(k.status) && !review) ? `<button class="btn btn-sm btn-primary" onclick="openReview('${k.id}')">⭐ Beoordeling plaatsen</button>` : ''}
      ${review ? `<span class="badge badge--blue">★ ${review.sterren}/5 beoordeeld</span>` : ''}
      ${['geaccepteerd', 'ingepland', 'onderweg', 'uitgevoerd', 'wacht_betaling', 'factuur_verzonden'].includes(k.status) ? `<button class="btn btn-sm btn-outline" onclick="openKlacht('${k.id}','klant')">Probleem melden</button>` : ''}
    </div>
  </div>`;
}

function klantPrijsvoorstel(id, akkoord) {
  if (!akkoord && !confirm('Weet u zeker dat u het prijsvoorstel wilt afwijzen? De aanvraag wordt dan geannuleerd.')) return;
  reageerOpPrijsvoorstel(id, akkoord);
  sessionStorage.setItem('fixli_volg_klus', id);
  renderKlantDash();
}

function klantExtraKost(id, akkoord) {
  zetExtraKostStatus(id, akkoord ? 'akkoord_klant' : 'afgewezen');
  const e = Store.get(TBL.extrakosten, []).find(x => x.id === id);
  if (e) sendEmail('admin', getSettings().adminEmail,
    akkoord ? 'Extra kosten: klant akkoord — controle nodig' : 'Extra kosten afgewezen door klant',
    `${e.type}: ${e.omschrijving} (${euro(e.bedragExcl)} excl. btw)`, e.klusId);
  renderKlantDash();
}

function klantBetaal(factuurId) {
  // >> BACKEND: echte betaallink/QR via Stripe of Mollie; webhook werkt status bij.
  const f = betaalFactuur(factuurId);
  if (!f) return;
  sendEmail('admin', getSettings().adminEmail, 'Betaling ontvangen', `Factuur ${f.nummer} (${euro(f.totaal)}) is betaald door de klant.`, f.klusId);
  alert(`Betaling geslaagd (demo). Factuur ${f.nummer} is voldaan. U kunt nu een beoordeling plaatsen.`);
  renderKlantDash();
}

function wijzigAfspraak(id) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === id); if (!k) return;
  const datum = prompt('Nieuwe gewenste datum (JJJJ-MM-DD):', k.datum);
  if (!datum) return;
  if (new Date(datum) < new Date(new Date().toDateString())) return alert('De datum kan niet in het verleden liggen.');
  const tijd = prompt('Nieuwe gewenste tijd (UU:MM, leeg = flexibel):', k.tijd || '') || '';
  k.datum = datum; k.tijd = tijd;
  // Toeslagen kunnen wijzigen (avond/weekend) → prijs opnieuw berekenen
  if (k.prijs.mode !== 'aanvraag') k.prijs = berekenPrijs(k.vakgebied, k.klus, { spoed: k.spoed, datum, tijd });
  Store.set(TBL.klussen, klussen);
  sendEmail('admin', getSettings().adminEmail, 'Afspraak gewijzigd', `Klant wijzigde ${k.klus} naar ${fmtDate(datum)} ${tijd}.`, id);
  renderKlantDash();
}

function annuleerKlus(id) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === id); if (!k) return;
  const a = annuleringsKosten(k);
  const melding = a.bedrag > 0
    ? `${a.uitleg}\n\nTotaal annuleringskosten: ${euro(a.bedrag)}. Wilt u doorgaan?`
    : `${a.uitleg}\n\nWeet u zeker dat u wilt annuleren?`;
  if (!confirm(melding)) return;
  k.status = 'geannuleerd';
  k.annuleringskosten = a.bedrag;
  Store.set(TBL.klussen, klussen);
  sendEmail('admin', getSettings().adminEmail, 'Klus geannuleerd',
    `Aanvraag ${k.klus} is geannuleerd door de klant.${a.bedrag ? ' Annuleringskosten: ' + euro(a.bedrag) + '.' : ''}`, id);
  renderKlantDash();
}

/* =====================================================
   REVIEWS
===================================================== */
let reviewKlusId = null;
function openReview(klusId) {
  reviewKlusId = klusId;
  qs('#review-modal').classList.add('open');
  qsa('#review-stars .star').forEach(s => s.classList.remove('on'));
  qs('#review-tekst').value = '';
}
function initReview() {
  qsa('#review-stars .star').forEach(star => star.addEventListener('click', () => {
    const n = +star.dataset.n;
    qsa('#review-stars .star').forEach(s => s.classList.toggle('on', +s.dataset.n <= n));
  }));
  qs('#review-close')?.addEventListener('click', () => qs('#review-modal').classList.remove('open'));
  qs('#review-submit')?.addEventListener('click', () => {
    const sterren = qsa('#review-stars .star.on').length;
    if (!sterren) return alert('Geef een aantal sterren.');
    const reviews = Store.get(TBL.reviews, []);
    const klus = Store.get(TBL.klussen, []).find(k => k.id === reviewKlusId);
    reviews.push({
      id: uid('rev_'), klusId: reviewKlusId, vakmanId: klus?.accepted_by,
      sterren, tekst: qs('#review-tekst').value.trim(),
      opTijd: qs('#rev-optijd').checked, communicatie: qs('#rev-comm').checked, kwaliteit: qs('#rev-kwal').checked,
      door: klus?.naam, time: new Date().toISOString()
    });
    Store.set(TBL.reviews, reviews);
    qs('#review-modal').classList.remove('open');
    renderKlantDash();
  });
}

/* =====================================================
   KLACHTEN
===================================================== */
let klachtCtx = null;
function openKlacht(klusId, door) {
  klachtCtx = { klusId, door };
  qs('#klacht-modal').classList.add('open');
  qs('#klacht-tekst').value = '';
}
function initKlacht() {
  qs('#klacht-close')?.addEventListener('click', () => qs('#klacht-modal').classList.remove('open'));
  qs('#klacht-submit')?.addEventListener('click', () => {
    const tekst = qs('#klacht-tekst').value.trim();
    if (!tekst) return alert('Beschrijf het probleem.');
    const klachten = Store.get(TBL.klachten, []);
    klachten.push({ id: uid('kl_'), klusId: klachtCtx.klusId, door: klachtCtx.door, tekst, status: 'nieuw', time: new Date().toISOString() });
    Store.set(TBL.klachten, klachten);
    sendEmail('admin', getSettings().adminEmail, 'Nieuwe klacht ingediend', `Klacht via ${klachtCtx.door}: ${tekst}`, klachtCtx.klusId);
    qs('#klacht-modal').classList.remove('open');
    alert('Bedankt. Uw melding is doorgezet naar Fixli.');
    if (klachtCtx.door === 'vakman') renderVakmanDash();
  });
}

/* =====================================================
   FACTUUR VIEWER
===================================================== */
function toonFactuur(id) {
  const f = Store.get(TBL.facturen, []).find(x => x.id === id);
  if (!f) return;
  const regels = (f.regels && f.regels.length)
    ? f.regels.map(r => `<tr><td>${esc(r.omschrijving)}</td><td>${euro(r.bedragIncl)}</td></tr>`).join('')
    : `<tr><td>${esc(f.klusomschrijving)}</td><td>${euro(f.totaal - f.servicekosten)}</td></tr>
       <tr><td>Servicekosten Fixli</td><td>${euro(f.servicekosten)}</td></tr>`;
  qs('#factuur-body').innerHTML = `
    <div class="factuur">
      <div class="factuur__head"><div><strong>Fixli</strong><br><span>Bemiddelingsplatform</span></div>
        <div style="text-align:right"><strong>${f.nummer}</strong><br><span>${fmtDate(f.datum)}</span></div></div>
      <div class="factuur__klant"><strong>${esc(f.klant.naam)}</strong><br>${esc(f.klant.adres || '')}<br>${esc(f.klant.postcode)} ${esc(f.klant.plaats)}</div>
      <table class="factuur__table"><tr><th>Omschrijving (incl. btw)</th><th>Bedrag</th></tr>
        ${regels}
        <tr><td style="color:var(--gray-400)">waarvan btw (21%)</td><td style="color:var(--gray-400)">${euro(f.btw)}</td></tr>
        <tr class="factuur__total"><td>Totaal incl. btw</td><td>${euro(f.totaal)}</td></tr>
      </table>
      <p class="factuur__status">Betaalstatus: <strong>${f.betaalstatus === 'betaald' ? '✓ Betaald' : 'Open'}</strong></p>
      ${f.betaalstatus !== 'betaald' ? `<p class="factuur__status" style="margin-top:6px">Betaallink: <a href="#" onclick="return false" style="color:var(--teal-dark)">${esc(f.betaallink || '')}</a><br><span style="font-size:.75rem;color:var(--gray-400)">▦ QR-code-simulatie — in de live-versie betaalt u hier via iDEAL.</span></p>` : ''}
    </div>`;
  qs('#factuur-modal').classList.add('open');
}
function initFactuur() {
  qs('#factuur-close')?.addEventListener('click', () => qs('#factuur-modal').classList.remove('open'));
  qs('#factuur-print')?.addEventListener('click', () => window.print());
}

/* =====================================================
   VAKMAN: REGISTRATIE
===================================================== */
function initVakmanForm() {
  const form = qs('#vakman-aanmeld-form'); if (!form) return;
  // Vakgebied pills
  const pills = qs('#vm-vakgebieden');
  if (pills) pills.innerHTML = Object.keys(KLUSSEN).map(v =>
    `<div class="checkbox-pill" data-vak="${v}"><span class="box"></span>${v}</div>`).join('');
  qs('#vm-vakgebieden')?.addEventListener('click', e => {
    const pill = e.target.closest('.checkbox-pill');
    if (pill) { pill.classList.toggle('checked'); pill.querySelector('.box').textContent = pill.classList.contains('checked') ? '✓' : ''; }
  });
  // Upload areas
  qsa('#page-vakman .upload-area').forEach(area => {
    const input = area.querySelector('input[type=file]');
    area.addEventListener('click', () => input?.click());
    input?.addEventListener('change', () => {
      const p = area.querySelector('p'); if (p && input.files[0]) p.textContent = `✓ ${input.files[0].name}`;
    });
  });
  qs('#vakman-submit')?.addEventListener('click', () => {
    const get = id => qs('#' + id)?.value.trim() || '';
    const verplicht = ['vm-bedrijf', 'vm-naam', 'vm-email', 'vm-telefoon', 'vm-pw', 'vm-kvk', 'vm-iban'];
    if (verplicht.some(id => !get(id))) return alert('Vul minimaal bedrijfsnaam, contactpersoon, e-mail, telefoon, wachtwoord, KvK en IBAN in.');
    if (!isEmail(get('vm-email'))) return alert('Voer een geldig e-mailadres in.');
    if (!isTelefoon(get('vm-telefoon'))) return alert('Voer een geldig telefoonnummer in.');
    if (!isKvk(get('vm-kvk'))) return alert('Een KvK-nummer bestaat uit 8 cijfers.');
    if (Store.get(TBL.vakmannen, []).find(v => v.email === get('vm-email'))) return alert('Er bestaat al een vakman-account met dit e-mailadres.');
    if (!qs('#vm-akkoord')?.checked) return alert('Akkoord met de vakmanvoorwaarden, betalingen via Fixli en het anti-omzeilingsbeding is verplicht.');
    const vakgebieden = qsa('#vm-vakgebieden .checkbox-pill.checked').map(p => p.textContent.replace('✓', '').trim());
    if (!vakgebieden.length) return alert('Selecteer minimaal één vakgebied.');

    const vakmannen = Store.get(TBL.vakmannen, []);
    const nieuw = {
      id: uid('vakman_'), bedrijfsnaam: get('vm-bedrijf'), naam: get('vm-naam'),
      email: get('vm-email'), telefoon: get('vm-telefoon'), password: get('vm-pw'),
      kvk: get('vm-kvk'), btw: get('vm-btw'), iban: get('vm-iban'),
      vestigingsadres: get('vm-adres'), plaats: get('vm-plaats'),
      werkgebied: get('vm-werkgebied').split(',').map(x => x.trim()).filter(Boolean),
      vakgebieden, ervaring: get('vm-ervaring'), tarief: get('vm-tarief'),
      beschikbaarheid: get('vm-beschikbaarheid'),
      documenten: qsa('#page-vakman .upload-area p').map(p => p.textContent).filter(t => t.startsWith('✓')).map(t => t.slice(2)),
      status: 'wacht_op_goedkeuring', aangemeld: new Date().toISOString()
    };
    vakmannen.push(nieuw); Store.set(TBL.vakmannen, vakmannen);
    sendEmail('vakman', nieuw.email, 'Aanmelding ontvangen', `Beste ${nieuw.naam}, uw aanmelding is ontvangen en wacht op controle.`);
    sendEmail('admin', getSettings().adminEmail, 'Nieuwe vakman-aanmelding', `${nieuw.bedrijfsnaam} heeft zich aangemeld.`);
    qs('#vakman-aanmeld-form').classList.add('hidden');
    qs('#vakman-aanmeld-success').classList.remove('hidden');
  });
}

/* =====================================================
   VAKMAN DASHBOARD
===================================================== */
let currentVakman = null;
function initVakmanDash() {
  qs('#vakman-login-btn')?.addEventListener('click', () => {
    const email = qs('#vakman-login-email')?.value.trim(), pw = qs('#vakman-login-pw')?.value;
    const vm = Store.get(TBL.vakmannen, []).find(v => v.email === email && v.password === pw);
    if (!vm) return alert('Onbekende vakman of wachtwoord. Demo: rob@hendrix-loodgieter.nl / demo123');
    loginVakman(vm);
  });
  qs('#vakman-demo-login')?.addEventListener('click', () => {
    const vm = Store.get(TBL.vakmannen, []).find(v => v.status === 'goedgekeurd');
    if (vm) loginVakman(vm);
  });
  qs('#vakman-demo-pending')?.addEventListener('click', () => {
    const vm = Store.get(TBL.vakmannen, []).find(v => v.status === 'wacht_op_goedkeuring');
    if (vm) loginVakman(vm); else alert('Geen wachtende vakman in demo.');
  });
  qs('#vakman-dash-logout')?.addEventListener('click', () => {
    currentVakman = null; Store.set(TBL.curVakman, null);
    qs('#vakman-login-screen').classList.remove('hidden');
    qs('#vakman-dash-content').classList.add('hidden');
  });
  qs('#vakman-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.vakman-tab'); if (!tab) return;
    qsa('.vakman-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
    qsa('.vakman-panel').forEach(p => p.classList.remove('active'));
    qs(`#vp-${tab.dataset.panel}`)?.classList.add('active');
  });
}
function loginVakman(vm) {
  currentVakman = vm; Store.set(TBL.curVakman, vm);
  qs('#vakman-login-screen').classList.add('hidden');
  qs('#vakman-dash-content').classList.remove('hidden');
  renderVakmanDash();
}

function renderVakmanDash() {
  if (!currentVakman) return;
  currentVakman = Store.get(TBL.vakmannen, []).find(v => v.id === currentVakman.id) || currentVakman;
  const vm = currentVakman;
  qs('#vakman-naam') && (qs('#vakman-naam').textContent = vm.bedrijfsnaam);

  const banner = qs('#vakman-status-banner');
  if (banner) {
    let html = '';
    if (vm.status === 'goedgekeurd') html = `<div class="alert alert--success">✅ Uw account is goedgekeurd. U kunt klussen accepteren in uw werkgebied.</div>`;
    else if (vm.status === 'geblokkeerd') html = `<div class="alert alert--danger">⛔ Uw account is geblokkeerd. Neem contact op met Fixli.</div>`;
    else if (vm.status === 'gepauzeerd') html = `<div class="alert alert--warn">⏸️ Uw account is tijdelijk gepauzeerd door Fixli.</div>`;
    else html = `<div class="alert alert--warn">⏳ Uw account wacht op controle. Na goedkeuring ziet u beschikbare klussen.</div>`;
    // Waarschuwing: document verloopt binnenkort (binnen 60 dagen)
    const binnenkort = (vm.documenten || []).filter(d => d.verlooptOp &&
      (new Date(d.verlooptOp) - new Date()) / 864e5 < 60);
    binnenkort.forEach(d => {
      const dagen = Math.max(0, Math.ceil((new Date(d.verlooptOp) - new Date()) / 864e5));
      html += `<div class="alert alert--warn">📄 Let op: <strong>${esc(d.naam)}</strong> verloopt ${dagen ? 'over ' + dagen + ' dagen' : 'vandaag'} (${fmtDate(d.verlooptOp)}). Upload tijdig een nieuwe versie via Documenten.</div>`;
    });
    if (vm.beschikbaar === false) html += `<div class="alert alert--info">🔕 U staat op "niet beschikbaar" — u ontvangt geen nieuwe klussen. Zet uzelf beschikbaar via Profiel.</div>`;
    banner.innerHTML = html;
  }
  renderBeschikbaar(); renderGeaccepteerd(); renderVakmanPlanning(); renderUrenExtra();
  renderVerdiensten(); renderUitbetalingen(); renderVakmanDocumenten(); renderVakmanReviews(); renderVakmanProfiel();
}

function renderBeschikbaar() {
  const c = qs('#vp-beschikbaar'); if (!c) return;
  const vm = currentVakman;
  if (vm.status !== 'goedgekeurd') {
    c.innerHTML = `<div class="alert alert--warn">Na goedkeuring door Fixli ziet u hier passende klussen in uw werkgebied.</div>`; return;
  }
  if (vm.beschikbaar === false) {
    c.innerHTML = `<div class="alert alert--info">U staat op "niet beschikbaar". Zet uzelf beschikbaar via het tabblad Profiel om klussen te zien.</div>`; return;
  }
  const klussen = beschikbareKlussenVoor(vm);
  if (!klussen.length) { c.innerHTML = `<div class="alert alert--info">Er zijn momenteel geen passende openstaande klussen in uw werkgebied.</div>`; return; }
  c.innerHTML = klussen.map(k => {
    const vergoeding = k.prijs.mode === 'aanvraag' ? 'volgt na prijsvoorstel'
      : k.prijs.mode === 'uur' ? `${euro(k.prijs.vergoedingPerUurExcl)} /uur excl. btw (min. ${k.prijs.minUren} u)`
      : euro(k.prijs.vergoedingVakmanExcl) + ' excl. btw';
    return `
    <div class="klus-card">
      <div class="klus-card__header"><h4>${esc(k.klus)}</h4><span class="badge badge--blue">${tariefLabel(k.prijs.mode)}</span></div>
      <div class="klus-card__meta">
        <span class="klus-card__meta-item">🔧 ${esc(k.vakgebied)}</span>
        <span class="klus-card__meta-item">📍 ${esc(postcodePrefix(k.postcode))}xx ${esc(k.plaats)}</span>
        <span class="klus-card__meta-item">🚗 ${afstandIndicatie(vm, k)}</span>
        <span class="klus-card__meta-item">📅 ${fmtDate(k.datum)} ${esc(k.tijd || '')}</span>
        <span class="klus-card__meta-item">${k.spoed ? '🚨 Spoed' : '🕐 Geen spoed'}</span>
      </div>
      <p class="klus-card__desc">${esc((k.beschrijving || '').slice(0, 120))}</p>
      <div class="vergoeding-box">Uw vergoeding: <strong>${vergoeding}</strong></div>
      <div class="alert alert--info" style="font-size:.82rem;margin-bottom:14px">🔒 Klantnaam, telefoon, e-mail en volledig adres ziet u pas na acceptatie.</div>
      <div class="klus-card__actions"><button class="btn btn-primary" onclick="accepteerKlus('${k.id}')">✓ Accepteer klus</button></div>
    </div>`;
  }).join('');
}

function accepteerKlus(id) {
  if (!confirm('Klus accepteren? De volledige klantgegevens worden daarna getoond.')) return;
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === id);
  if (!k || k.status !== 'beschikbaar') { alert('Deze klus is niet meer beschikbaar.'); renderVakmanDash(); return; }
  k.status = 'geaccepteerd'; k.accepted_by = currentVakman.id; k.geaccepteerd_op = new Date().toISOString();
  Store.set(TBL.klussen, klussen);
  // Notificaties
  sendEmail('vakman', currentVakman.email, 'Klus geaccepteerd', `U heeft de klus "${k.klus}" geaccepteerd. Klantgegevens zijn nu zichtbaar.`, id);
  sendEmail('klant', k.email, 'Uw klus is geaccepteerd', `Goed nieuws! ${currentVakman.bedrijfsnaam} heeft uw klus "${k.klus}" geaccepteerd.`, id);
  sendEmail('admin', getSettings().adminEmail, 'Klus geaccepteerd', `${currentVakman.bedrijfsnaam} accepteerde "${k.klus}".`, id);
  renderVakmanDash();
}

function renderGeaccepteerd() {
  const c = qs('#vp-geaccepteerd'); if (!c || !currentVakman) return;
  const klussen = Store.get(TBL.klussen, []).filter(k => k.accepted_by === currentVakman.id && k.status !== 'geannuleerd');
  if (!klussen.length) { c.innerHTML = `<div class="alert alert--info">U heeft nog geen klussen geaccepteerd.</div>`; return; }
  c.innerHTML = klussen.map(k => {
    const actief = ['geaccepteerd', 'ingepland', 'onderweg'].includes(k.status);
    const extras = extraKostenVoorKlus(k.id);
    const vergoeding = k.prijs.mode === 'uur'
      ? (k.uren ? `${euro(k.prijs.vergoedingVakmanExcl)} excl. btw (${k.uren.berekend} uur)` : `${euro(k.prijs.vergoedingPerUurExcl)} /uur excl. btw`)
      : euro(k.prijs.vergoedingVakmanExcl) + ' excl. btw';
    return `
    <div class="klus-card">
      <div class="klus-card__header"><h4>${esc(k.klus)} — ${esc(k.vakgebied)}</h4><span class="badge ${statusBadge(k.status)}">${statusLabel(k.status)}</span></div>
      <div class="card klantgegevens">
        <h4>📋 Klantgegevens</h4>
        <p><strong>Naam:</strong> ${esc(k.naam)}</p>
        <p><strong>Telefoon:</strong> ${esc(k.telefoon)}</p>
        <p><strong>E-mail:</strong> ${esc(k.email)}</p>
        <p><strong>Adres:</strong> ${esc(k.adres)}, ${esc(k.postcode)} ${esc(k.plaats)}</p>
        <p><strong>Datum:</strong> ${fmtDate(k.datum)} ${esc(k.tijd || '')}</p>
        <p><strong>Tarieftype:</strong> ${tariefLabel(k.prijs.mode)}${k.prijs.mode === 'uur' ? ` · min. ${k.prijs.minUren} uur` : ''}</p>
        <p><strong>Omschrijving:</strong> ${esc(k.beschrijving || '—')}</p>
        <p><strong>Uw vergoeding:</strong> ${vergoeding}</p>
      </div>
      ${k.uren ? `<p style="font-size:.82rem;margin-top:8px">⏱️ Uren ingevuld: ${k.uren.berekend} uur (${esc(k.uren.start)}–${esc(k.uren.eind)})</p>` : ''}
      ${extras.length ? `<p style="font-size:.82rem;margin-top:6px">➕ Extra kosten: ${extras.map(e => `${esc(e.type)} ${euro(e.bedragExcl)} <span class="badge ${EXTRA_STATUS[e.status]?.badge}">${EXTRA_STATUS[e.status]?.label}</span>`).join(' · ')}</p>` : ''}
      <div class="klus-card__actions" style="margin-top:12px">
        ${k.status === 'geaccepteerd' ? `<button class="btn btn-sm btn-primary" onclick="zetVakmanKlusStatus('${k.id}','ingepland')">📅 Inplannen</button>` : ''}
        ${k.status === 'ingepland' ? `<button class="btn btn-sm btn-primary" onclick="zetVakmanKlusStatus('${k.id}','onderweg')">🚐 Klus starten</button>` : ''}
        ${k.prijs.mode === 'uur' && actief ? `<button class="btn btn-sm btn-navy" onclick="openUren('${k.id}')">⏱️ Uren invullen</button>` : ''}
        ${actief ? `<button class="btn btn-sm btn-outline" onclick="openExtraKost('${k.id}')">➕ Extra kosten toevoegen</button>` : ''}
        ${actief ? `<button class="btn btn-sm btn-success" onclick="rondAf('${k.id}')">✓ Klus afronden</button>` : ''}
        ${actief ? `<button class="btn btn-sm btn-outline" onclick="openKlacht('${k.id}','vakman')">Probleem melden</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* Vakman zet status verder in de keten (geaccepteerd → ingepland → onderweg/gestart) */
function zetVakmanKlusStatus(id, status) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === id); if (!k) return;
  k.status = status; Store.set(TBL.klussen, klussen);
  if (status === 'ingepland') sendEmail('klant', k.email, 'Afspraak ingepland', `Uw klus "${k.klus}" is ingepland op ${fmtDate(k.datum)} ${k.tijd || ''}.`, id);
  renderVakmanDash();
}

function rondAf(id) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === id);
  if (!k) return;
  // Bij uurtarief eerst de gewerkte uren invullen
  if (k.prijs.mode === 'uur' && !k.uren) {
    alert('Vul eerst de gewerkte uren in voordat u de klus afrondt.');
    openUren(id);
    return;
  }
  const openExtras = extraKostenVoorKlus(id).filter(e => ['wacht_klant', 'wacht_controle'].includes(e.status));
  if (openExtras.length && !confirm(`Er staan nog ${openExtras.length} extra kostenpost(en) open ter goedkeuring. Niet-goedgekeurde kosten komen niet op de factuur. Toch afronden?`)) return;

  k.status = 'uitgevoerd'; k.uitgevoerd_op = new Date().toISOString();
  Store.set(TBL.klussen, klussen);
  const factuur = maakFactuur(k);
  // Standaard betaalt de klant na afloop via een betaallink.
  // >> BACKEND: Stripe/Mollie payment link versturen; webhook zet status op betaald.
  if (k.betaalstatus === 'betaald') {
    k.status = 'afgerond';
    sendEmail('klant', k.email, 'Klus afgerond — factuur beschikbaar', `Uw klus "${k.klus}" is afgerond. Uw factuur (${factuur.nummer}) staat in uw boekingspagina. Laat gerust een beoordeling achter.`, id);
  } else {
    k.status = 'factuur_verzonden';
    sendEmail('klant', k.email, 'Factuur en betaallink voor uw klus', `Uw klus "${k.klus}" is uitgevoerd. Betaal ${euro(factuur.totaal)} eenvoudig via uw beveiligde betaallink: ${factuur.betaallink}. Na betaling kunt u een beoordeling achterlaten.`, id);
  }
  Store.set(TBL.klussen, klussen);
  sendEmail('vakman', currentVakman.email, 'Uitbetaling gepland', `Uitbetaling voor "${k.klus}" (${euro(factuur.vakmanUitbetaling)} excl. btw) staat klaar en wordt vrijgegeven zodra de klant heeft betaald en er geen open klacht is.`, id);
  renderVakmanDash();
}

/* =====================================================
   URENREGISTRATIE (modal, alleen bij uurtarief)
===================================================== */
let urenKlusId = null;
function openUren(klusId) {
  urenKlusId = klusId;
  const k = Store.get(TBL.klussen, []).find(x => x.id === klusId);
  qs('#uren-modal')?.classList.add('open');
  if (qs('#uren-min')) qs('#uren-min').textContent = k?.prijs.minUren || getSettings().minUren;
  ['#uren-start', '#uren-eind', '#uren-pauze', '#uren-beschrijving'].forEach(id => { const el = qs(id); if (el) el.value = ''; });
}
function initUren() {
  qs('#uren-close')?.addEventListener('click', () => qs('#uren-modal').classList.remove('open'));
  qs('#uren-submit')?.addEventListener('click', () => {
    const start = qs('#uren-start')?.value, eind = qs('#uren-eind')?.value;
    const pauze = qs('#uren-pauze')?.value || 0, beschrijving = qs('#uren-beschrijving')?.value.trim();
    if (!start || !eind) return alert('Vul start- en eindtijd in.');
    if (!beschrijving) return alert('Geef een korte werkbeschrijving.');
    const gewerkt = berekenUren(start, eind, pauze);
    if (gewerkt <= 0) return alert('De eindtijd moet na de starttijd liggen.');
    const k = registreerUren(urenKlusId, { start, eind, pauzeMin: pauze, beschrijving });
    if (!k) return alert('Uren konden niet worden opgeslagen.');
    qs('#uren-modal').classList.remove('open');
    sendEmail('klant', k.email, 'Gewerkte uren geregistreerd',
      `Voor uw klus "${k.klus}" zijn ${k.uren.berekend} uur geregistreerd (minimaal ${k.prijs.minUren} uur). Bijgewerkt totaal: ${euro(k.prijs.totaal)} incl. btw en servicekosten.`, k.id);
    alert(`Uren opgeslagen: ${k.uren.berekend} uur. Nieuw klantbedrag: ${euro(k.prijs.totaal)} — uw vergoeding: ${euro(k.prijs.vergoedingVakmanExcl)} excl. btw.`);
    renderVakmanDash();
  });
}

/* =====================================================
   EXTRA KOSTEN (modal)
   Worden nooit automatisch definitief: eerst akkoord klant,
   daarna controle door Fixli.
===================================================== */
let extraKlusId = null;
function openExtraKost(klusId) {
  extraKlusId = klusId;
  const k = Store.get(TBL.klussen, []).find(x => x.id === klusId);
  const sel = qs('#ek-type');
  if (sel) {
    const toegestaan = EXTRA_TYPES.filter(t =>
      (t !== 'Materiaal' || k.prijs.materiaal !== false) &&
      (t !== 'Parkeren' || k.prijs.parkeren !== false) &&
      (t !== 'Meerwerk' || k.prijs.meerwerk !== false));
    sel.innerHTML = toegestaan.map(t => `<option>${t}</option>`).join('');
  }
  ['#ek-omschrijving', '#ek-bedrag', '#ek-bewijs'].forEach(id => { const el = qs(id); if (el) el.value = ''; });
  qs('#extrakost-modal')?.classList.add('open');
}
function initExtraKost() {
  qs('#ek-close')?.addEventListener('click', () => qs('#extrakost-modal').classList.remove('open'));
  qs('#ek-submit')?.addEventListener('click', () => {
    const type = qs('#ek-type')?.value;
    const omschrijving = qs('#ek-omschrijving')?.value.trim();
    const bedrag = parseFloat(qs('#ek-bedrag')?.value);
    if (!omschrijving) return alert('Omschrijving is verplicht.');
    if (!(bedrag > 0)) return alert('Vul een geldig bedrag (excl. btw) in.');
    const item = voegExtraKostToe(extraKlusId, { type, omschrijving, bedragExcl: bedrag, bewijs: qs('#ek-bewijs')?.value || '' });
    if (!item) return;
    const k = Store.get(TBL.klussen, []).find(x => x.id === extraKlusId);
    sendEmail('klant', k.email, 'Extra kosten ter goedkeuring',
      `De vakman heeft extra kosten toegevoegd aan "${k.klus}": ${type} — ${omschrijving} (${euro(bedrag)} excl. btw). Geef akkoord of wijs af via uw boekingspagina.`, k.id);
    qs('#extrakost-modal').classList.remove('open');
    alert('Extra kosten toegevoegd. De klant moet eerst akkoord geven; daarna controleert Fixli. Pas na goedkeuring komen ze op de factuur.');
    renderVakmanDash();
  });
}

/* =====================================================
   VAKMAN: PLANNING / UREN&KOSTEN / UITBETALINGEN / DOCUMENTEN
===================================================== */
function renderVakmanPlanning() {
  const c = qs('#vp-planning'); if (!c || !currentVakman) return;
  const klussen = Store.get(TBL.klussen, [])
    .filter(k => k.accepted_by === currentVakman.id && ['geaccepteerd', 'ingepland', 'onderweg'].includes(k.status))
    .sort((a, b) => (a.datum + (a.tijd || '')) < (b.datum + (b.tijd || '')) ? -1 : 1);
  if (!klussen.length) { c.innerHTML = `<div class="alert alert--info">Geen geplande klussen.</div>`; return; }
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Datum</th><th>Tijd</th><th>Klus</th><th>Plaats</th><th>Status</th></tr></thead>
    <tbody>${klussen.map(k => `<tr>
      <td><strong>${fmtDate(k.datum)}</strong></td><td>${esc(k.tijd || 'Flexibel')}</td>
      <td>${esc(k.klus)}</td><td>${esc(k.plaats)}</td>
      <td><span class="badge ${statusBadge(k.status)}">${statusLabel(k.status)}</span></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function renderUrenExtra() {
  const c = qs('#vp-urenkosten'); if (!c || !currentVakman) return;
  const klussen = Store.get(TBL.klussen, []).filter(k => k.accepted_by === currentVakman.id);
  const urenRows = klussen.filter(k => k.uren).map(k => `<tr>
    <td>${esc(k.klus)}</td><td>${esc(k.uren.start)}–${esc(k.uren.eind)}</td><td>${k.uren.pauzeMin || 0} min</td>
    <td><strong>${k.uren.berekend} u</strong></td><td>${esc(k.uren.beschrijving || '')}</td></tr>`).join('');
  const extras = Store.get(TBL.extrakosten, []).filter(e => klussen.some(k => k.id === e.klusId));
  const extraRows = extras.map(e => {
    const k = klussen.find(x => x.id === e.klusId);
    return `<tr><td>${esc(k?.klus || '')}</td><td>${esc(e.type)}</td><td>${esc(e.omschrijving)}</td>
      <td>${euro(e.bedragExcl)}</td><td><span class="badge ${EXTRA_STATUS[e.status]?.badge}">${EXTRA_STATUS[e.status]?.label}</span></td></tr>`;
  }).join('');
  c.innerHTML = `
    <h4 style="margin-bottom:12px">⏱️ Urenregistraties</h4>
    ${urenRows ? `<div class="table-wrap" style="margin-bottom:24px"><table><thead><tr><th>Klus</th><th>Tijden</th><th>Pauze</th><th>Berekend</th><th>Werkbeschrijving</th></tr></thead><tbody>${urenRows}</tbody></table></div>` : '<div class="alert alert--info">Nog geen uren geregistreerd.</div>'}
    <h4 style="margin-bottom:12px">➕ Extra kosten</h4>
    ${extraRows ? `<div class="table-wrap"><table><thead><tr><th>Klus</th><th>Type</th><th>Omschrijving</th><th>Bedrag excl.</th><th>Status</th></tr></thead><tbody>${extraRows}</tbody></table></div>` : '<div class="alert alert--info">Nog geen extra kosten toegevoegd.</div>'}`;
}

function renderUitbetalingen() {
  const c = qs('#vp-uitbetalingen'); if (!c || !currentVakman) return;
  const facturen = Store.get(TBL.facturen, []).filter(f => f.accepted_by === currentVakman.id);
  if (!facturen.length) { c.innerHTML = `<div class="alert alert--info">Nog geen uitbetalingen. Na afronding en betaling door de klant verschijnen ze hier.</div>`; return; }
  const open = facturen.filter(f => f.uitbetaalstatus !== 'uitbetaald').reduce((s, f) => s + f.vakmanUitbetaling, 0);
  const klaar = facturen.filter(f => f.uitbetaalstatus === 'uitbetaald').reduce((s, f) => s + f.vakmanUitbetaling, 0);
  c.innerHTML = `
    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--teal">⏳</div><div><strong>${euro(open)}</strong><span>Openstaand</span></div></div>
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--teal">✅</div><div><strong>${euro(klaar)}</strong><span>Uitbetaald</span></div></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Factuur</th><th>Klus</th><th>Uitbetaling excl. btw</th><th>Klant betaald?</th><th>Status</th></tr></thead>
      <tbody>${facturen.map(f => {
        const check = kanUitbetalen(f);
        return `<tr><td>${esc(f.nummer)}</td><td>${esc(f.klusomschrijving)}</td><td><strong>${euro(f.vakmanUitbetaling)}</strong></td>
          <td>${f.betaalstatus === 'betaald' ? '✓ Ja' : 'Nog niet'}</td>
          <td>${f.uitbetaalstatus === 'uitbetaald' ? '<span class="badge badge--green">Uitbetaald</span>'
            : check.ok ? '<span class="badge badge--blue">Klaar voor uitbetaling</span>'
            : `<span class="badge badge--orange" title="${esc(check.reden)}">Wacht — ${esc(check.reden)}</span>`}</td></tr>`;
      }).join('')}</tbody></table></div>
    <p style="font-size:.8rem;color:var(--gray-400);margin-top:12px">Uitbetaling volgt nadat de klant via Fixli heeft betaald en er geen open klacht op de klus staat.</p>`;
}

function renderVakmanDocumenten() {
  const c = qs('#vp-documenten'); if (!c || !currentVakman) return;
  const docs = currentVakman.documenten || [];
  c.innerHTML = `
    ${docs.length ? `<div class="table-wrap" style="margin-bottom:20px"><table>
      <thead><tr><th>Document</th><th>Verloopt op</th><th>Status</th></tr></thead>
      <tbody>${docs.map(d => {
        const naam = typeof d === 'string' ? d : d.naam;
        const verloopt = typeof d === 'object' ? d.verlooptOp : null;
        const dagen = verloopt ? Math.ceil((new Date(verloopt) - new Date()) / 864e5) : null;
        const status = dagen === null ? '<span class="badge badge--gray">Onbekend</span>'
          : dagen < 0 ? '<span class="badge badge--red">Verlopen</span>'
          : dagen < 60 ? `<span class="badge badge--orange">Verloopt over ${dagen} dagen</span>`
          : '<span class="badge badge--green">Geldig</span>';
        return `<tr><td>📄 ${esc(naam)}</td><td>${verloopt ? fmtDate(verloopt) : '—'}</td><td>${status}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="alert alert--info">Nog geen documenten geüpload.</div>'}
    <div class="upload-area" id="vm-doc-upload"><div class="upload-area__icon">📄</div><p>Nieuw document uploaden (demo)</p><input type="file"></div>`;
  const area = qs('#vm-doc-upload'); const input = area?.querySelector('input');
  area?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', () => {
    if (!input.files[0]) return;
    const vakmannen = Store.get(TBL.vakmannen, []);
    const vm = vakmannen.find(v => v.id === currentVakman.id);
    const verlooptOp = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
    (vm.documenten = vm.documenten || []).push({ naam: input.files[0].name, verlooptOp });
    Store.set(TBL.vakmannen, vakmannen);
    renderVakmanDash();
  });
}

function renderVerdiensten() {
  const c = qs('#vp-verdiensten'); if (!c || !currentVakman) return;
  const facturen = Store.get(TBL.facturen, []).filter(f => f.accepted_by === currentVakman.id);
  const totaal = facturen.reduce((s, f) => s + (f.vakmanUitbetaling || 0), 0);
  c.innerHTML = `
    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--teal">💶</div><div><strong>${euro(totaal)}</strong><span>Totaal uitbetalingen excl. btw</span></div></div>
      <div class="stat-card"><div class="stat-card__icon stat-card__icon--navy">📄</div><div><strong>${facturen.length}</strong><span>Uitbetalingsspecificaties</span></div></div>
    </div>
    ${facturen.length ? `<div class="table-wrap"><table><thead><tr><th>Klus</th><th>Datum</th><th>Vergoeding excl. btw</th><th>Status</th></tr></thead><tbody>
      ${facturen.map(f => `<tr><td>${esc(f.klusomschrijving)}</td><td>${fmtDate(f.datum)}</td><td>${euro(f.vakmanUitbetaling)}</td><td><span class="badge badge--blue">Gepland</span></td></tr>`).join('')}
    </tbody></table></div>` : `<div class="alert alert--info">Nog geen uitbetalingen.</div>`}`;
}

function renderVakmanReviews() {
  const c = qs('#vp-reviews'); if (!c || !currentVakman) return;
  const reviews = Store.get(TBL.reviews, []).filter(r => r.vakmanId === currentVakman.id);
  if (!reviews.length) { c.innerHTML = `<div class="alert alert--info">U heeft nog geen beoordelingen.</div>`; return; }
  const gem = (reviews.reduce((s, r) => s + r.sterren, 0) / reviews.length).toFixed(1);
  c.innerHTML = `<div class="alert alert--success">Gemiddelde beoordeling: <strong>★ ${gem}/5</strong> (${reviews.length})</div>` +
    reviews.map(r => `<div class="card" style="margin-bottom:12px"><strong>${'★'.repeat(r.sterren)}${'☆'.repeat(5 - r.sterren)}</strong> — ${esc(r.door || 'Klant')}<p style="margin-top:6px">${esc(r.tekst || '')}</p></div>`).join('');
}

function renderVakmanProfiel() {
  const c = qs('#vp-profiel'); if (!c || !currentVakman) return;
  const vm = currentVakman;
  const docNamen = (vm.documenten || []).map(d => typeof d === 'string' ? d : d.naam);
  c.innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <h4 style="margin-bottom:12px">⚙️ Beschikbaarheid & werkgebied</h4>
    <label class="check-line" style="margin-bottom:14px"><input type="checkbox" id="vm-beschikbaar-toggle" ${vm.beschikbaar !== false ? 'checked' : ''}>
      <span><strong>Ik ben beschikbaar voor nieuwe klussen</strong><br><span style="font-size:.8rem;color:var(--gray-400)">Uit = u ontvangt geen nieuwe klussen, lopende klussen blijven zichtbaar.</span></span></label>
    <div class="form-group"><label>Werkgebied (postcodecijfers, komma-gescheiden)</label>
      <input id="vm-werkgebied-edit" value="${esc((vm.werkgebied || []).join(', '))}" placeholder="Bijv. 38, 35, 37"></div>
    <button class="btn btn-sm btn-primary" id="vm-profiel-opslaan">Opslaan</button>
  </div>
  <div class="card">
    <h4 style="margin-bottom:12px">Bedrijfsgegevens</h4>
    <p><strong>Bedrijf:</strong> ${esc(vm.bedrijfsnaam)}</p>
    <p><strong>Contactpersoon:</strong> ${esc(vm.naam)}</p>
    <p><strong>E-mail:</strong> ${esc(vm.email)} · <strong>Tel:</strong> ${esc(vm.telefoon)}</p>
    <p><strong>KvK:</strong> ${esc(vm.kvk)} · <strong>Btw:</strong> ${esc(vm.btw || '—')}</p>
    <p><strong>IBAN:</strong> ${esc(vm.iban || '—')}</p>
    <p><strong>Werkgebied:</strong> ${esc((vm.werkgebied || []).map(w => w + 'xx').join(', ')) || 'Overal'}</p>
    <p><strong>Vakgebieden:</strong> ${esc((vm.vakgebieden || []).join(', '))}</p>
    <p><strong>Ervaring:</strong> ${esc(vm.ervaring || '—')} jaar</p>
    <p><strong>Documenten:</strong> ${esc(docNamen.join(', ')) || 'Geen'}</p>
    <p style="margin-top:10px"><strong>Status:</strong> <span class="badge ${(VAKMAN_STATUS[vm.status] || {}).badge}">${(VAKMAN_STATUS[vm.status] || {}).label}</span></p>
  </div>`;
  qs('#vm-profiel-opslaan')?.addEventListener('click', () => {
    const vakmannen = Store.get(TBL.vakmannen, []);
    const v = vakmannen.find(x => x.id === vm.id); if (!v) return;
    v.beschikbaar = qs('#vm-beschikbaar-toggle')?.checked !== false;
    v.werkgebied = (qs('#vm-werkgebied-edit')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
    Store.set(TBL.vakmannen, vakmannen);
    alert('Profiel opgeslagen.');
    renderVakmanDash();
  });
}

/* =====================================================
   ADMIN DASHBOARD
===================================================== */
function initAdmin() {
  qs('#admin-login-btn')?.addEventListener('click', () => {
    if (qs('#admin-pw')?.value === 'admin123') {
      qs('#admin-login-screen').classList.add('hidden');
      qs('#admin-content').classList.remove('hidden');
      renderAdmin();
    } else alert('Onjuist wachtwoord.');
  });
  qs('#admin-logout')?.addEventListener('click', () => {
    qs('#admin-login-screen').classList.remove('hidden');
    qs('#admin-content').classList.add('hidden');
  });
  qs('#admin-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.admin-tab'); if (!tab) return;
    qsa('.admin-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
    qsa('.admin-panel').forEach(p => p.classList.remove('active'));
    qs(`#ap-${tab.dataset.panel}`)?.classList.add('active');
    renderAdmin();
  });
}

function renderAdmin() {
  renderAdminStats(); renderAdminKlussen(); renderAdminControle(); renderAdminVakmannen();
  renderAdminFacturen(); renderAdminKlachten(); renderAdminReviews();
  renderAdminNotif(); renderAdminTarieven(); renderAdminSettings();
}

function renderAdminStats() {
  const c = qs('#admin-stats'); if (!c) return;
  const k = Store.get(TBL.klussen, []), v = Store.get(TBL.vakmannen, []), f = Store.get(TBL.facturen, []), kl = Store.get(TBL.klachten, []);
  const omzetIncl = f.reduce((s, x) => s + x.totaal, 0);
  const omzetExcl = f.reduce((s, x) => s + x.bedragExcl, 0);
  const marge = f.reduce((s, x) => s + (x.margeFixli || 0), 0);
  const uitbetaling = f.reduce((s, x) => s + (x.vakmanUitbetaling || 0), 0);
  const card = (icon, val, lbl, tone = 'teal') => `<div class="stat-card"><div class="stat-card__icon stat-card__icon--${tone}">${icon}</div><div><strong>${val}</strong><span>${lbl}</span></div></div>`;
  c.innerHTML = `<div class="stat-grid">
    ${card('🆕', k.filter(x => x.status === 'wacht_controle').length, 'Wacht op controle', 'navy')}
    ${card('📋', k.filter(x => x.status === 'beschikbaar').length, 'Open klussen')}
    ${card('✅', k.filter(x => x.status === 'geaccepteerd').length, 'Geaccepteerd')}
    ${card('🏁', k.filter(x => ['uitgevoerd', 'betaald', 'afgerond'].includes(x.status)).length, 'Afgerond')}
    ${card('💶', euro(omzetIncl), 'Omzet incl. btw', 'navy')}
    ${card('💰', euro(marge), 'Fixli marge', 'teal')}
    ${card('🏦', euro(uitbetaling), 'Uitbetaling vakmannen', 'navy')}
    ${card('👷', v.filter(x => x.status === 'goedgekeurd').length, 'Actieve vakmannen')}
    ${card('📨', v.filter(x => x.status === 'wacht_op_goedkeuring').length, 'Nieuwe vakmannen', 'navy')}
    ${card('⚠️', kl.filter(x => x.status !== 'gesloten' && x.status !== 'opgelost').length, 'Open klachten', 'navy')}
  </div>`;
}

function renderAdminKlussen() {
  const c = qs('#admin-klussen-table'); if (!c) return;
  const klussen = Store.get(TBL.klussen, []);
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Klus</th><th>Klant</th><th>Plaats</th><th>Tarief</th><th>Klantprijs</th><th>Vakman vergoeding</th><th>Marge</th><th>Status</th><th>Acties</th></tr></thead>
    <tbody>${klussen.map(k => `<tr>
      <td>${esc(k.klus)}<br><span style="color:var(--gray-400);font-size:.78rem">${esc(k.vakgebied)}${k.uren ? ' · ⏱️ ' + k.uren.berekend + ' u' : ''}</span></td>
      <td>${esc(k.naam)}</td><td>${esc(k.plaats)}</td>
      <td>${tariefLabel(k.prijs.mode)}</td>
      <td>${k.prijs.mode === 'aanvraag' && !k.prijs.totaal ? '—' : euro(k.prijs.totaal)}</td>
      <td>${euro(k.prijs.vergoedingVakmanExcl)}</td>
      <td>${euro(k.prijs.margeFixliExcl)}</td>
      <td><span class="badge ${statusBadge(k.status)}">${statusLabel(k.status)}</span></td>
      <td><div class="admin-actions">
        ${k.status === 'wacht_controle' && k.prijs.mode === 'aanvraag' ? `<button class="btn btn-sm btn-primary" onclick="adminPrijsvoorstel('${k.id}')">💶 Prijsvoorstel</button>` : ''}
        ${k.status === 'wacht_controle' && k.prijs.mode !== 'aanvraag' ? `<button class="btn btn-sm btn-success" onclick="keurAanvraagGoed('${k.id}')">Goedkeuren</button>` : ''}
        ${k.status === 'wacht_controle' ? `<button class="btn btn-sm btn-danger" onclick="wijsAanvraagAf('${k.id}')">Afwijzen</button>` : ''}
        <button class="btn btn-sm btn-outline" onclick="adminWijzigPrijs('${k.id}')">Prijs</button>
        <select onchange="adminZetStatus('${k.id}', this.value)"><option value="">Status…</option>${Object.keys(KLUS_STATUS).map(s => `<option value="${s}">${KLUS_STATUS[s].label}</option>`).join('')}</select>
      </div></td></tr>`).join('')}</tbody></table></div>`;
}

/* Prijsvoorstel maken bij "prijs op aanvraag" (punt 13) */
function adminPrijsvoorstel(id) {
  const bedrag = prompt('Voorgesteld werkbedrag incl. btw (servicekosten worden automatisch toegevoegd):');
  if (bedrag === null) return;
  if (!(+bedrag > 0)) return alert('Vul een geldig bedrag in.');
  const toelichting = prompt('Korte toelichting voor de klant (optioneel):') || '';
  const k = maakPrijsvoorstel(id, +bedrag, toelichting);
  if (k) { audit('Prijsvoorstel gedaan', `${k.klus} → ${euro(k.prijs.totaal)}`); alert(`Prijsvoorstel verstuurd: ${euro(k.prijs.totaal)} incl. btw en servicekosten. De klant kan accepteren of annuleren.`); }
  renderAdmin();
}

function keurAanvraagGoed(id) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === id); if (!k) return;
  k.status = 'beschikbaar'; k.goedgekeurd_op = new Date().toISOString();
  Store.set(TBL.klussen, klussen);
  audit('Aanvraag goedgekeurd', k.klus);
  sendEmail('klant', k.email, 'Aanvraag goedgekeurd', `Uw aanvraag "${k.klus}" is goedgekeurd en staat nu open voor passende vakmannen.`, id);
  // Notificeer matchende vakmannen
  Store.get(TBL.vakmannen, []).filter(v => vakmanMatchtKlus(v, k)).forEach(v =>
    sendEmail('vakman', v.email, 'Nieuwe passende klus beschikbaar', `Er staat een nieuwe klus "${k.klus}" in ${k.plaats} klaar.`, id));
  renderAdmin();
}
function wijsAanvraagAf(id) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === id); if (!k) return;
  k.status = 'afgewezen'; Store.set(TBL.klussen, klussen);
  audit('Aanvraag afgewezen', k.klus);
  sendEmail('klant', k.email, 'Aanvraag afgewezen', `Uw aanvraag "${k.klus}" kon helaas niet in behandeling worden genomen.`, id);
  renderAdmin();
}
function adminZetStatus(id, status) {
  if (!status) return;
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === id); if (!k) return;
  k.status = status; Store.set(TBL.klussen, klussen);
  if (['uitgevoerd', 'betaald', 'afgerond'].includes(status)) maakFactuur(k);
  audit('Status gewijzigd', `${k.klus} → ${statusLabel(status)}`);
  renderAdmin();
}
function adminWijzigPrijs(id) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === id); if (!k) return;
  const nieuw = prompt('Nieuwe klantprijs incl. btw (incl. servicekosten):', k.prijs.totaal || 0);
  if (nieuw === null) return;
  const s = getSettings();
  const totaal = round2(+nieuw);
  const werkIncl = round2(totaal - s.servicekosten);
  const v = verdeelBedrag(werkIncl, s.servicekosten);
  k.prijs = { ...k.prijs, mode: k.prijs.mode === 'aanvraag' ? 'vast' : k.prijs.mode,
    klusprijs: werkIncl, servicekosten: s.servicekosten, ...v };
  Store.set(TBL.klussen, klussen);
  audit('Klantprijs gewijzigd', `${k.klus} → ${euro(totaal)}`);
  renderAdmin();
}

function renderAdminVakmannen() {
  const c = qs('#admin-vakmannen-table'); if (!c) return;
  const vakmannen = Store.get(TBL.vakmannen, []);
  c.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Bedrijf</th><th>Contact</th><th>Vakgebied</th><th>Werkgebied</th><th>Documenten</th><th>Status</th><th>Acties</th></tr></thead>
    <tbody>${vakmannen.map(v => `<tr>
      <td>${esc(v.bedrijfsnaam)}<br><span style="color:var(--gray-400);font-size:.78rem">KvK ${esc(v.kvk || '—')}</span></td>
      <td>${esc(v.naam)}<br><span style="color:var(--gray-400);font-size:.78rem">${esc(v.email)}</span></td>
      <td>${esc((v.vakgebieden || []).join(', ')) || '—'}</td>
      <td>${esc((v.werkgebied || []).map(w => w + 'xx').join(', ')) || 'Overal'}</td>
      <td>${(v.documenten || []).length} stuk(s)</td>
      <td><span class="badge ${(VAKMAN_STATUS[v.status] || {}).badge}">${(VAKMAN_STATUS[v.status] || {}).label}</span></td>
      <td><div class="admin-actions">
        ${v.status !== 'goedgekeurd' ? `<button class="btn btn-sm btn-success" onclick="zetVakmanStatus('${v.id}','goedgekeurd')" title="Goedkeuren">✓</button>` : ''}
        ${!['afgewezen', 'geblokkeerd'].includes(v.status) ? `<button class="btn btn-sm btn-danger" onclick="zetVakmanStatus('${v.id}','afgewezen')" title="Afwijzen">✗</button>` : ''}
        ${v.status === 'goedgekeurd' ? `<button class="btn btn-sm btn-outline" onclick="zetVakmanStatus('${v.id}','gepauzeerd')">⏸️ Pauzeren</button>` : ''}
        ${v.status === 'gepauzeerd' ? `<button class="btn btn-sm btn-outline" onclick="zetVakmanStatus('${v.id}','goedgekeurd')">▶️ Hervatten</button>` : ''}
        ${v.status !== 'geblokkeerd' ? `<button class="btn btn-sm btn-danger" onclick="zetVakmanStatus('${v.id}','geblokkeerd')">⛔ Blokkeren</button>` : `<button class="btn btn-sm btn-outline" onclick="zetVakmanStatus('${v.id}','goedgekeurd')">Deblokkeren</button>`}
      </div></td></tr>`).join('')}</tbody></table></div>`;
}
function zetVakmanStatus(id, status) {
  if (!status) return;
  const vakmannen = Store.get(TBL.vakmannen, []);
  const v = vakmannen.find(x => x.id === id); if (!v) return;
  const oud = v.status; v.status = status; Store.set(TBL.vakmannen, vakmannen);
  audit('Vakmanstatus gewijzigd', `${v.bedrijfsnaam} → ${(VAKMAN_STATUS[status] || {}).label}`);
  if (status === 'goedgekeurd' && oud !== 'goedgekeurd') sendEmail('vakman', v.email, 'Account goedgekeurd', `Gefeliciteerd ${v.naam}, uw account is goedgekeurd. U kunt nu klussen accepteren.`);
  if (status === 'afgewezen') sendEmail('vakman', v.email, 'Account afgewezen', `Uw aanmelding is helaas afgewezen.`);
  renderAdmin();
}

function renderAdminFacturen() {
  const c = qs('#admin-facturen-table'); if (!c) return;
  const f = Store.get(TBL.facturen, []);
  const users = Store.get(TBL.users, []);
  c.innerHTML = (f.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Factuur</th><th>Klant</th><th>Totaal incl.</th><th>Btw</th><th>Vakman</th><th>Marge</th><th>Betaling</th><th>Uitbetaling</th><th>Acties</th></tr></thead>
    <tbody>${f.map(x => {
      const check = kanUitbetalen(x);
      return `<tr><td><a href="#" onclick="toonFactuur('${x.id}');return false" style="color:var(--teal-dark);font-weight:600">${x.nummer}</a></td>
      <td>${esc(x.klant.naam)}</td><td>${euro(x.totaal)}</td><td>${euro(x.btw)}</td><td>${euro(x.vakmanUitbetaling)}</td><td>${euro(x.margeFixli)}</td>
      <td><span class="badge ${x.betaalstatus === 'betaald' ? 'badge--green' : 'badge--orange'}">${x.betaalstatus}</span></td>
      <td>${x.uitbetaalstatus === 'uitbetaald' ? '<span class="badge badge--green">Uitbetaald</span>' : check.ok ? '<span class="badge badge--blue">Klaar</span>' : `<span class="badge badge--orange" title="${esc(check.reden)}">Wacht</span>`}</td>
      <td><div class="admin-actions">
        ${x.betaalstatus !== 'betaald' ? `<button class="btn btn-sm btn-success" onclick="adminMarkeerBetaald('${x.id}')">💳 Betaald</button>` : ''}
        ${x.uitbetaalstatus !== 'uitbetaald' ? `<button class="btn btn-sm btn-primary" onclick="adminUitbetalen('${x.id}')">💸 Uitbetalen</button>` : ''}
      </div></td></tr>`;
    }).join('')}</tbody></table></div>`
    : `<div class="alert alert--info">Nog geen facturen.</div>`) +
  `<h4 style="margin:24px 0 12px">👤 Klanten</h4>
  ${users.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Naam</th><th>E-mail</th><th>Status</th><th>Acties</th></tr></thead>
    <tbody>${users.map(u => `<tr><td>${esc(u.naam)}</td><td>${esc(u.email)}</td>
      <td>${u.geblokkeerd ? '<span class="badge badge--red">Geblokkeerd</span>' : '<span class="badge badge--green">Actief</span>'}</td>
      <td>${u.geblokkeerd ? `<button class="btn btn-sm btn-outline" onclick="adminBlokkeerKlant('${u.id}', false)">Deblokkeren</button>` : `<button class="btn btn-sm btn-danger" onclick="adminBlokkeerKlant('${u.id}', true)">⛔ Blokkeren</button>`}</td>
    </tr>`).join('')}</tbody></table></div>` : '<div class="alert alert--info">Nog geen klantaccounts.</div>'}`;
}

function adminMarkeerBetaald(factuurId) {
  // >> BACKEND: dit doet normaal de payment-provider-webhook
  const f = betaalFactuur(factuurId);
  if (f) audit('Factuur handmatig op betaald gezet', f.nummer);
  renderAdmin();
}
function adminUitbetalen(factuurId) {
  const res = geefUitbetalingVrij(factuurId);
  if (res && !res.ok) return alert('Uitbetaling niet mogelijk: ' + res.reden);
  audit('Uitbetaling vrijgegeven', factuurId);
  alert('Uitbetaling vrijgegeven (demo). // BACKEND: SEPA-batch of Stripe Connect payout.');
  renderAdmin();
}
function adminBlokkeerKlant(userId, blokkeer) {
  const users = Store.get(TBL.users, []);
  const u = users.find(x => x.id === userId); if (!u) return;
  u.geblokkeerd = blokkeer;
  Store.set(TBL.users, users);
  audit(blokkeer ? 'Klant geblokkeerd' : 'Klant gedeblokkeerd', u.email);
  renderAdmin();
}

function renderAdminKlachten() {
  const c = qs('#admin-klachten-table'); if (!c) return;
  const kl = Store.get(TBL.klachten, []);
  const klussen = Store.get(TBL.klussen, []);
  c.innerHTML = kl.length ? kl.map(k => {
    const klus = klussen.find(x => x.id === k.klusId);
    return `<div class="card" style="margin-bottom:12px">
      <div class="klus-card__header"><h4>Klacht via ${k.door}</h4><span class="badge badge--orange">${k.status}</span></div>
      <p style="margin-bottom:8px"><strong>Klus:</strong> ${klus ? esc(klus.klus) : '—'} · ${fmtDate(k.time)}</p>
      <p>${esc(k.tekst)}</p>
      <div class="klus-card__actions" style="margin-top:12px">
        <select onchange="zetKlachtStatus('${k.id}', this.value)"><option value="">Status wijzigen…</option>
          ${['nieuw', 'in_behandeling', 'wacht_klant', 'wacht_vakman', 'opgelost', 'gesloten'].map(s => `<option value="${s}">${s.replace('_', ' ')}</option>`).join('')}</select>
      </div></div>`;
  }).join('') : `<div class="alert alert--info">Geen klachten.</div>`;
}
function zetKlachtStatus(id, status) {
  if (!status) return;
  const kl = Store.get(TBL.klachten, []);
  const k = kl.find(x => x.id === id); if (k) { k.status = status; Store.set(TBL.klachten, kl); audit('Klacht bijgewerkt', status); }
  renderAdminKlachten(); renderAdminStats();
}

function renderAdminReviews() {
  const c = qs('#admin-reviews-table'); if (!c) return;
  const r = Store.get(TBL.reviews, []);
  c.innerHTML = r.length ? r.map(x => `<div class="card" style="margin-bottom:12px"><strong>${'★'.repeat(x.sterren)}${'☆'.repeat(5 - x.sterren)}</strong> — ${esc(x.door || 'Klant')} · ${fmtDate(x.time)}<p style="margin-top:6px">${esc(x.tekst || '')}</p></div>`).join('')
    : `<div class="alert alert--info">Nog geen reviews.</div>`;
}

function renderAdminNotif() {
  const c = qs('#admin-notif-table'); if (!c) return;
  const log = Store.get(TBL.notif, []);
  c.innerHTML = log.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Tijd</th><th>Naar</th><th>Ontvanger</th><th>Onderwerp</th></tr></thead>
    <tbody>${log.slice(0, 50).map(m => `<tr><td>${new Date(m.time).toLocaleString('nl-NL')}</td><td><span class="badge badge--gray">${m.to}</span></td><td>${esc(m.email)}</td><td>${esc(m.subject)}</td></tr>`).join('')}</tbody></table></div>`
    : `<div class="alert alert--info">Nog geen verzonden notificaties.</div>`;
}

function renderAdminSettings() {
  const c = qs('#admin-settings'); if (!c) return;
  const s = getSettings();
  c.innerHTML = `<div class="card" style="max-width:560px">
    <h4 style="margin-bottom:16px">Platforminstellingen</h4>
    ${setRow('Servicekosten (incl. btw)', 'set-service', s.servicekosten)}
    ${setRow('Spoedtoeslag (incl. btw)', 'set-spoed', s.spoedtoeslag)}
    ${setRow('Avondtoeslag (incl. btw, vanaf 18:00)', 'set-avond', s.avondtoeslag)}
    ${setRow('Weekendtoeslag (incl. btw)', 'set-weekend', s.weekendtoeslag)}
    ${setRow('Minimale uren bij uurtarief', 'set-minuren', s.minUren)}
    ${setRow('Aandeel vakman (0–1)', 'set-share', s.vakmanShare)}
    ${setRow('Annulering: servicekosten binnen (uren vóór afspraak)', 'set-annul-uren', s.annuleringBinnenUren)}
    ${setRow('Voorrijkosten bij annulering onderweg (incl. btw)', 'set-voorrij', s.voorrijkosten)}
    ${setRow('Anti-omzeilingsperiode (maanden)', 'set-anti', s.antiOmzeilingMaanden)}
    ${setRow('Boete vakman (incl. btw)', 'set-boete-vm', s.boeteVakman)}
    ${setRow('Boete klant (incl. btw)', 'set-boete-kl', s.boeteKlant)}
    <button class="btn btn-primary mt-4" onclick="bewaarSettings()">Instellingen opslaan</button>
  </div>
  <div class="card" style="max-width:560px;margin-top:16px"><h4 style="margin-bottom:12px">Audit-log (adminacties)</h4>
    ${(Store.get(TBL.auditlog, []).slice(0, 20).map(l => `<p style="font-size:.82rem;color:var(--gray-600)">${new Date(l.time).toLocaleString('nl-NL')} — ${l.actie}: ${l.detail}</p>`).join('') || '<p style="color:var(--gray-400)">Nog geen acties.</p>')}</div>`;
}

/* =====================================================
   ADMIN: CONTROLE — urenregistraties en extra kosten
===================================================== */
function renderAdminControle() {
  const c = qs('#admin-controle'); if (!c) return;
  const klussen = Store.get(TBL.klussen, []);

  // Urenregistraties ter controle
  const uren = klussen.filter(k => k.uren);
  const urenRows = uren.map(k => `<tr>
    <td>${esc(k.klus)}<br><span style="color:var(--gray-400);font-size:.78rem">${esc(k.naam)}</span></td>
    <td>${esc(k.uren.start)}–${esc(k.uren.eind)} (${k.uren.pauzeMin || 0} min pauze)</td>
    <td><strong>${k.uren.berekend} u</strong> (gewerkt ${k.uren.gewerkt} u, min. ${k.prijs.minUren} u)</td>
    <td>${esc(k.uren.beschrijving || '')}</td>
    <td>${euro(k.prijs.totaal)}</td>
    <td>${k.uren.status === 'gecontroleerd' ? '<span class="badge badge--green">Gecontroleerd</span>' : `<button class="btn btn-sm btn-success" onclick="adminKeurUrenGoed('${k.id}')">✓ Controleren</button>`}</td>
  </tr>`).join('');

  // Extra kosten ter controle / overzicht
  const extras = Store.get(TBL.extrakosten, []);
  const extraRows = extras.map(e => {
    const k = klussen.find(x => x.id === e.klusId);
    return `<tr>
      <td>${esc(k?.klus || '—')}<br><span style="color:var(--gray-400);font-size:.78rem">${esc(k?.naam || '')}</span></td>
      <td>${esc(e.type)}</td><td>${esc(e.omschrijving)}</td><td>${euro(e.bedragExcl)}</td>
      <td><span class="badge ${EXTRA_STATUS[e.status]?.badge}">${EXTRA_STATUS[e.status]?.label}</span></td>
      <td><div class="admin-actions">
        ${e.status === 'wacht_controle' ? `<button class="btn btn-sm btn-success" onclick="adminExtraKost('${e.id}','goedgekeurd')">✓ Goedkeuren</button><button class="btn btn-sm btn-danger" onclick="adminExtraKost('${e.id}','afgewezen')">✗ Afwijzen</button>` : ''}
        ${e.status === 'wacht_klant' ? '<span style="font-size:.78rem;color:var(--gray-400)">Wacht eerst op klant</span>' : ''}
      </div></td>
    </tr>`;
  }).join('');

  c.innerHTML = `
    <h4 style="margin-bottom:12px">⏱️ Urenregistraties controleren</h4>
    ${urenRows ? `<div class="table-wrap" style="margin-bottom:28px"><table><thead><tr><th>Klus</th><th>Tijden</th><th>Berekend</th><th>Werkbeschrijving</th><th>Klantbedrag</th><th>Controle</th></tr></thead><tbody>${urenRows}</tbody></table></div>` : '<div class="alert alert--info" style="margin-bottom:28px">Geen urenregistraties.</div>'}
    <h4 style="margin-bottom:12px">➕ Extra kosten goedkeuren/afwijzen</h4>
    ${extraRows ? `<div class="table-wrap"><table><thead><tr><th>Klus</th><th>Type</th><th>Omschrijving</th><th>Bedrag excl.</th><th>Status</th><th>Acties</th></tr></thead><tbody>${extraRows}</tbody></table></div>` : '<div class="alert alert--info">Geen extra kosten.</div>'}`;
}
function adminKeurUrenGoed(klusId) {
  const klussen = Store.get(TBL.klussen, []);
  const k = klussen.find(x => x.id === klusId);
  if (!k || !k.uren) return;
  k.uren.status = 'gecontroleerd';
  Store.set(TBL.klussen, klussen);
  audit('Uren gecontroleerd', `${k.klus}: ${k.uren.berekend} uur`);
  renderAdmin();
}
function adminExtraKost(id, status) {
  const e = zetExtraKostStatus(id, status);
  if (e) {
    const k = Store.get(TBL.klussen, []).find(x => x.id === e.klusId);
    audit(status === 'goedgekeurd' ? 'Extra kosten goedgekeurd' : 'Extra kosten afgewezen', `${e.type} ${euro(e.bedragExcl)}`);
    if (k) sendEmail('klant', k.email, status === 'goedgekeurd' ? 'Extra kosten goedgekeurd' : 'Extra kosten afgewezen',
      `De extra kosten "${e.omschrijving}" (${euro(e.bedragExcl)} excl. btw) zijn door Fixli ${status === 'goedgekeurd' ? 'goedgekeurd en komen op de eindfactuur' : 'afgewezen en worden niet in rekening gebracht'}.`, k.id);
  }
  renderAdmin();
}

/* =====================================================
   ADMIN: TARIEVEN BEHEREN (tarieftypes, prijzen, uurtarieven, min. uren, flags)
===================================================== */
function renderAdminTarieven() {
  const c = qs('#admin-tarieven'); if (!c) return;
  c.innerHTML = Object.keys(KLUSSEN_DEFAULT).map(vg => `
    <h4 style="margin:18px 0 10px">${VAKGEBIED_ICONS[vg]} ${vg}</h4>
    <div class="table-wrap"><table>
      <thead><tr><th>Klus</th><th>Tarieftype</th><th>Vaste prijs</th><th>Uurtarief</th><th>Min. uren</th><th>Meerwerk</th><th>Materiaal</th><th>Parkeren</th><th></th></tr></thead>
      <tbody>${getKlussenVoor(vg).map(k => {
        const key = `${vg}||${k.naam}`.replace(/'/g, "\\'");
        return `<tr data-tarief-key="${esc(vg)}||${esc(k.naam)}">
          <td>${esc(k.naam)}</td>
          <td><select class="t-mode"><option value="vast" ${k.mode === 'vast' ? 'selected' : ''}>Vaste prijs</option><option value="uur" ${k.mode === 'uur' ? 'selected' : ''}>Uurtarief</option><option value="aanvraag" ${k.mode === 'aanvraag' ? 'selected' : ''}>Op aanvraag</option></select></td>
          <td><input class="t-prijs" style="width:80px" value="${k.prijs ?? ''}"></td>
          <td><input class="t-uur" style="width:70px" value="${k.uurtarief ?? ''}"></td>
          <td><input class="t-min" style="width:55px" value="${k.minUren ?? ''}"></td>
          <td><input type="checkbox" class="t-meerwerk" ${k.meerwerk !== false ? 'checked' : ''}></td>
          <td><input type="checkbox" class="t-materiaal" ${k.materiaal !== false ? 'checked' : ''}></td>
          <td><input type="checkbox" class="t-parkeren" ${k.parkeren !== false ? 'checked' : ''}></td>
          <td><button class="btn btn-sm btn-primary t-save">Opslaan</button></td>
        </tr>`;
      }).join('')}</tbody></table></div>`).join('');

  c.onclick = e => {
    const btn = e.target.closest('.t-save'); if (!btn) return;
    const tr = btn.closest('tr');
    const [vg, naam] = tr.dataset.tariefKey.split('||');
    saveKlusOverride(vg, naam, {
      mode: tr.querySelector('.t-mode').value,
      prijs: parseFloat(tr.querySelector('.t-prijs').value) || null,
      uurtarief: parseFloat(tr.querySelector('.t-uur').value) || null,
      minUren: parseFloat(tr.querySelector('.t-min').value) || getSettings().minUren,
      meerwerk: tr.querySelector('.t-meerwerk').checked,
      materiaal: tr.querySelector('.t-materiaal').checked,
      parkeren: tr.querySelector('.t-parkeren').checked
    });
    audit('Tarief gewijzigd', `${vg} / ${naam}`);
    btn.textContent = '✓ Opgeslagen';
    setTimeout(() => { btn.textContent = 'Opslaan'; }, 1200);
  };
}
function setRow(label, id, val) {
  return `<div class="form-group"><label>${label}</label><input id="${id}" value="${val}"></div>`;
}
function bewaarSettings() {
  const s = getSettings();
  s.servicekosten = +qs('#set-service').value;
  s.spoedtoeslag = +qs('#set-spoed').value;
  s.avondtoeslag = +qs('#set-avond').value;
  s.weekendtoeslag = +qs('#set-weekend').value;
  s.minUren = +qs('#set-minuren').value || 1;
  s.vakmanShare = +qs('#set-share').value;
  s.annuleringBinnenUren = +qs('#set-annul-uren').value;
  s.voorrijkosten = +qs('#set-voorrij').value;
  s.antiOmzeilingMaanden = +qs('#set-anti').value;
  s.boeteVakman = +qs('#set-boete-vm').value;
  s.boeteKlant = +qs('#set-boete-kl').value;
  saveSettings(s); audit('Instellingen opgeslagen');
  alert('Instellingen opgeslagen.');
}


/* =====================================================
   FAQ + CONTACT + TABS
===================================================== */
function initFAQ() {
  document.addEventListener('click', e => {
    const q = e.target.closest('.faq-question'); if (!q) return;
    const open = q.classList.contains('open');
    const list = q.closest('.faq-list');
    qsa('.faq-question', list).forEach(x => { x.classList.remove('open'); x.nextElementSibling?.classList.remove('open'); });
    if (!open) { q.classList.add('open'); q.nextElementSibling?.classList.add('open'); }
  });
}
function initContact() {
  qs('#contact-submit')?.addEventListener('click', () => {
    const n = qs('#c-naam')?.value.trim(), e = qs('#c-email')?.value.trim(), b = qs('#c-bericht')?.value.trim();
    if (!n || !e || !b) return alert('Vul naam, e-mail en bericht in.');
    sendEmail('admin', getSettings().adminEmail, 'Nieuw contactbericht', `Van ${n} (${e}): ${b}`);
    qs('#contact-form-wrap').classList.add('hidden'); qs('#contact-success').classList.remove('hidden');
  });
}
function initTabs() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn[data-group]'); if (!btn) return;
    const g = btn.dataset.group, t = btn.dataset.tab;
    qsa(`.tab-btn[data-group="${g}"]`).forEach(b => b.classList.remove('active')); btn.classList.add('active');
    qsa(`.tab-panel[data-group="${g}"]`).forEach(p => p.classList.remove('active'));
    qs(`.tab-panel[data-group="${g}"][data-tab="${t}"]`)?.classList.add('active');
  });
}

/* =====================================================
   START
===================================================== */
/* =====================================================
   BOOT
   Elke init draait geïsoleerd: één fout (bijv. door oude
   data of een ontbrekend element) kan de rest van de
   pagina — zoals de aanvraagflow — nooit meer blokkeren.
===================================================== */
function fixliBoot() {
  const veilig = (naam, fn) => { try { fn(); } catch (e) { console.error('Fixli init-fout in ' + naam + ':', e); } };

  veilig('initDemoData', initDemoData);
  veilig('migreerData', migreerData);
  veilig('initNav', initNav);
  veilig('initHome', initHome);
  veilig('initFlow', initFlow);
  veilig('initAuth', initAuth);
  veilig('initVakmanForm', initVakmanForm);
  veilig('initVakmanDash', initVakmanDash);
  veilig('initAdmin', initAdmin);
  veilig('initFAQ', initFAQ);
  veilig('initContact', initContact);
  veilig('initTabs', initTabs);
  veilig('initReview', initReview);
  veilig('initKlacht', initKlacht);
  veilig('initFactuur', initFactuur);
  veilig('initUren', initUren);
  veilig('initExtraKost', initExtraKost);
  veilig('accountKnop', () => qs('#sa-create')?.addEventListener('click', maakAccountNaAanvraag));
  veilig('updateAuthUI', updateAuthUI);
  veilig('vakmanSessie', () => {
    const savedVm = Store.get(TBL.curVakman);
    if (savedVm) {
      const vm = Store.get(TBL.vakmannen, []).find(v => v.id === savedVm.id);
      if (vm) loginVakman(vm);
    }
  });
  veilig('renderKlantDash', renderKlantDash);
  veilig('demoModus', () => {
    if (new URLSearchParams(location.search).get('demo') === '1') document.body.classList.add('demo-mode');
  });
}

// Start zodra de DOM klaar is — ook als dit script pas later wordt uitgevoerd.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixliBoot);
} else {
  fixliBoot();
}
