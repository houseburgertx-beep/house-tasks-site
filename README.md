# HOUSE TASKS · Grupo House190

[**Abrir o aplicativo no GitHub Pages**](https://houseburgertx-beep.github.io/house-tasks-site/)

Interface React com suporte completo a **Progressive Web App (PWA)** publicada no GitHub Pages. Autenticação própria e API serverless na Cloudflare (`brunohouse.workers.dev`).

---

## 📱 Suporte a PWA (Instalação em Celulares e Tablets)

O aplicativo está configurado com `manifest.webmanifest` e `sw.js` (Service Worker):
- **iOS / Safari**: Toque em Compartilhar ➔ "Adicionar à Tela de Início".
- **Android / Chrome**: Toque no menu ➔ "Instalar aplicativo" ou adicione à tela inicial.
- **Cache do Shell**: Inicialização instantânea mesmo em conexões instáveis de loja/cozinha.

---

## ⚙️ Configuração da API

A URL base da API é configurável dinamicamente em [`app-config.json`](./app-config.json):

```json
{
  "apiBaseUrl": "https://house-tasks-api.brunohouse.workers.dev"
}
```

Qualquer alteração neste arquivo é lida em tempo de execução pelo `index.html`, sem necessidade de recompilar o bundle Javascript.

---

## 📦 Estrutura do Repositório

```text
house-tasks-site/
├── .github/workflows/pages.yml  # Deploy automático no GitHub Pages
├── .nojekyll                    # Evita descarte de assets pelo Jekyll
├── app-config.json              # Configuração dinâmica de endpoint
├── favicon.svg                  # Ícone vetorial da House
├── index.html                   # Shell da SPA + PWA e runtime bootstrap
├── manifest.webmanifest         # Manifesto PWA com metadados e ícones
├── sw.js                        # Service Worker para cache estático
├── assets/
│   ├── apple-touch-icon.png     # Ícone para dispositivos Apple (180x180)
│   ├── icon-192.png             # Ícone PWA (192x192)
│   ├── icon-512.png             # Ícone PWA (512x512)
│   ├── index-*.js               # Bundle JS da aplicação
│   └── index-*.css              # Folha de estilos
└── README.md
```

> **Nota:** Este repositório contém a distribuição de produção. O código-fonte original está no repositório privado `houseburgertx-beep/house-tasks`, na branch `house-exclusivo`.
