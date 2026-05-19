// ============================================================
// Générateur HTML proposition commerciale
// Document auto-contenu (CSS inline) qualité premium
// ============================================================

import type { PropositionData } from '@/types';
import { formatEuros, formatNumber } from './financial';

export function genererPropositionHTML(data: PropositionData): string {
  const { prospect, numero, date, toiture, financier, photo_satellite_url } =
    data;

  const economieJalons = [1, 5, 10, 15, 20, 25]
    .map((annee) => {
      const p = financier.projection[annee - 1];
      if (!p) return '';
      return `
        <tr>
          <td>Année ${annee}</td>
          <td>${formatNumber(p.production_kwh)} kWh</td>
          <td>${formatEuros(p.economie)}</td>
          <td><strong>${formatEuros(p.economie_cumulee)}</strong></td>
        </tr>`;
    })
    .join('');

  const kmVoiture = Math.round(financier.co2_evite_kg_an / 0.12);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Proposition Énergies Concept — ${prospect.prenom} ${prospect.nom}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Plus Jakarta Sans", sans-serif;
    color: #1F2937;
    background: #F8F9FC;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .container {
    max-width: 880px;
    margin: 0 auto;
    padding: 32px 16px 64px;
  }
  .page {
    background: #fff;
    border-radius: 16px;
    padding: 48px;
    box-shadow: 0 1px 3px rgba(15,25,35,0.04);
    margin-bottom: 24px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #E5E7EB;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  .logo {
    font-family: "Outfit", sans-serif;
    font-weight: 700;
    font-size: 28px;
    color: #F5821F;
    letter-spacing: -0.02em;
  }
  .logo small {
    display: block;
    color: #6B7280;
    font-weight: 500;
    font-size: 13px;
    margin-top: 4px;
    letter-spacing: 0;
  }
  .meta { text-align: right; color: #6B7280; font-size: 13px; }
  .meta strong { color: #1F2937; }

  h1 {
    font-family: "Outfit", sans-serif;
    font-size: 32px;
    line-height: 1.15;
    color: #0F1923;
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }
  h2 {
    font-family: "Outfit", sans-serif;
    font-size: 22px;
    color: #0F1923;
    margin-bottom: 16px;
    letter-spacing: -0.01em;
  }
  h3 {
    font-size: 14px;
    color: #6B7280;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }

  .lead { color: #6B7280; font-size: 16px; margin-bottom: 32px; }

  .hero-sat {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    margin: 24px 0;
    box-shadow: 0 4px 16px rgba(15,25,35,0.08);
    border: 1px solid #E5E7EB;
  }
  .hero-sat img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 420px;
    object-fit: cover;
  }
  .hero-sat-caption {
    position: absolute;
    bottom: 12px;
    left: 12px;
    background: rgba(15, 25, 35, 0.85);
    color: #fff;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(6px);
  }
  .hero-sat-caption .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #F5821F;
    box-shadow: 0 0 0 3px rgba(245, 130, 31, 0.3);
  }

  .resume {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin: 32px 0;
  }
  .chiffre {
    background: linear-gradient(135deg, #FEF0E6 0%, #fff 100%);
    border: 1px solid #FCD7B4;
    border-radius: 16px;
    padding: 24px;
    text-align: center;
  }
  .chiffre .val {
    font-family: "Outfit", sans-serif;
    font-size: 36px;
    font-weight: 700;
    color: #F5821F;
    line-height: 1;
    margin-bottom: 8px;
  }
  .chiffre .label { color: #6B7280; font-size: 13px; }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 16px;
  }
  .row { display: flex; justify-content: space-between; padding: 10px 0;
    border-bottom: 1px solid #F3F4F6; }
  .row:last-child { border: none; }
  .row .k { color: #6B7280; }
  .row .v { font-weight: 600; }

  .jauge {
    background: #F3F4F6;
    border-radius: 999px;
    height: 16px;
    overflow: hidden;
    margin: 12px 0;
  }
  .jauge .barre {
    height: 100%;
    background: linear-gradient(90deg, #F5821F, #D96B0A);
    border-radius: 999px;
  }
  .jauge-label {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #6B7280;
  }

  .recommandation {
    background: linear-gradient(135deg, #0D7C66 0%, #0a5e4e 100%);
    color: #fff;
    border-radius: 16px;
    padding: 32px;
    margin: 24px 0;
  }
  .recommandation h2 { color: #fff; }
  .recommandation .reco-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 16px;
  }
  .recommandation .reco-item .val {
    font-family: "Outfit", sans-serif;
    font-size: 28px;
    font-weight: 700;
  }
  .recommandation .reco-item .lab { opacity: 0.85; font-size: 13px; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }
  th, td {
    text-align: left;
    padding: 12px 16px;
    font-size: 14px;
  }
  thead th {
    background: #F8F9FC;
    color: #6B7280;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.05em;
  }
  tbody tr { border-top: 1px solid #F3F4F6; }
  tbody tr:hover { background: #FBFBFD; }
  td strong { color: #F5821F; }

  .invest {
    background: #F8F9FC;
    border-radius: 12px;
    padding: 24px;
    margin: 16px 0;
  }
  .invest .total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 2px solid #F5821F;
  }
  .invest .total .lab { font-size: 16px; }
  .invest .total .val {
    font-family: "Outfit", sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: #F5821F;
  }

  .env {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  .env-card {
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }
  .env-card .val {
    font-family: "Outfit", sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: #0D7C66;
  }
  .env-card .lab { font-size: 13px; color: #065f46; margin-top: 4px; }

  ol.steps { counter-reset: step; list-style: none; padding: 0; }
  ol.steps li {
    counter-increment: step;
    padding: 16px 0 16px 56px;
    position: relative;
    border-bottom: 1px solid #F3F4F6;
  }
  ol.steps li:before {
    content: counter(step);
    position: absolute;
    left: 0; top: 16px;
    width: 40px; height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #F5821F, #D96B0A);
    color: #fff;
    font-family: "Outfit", sans-serif;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  ol.steps li strong { display: block; margin-bottom: 4px; font-size: 16px; }
  ol.steps li span { color: #6B7280; font-size: 14px; }

  .cta {
    background: linear-gradient(135deg, #F5821F 0%, #D96B0A 100%);
    color: #fff;
    border-radius: 16px;
    padding: 40px;
    text-align: center;
    margin: 32px 0;
  }
  .cta h2 { color: #fff; }
  .cta p { margin: 12px 0 24px; opacity: 0.92; }
  .cta a {
    display: inline-block;
    background: #fff;
    color: #F5821F;
    padding: 14px 32px;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 700;
    font-size: 16px;
  }

  .mentions {
    color: #9CA3AF;
    font-size: 11px;
    line-height: 1.6;
    margin-top: 32px;
  }

  @media (max-width: 768px) {
    .page { padding: 24px; }
    .resume, .grid-2, .recommandation .reco-grid, .env {
      grid-template-columns: 1fr;
    }
    .header { flex-direction: column; gap: 16px; }
    .meta { text-align: left; }
    h1 { font-size: 26px; }
  }
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; page-break-after: always; }
  }
</style>
</head>
<body>
<div class="container">

  <!-- Page 1 : couverture + résumé -->
  <div class="page">
    <div class="header">
      <div>
        <div class="logo">Énergies Concept
          <small>Installateur photovoltaïque · Montpellier</small>
        </div>
      </div>
      <div class="meta">
        Proposition n° <strong>${numero}</strong><br />
        ${date}<br />
        Validité 30 jours
      </div>
    </div>

    <h1>Étude solaire personnalisée</h1>
    <p class="lead">
      Préparée pour ${prospect.prenom} ${prospect.nom} —
      ${prospect.adresse}, ${prospect.ville}
    </p>

    ${
      photo_satellite_url
        ? `<div class="hero-sat">
        <img src="${photo_satellite_url}" alt="Vue satellite de votre bâtiment" crossorigin="anonymous" />
        <div class="hero-sat-caption">
          <span class="dot"></span>
          Vue satellite de votre bâtiment · analyse Google Solar API
        </div>
      </div>`
        : ''
    }

    <div class="resume">
      <div class="chiffre">
        <div class="val">${formatEuros(financier.economie_annuelle)}</div>
        <div class="label">Économies dès la 1ʳᵉ année</div>
      </div>
      <div class="chiffre">
        <div class="val">${financier.temps_retour_ans} ans</div>
        <div class="label">Retour sur investissement</div>
      </div>
      <div class="chiffre">
        <div class="val">${formatEuros(financier.gain_25_ans)}</div>
        <div class="label">Gain cumulé sur 25 ans</div>
      </div>
    </div>

    <h2>Votre toiture</h2>
    <div class="grid-2">
      <div>
        <div class="row"><span class="k">Surface utilisable</span>
          <span class="v">${toiture.surface_m2.toFixed(0)} m²</span></div>
        <div class="row"><span class="k">Orientation principale</span>
          <span class="v">${toiture.orientation}</span></div>
        <div class="row"><span class="k">Ensoleillement annuel</span>
          <span class="v">${formatNumber(toiture.heures_ensoleillement)} h</span></div>
        <div class="row"><span class="k">Qualité de l'analyse</span>
          <span class="v">${toiture.qualite_imagerie}</span></div>
      </div>
      <div>
        <h3>Score solaire</h3>
        <div style="font-family: Outfit, sans-serif; font-size: 48px; font-weight: 700; color: #F5821F; line-height: 1;">
          ${toiture.score_solaire}<span style="font-size: 22px; color: #6B7280;">/100</span>
        </div>
        <div class="jauge">
          <div class="barre" style="width: ${toiture.score_solaire}%;"></div>
        </div>
        <div class="jauge-label">
          <span>Faible</span><span>Excellent</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Page 2 : recommandation + économies -->
  <div class="page">
    <h2>Notre recommandation</h2>
    <div class="recommandation">
      <h2>Installation ${financier.kwc} kWc</h2>
      <p>Dimensionnée pour couvrir environ 80 % de votre consommation,
        avec autoconsommation et revente du surplus.</p>
      <div class="reco-grid">
        <div class="reco-item">
          <div class="val">${financier.nb_panneaux}</div>
          <div class="lab">panneaux installés</div>
        </div>
        <div class="reco-item">
          <div class="val">${financier.kwc} kWc</div>
          <div class="lab">puissance crête</div>
        </div>
        <div class="reco-item">
          <div class="val">${formatNumber(financier.production_annuelle_kwh)} kWh</div>
          <div class="lab">production annuelle</div>
        </div>
      </div>
    </div>

    <h2>Vos économies sur 25 ans</h2>
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Production</th>
          <th>Économie annuelle</th>
          <th>Économie cumulée</th>
        </tr>
      </thead>
      <tbody>
        ${economieJalons}
        <tr>
          <td colspan="3"><strong>Total cumulé sur 25 ans</strong></td>
          <td><strong>${formatEuros(financier.gain_25_ans)}</strong></td>
        </tr>
      </tbody>
    </table>

    <p style="color:#6B7280; font-size: 13px; margin-top: 12px;">
      Calculs basés sur un prix de l'électricité de
      ${(0.2516).toFixed(4)} €/kWh avec une hausse moyenne de 3 %/an,
      un tarif de rachat du surplus de
      ${financier.kwc <= 3 ? '13,62' : '11,55'} c€/kWh (tarif réglementé S1 2026),
      et une dégradation des panneaux de 0,5 %/an.
    </p>
  </div>

  <!-- Page 3 : investissement -->
  <div class="page">
    <h2>Votre investissement</h2>
    <div class="invest">
      <div class="row">
        <span class="k">Installation clé en main (HT)</span>
        <span class="v">${formatEuros(financier.cout_installation_ht)}</span>
      </div>
      <div class="row">
        <span class="k">TVA (${(financier.taux_tva * 100).toFixed(0)} %)</span>
        <span class="v">${formatEuros(financier.cout_installation_ttc - financier.cout_installation_ht)}</span>
      </div>
      <div class="row">
        <span class="k">Coût TTC</span>
        <span class="v">${formatEuros(financier.cout_installation_ttc)}</span>
      </div>
      <div class="row">
        <span class="k">Prime à l'autoconsommation (versée sur 5 ans)</span>
        <span class="v" style="color:#0D7C66;">
          - ${formatEuros(financier.prime_autoconsommation_total)}
        </span>
      </div>
      <div class="total">
        <span class="lab"><strong>Reste à charge</strong></span>
        <span class="val">${formatEuros(financier.reste_a_charge)}</span>
      </div>
    </div>

    <h2 style="margin-top: 32px;">Votre impact environnemental</h2>
    <div class="env">
      <div class="env-card">
        <div class="val">${formatNumber(financier.co2_evite_kg_an)} kg</div>
        <div class="lab">CO₂ évité par an</div>
      </div>
      <div class="env-card">
        <div class="val">${formatNumber(financier.arbres_equivalent)}</div>
        <div class="lab">arbres équivalent / an</div>
      </div>
      <div class="env-card">
        <div class="val">${formatNumber(kmVoiture)} km</div>
        <div class="lab">en voiture évités / an</div>
      </div>
    </div>
  </div>

  <!-- Page 4 : prochaines étapes + CTA -->
  <div class="page">
    <h2>Vos prochaines étapes</h2>
    <ol class="steps">
      <li>
        <strong>Visite technique gratuite</strong>
        <span>Un de nos experts confirme sur site les données de toiture
          et le tracé exact de l'installation.</span>
      </li>
      <li>
        <strong>Devis définitif et démarches administratives</strong>
        <span>Nous prenons en charge la déclaration préalable de
          travaux et le raccordement Enedis.</span>
      </li>
      <li>
        <strong>Installation par nos équipes certifiées RGE</strong>
        <span>1 à 2 jours d'intervention. Garantie décennale incluse.</span>
      </li>
      <li>
        <strong>Mise en service et suivi</strong>
        <span>Application de monitoring temps réel. Garantie production
          25 ans sur les panneaux.</span>
      </li>
    </ol>

    <div class="cta">
      <h2>Prêt à concrétiser ce projet ?</h2>
      <p>Nous vous proposons une visite technique gratuite et sans engagement.</p>
      <a href="mailto:contact@energies-concept.fr?subject=Visite technique - ${numero}">
        Demander ma visite technique
      </a>
    </div>

    <div class="mentions">
      Énergies Concept · Installateur photovoltaïque RGE QualiPV ·
      Siège : Montpellier (34) · SIRET fictif pour démonstration.
      Cette proposition est établie à titre indicatif sur la base
      des données satellitaires fournies par Google Solar API et des
      tarifs réglementaires en vigueur au S1 2026. Les chiffres
      réels seront confirmés après la visite technique sur site.
      Les économies projetées intègrent une hausse moyenne du tarif
      de l'électricité de 3 %/an et une dégradation des panneaux de
      0,5 %/an, conformes aux usages du secteur.
    </div>
  </div>
</div>
</body>
</html>`;
}
