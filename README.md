<h1 align="center">drAIn 🌧️</h1>
<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
<a href="https://github.com/eliseoalcaraz/drAIn/blob/main/LICENSE">
<img alt="License" src="https://img.shields.io/badge/License-GPL--2.0-blue?style=for-the-badge" />
</a>

<div align="center">
  <br />
  <a href="https://github.com/eliseoalcaraz/drAIn">
    <img src="public/images/logo.png" alt="Logo" width="20%" height="20%">
  </a>
  <br />
  <p align="center">
    <br />
      Predict, Simulate, and Strengthen Urban Drainage Systems
    <br />
    <br />
    <p align="center">
      <a href="#"><img alt="Status" src="https://img.shields.io/badge/status-Beta-yellow?style=flat&color=yellow" /></a>
      <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-15.5.4-2B2B2B?logo=nextdotjs&logoColor=white&style=flat" /></a>
      <a href="https://github.com/eliseoalcaraz/drAIn/commits/main"><img alt="Last commit" src="https://proxy.cyb3rko.de/shields/github/last-commit/eliseoalcaraz/drAIn?color=coral&logo=git&logoColor=white" /></a>
  </p>
  <a href="https://github.com/eliseoalcaraz/drAIn/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
  &middot;
  <a href="https://github.com/eliseoalcaraz/drAIn/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#%EF%B8%8F-project-overview">🗺️ Project Overview</a>
      <ul>
        <li><a href="#-tech-stack">📚 Tech Stack</a></li>
      </ul>
    </li>
    <li>
      <a href="#-getting-started">💻 Getting Started</a>
      <ul>
        <li><a href="#-prerequisites">🔧 Prerequisites</a></li>
        <li><a href="#%EF%B8%8F-installation">🛠️ Installation</a></li>
        <li><a href="#%EF%B8%8F-running-the-application">▶️ Running</a></li>
      </ul>
    </li>
    <li><a href="#-contributing">📬 Contributing</a></li>
    <li><a href="#%EF%B8%8F-license">⚖️ License</a></li>
  </ol>
</details>

## 🗺️ Project Overview

**drAIn** is an **AI/machine learning - powered platform for flood resilience**. It is designed to help engineers, planners, and local governments **predict, simulate, and strengthen urban drainage systems**.

The project moves beyond simple hazard mapping by integrating **SWMM-based (Storm Water Management Model) hydraulic simulations** with **AI-driven analytics** and **community participation**. It transforms complex flood data into actionable insights to support proactive maintenance, infrastructure upgrades, and data-driven resilience planning.

### 💡 Why drAIn?

Urban flooding is a critical problem, often caused by heavy rainfall and poor drainage maintenance. While many existing tools focus on flood hazard mapping or risk assessment, they often remain theoretical. They typically lack real-time data integration, community participation, and operational decision support.

- 🧠 **Machine learning - Driven Vulnerability Ranking:** Assesses each drainage component using metrics like flooding volume and overflow duration. It then applies machine learning (K-Means clustering) to classify and rank structural vulnerabilities.
- 🌊 **Interactive Simulation:** Provides interactive "what-if" scenario testing, allowing users to simulate the impact of rainfall or structural changes in real time.
- 👥 **Community Participation:** Incorporates citizen reporting, allowing communities to contribute real-world drainage data for model validation and maintenance tracking.
- 📊 **Actionable Intelligence:** Converts complex simulation data into clear, actionable intelligence for engineers and planners to make informed decisions.

### 📚 Tech Stack

<p align="left">
  <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-2B2B2B?logo=nextdotjs&logoColor=white&style=flat" /></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=flat" /></a>
  <a href="https://tailwindcss.com/"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-0EA5E9?logo=tailwindcss&logoColor=white&style=flat" /></a>
  <a href="https://ui.shadcn.com/"><img alt="shadcn/ui" src="https://img.shields.io/badge/shadcn/ui-111111?logo=shadcnui&logoColor=white&style=flat" /></a>
  <a href="https://lucide.dev/"><img alt="Lucide Icons" src="https://img.shields.io/badge/Lucide_Icons-10B981?logo=lucide&logoColor=white&style=flat" /></a>
  <a href="https://www.mapbox.com/"><img alt="Mapbox" src="https://img.shields.io/badge/Mapbox-000000?logo=mapbox&logoColor=white&style=flat" /></a>
  <a href="https://supabase.com"><img alt="Supabase" src="https://img.shields.io/badge/Supabase-269e6c?logo=supabase&logoColor=white&style=flat" /></a>
  <a href="https://fastapi.tiangolo.com/"><img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white&style=flat" /></a>
  <a href="https://www.epa.gov/water-research/storm-water-management-model-swmm"><img alt="PySWMM" src="https://img.shields.io/badge/PySWMM-0078D4?logo=python&logoColor=white&style=flat" /></a>
  <a href="https://scikit-learn.org/"><img alt="scikit-learn" src="https://img.shields.io/badge/scikit--learn-F7931E?logo=scikitlearn&logoColor=white&style=flat" /></a>
  <a href="https://gemini.google.com/"><img alt="Google Gemini" src="https://img.shields.io/badge/Google_Gemini-4285F4?logo=googlegemini&logoColor=white&style=flat" /></a>
  <a href="https://vercel.com/"><img alt="Vercel" src="https://img.shields.io/badge/Vercel-232323?logo=vercel&logoColor=white&style=flat" /></a>
  <a href="https://railway.app/"><img alt="Railway" src="https://img.shields.io/badge/Railway-0B0D0E?logo=railway&logoColor=white&style=flat" /></a>
</p>

## 💻 Getting Started

Follow these steps to set up and run **drAIn** locally.

### 🔧 Prerequisites

- [Node.js](https://nodejs.org/) (version 16.0 or higher)
- [pnpm](https://pnpm.io/)

### 🛠️ Installation

#### 1. Clone the Repository

```sh
git clone https://github.com/eliseoalcaraz/drAIn.git
cd drAIn
```

#### 2. Install Dependencies

```sh
pnpm install
```

#### 3. Environment Setup

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration (API keys, database URL, etc.)

### ▶️ Running the Application

```sh
pnpm run dev
```

<!-- CONTRIBUTING -->

## 📬 Contributing

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 📢 Contributors

<a href="https://github.com/eliseoalcaraz/drAIn/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=eliseoalcaraz/drAIn" alt="contrib.rocks image" />
</a>

### 🔎 Codebase evaluation (brief)

Positives

- Clear Next.js app-router layout (app/), with UI components under components/, utilities/hooks under lib/ and hooks/, and public assets in public/. This follows common modern Next.js monorepo patterns.
- TypeScript + pnpm are used consistently which helps reproducible installs and type safety.
- UI primitives appear centralized (components/ui), and domain code is split into domain folders (control-panel, map, simulation) — good separation of concerns.
- Use of hooks for data (useInlets, usePipes, etc.) and context providers indicates a predictable data flow.

Areas to improve (actionable)

- Type coverage and runtime safety: several files contain apparent issues (missing returns or references to undefined identifiers). Run `pnpm typecheck` and fix:
  - Example patterns: functions returning nothing where Promise<T[]> is expected; local variables referenced without declaration (fix promise/error/data handling).
- Single source of truth for API client & supabase usage: centralize client initialisation and types to avoid duplication.
- Tests & CI: add unit and integration tests (Playwright is present — add CI job to run them). Add `pnpm test`/`pnpm ci` steps to CI.
- Lint and formatting: ensure `pnpm lint` and a pre-commit hook run to keep style consistent.
- Documentation: expand README with:
  - development checklist (typecheck, lint, test)
  - architecture overview (what lives in app/, components/, lib/, hooks/)
  - how to run the simulation API locally (if applicable)
- Large static assets: very large geojson files under public/ can bloat the repo. Consider moving large datasets to an external storage or separate data-only repo if they grow.
- Naming consistency: enforce a naming convention for fields (camelCase vs snake_case) and document it to ease mapping between front-end and Supabase column names.

Recommended quick next steps

1. Run: `pnpm install && pnpm typecheck && pnpm lint` locally and fix reported issues.
2. Add a basic GitHub Actions workflow that runs typecheck, lint and tests on PRs.
3. Create a short CONTRIBUTING.md with the development workflow (typecheck → lint → tests → format).
4. Triage and fix the obvious runtime issues shown by typecheck (files with missing returns / undefined identifiers).

<!-- LICENSE -->

## ⚖️ License

This project is licensed under the GNU General Public License v2.0 (GPL-2.0).
You may redistribute and/or modify it under the terms of the GNU GPL, as published by the Free Software Foundation. - see the [LICENSE](LICENSE) file for details.

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/eliseoalcaraz/drAIn.svg?style=for-the-badge
[contributors-url]: https://github.com/eliseoalcaraz/drAIn/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/eliseoalcaraz/drAIn.svg?style=for-the-badge
[forks-url]: https://github.com/eliseoalcaraz/drAIn/network/members
[stars-shield]: https://img.shields.io/github/stars/eliseoalcaraz/drAIn.svg?style=for-the-badge
[stars-url]: https://github.com/eliseoalcaraz/drAIn/stargazers
[issues-shield]: https://img.shields.io/github/issues/eliseoalcaraz/drAIn.svg?style=for-the-badge
[issues-url]: https://github.com/eliseoalcaraz/drAIn/issues
