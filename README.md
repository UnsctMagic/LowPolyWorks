# LowPolyWorks

LowPolyWorks post feed and projects, with a separate author workspace. MDLxL and WarhammerCraft are projects. The WarhammerCraft catalogue contains 41 models across Warriors of Chaos, Vampire Counts, The Empire, Bretonnia, and Orcs & Goblins.

## Run locally

Install Node.js 20 or newer, then run from this folder:

```sh
npm start
```

You can also run `node server.mjs` directly.

Open <http://127.0.0.1:4178/>. No dependency installation or build step is required for the website. Posts and subscriptions use the deployed publishing backend; until it is deployed, the local feed reports that posts are unavailable. The catalogue remains available at `#armies`. If that port is already occupied, set the `PORT` environment variable to another port.

```sh
npm run check
```

Without npm, run `node tools/check-project.mjs`.

This checks the application JavaScript, catalogue references, model hashes, textures, portraits, and army formation assets.

Model links use `/model/<id>/` so Discord can read each model's title, description, and thumbnail directly from the HTML. Old `#model/<id>` links still open the same viewer and update to the shareable URL. After changing the catalogue, unit thumbnails, or `dist/index.html`, run `npm run build:model-pages` before checking and publishing `dist/`.

## Files

- `dist/`: complete runnable website, including editable JavaScript and CSS, catalogue data, models, textures, renderer modules, WhiteoutLib, UI art, portraits, and downloads.
- `dist/catalogue.json`: descriptions, authors and profile links, detailed parts credits, geoset information, and source references.
- `dist/herrdave-import.json`: provenance for the imported HerrDave collection.
- `source-archives/`: the seven recovered original WarhammerCraft model packages. HerrDave's ten original packages are in `dist/downloads/herrdave/`.
- `tools/`: local thumbnail capture pages and project verification.
- `tracker/`: usage and publishing backend, author login, and model notification delivery. Reader and provisioning credentials stay in the ignored `.internal/` folder.
- `.openai/`: existing website preview configuration.

The local capture pages are available at `/__thumbnails.html` for army formations and `/__portraits.html` for full-unit cards. Unit cards use a slight front-side angle and the army's canonical Warcraft III team colour. Opening these pages regenerates the corresponding PNG files in `dist/thumbs/`.

## Credits

Models are by Unsanctioned Magic, HerrDave, and the collaborators listed on each model page. HerrDave's models were included with the owner's permission. Credits and links are preserved in the catalogue.

The live viewer uses MDLxL's Showcase rendering components, war3-model, Three.js, and WhiteoutLib. Third-party licenses and provenance are included under `dist/vendor/`, `dist/whiteout/`, and `dist/THIRD_PARTY_NOTICES.txt`. Native Warcraft III assets remain owned by Blizzard Entertainment. This repository does not grant ownership or a new license to those assets or the contributed models.

Model update tags are recorded automatically from the downloadable MDX bytes by `tools/model-updates.mjs`, during model-page generation and on catalogue/model pushes to either publishing branch. Existing model replacements refresh `model-updates.json`; unrelated page edits keep the previous time. Army-card tags show the Amsterdam update date, darken after 24 and 48 hours, and disappear after 72 hours. Uploaded cards use their existing update timestamp.
