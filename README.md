# Resident SBS - Staff Coaching & Observation Dashboard

A Google Apps Script web application for managing staff coaching, observation activities, and compliance analytics.

## 📁 Project Structure

```
Resident SBS/
├── appscript/          # Google Apps Script source files
│   ├── Code.gs         # Server-side logic (doGet, include helper)
│   ├── Index.html      # Main HTML template
│   ├── CSS.html        # Stylesheet module
│   ├── JS.html         # Client-side JavaScript module
│   ├── appsscript.json # Apps Script project manifest
│   └── .clasp.json     # clasp project config
├── .gitignore
└── README.md
```

## 🚀 Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [clasp](https://github.com/google/clasp) (`npm install -g @google/clasp`)

### Getting Started

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd "Resident SBS"
   ```

2. Login to clasp:
   ```bash
   clasp login
   ```

3. Push changes to Apps Script:
   ```bash
   cd appscript
   clasp push
   ```

4. Deploy:
   ```bash
   clasp deploy --description "Your deploy message"
   ```

5. Open the web app:
   ```bash
   clasp open-web-app
   ```

## 🛠️ Key Features

- **Collapsible Sidebar** — Click hamburger to minimize to icon-only mode
- **Dashboard View** — Charts for coaching activity, absenteeism, observation scores
- **Coaches View** — List of 20 coaches with initials-based avatars
- **Observation Modals** — Detailed observation and rating system
- **Responsive Design** — Adapts to mobile and desktop screens

## 📋 Coaches

Jake Cajes, Mikaela Barrera, John Ortega, Chui Goh, Kyla Serion, Zaira Kinol, Irene Estravela, Krizha Abia, Korina Alcantara, Charbel Mahinay, Erwin Verano, JM Piñero, Karl Mag-usara, Shiela Bologa, Gazelle Bulalacao, Joenesse Bonghanoy, Alyssa Reyes, Elaine Roxas, May-Ann Montegrejo, Xavy Cuerpo
