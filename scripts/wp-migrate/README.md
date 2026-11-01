# WordPress → Hugo migration

One-off script that was used to import the content of the old WordPress site.
Only needed again if new content gets published on WordPress before the switch.

```sh
mkdir -p /tmp/wp && cd /tmp/wp
curl -so pages.json "https://bachmannsessa.ch/wp-json/wp/v2/pages?per_page=100"
curl -so posts.json "https://bachmannsessa.ch/wp-json/wp/v2/posts?per_page=100"
for p in 1 2 3; do curl -so media$p.json "https://bachmannsessa.ch/wp-json/wp/v2/media?per_page=100&page=$p"; done

cd <repo>/scripts/wp-migrate && npm install
node migrate.js /tmp/wp <repo>      # writes content/de + content/it (overwrites!)
# images: downloads.json lists url -> path; download them to assets/<path>
jq -r '.[]|"\(.[0]) assets\(.[1])"' /tmp/wp/downloads.json | while read u f; do mkdir -p "$(dirname "$f")"; curl -sfLo "$f" "$u"; done
```

Note: manual fixes made after the import (wine page weights, home page `wineSection`,
news `_index.md`, IT aliases) would have to be redone — prefer copying single new posts.
