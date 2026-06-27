/**
 * ElektroKlik – Stap-funnel JavaScript (4 stappen)
 * 1. Postcode
 * 2. Dienst
 * 3. Details (dynamisch per dienst)
 * 4. Gegevens
 */
(function () {
  'use strict';

  var huidigeStap = 1;
  var TOTAAL_STAPPEN = 4;

  /* ============================================================
     GLOBALE NAVIGATIE
  ============================================================ */
  window.gaNaarStap = function (doelStap) {
    if (doelStap > huidigeStap) {
      if (!valideerStap(huidigeStap)) return;
    }
    toonStap(doelStap);
  };

  window.scrollNaarFunnel = function (e) {
    e.preventDefault();
    var kaart = document.getElementById('funnelKaart');
    if (kaart) {
      var offset = 80;
      var top = kaart.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
      setTimeout(function () {
        var eersteInput = document.getElementById('postcode');
        if (eersteInput) eersteInput.focus();
      }, 400);
    }
  };

  /* ============================================================
     STAP WEERGAVE
  ============================================================ */
  function toonStap(nr) {
    for (var i = 1; i <= TOTAAL_STAPPEN; i++) {
      var el = document.getElementById('stap' + i);
      if (el) el.classList.add('verborgen');
    }

    var doel = document.getElementById('stap' + nr);
    if (doel) {
      doel.classList.remove('verborgen');

      // Bij stap 3: toon juiste detail-blok op basis van gekozen dienst
      if (nr === 3) {
        toonDetailsBlok();
      }

      var eersteInput = doel.querySelector('input:not([type="radio"]):not([type="checkbox"]):not(.verborgen *), textarea, select');
      if (eersteInput && !eersteInput.closest('.verborgen')) {
        setTimeout(function () { try { eersteInput.focus(); } catch (e) {} }, 50);
      }
    }

    if (window.innerWidth <= 640) {
      var kaart = document.getElementById('funnelKaart');
      if (kaart) {
        setTimeout(function () {
          kaart.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }
    }

    huidigeStap = nr;
    updateVoortgang(nr);
  }

  /* ============================================================
     VOORTGANGSBALK
  ============================================================ */
  function updateVoortgang(actief) {
    for (var i = 1; i <= TOTAAL_STAPPEN; i++) {
      var el = document.getElementById('vstap' + i);
      if (!el) continue;
      el.classList.remove('active', 'klaar');
      if (i < actief) el.classList.add('klaar');
      if (i === actief) el.classList.add('active');
    }

    var lijnen = document.querySelectorAll('.voortgang-lijn');
    lijnen.forEach(function (lijn, idx) {
      if (actief > idx + 1) {
        lijn.style.background = '#059669';
      } else {
        lijn.style.background = '';
      }
    });
  }

  /* ============================================================
     DETAILS BLOK (stap 3) – tonen op basis van gekozen dienst
  ============================================================ */
  function getGekozenDienst() {
    var gekozen = document.querySelector('input[name="dienst"]:checked');
    return gekozen ? gekozen.value : null;
  }

  function toonDetailsBlok() {
    var dienst = getGekozenDienst();
    var blokken = document.querySelectorAll('.details-blok');
    blokken.forEach(function (blok) {
      if (blok.getAttribute('data-dienst') === dienst) {
        blok.classList.remove('verborgen');
      } else {
        blok.classList.add('verborgen');
      }
    });

    // Pas subkop aan
    var sub = document.getElementById('stap3-sub');
    if (sub) {
      var teksten = {
        laadpaal:    'Een paar korte vragen over uw laadpaal.',
        groepenkast: 'Een paar korte vragen over uw meterkast.',
        fornuis:     'Een paar korte vragen over uw aansluiting.',
        storing:     'Geen extra vragen – door naar uw gegevens.'
      };
      sub.textContent = teksten[dienst] || 'Zo kunnen we u beter helpen.';
    }
  }

  /* ============================================================
     VALIDATIE
  ============================================================ */
  function valideerStap(stap) {
    if (stap === 1) return valideerStap1();
    if (stap === 2) return valideerStap2();
    if (stap === 3) return valideerStap3();
    if (stap === 4) return valideerStap4();
    return true;
  }

  function valideerStap1() {
    var ok = true;
    var postcode = document.getElementById('postcode');
    var postcodeClean = postcode ? postcode.value.trim().replace(/\s/g, '') : '';
    var postcodeRegex = /^[1-9][0-9]{3}[a-zA-Z]{2}$/;
    if (!postcode || !postcodeRegex.test(postcodeClean)) {
      toonFout(postcode, 'error-postcode'); ok = false;
    } else { verbergFout(postcode, 'error-postcode'); }

    var huisnummer = document.getElementById('huisnummer');
    if (!huisnummer || huisnummer.value.trim().length < 1) {
      toonFout(huisnummer, 'error-huisnummer'); ok = false;
    } else { verbergFout(huisnummer, 'error-huisnummer'); }

    return ok;
  }

  function valideerStap2() {
    var gekozen = document.querySelector('input[name="dienst"]:checked');
    var errorEl = document.getElementById('error-dienst');
    if (!gekozen) {
      if (errorEl) errorEl.classList.remove('verborgen');
      return false;
    }
    if (errorEl) errorEl.classList.add('verborgen');
    return true;
  }

  function valideerStap3() {
    var dienst = getGekozenDienst();
    if (!dienst || dienst === 'storing') return true;

    var ok = true;

    function checkRadio(name) {
      var gekozen = document.querySelector('input[name="' + name + '"]:checked');
      var foutEl = document.getElementById('error-' + name);
      if (!gekozen) {
        if (foutEl) foutEl.classList.remove('verborgen');
        ok = false;
      } else {
        if (foutEl) foutEl.classList.add('verborgen');
      }
    }

    function checkSelect(elId, fieldName) {
      var el = document.getElementById(elId);
      var foutEl = document.getElementById('error-' + fieldName);
      if (!el || !el.value) {
        if (foutEl) foutEl.classList.remove('verborgen');
        ok = false;
      } else {
        if (foutEl) foutEl.classList.add('verborgen');
      }
    }

    if (dienst === 'laadpaal') {
      checkRadio('lp_slimme_meter');
      checkRadio('lp_aansluiting');
      checkRadio('lp_meterkast');
      checkRadio('lp_kruipruimte');
      checkSelect('lp-wanneer', 'lp_wanneer');
    }

    if (dienst === 'groepenkast') {
      checkRadio('gk_aansluiting');
      checkSelect('gk-groepen', 'gk_groepen');
      checkSelect('gk-wanneer', 'gk_wanneer');
    }

    if (dienst === 'fornuis') {
      checkRadio('fn_aansluiting');
      checkRadio('fn_meterkast');
      checkSelect('fn-wanneer', 'fn_wanneer');
    }

    if (!ok) {
      var eersteFout = document.querySelector('#stap3 .veld-fout:not(.verborgen)');
      if (eersteFout) {
        eersteFout.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return ok;
  }

  function valideerStap4() {
    var ok = true;

    var naam = document.getElementById('naam');
    if (!naam || naam.value.trim().length < 2) {
      toonFout(naam, 'error-naam'); ok = false;
    } else { verbergFout(naam, 'error-naam'); }

    var telefoon = document.getElementById('telefoon');
    var telClean = telefoon ? telefoon.value.replace(/[\s\-().+]/g, '') : '';
    if (!telefoon || telClean.length < 9 || !/^\d+$/.test(telClean)) {
      toonFout(telefoon, 'error-telefoon'); ok = false;
    } else { verbergFout(telefoon, 'error-telefoon'); }

    var email = document.getElementById('email');
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.value.trim())) {
      toonFout(email, 'error-email'); ok = false;
    } else { verbergFout(email, 'error-email'); }

    var omschrijving = document.getElementById('omschrijving');
    if (!omschrijving || omschrijving.value.trim().length < 10) {
      toonFout(omschrijving, 'error-omschrijving'); ok = false;
    } else { verbergFout(omschrijving, 'error-omschrijving'); }

    var privacy = document.getElementById('privacy');
    var privacyFout = document.getElementById('error-privacy');
    if (!privacy || !privacy.checked) {
      if (privacyFout) privacyFout.classList.remove('verborgen');
      ok = false;
    } else {
      if (privacyFout) privacyFout.classList.add('verborgen');
    }

    return ok;
  }

  function toonFout(veld, foutId) {
    if (veld) { veld.classList.add('error'); veld.setAttribute('aria-invalid', 'true'); }
    var foutEl = document.getElementById(foutId);
    if (foutEl) foutEl.classList.remove('verborgen');
  }

  function verbergFout(veld, foutId) {
    if (veld) { veld.classList.remove('error'); veld.removeAttribute('aria-invalid'); }
    var foutEl = document.getElementById(foutId);
    if (foutEl) foutEl.classList.add('verborgen');
  }

  /* ============================================================
     SPOED MELDING – toon bij 'storing' keuze
  ============================================================ */
  function initSpoedMelding() {
    var radios = document.querySelectorAll('input[name="dienst"]');
    var melding = document.getElementById('spoedMelding');
    if (!melding) return;

    radios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (this.value === 'storing') {
          melding.classList.remove('verborgen');
        } else {
          melding.classList.add('verborgen');
        }
      });
    });
  }

  /* ============================================================
     FAQ ACCORDION
  ============================================================ */
  function initFAQ() {
    var knoppen = document.querySelectorAll('.faq-vraag');
    knoppen.forEach(function (knop) {
      knop.addEventListener('click', function () {
        var isOpen = this.getAttribute('aria-expanded') === 'true';
        var antwoordId = this.getAttribute('aria-controls');
        var antwoord = document.getElementById(antwoordId);

        knoppen.forEach(function (andereKnop) {
          andereKnop.setAttribute('aria-expanded', 'false');
          var andereAntwoord = document.getElementById(andereKnop.getAttribute('aria-controls'));
          if (andereAntwoord) andereAntwoord.hidden = true;
        });

        if (!isOpen) {
          this.setAttribute('aria-expanded', 'true');
          if (antwoord) antwoord.hidden = false;
        }
      });
    });
  }

  /* ============================================================
     FORMULIER SUBMIT
  ============================================================ */
  function initFormulier() {
    var form = document.getElementById('aanvraagFormulier');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valideerStap4()) return;
      verstuurFormulier();
    });

    ['naam', 'telefoon', 'email', 'omschrijving'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { verbergFout(el, 'error-' + id); });
    });

    var postcodeEl = document.getElementById('postcode');
    if (postcodeEl) postcodeEl.addEventListener('input', function () { verbergFout(postcodeEl, 'error-postcode'); });

    var hnrEl = document.getElementById('huisnummer');
    if (hnrEl) hnrEl.addEventListener('input', function () { verbergFout(hnrEl, 'error-huisnummer'); });
  }

  function verstuurFormulier() {
    var form = document.getElementById('aanvraagFormulier');
    var btn = document.getElementById('submitBtn');
    var btnTekst = btn ? btn.querySelector('.btn-text') : null;
    var btnLaad = btn ? btn.querySelector('.btn-loading') : null;

    if (btn) btn.disabled = true;
    if (btnTekst) btnTekst.classList.add('verborgen');
    if (btnLaad) btnLaad.classList.remove('verborgen');

    // Stuur alleen de details mee die horen bij de gekozen dienst
    var formData = new FormData(form);
    var dienst = getGekozenDienst();
    var prefixMap = { laadpaal: 'lp_', groepenkast: 'gk_', fornuis: 'fn_' };
    Object.keys(prefixMap).forEach(function (k) {
      if (k === dienst) return;
      var prefix = prefixMap[k];
      // Verwijder velden die niet bij gekozen dienst horen
      Array.from(formData.keys()).forEach(function (key) {
        if (key.indexOf(prefix) === 0) formData.delete(key);
      });
    });

    var endpointUrl = 'https://formspree.io/f/xjgzdzww';

    fetch(endpointUrl, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
      .then(function (response) {
        if (response.ok) {
          toonSucces();
        } else {
          toonFoutmelding();
          resetKnop(btn, btnTekst, btnLaad);
        }
      })
      .catch(function () {
        toonFoutmelding();
        resetKnop(btn, btnTekst, btnLaad);
      });
  }

  function toonSucces() {
    var form = document.getElementById('aanvraagFormulier');
    var voortgang = document.querySelector('.funnel-voortgang');
    var succes = document.getElementById('form-succes');
    if (form) form.classList.add('verborgen');
    if (voortgang) voortgang.style.display = 'none';
    if (succes) {
      succes.classList.remove('verborgen');
      succes.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function toonFoutmelding() {
    var form = document.getElementById('aanvraagFormulier');
    if (!form || document.getElementById('submit-fout')) return;
    var p = document.createElement('p');
    p.id = 'submit-fout';
    p.setAttribute('role', 'alert');
    p.style.cssText = 'color:#dc2626;font-size:.875rem;font-weight:600;text-align:center;padding:12px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;margin-top:12px;';
    p.textContent = 'Er is iets misgegaan. Probeer het opnieuw of bel ons direct.';
    var laatsteStap = document.getElementById('stap4');
    var footer = laatsteStap ? laatsteStap.querySelector('.btn-volgende') : null;
    if (footer) footer.parentNode.insertBefore(p, footer.nextSibling);
  }

  function resetKnop(btn, tekst, laad) {
    if (btn) btn.disabled = false;
    if (tekst) tekst.classList.remove('verborgen');
    if (laad) laad.classList.add('verborgen');
  }

  /* ============================================================
     FOOTER JAAR
  ============================================================ */
  function initJaar() {
    var el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ============================================================
     INIT
  ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    initSpoedMelding();
    initFAQ();
    initFormulier();
    initJaar();
    toonStap(1);
  });

})();
