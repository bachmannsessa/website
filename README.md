# bachmannsessa.ch – borghirolovini

Website of the borghirolovini winery (Beat Bachmann, Sessa), built with [Hugo](https://gohugo.io)
and published via GitHub Pages. German at `/`, Italian at `/it/`.

## Local development

```sh
sudo pacman -S hugo          # or any Hugo "extended" >= 0.168
hugo server                  # http://localhost:1313, live reload
hugo --gc --minify           # production build into ./public
```

## Structure

| Path | What |
|------|------|
| `content/de/`, `content/it/` | All pages and news posts (Markdown). Translations are linked via `translationKey`. |
| `content/*/news/` | News posts. File name `<slug>.md`, URL becomes `/YYYY/MM/DD/<slug>/` (date from front matter, same as WordPress). |
| `data/weine.yaml` | Wines + prices for the order form. |
| `assets/images/` | Images (originals). Hugo generates resized WebP versions at build time. |
| `layouts/` | Templates (`home.html`, `page.html`, `section.html`, `news/`, `_partials/`, `_shortcodes/`). |
| `assets/css/main.css`, `assets/js/main.js` | Styles and scripts (nav, age gate, forms). |
| `i18n/` | UI strings DE/IT. |
| `hugo.toml` | Config, menus, form settings. |

## Firmen- und Kontaktdaten (company & contact data)

**All company/contact data lives in one place: `hugo.toml` → `[params]` and `[params.company]`.**
Change it there and the whole site updates: footer, contact page, "Besuch & Kontakt" on the start
page, Impressum and Datenschutzerklärung (via the shortcodes `firma`, `register`, `email`).

| Key | Used for | Current value |
|-----|----------|---------------|
| `owner` | name shown in footer/contact | Beat Bachmann |
| `address` | short address (lines separated by ` · `) | Borghirolo · 6997 Sessa |
| `email` | footer, contact, Impressum, Datenschutz | vino@bachmannsessa.ch |
| `phone` | optional, shown everywhere the email is shown if set | *(empty)* |
| `company.name`, `careOf`, `street`, `zip`, `city`, `country` | legal entity (Impressum, Datenschutz) | Vicon Sagl, c/o Beat Bachmann, Borghirolo, 6997 Sessa |
| `company.seat` | registered seat | Tresa TI |
| `company.uid` | UID number | CHE-108.532.459 |
| `company.vat` | VAT number, optional (shown if set) | *(empty)* |
| `company.responsible` | "Verantwortlich für den Inhalt" | Beat Bachmann |

Company data as entered in the commercial register (checked 2026-11-01). The register name ("Handelsregister des Kantons Tessin" /
"Registro di commercio del Cantone Ticino") is in `i18n/*.yaml` → `legalRegisterName`.

Legal page texts (draft, not legal advice – have them checked):
- Impressum: `content/de/impressum.md`, `content/it/note-legali.md`
- Datenschutzerklärung: `content/de/datenschutz.md`, `content/it/privacy.md`
  → update the text if services change (hosting, form provider, map, new tracking …) and adjust
  the "Stand" date at the bottom.

## Photos

Every page sets its photo in the front matter: `image: "/images/…"` (file in `assets/images/…`),
optionally `imagePosition: "50% 30%"` as focus point for crops.
Italian pages without their own `image` automatically use the photo (and focus point) of their
German translation – so normally set it only in the German file.

Start page header: a slideshow defined in `content/de/_index.md` → `heroImages` (list of `src` and
optional `position`, in display order; `heroInterval` = seconds per photo). The Italian start page
uses the same list unless it defines its own. The welcome text below the photos is `welcome`
(eyebrow, title, text, signature) in `content/de/_index.md` and `content/it/_index.md`.

## Web editor (Sveltia CMS) – for writing news

`/admin/` (e.g. https://bachmannsessa.ch/admin/) is a web editor for news posts and the wine
price list. It commits directly to this repo; the deploy workflow then publishes within ~2 minutes.
Config: `static/admin/config.yml`.

- German and Italian are edited side by side in one entry (Italian can be switched off per post
  via the ⋮ menu). Translations are linked automatically via `translationKey`.
- Uploaded photos are converted to WebP (max. 2048px) in the browser before being committed.
- "Entwurf" (draft) posts are committed but not published.

Setup:
1. Put the real repo name into `static/admin/config.yml` → `backend.repo`.
2. Give your father a GitHub account and add it as collaborator on the repo.
3. Sign-in: simplest is **"Sign In Using Access Token"** – create a fine-grained token
   (GitHub → Settings → Developer settings → Fine-grained tokens) for this repo with
   *Contents: Read and write*. It's stored in the browser, so it's a one-time step.
   For a proper "Sign in with GitHub" button, deploy
   [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) (free Cloudflare Worker) and set
   `backend.base_url`.

### Writing a news post by hand

Create `content/de/news/herbst-im-rebberg.md` (and optionally `content/it/news/autunno-nel-vigneto.md`):

```markdown
---
title: "Herbst im Rebberg"
date: 2026-11-01T10:00:00+01:00
translationKey: "news/herbst-im-rebberg"   # same key in the IT file links the two
image: "/images/news/rebberg.jpg"          # file lives in assets/images/news/
---

Text in Markdown …
```

The start page always shows the newest post automatically.

## Forms (contact + order)

GitHub Pages is static, so both forms post to [Web3Forms](https://web3forms.com), which forwards
them by e-mail (free: 250 submissions/month).

1. On web3forms.com, create an access key with the recipient's e-mail address.
2. Put it in `hugo.toml` → `params.forms.accessKey` (the key is public by design).

The order form is generated from `data/weine.yaml`; the total is computed in the browser and the
e-mail contains a readable order summary plus the address fields.

Order basket: "Zur Bestellung hinzufügen" buttons (wine overview, wine pages, start page) store
`{wineId: quantity}` in the visitor's browser (`localStorage`, key `bsv-cart`). The menu shows the
bottle count; the order page is pre-filled from the basket and keeps it in sync. After a successful
"Bestellung abschliessen" the basket is emptied. No server or cookies involved.

## Deployment

Every push to `main` builds and deploys via `.github/workflows/deploy.yml`.

One-time setup:
1. Create the GitHub repo and push.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Custom domain: Settings → Pages → Custom domain `bachmannsessa.ch`, then at the DNS provider:
   `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   and `CNAME www → <user>.github.io`. Enable "Enforce HTTPS" afterwards.
