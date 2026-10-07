# Warcraft model rendering

- Render team colour and team glow with the actual Warcraft III `TeamColorNN` and `TeamGlowNN` textures for the selected player colour. Do not substitute flat RGB fills or procedural glow approximations.
- Preserve authored team-glow geometry and effects in live previews and captured model images. Transparent captures must retain the glow without an opaque background rectangle.
- Verify colour changes on the model itself before publishing; changing a card background does not verify a team-colour change.
