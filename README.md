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

## Deployment

Every push to `main` builds and deploys via `.github/workflows/deploy.yml`.

One-time setup:
1. Create the GitHub repo and push.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Custom domain: Settings → Pages → Custom domain `bachmannsessa.ch`, then at the DNS provider:
   `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   and `CNAME www → <user>.github.io`. Enable "Enforce HTTPS" afterwards.
