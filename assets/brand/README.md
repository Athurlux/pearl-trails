# Pearl Trails — Brand Assets

Source kit copied from `Downloads/Pearl_Trails_Brand_Assets`. Originals left in place.
`SOURCE-README.txt` is the kit author's original notes, kept verbatim.

**Tagline:** STAYS THAT STAY WITH YOU

## Palette

| Name | Hex | Intended use |
|---|---|---|
| Deep Forest | `#0F3D32` | navigation, primary buttons, dark sections |
| Pearl Ivory | `#F9F7F2` | primary page background, light surfaces |
| Warm Sand | `#D9B88C` | secondary accents |
| Soft Gold | `#B8925A` | restrained highlights, icons, dividers |

Two greens/neutrals plus two metallics — a restrained palette. Resist adding colours to it;
semantic states (success/warning/danger) will need deriving later and should be decided once,
not invented per screen.

## Which file to use

### Logos — `logos/`

| File | Use |
|---|---|
| `pearl-trails-primary-transparent.png` | main horizontal logo, any light surface |
| `pearl-trails-primary-white-background.png` | main logo pre-composited on white |
| `pearl-trails-wordmark-transparent.png` | compact wordmark — headers, navbars |
| `pearl-trails-reversed-transparent.png` | light version for dark backgrounds |
| `pearl-trails-dark-background.png` | pre-composited on Deep Forest |

### Icons — `icons/`

| File | Use |
|---|---|
| `pearl-trails-icon-mark-transparent.png` | pearl + trail mark, standalone |
| `pearl-trails-icon-mark-reversed-transparent.png` | mark for dark backgrounds |
| `pearl-trails-app-icon-512.png` / `-192.png` | PWA / app icons |
| `pearl-trails-app-icon-light-512.png` | light app icon variant |
| `pearl-trails-social-profile-1080.png` | social profile square |

### Favicons — `favicons/`

`.ico` plus 16/32/48/64 PNGs.

## Known limitations

- **Raster only.** The kit was generated from a raster source, so there is no true SVG.
  Small sizes and large hero placements will both show limits. If the logo becomes central
  to the UI, commissioning a vector redraw is worth considering.
- **Transparent PNGs use a real alpha channel** — no baked checkerboard.
- **No dark-mode palette** is defined. Reversed logo variants exist, but surface/text colours
  for a dark theme have not been decided.

## Notes for later

When a framework is chosen, these move to whatever static directory it expects
(`public/`, `static/`, `src/assets/`). Keep this folder as the source of truth and copy
into the build location rather than editing in place.
