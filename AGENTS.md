# LowPolyWorks public credit name

- Always use `UnsanctionedMagic` (one word) as the exact spelling of the public name for Avner everywhere on LowPolyWorks, including model bylines and credits, project and tutorial content, acknowledgements, posts, and metadata. Use this spelling in both source and published content.

# Warcraft model rendering

- Render team colour and team glow with the actual Warcraft III `TeamColorNN` and `TeamGlowNN` textures for the selected player colour. Do not substitute flat RGB fills or procedural glow approximations.
- Preserve authored team-glow geometry and effects in live previews and captured model images. Transparent captures must retain the glow without an opaque background rectangle.
- Verify colour changes on the model itself before publishing; changing a card background does not verify a team-colour change.

## MDLxL tutorial design

- Use the existing MDLxL tutorial cards, header, language picker and back navigation. Keep the guide focused on the named controls and show authentic editor footage.
- Publish recordings as standalone, muted, looping MP4s with native playback controls. Preserve frame timing and synchronize localized keyboard cues as video captions. Load clips as they come into view.
- Use the standard animated green ring and crosshair to mark each demonstrated control when the lesson introduces it. Center the ping on the actual control in the recording or annotated image.
- Match annotated image and video widths within each guide and preserve their aspect ratios. Check the live-sized layout, green pings, captions, and at least two playback loops at desktop and mobile widths before publishing.

## Model card rotation

- On every army page, a Unit/Hero pair shows its main Unit or non-Hero version. Keep Hero versions, including named Hero subvariants, in the model-page variant tabs. Only distinct non-Hero Unit variations may appear in page-load cycling, arrows or dots. Hide the rotation controls when the card has only one eligible version.

## Warriors of Chaos card sizing

- Grouped Warriors of Chaos cards with multiple eligible Unit variations cycle through those variations on successive page loads, subject to any explicit non-Hero card default, using the variant list automatically. Keep the chosen picture stable during navigation within a load; do not use a timer or a hard-coded subset.
- Treat every Warrior of Khorne, Nurgle, Slaanesh, and Tzeentch variant as one visual card family. Use the shared army-card frame (square on desktop, 4:5 on mobile) and a square 1024×1024 transparent card image. Preserve model proportions; any size correction must be uniform and limited to the army card.
- Before publishing a new Warrior variant or changing a Warrior card, cycle **every eligible non-Hero** variant on the Warriors of Chaos army page at desktop and mobile widths. Match perceived occupied area against the existing cards, including bulky shields and thin weapons; equal PNG dimensions or equal head-to-foot height alone do not establish equal visual size. The current accepted set occupies roughly 25–38% of a 1024×1024 image in pixels with alpha above 8 after card scaling. Use that as a guide, then inspect the page for clipping, readable eyes, and full weapons.
- Keep card-image changes separate from model-page thumbnails, the rotatable 3D preview, and MDX files.

## Hero / Unit picture framing

- This is a site-wide rule for every army and every existing or future Unit/Hero pair, including named subvariants (Axe, Flail, Swimless) and the Warboss/Hero pair. Hero glow must never reduce the body size or change its position: derive the camera and body framing from the corresponding Unit, retain the authored glow, and never fit or crop the Hero independently. Any extra canvas room needed for glow must use one identical crop for both pictures. Regenerate legacy mismatched pictures rather than treating them as exceptions.
- Every Hero / Unit pair must align pixel for pixel, automatically. Preserve native model proportions and use square 1024×1024 transparent pictures with the authored hero glow. The portrait studio must use the Unit as the reference and reuse its exact camera, lighting frame, pose, time and crop rectangle for both pictures, including Hero-only captures. Independently fitting both images with equal settings is insufficient; never stretch width or height independently.
- Before publishing or replacing either picture, overlay/compare the body silhouettes at native resolution and require zero shifted silhouette or edge pixels, excluding the additional hero glow. Compare both variants with an accepted Hero / Unit pair on the actual army page at desktop and mobile widths for full weapons, glow and no clipping. Keep the standard shared card frame and the requested main variant.

## Model card ordering

- On every army page, updated models move up automatically: sort cards newest first by the latest model publication or update timestamp across all live variants. Fixed army placements must not override this order. Preserve group membership, variant selection and relative order when dates are equal or missing.
- For every model update, refresh the byte-derived update metadata and verify the affected card moves up on the actual army page at desktop and mobile widths.

## Model file additions

Use the same catalogue workflow for a loose MDX, a ZIP drop, or an offline draft waiting for models. A supplied model plus its text and credits is enough to prepare the standard card and page.

### Identify the drop

- Match the requested title, army, variant and exact MDX filename to the supplied files. For a ZIP or a prior archive release, open the matching `source-archives/` ZIP and read its `readme.html` alongside the model filenames. Use the readme for that release’s title, lore, byline evidence and explicit parts credits. Use the latest user-supplied files and instructions for any replacements or corrections. A model name, an archive’s age, and link order alone do not establish which bytes or base model to use.
- For an update, start from the accepted catalogue entry and retain its title, description, credits, variant grouping and downloads except where the user supplies a change. Map each supplied MDX to its own variant. For a draft awaiting files, prepare the catalogue text and attribution locally so the same entry can drive the rendered preview when the MDX arrives.

### Build the credits

- Keep the user’s lore verbatim. Use the model’s own release notes or archive readme for attribution. Use linked donor pages to resolve the title and creator of the specific asset the user named. Keep the donor page’s thanks, sponsorship, parts list and other credits out unless the user explicitly requested them.
- Set the catalogue `authors` in display order. For Avner’s drops, `UnsanctionedMagic` comes first and the credited base-model creator comes second. Put any other explicitly credited main authors after the base creator. An archive’s `Submitted by` line can identify additional main authors, while its explicit `Model Base` row establishes the base creator. When several base sources are supplied, keep their specific roles. If the primary base is genuinely unclear, ask which creator should be second and continue the independent asset work.
- Store each named contribution in the catalogue `credits` and its matching `creditLinks`. Use `Model Base - <model title> by <author>` to render the bold **Model Base** heading with linked model and author. Retain an explicit further editor or upstream base in the detailed credits. For parts, use the supplied role and linked asset title with the creator when known. Use the supplied asset title and “Credits unknown” for an explicitly unknown creator. Link titles and names instead of displaying raw URLs or a hosting-site name as the asset title.
- If the user says a part is shared with an existing model, locate the exact catalogue entry and reuse only the matching part’s credit and links. Apply later corrections to both the row and its links. For shared Unit/Hero credits, keep the detailed rows on the specified main page and use the existing shared-credit link on the other variant.

### Prepare and verify the release

- Use `dist/catalogue.json` to drive the normal army card, model page and Credits tab. Generate the share page with `node tools/model-pages.mjs`. Before publishing, open the actual local card and Credits tab and compare them against the latest user notes, matching archive readme or accepted entry. Verify the byline order on the card, model page and Credits tab, every contribution label and linked title/author, the destination of each link, and that removed or unrequested credits are absent. Repeat this comparison when an offline draft is resumed for publication.
- Preserve the supplied MDX bytes and native paths. Verify SHA-256 against the source and the served preview and download. Keep native preview assets out of download ZIPs. Include the supplied custom dependencies in the download where needed.
- Run `node tools/model-textures.mjs <catalogue-id>` to resolve native textures and the model’s event resources, including sounds, blood/footprint/ubersplat textures, spawned models and their referenced child assets. Use existing mappings and the local classic MPQ and CASC archives. The command accepts `--mdlxl`, `--archives` and `--game`; local sources include `D:/WarcraftStuff` and `D:/Warcraft III`. Check available custom assets too. If a resource needs conversion for the viewer, convert a preview copy and verify its geometry, animation, effects and references. Publish the resource mappings and files together and report any genuinely unavailable dependency.
- Compare the local renderer with current `gh-pages` before capture. Use `node server.mjs` and `/__portraits.html?models=<catalogue-id>` to capture the requested card with actual Warcraft team textures. Apply the existing Unit/Hero framing, rotation and recency rules. Run `node tools/check-project.mjs`. Inspect the card and page at desktop and mobile widths. Exercise normal mouse rotation, team colour, textures, effects and any animation-event sounds in the local viewer.
- Keep offline, draft or review-first work local until the user authorizes publication. For a standard model-card request without that limit, complete publication. Apply the scoped changes to current `main` and the root of `gh-pages`, with updated generated pages and cache references. Inspect the Pages commit diff for the expected release files before pushing. Wait for Cloudflare Pages and verify the public card, bylines, Credits tab, preview and download again. Report the live link and any material verification limits.

### Archive examples

- **Graveguard** — the readme credits Rhapsodie for Necron Guard, with Maximal’s Nature Protector as its upstream base. The main byline is `UnsanctionedMagic, Rhapsodie`.
- **Chaos Aspiring Champion** and **Von Carstein Vampire** — the archive’s submitter list puts stein123 ahead of Direfury, while the explicit base rows identify Direfury. Apply the current byline rule with Direfury second and retain the documented kitbash or editing contribution.
- **Chaos Knights of Khorne** — the archive contains separate Axe and Flail MDXs and a shared readme that distinguishes HerrDave’s Vile Knight base from Stein123’s further edits. Keep both variants’ file identities and the distinct credit roles.
