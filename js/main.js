/**
 * ElektroKlik – Landingspagina JavaScript
 * Functionaliteit:
 *  1. Conditionele formulierlogica (dienst → juiste vragen tonen)
 *  2. Sub-conditionele logica (Anders-velden groepenkast)
 *  3. FAQ accordion
 *  4. Formuliervalidatie voor submit
 *  5. Formulier submit handler (fetch POST + succes/error state)
 *  6. Smooth scroll voor ankerkoppelingen
 *  7. Footer jaar automatisch
 *  8. Dienst-CTA knoppen voorinvullen dienst in formulier
 */

(function () {
  'use strict';

  /* ============================================================
     1. DOM READY
  ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    initDienstSelector();
    initSubConditionals();
    initFAQ();
    initFormValidation();
    initDienstCTALinks();
    initFooterYear();
    initSmoothScroll();
  });

  /* ============================================================
     2. DIENST SELECTOR – conditionele vragen
  ============================================================ */
  function initDienstSelector() {
    var dienstRadios = document.querySelectorAll('input[name="dienst"]');
    var dienstVragenSections = document.querySelectorAll('.dienst-vragen');

    dienstRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        var gekozenDienst = this.value;

        // Verberg alle dienst-specifieke secties
        dienstVragenSections.forEach(function (section) {
          section.classList.add('hidden');
          // Reset velden in verborgen secties (geen onnodige validatie)
          disableFieldsInSection(section);
        });

        // Toon de juiste sectie
        var doelSectie = document.getElementById('vragen-' + gekozenDienst);
        if (doelSectie) {
          doelSectie.classList.remove('hidden');
          enableFieldsInSection(doelSectie);
        }

        // Foutmelding dienst verbergen
        var dienstError = document.getElementById('error-dienst');
        if (dienstError) dienstError.classList.add('hidden');

        // Scroll zachtjes naar vervolgvragen op mobiel
        if (doelSectie && window.innerWidth <= 640) {
          setTimeout(function () {
            doelSectie.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
        }
      });
    });
  }

  function disableFieldsInSection(section) {
    section.querySelectorAll('input, textarea, select').forEach(function (field) {
      field.disabled = true;
    });
  }

  function enableFieldsInSection(section) {
    section.querySelectorAll('input, textarea, select').forEach(function (field) {
      field.disabled = false;
    });
  }

  /* ============================================================
     3. SUB-CONDITIONALS – "Anders" velden groepenkast
  ============================================================ */
  function initSubConditionals() {
    // Groepenkast: werk – "Anders" toont vrij tekstveld
    watchRadioForConditionalInput(
      'groepenkast_werk',
      'anders',
      'groepenkast_anders'
    );

    // Groepenkast: doel – "Anders" toont vrij tekstveld
    watchRadioForConditionalInput(
      'uitbreiding_doel',
      'anders',
      'uitbreiding_anders'
    );
  }

  /**
   * Luister op een radiogroep: als triggerValue geselecteerd wordt,
   * toon dan het element met inputId.
   */
  function watchRadioForConditionalInput(radioName, triggerValue, inputId) {
    var radios = document.querySelectorAll('input[name="' + radioName + '"]');
    var conditionalInput = document.getElementById(inputId);
    if (!conditionalInput) return;

    radios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (this.value === triggerValue) {
          conditionalInput.classList.remove('hidden');
          conditionalInput.focus();
        } else {
          conditionalInput.classList.add('hidden');
          conditionalInput.value = '';
        }
      });
    });
  }

  /* ============================================================
     4. FAQ ACCORDION
  ============================================================ */
  function initFAQ() {
    var faqButtons = document.querySelectorAll('.faq-question');

    faqButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var isOpen = this.getAttribute('aria-expanded') === 'true';
        var answerId = this.getAttribute('aria-controls');
        var answerEl = document.getElementById(answerId);

        // Sluit alle andere open items
        faqButtons.forEach(function (otherBtn) {
          var otherAnswerId = otherBtn.getAttribute('aria-controls');
          var otherAnswer = document.getElementById(otherAnswerId);
          otherBtn.setAttribute('aria-expanded', 'false');
          if (otherAnswer) otherAnswer.hidden = true;
        });

        // Toggle huidig item
        if (!isOpen) {
          this.setAttribute('aria-expanded', 'true');
          if (answerEl) answerEl.hidden = false;
        }
      });
    });
  }

  /* ============================================================
     5. FORMULIERVALIDATIE
  ============================================================ */
  function initFormValidation() {
    var form = document.getElementById('aanvraagFormulier');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (validateForm()) {
        submitForm();
      }
    });

    // Live validatie: foutmelding wegpakken zodra gebruiker iets invult
    var vereisteBasis = ['naam', 'telefoon', 'email', 'postcode', 'huisnummer', 'omschrijving'];
    vereisteBasis.forEach(function (fieldId) {
      var field = document.getElementById(fieldId);
      if (!field) return;
      field.addEventListener('input', function () {
        clearFieldError(field, 'error-' + fieldId);
      });
    });
  }

  function validateForm() {
    var isGeldig = true;

    // Controleer dienst
    var dienstGekozen = document.querySelector('input[name="dienst"]:checked');
    if (!dienstGekozen) {
      showFieldError(null, 'error-dienst');
      document.getElementById('step-dienst').scrollIntoView({ behavior: 'smooth', block: 'center' });
      isGeldig = false;
    }

    // Naam
    var naam = document.getElementById('naam');
    if (!naam || naam.value.trim().length < 2) {
      markFieldError(naam, 'error-naam');
      isGeldig = false;
    }

    // Telefoonnummer – minimale controle op lengte/patroon
    var telefoon = document.getElementById('telefoon');
    var telefoonClean = telefoon ? telefoon.value.replace(/[\s\-().+]/g, '') : '';
    if (!telefoon || telefoonClean.length < 9 || !/^\d+$/.test(telefoonClean)) {
      markFieldError(telefoon, 'error-telefoon');
      isGeldig = false;
    }

    // E-mail
    var email = document.getElementById('email');
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.value.trim())) {
      markFieldError(email, 'error-email');
      isGeldig = false;
    }

    // Postcode – Nederlands formaat 1234 AB
    var postcode = document.getElementById('postcode');
    var postcodeClean = postcode ? postcode.value.trim().replace(/\s/g, '') : '';
    var postcodeRegex = /^[1-9][0-9]{3}[a-zA-Z]{2}$/;
    if (!postcode || !postcodeRegex.test(postcodeClean)) {
      markFieldError(postcode, 'error-postcode');
      isGeldig = false;
    }

    // Huisnummer
    var huisnummer = document.getElementById('huisnummer');
    if (!huisnummer || huisnummer.value.trim().length < 1) {
      markFieldError(huisnummer, 'error-huisnummer');
      isGeldig = false;
    }

    // Omschrijving – minimaal 10 tekens
    var omschrijving = document.getElementById('omschrijving');
    if (!omschrijving || omschrijving.value.trim().length < 10) {
      markFieldError(omschrijving, 'error-omschrijving');
      isGeldig = false;
    }

    // Privacy checkbox
    var privacy = document.getElementById('privacy');
    if (!privacy || !privacy.checked) {
      showFieldError(null, 'error-privacy');
      isGeldig = false;
    }

    // Scroll naar eerste fout
    if (!isGeldig) {
      var eersteError = form.querySelector('.field-error:not(.hidden)');
      if (eersteError) {
        eersteError.closest('fieldset, .form-group, .form-footer')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return isGeldig;
  }

  function markFieldError(field, errorId) {
    if (field) {
      field.classList.add('error');
      field.setAttribute('aria-invalid', 'true');
    }
    showFieldError(field, errorId);
  }

  function showFieldError(field, errorId) {
    var errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.classList.remove('hidden');
  }

  function clearFieldError(field, errorId) {
    if (field) {
      field.classList.remove('error');
      field.removeAttribute('aria-invalid');
    }
    var errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.classList.add('hidden');
  }

  /* ============================================================
     6. FORMULIER SUBMIT
  ============================================================ */
  function submitForm() {
    var form = document.getElementById('aanvraagFormulier');
    var submitBtn = document.getElementById('submitBtn');
    var btnText = submitBtn.querySelector('.btn-text');
    var btnLoading = submitBtn.querySelector('.btn-loading');

    // Loading state
    submitBtn.disabled = true;
    if (btnText) btnText.classList.add('hidden');
    if (btnLoading) btnLoading.classList.remove('hidden');

    var formData = new FormData(form);

    /*
     * CONFIGURATIE: vervang de URL hieronder door uw eigen backend endpoint,
     * Formspree URL (https://formspree.io/f/XXXXXXXX),
     * of Netlify Forms endpoint.
     *
     * Formspree voorbeeld:
     *   var endpointUrl = 'https://formspree.io/f/XXXXXXXX';
     *
     * Eigen backend voorbeeld:
     *   var endpointUrl = '/api/aanvraag';
     */
    var endpointUrl = 'https://formspree.io/f/xjgzdzww';

    fetch(endpointUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(function (response) {
        if (response.ok) {
          toonSuccesMelding();
        } else {
          toonFoutMelding();
          resetSubmitButton(submitBtn, btnText, btnLoading);
        }
      })
      .catch(function () {
        toonFoutMelding();
        resetSubmitButton(submitBtn, btnText, btnLoading);
      });
  }

  function toonSuccesMelding() {
    var form = document.getElementById('aanvraagFormulier');
    var succes = document.getElementById('form-succes');
    if (form) form.classList.add('hidden');
    if (succes) {
      succes.classList.remove('hidden');
      succes.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Optioneel: stuur naar bevestigingspagina
    // window.location.href = '/bedankt';
  }

  function toonFoutMelding() {
    // Voeg een algemene foutmelding toe boven de submit-knop als er geen backend is
    var form = document.getElementById('aanvraagFormulier');
    var bestaandeAlert = document.getElementById('submit-fout-alert');
    if (bestaandeAlert) return;

    var alert = document.createElement('p');
    alert.id = 'submit-fout-alert';
    alert.setAttribute('role', 'alert');
    alert.style.cssText = 'color:#c0392b;font-size:0.9rem;font-weight:600;text-align:center;padding:12px;background:#fff5f5;border-radius:8px;border:1px solid #fed7d7;';
    alert.textContent = 'Er is iets misgegaan bij het versturen. Probeer het opnieuw of bel ons direct.';

    var footer = form.querySelector('.form-footer');
    if (footer) form.insertBefore(alert, footer);
  }

  function resetSubmitButton(btn, btnText, btnLoading) {
    btn.disabled = false;
    if (btnText) btnText.classList.remove('hidden');
    if (btnLoading) btnLoading.classList.add('hidden');
  }

  /* ============================================================
     7. DIENST-CTA LINKS – klik op dienst-kaart → vul formulier voor
  ============================================================ */
  function initDienstCTALinks() {
    var dienstLinks = document.querySelectorAll('.dienst-cta[data-dienst]');

    dienstLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var dienstWaarde = this.getAttribute('data-dienst');
        var doelRadio = document.querySelector(
          'input[name="dienst"][value="' + dienstWaarde + '"]'
        );
        if (doelRadio) {
          doelRadio.checked = true;
          doelRadio.dispatchEvent(new Event('change'));
        }
        // Scroll naar formulier
        var aanvraagSectie = document.getElementById('aanvraag');
        if (aanvraagSectie) {
          var offset = 80; // hoogte van sticky header
          var top = aanvraagSectie.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
  }

  /* ============================================================
     8. FOOTER JAAR
  ============================================================ */
  function initFooterYear() {
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ============================================================
     9. SMOOTH SCROLL voor ankerkoppelingen (fallback voor oudere browsers)
  ============================================================ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anker) {
      anker.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href === '#' || href === '#!') return;
        var doel = document.querySelector(href);
        if (doel) {
          e.preventDefault();
          var offset = 80;
          var top = doel.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
          // Focus het doelelement voor toegankelijkheid
          doel.setAttribute('tabindex', '-1');
          doel.focus({ preventScroll: true });
        }
      });
    });
  }

})();
