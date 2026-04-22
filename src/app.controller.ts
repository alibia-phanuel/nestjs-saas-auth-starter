import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import express from 'express';

@ApiExcludeController()
@Controller()
export class AppController {
  @Get()
  getHome(@Res() res: express.Response): void {
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>nestjs-saas-starter</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --red: #e0234e;
      --red-dark: #b01a3a;
      --bg: #0a0a0f;
      --bg2: #111118;
      --bg3: #1a1a24;
      --border: rgba(255,255,255,0.08);
      --text: #f0f0f0;
      --muted: #888;
      --green: #4ade80;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }

    .bg-grid {
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(224,35,78,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(224,35,78,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      animation: gridMove 20s linear infinite;
      z-index: 0;
    }

    @keyframes gridMove {
      0% { transform: translateY(0); }
      100% { transform: translateY(40px); }
    }

    .glow {
      position: fixed;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(224,35,78,0.12) 0%, transparent 70%);
      top: -200px;
      left: 50%;
      transform: translateX(-50%);
      animation: glowPulse 4s ease-in-out infinite;
      z-index: 0;
    }

    @keyframes glowPulse {
      0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
      50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
    }

    .container {
      position: relative;
      z-index: 1;
      max-width: 900px;
      margin: 0 auto;
      padding: 60px 24px;
    }

    .header {
      text-align: center;
      margin-bottom: 56px;
      animation: fadeDown 0.8s ease both;
    }

    @keyframes fadeDown {
      from { opacity: 0; transform: translateY(-24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(224,35,78,0.12);
      border: 1px solid rgba(224,35,78,0.3);
      color: var(--red);
      padding: 4px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 20px;
      animation: fadeDown 0.8s ease 0.1s both;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--red);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    h1 {
      font-size: clamp(28px, 5vw, 48px);
      font-weight: 700;
      letter-spacing: -1px;
      margin-bottom: 12px;
      animation: fadeDown 0.8s ease 0.2s both;
    }

    h1 span { color: var(--red); }

    .subtitle {
      color: var(--muted);
      font-size: 15px;
      max-width: 500px;
      margin: 0 auto 28px;
      line-height: 1.6;
      animation: fadeDown 0.8s ease 0.3s both;
    }

    .cta-group {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      animation: fadeDown 0.8s ease 0.4s both;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
    }

    .btn-primary {
      background: var(--red);
      color: white;
      border: 1px solid var(--red);
    }

    .btn-primary:hover {
      background: var(--red-dark);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(224,35,78,0.3);
    }

    .btn-outline {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-outline:hover {
      border-color: rgba(255,255,255,0.2);
      transform: translateY(-2px);
      background: var(--bg3);
    }

    .stack-row {
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
      margin: 32px 0;
      animation: fadeDown 0.8s ease 0.5s both;
    }

    .pill {
      background: var(--bg3);
      border: 1px solid var(--border);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      color: var(--muted);
      transition: all 0.2s;
    }

    .pill:hover {
      border-color: rgba(224,35,78,0.4);
      color: var(--text);
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--muted);
      margin-bottom: 16px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 40px;
    }

    .card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s;
      animation: fadeUp 0.6s ease both;
    }

    .card:hover {
      border-color: rgba(224,35,78,0.3);
      transform: translateY(-3px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.3);
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }

    .card-icon { font-size: 18px; }

    .card-title {
      font-size: 14px;
      font-weight: 600;
    }

    .card ul { list-style: none; }

    .card ul li {
      font-size: 13px;
      color: var(--muted);
      padding: 3px 0;
      display: flex;
      align-items: center;
      gap: 7px;
      transition: color 0.2s;
    }

    .card ul li:hover { color: var(--text); }

    .card ul li::before {
      content: '';
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--red);
      flex-shrink: 0;
    }

    .status-bar {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 40px;
      animation: fadeUp 0.6s ease 0.3s both;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--muted);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      animation: pulse 2s ease-in-out infinite;
    }

    .author {
      text-align: center;
      padding: 32px;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 12px;
      animation: fadeUp 0.6s ease 0.5s both;
    }

    .author-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .author-links {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 14px;
    }

    .author-links a {
      color: var(--muted);
      text-decoration: none;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: color 0.2s;
    }

    .author-links a:hover { color: var(--red); }

    .progress-wrap {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      animation: fadeUp 0.6s ease 0.2s both;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 10px;
    }

    .progress-bar {
      height: 6px;
      background: var(--bg3);
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--red), #ff6b9d);
      border-radius: 999px;
      transition: width 1.2s ease;
    }

    .progress-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
      font-size: 12px;
    }

    #days-remaining { color: var(--muted); }

    #live-timer {
      color: var(--red);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.3px;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow"></div>

  <div class="container">

    <!-- En-tête -->
    <div class="header">
      <div class="badge">
        <div class="pulse-dot"></div>
        <span id="badge-text">...</span>
      </div>
      <h1>nestjs-<span>saas</span>-starter</h1>
      <p class="subtitle">
        Kit de démarrage SaaS professionnel — Auth, RBAC,
        Multi-tenant, GraphQL &amp; TDD
      </p>
      <div class="cta-group">
        <a class="btn btn-primary" href="/api/docs">📄 Documentation API</a>
        <a class="btn btn-outline" href="https://github.com/alibia-phanuel/nestjs-saas-auth-starter" target="_blank">⭐ GitHub</a>
        <a class="btn btn-outline" href="https://www.linkedin.com/in/phanuel-tsopze-8a33a52a4/" target="_blank">💼 LinkedIn</a>
        <a class="btn btn-outline" href="https://phanuel-alibia.com/" target="_blank">🌐 Portfolio</a>
      </div>
    </div>

    <!-- Stack -->
    <div class="stack-row">
      <span class="pill">NestJS</span>
      <span class="pill">TypeScript</span>
      <span class="pill">Prisma</span>
      <span class="pill">PostgreSQL</span>
      <span class="pill">GraphQL</span>
      <span class="pill">Docker</span>
      <span class="pill">Jest</span>
    </div>

    <!-- Progression -->
    <div class="progress-wrap">
      <div class="progress-header">
        <span>Avancement du projet</span>
        <span id="progress-label" style="color:var(--red)">...</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" id="progress-fill"></div>
      </div>
      <div class="progress-meta">
        <span id="days-remaining">⏳ ...</span>
        <span id="live-timer">🕐 ...</span>
      </div>
    </div>

    <!-- Statut -->
    <div class="status-bar">
      <div class="status-item">
        <div class="status-dot"></div>
        API en ligne
      </div>
      <div class="status-item">✅ Prisma connecté</div>
      <div class="status-item">✅ i18n actif (FR / EN)</div>
      <div class="status-item">✅ Swagger sur /api/docs</div>
      <div class="status-item">v1.0.0</div>
    </div>

    <!-- Fonctionnalités -->
    <p class="section-title">Fonctionnalités</p>
    <div class="grid">
      <div class="card" style="animation-delay:0.1s">
        <div class="card-header">
          <span class="card-icon">🔐</span>
          <span class="card-title">Authentification</span>
        </div>
        <ul>
          <li>Inscription / Connexion / Déconnexion</li>
          <li>JWT (Access + Refresh Token)</li>
          <li>Double authentification (Google Authenticator)</li>
          <li>OAuth (Google + Apple)</li>
          <li>Clé API</li>
        </ul>
      </div>

      <div class="card" style="animation-delay:0.2s">
        <div class="card-header">
          <span class="card-icon">👥</span>
          <span class="card-title">Gestion des utilisateurs</span>
        </div>
        <ul>
          <li>CRUD complet</li>
          <li>RBAC (Rôles + Permissions)</li>
          <li>Activation par e-mail</li>
          <li>Gestion du profil</li>
        </ul>
      </div>

      <div class="card" style="animation-delay:0.3s">
        <div class="card-header">
          <span class="card-icon">🏢</span>
          <span class="card-title">Prêt pour le SaaS</span>
        </div>
        <ul>
          <li>Multi-tenant</li>
          <li>Plans (Gratuit, Pro, Entreprise)</li>
          <li>Invitations de membres</li>
        </ul>
      </div>

      <div class="card" style="animation-delay:0.4s">
        <div class="card-header">
          <span class="card-icon">📡</span>
          <span class="card-title">Double API</span>
        </div>
        <ul>
          <li>REST (Swagger)</li>
          <li>GraphQL (Apollo)</li>
          <li>Clés de messages i18n</li>
        </ul>
      </div>

      <div class="card" style="animation-delay:0.5s">
        <div class="card-header">
          <span class="card-icon">🧪</span>
          <span class="card-title">TDD &amp; Qualité</span>
        </div>
        <ul>
          <li>Couverture de tests &gt; 80%</li>
          <li>Rouge → Vert → Refactorisation</li>
          <li>Tests unitaires + E2E</li>
        </ul>
      </div>

      <div class="card" style="animation-delay:0.6s">
        <div class="card-header">
          <span class="card-icon">🚀</span>
          <span class="card-title">Prêt pour la production</span>
        </div>
        <ul>
          <li>Docker Compose</li>
          <li>Limitation de débit</li>
          <li>Journalisation structurée</li>
          <li>CI/CD intégrable</li>
        </ul>
      </div>
    </div>

    <!-- Auteur -->
    <div class="author">
      <div class="author-name">Tsopze Nekdem Phanuel Arsene</div>
      <div style="font-size:13px;color:var(--muted)">
        Construction en public — Défi 14 jours
      </div>
      <div class="author-links">
        <a href="https://www.linkedin.com/in/phanuel-tsopze-8a33a52a4/" target="_blank">💼 LinkedIn</a>
        <a href="https://phanuel-alibia.com/" target="_blank">🌐 Portfolio</a>
        <a href="https://github.com/alibia-phanuel/nestjs-saas-auth-starter" target="_blank">⭐ GitHub</a>
      </div>
    </div>

  </div>

  <script>
    (function () {
      /* ── CONFIG ── */
      const START_DATE = new Date('2026-04-16T08:00:00');
      const TOTAL_DAYS = 14;
      /* ─────────── */

      const END_DATE = new Date(START_DATE);
      END_DATE.setDate(END_DATE.getDate() + TOTAL_DAYS - 1);

      function pad(n) {
        return String(n).padStart(2, '0');
      }

      function update() {
        const now       = new Date();
        const elapsed   = now - START_DATE;
        const total     = END_DATE - START_DATE;
        const remaining = END_DATE - now;

        /* --- avant le début --- */
        if (elapsed < 0) {
          document.getElementById('badge-text').textContent     = 'En développement actif — Jour 0 / ' + TOTAL_DAYS;
          document.getElementById('progress-label').textContent = 'Jour 0 / ' + TOTAL_DAYS + ' — 0%';
          document.getElementById('days-remaining').textContent = '⏳ Défi pas encore commencé';
          document.getElementById('live-timer').textContent     = '🕐 Démarre bientôt';
          document.getElementById('progress-fill').style.width  = '0%';
          return;
        }

        /* --- après la fin --- */
        if (remaining <= 0) {
          document.getElementById('badge-text').textContent     = 'Défi terminé 🎉';
          document.getElementById('progress-label').textContent = 'Jour ' + TOTAL_DAYS + ' / ' + TOTAL_DAYS + ' — 100%';
          document.getElementById('days-remaining').textContent = '🎉 Défi accompli !';
          document.getElementById('live-timer').textContent     = '✅ Terminé';
          document.getElementById('progress-fill').style.width  = '100%';
          return;
        }

        /* --- calculs --- */
        const pct        = Math.min(100, (elapsed / total) * 100);
        const currentDay = Math.min(TOTAL_DAYS, Math.floor(elapsed / 86_400_000) + 1);
        const daysLeft   = Math.ceil(remaining / 86_400_000);

        const totalSec   = Math.floor(remaining / 1000);
        const hours      = Math.floor(totalSec / 3600);
        const minutes    = Math.floor((totalSec % 3600) / 60);
        const seconds    = totalSec % 60;

        /* --- DOM --- */
        document.getElementById('badge-text').textContent =
          'En développement actif — Jour ' + currentDay + ' / ' + TOTAL_DAYS;

        document.getElementById('progress-fill').style.width =
          pct.toFixed(1) + '%';

        document.getElementById('progress-label').textContent =
          'Jour ' + currentDay + ' / ' + TOTAL_DAYS +
          ' — ' + Math.round(pct) + '%';

        document.getElementById('days-remaining').textContent =
          '⏳ ' + daysLeft + ' jour' + (daysLeft > 1 ? 's' : '') + ' restant' + (daysLeft > 1 ? 's' : '');

        document.getElementById('live-timer').textContent =
          '🕐 Jour ' + currentDay +
          ' — ' + pad(hours) + 'h ' + pad(minutes) + 'm ' + pad(seconds) + 's';
      }

      update();
      setInterval(update, 1000);
    })();
  </script>
</body>
</html>`);
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      service: 'nestjs-saas-starter',
    };
  }
}
