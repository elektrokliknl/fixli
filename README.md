# ElektroKlik – Landingspagina

Een moderne, conversiegerichte en SEO-sterke landingspagina voor **ElektroKlik**, een gecertificeerd elektrotechnisch bedrijf gericht op particuliere klanten.

---

## 📁 Bestandsstructuur

```
elektroklik-landingspagina/
├── index.html          → Volledige HTML van de landingspagina
├── css/
│   └── style.css       → Alle stijlen (responsive, mobiel-first)
├── js/
│   └── main.js         → Formulierlogica, FAQ, validatie, submit
└── README.md           → Dit bestand
```

---

## 🚀 Snel aan de slag

### 1. Bestanden uploaden

Upload de map naar uw webserver, GitHub Pages, Netlify of Vercel.

**GitHub Pages:**
1. Maak een nieuw repository aan op GitHub
2. Upload alle bestanden (behoud de mapstructuur)
3. Ga naar Settings → Pages → selecteer `main` branch
4. De pagina is live op `https://uwgebruikersnaam.github.io/elektroklik-landingspagina/`

**Netlify (aanbevolen voor formulierverwerking):**
1. Sleep de map naar [netlify.com/drop](https://netlify.com/drop)
2. Of koppel aan uw GitHub repository voor automatische deploys

---

## ✏️ Wat u eerst moet aanpassen

### Telefoonnummer
Zoek naar `+31XXXXXXXXXX` en `+31 XX XXX XXXX` en vervang deze door uw echte telefoonnummer.
Aanpaslocaties in `index.html`:
- Header bel-knop
- Hero CTA
- Spoed blok
- FAQ antwoord
- Afsluitende CTA
- Sticky bel-knop (mobiel)
- Footer contact
- Succes-melding
- Spoed inline melding in formulier

### E-mailadres
Vervang `info@elektroklik.nl` in de footer door uw echte e-mailadres.

### Website URL (SEO)
Vervang `https://www.elektroklik.nl/` in de `<link rel="canonical">` en Open Graph tags door uw echte domeinnaam.

### Formulier endpoint
In `js/main.js` op regel ~147:
```js
var endpointUrl = '/api/aanvraag'; // ← AANPASSEN
```

Kies één van de volgende opties:

#### Optie A – Formspree (eenvoudigst, gratis tot 50 aanvragen/maand)
1. Maak een account aan op [formspree.io](https://formspree.io)
2. Maak een nieuw formulier aan
3. Vervang de URL door: `https://formspree.io/f/UWFORMID`

#### Optie B – Netlify Forms (gratis bij gebruik van Netlify hosting)
1. Voeg `data-netlify="true"` toe aan het `<form>` element in `index.html`
2. Vervang de fetch URL door: `'/'` (Netlify verwerkt het automatisch)
3. Verwijder de fetch-aanroep en gebruik `form.submit()` of laat Netlify AJAX aan

#### Optie C – Eigen backend
Richt een POST endpoint in dat de `FormData` verwerkt en doorstuur per e-mail.

---

## 🎨 Kleurenpalet aanpassen

De kleuren staan bovenin `css/style.css`:

| Variabele       | Huidige waarde | Gebruik                        |
|-----------------|----------------|-------------------------------|
| Teal (primair)  | `#0E7A78`      | Knoppen, accenten, links       |
| Donkerblauw     | `#0E4A72`      | Koppen, hero achtergrond       |
| Oranje          | `#F5A623`      | CTA knoppen, hero accenten     |
| Achtergrond alt | `#f4f8fb`      | Afwisselende secties           |

---

## 📱 Responsive

De pagina is volledig mobielvriendelijk:
- **Desktop** (>1024px): 3-koloms grids, volledige breedte hero
- **Tablet** (640–1024px): 2-koloms grids
- **Mobiel** (<640px): 1-kolom, gestapelde CTA's, sticky bel-knop rechtsonder

---

## ♿ Toegankelijkheid

- Semantische HTML met ARIA-labels op alle interactieve elementen
- `role="alert"` op foutmeldingen en succes-melding
- `aria-expanded` op FAQ knoppen
- `aria-required` op verplichte velden
- Focus-visible stijlen voor toetsenbord-navigatie
- Alle decoratieve SVG-iconen hebben `aria-hidden="true"`

---

## 🔍 SEO

**SEO-titel:**
`Elektricien nodig? ElektroKlik – Laadpaal, groepenkast, storing & meer`

**Meta description:**
`ElektroKlik is uw gecertificeerde elektricien voor laadpaal installatie, groepenkast uitbreiden, inductiekookplaat aansluiten en elektra storingen. Snel, veilig en netjes afgewerkt. Vraag direct een offerte aan.`

**H1/H2/H3 structuur:**
```
H1: Uw elektricien voor thuis – snel, veilig en netjes afgewerkt
  H2: Wat doet ElektroKlik?
  H2: Waarmee kan ElektroKlik u helpen?
    H3: Laadpaal installatie
    H3: Groepenkast uitbreiden
    H3: Inductiekookplaat aansluiten
    H3: Perilex aansluiting aanleggen
    H3: Elektra storing oplossen
  H2: Waarom klanten kiezen voor ElektroKlik
    H3: Gecertificeerd en veilig
    H3: Heldere prijzen, geen verrassingen
    H3: Snel reactie en flexibele planning
    H3: Netjes afgewerkt
    H3: Duidelijke communicatie
    H3: Vakbekwame monteurs
  H2: Aanvraag doen
  H2: Spoed met elektra?
  H2: Veelgestelde vragen
  H2: Klaar om uw klus te laten uitvoeren?
```

**Schema.org:** LocalBusiness (ElectricalContractor) markup aanwezig in `<head>`

### Lokale SEO aanbevelingen
- Voeg uw stad/regio toe aan de paginatitel: bijv. `ElektroKlik Amsterdam`
- Maak een Google Business Profile aan en link naar deze pagina
- Voeg aan het schema de `address` en `geo` velden toe met uw vestigingsadres
- Overweeg aparte landingspagina's per regio/stad voor uitgebreid werkgebied

---

## ⚡ Conversie-aanbevelingen

### Snel te implementeren
1. **Reviews toevoegen** – Voeg 2–3 klantbeoordelingen toe (Trustpilot/Google widget of statische sterren)
2. **Telefoonnummer altijd zichtbaar** – De sticky bel-knop is al aanwezig op mobiel; overweeg ook een vaste balk op desktop
3. **Reactietijd benadrukken** – "Binnen 1 werkdag" staat al op meerdere plekken; overweeg "Vandaag nog reactie" als dat realistisch is
4. **Foto's van echt werk** – Vervang de hero achtergrond door een echte foto van een monteur aan het werk
5. **WhatsApp-knop toevoegen** – Voeg naast bellen ook een WhatsApp-link toe voor lagere drempel
6. **Postcode-controle** – Geef direct feedback of uw werkgebied de postcode dekt

### Middellange termijn
7. **Live chat** – Voeg een eenvoudige chatwidget toe (Crisp, Tawk.to – gratis)
8. **Google Reviews integratie** – Toon automatisch uw Google-beoordeling met sterrenwaardering
9. **Bevestigingsmail** – Stuur na aanvraag automatisch een bevestigingsmail naar de klant
10. **A/B test CTA tekst** – Test "Aanvraag doen" vs "Vrijblijvende offerte aanvragen" vs "Direct plannen"

---

## 🛠️ Technische vereisten

- Puur HTML/CSS/JavaScript – geen frameworks of dependencies
- Google Fonts (Inter) – geladen via CDN; voor volledig offline gebruik: download het font en host het zelf
- Geen cookies of tracking – voeg zelf Google Analytics / Meta Pixel toe indien gewenst
- Werkt in alle moderne browsers (Chrome, Firefox, Safari, Edge)
- Internet Explorer: niet ondersteund

---

## 📋 Checklist voor livegang

- [ ] Telefoonnummer ingevuld op alle plekken
- [ ] E-mailadres ingevuld in footer
- [ ] Formulier endpoint geconfigureerd (Formspree / Netlify / eigen backend)
- [ ] Canonical URL aangepast naar uw domein
- [ ] Schema.org markup aangevuld met adres en telefoon
- [ ] Favicon toegevoegd
- [ ] Google Analytics of andere tracking toegevoegd (optioneel)
- [ ] Google Business Profile aangemaakt en gelinkt
- [ ] Pagina getest op mobiel (iPhone + Android)
- [ ] Formulier testinzending gedaan
- [ ] SSL-certificaat actief (https)

---

*ElektroKlik landingspagina – gebouwd voor conversie, vertrouwen en vindbaarheid.*
