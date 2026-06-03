# Assets

Placeholders are currently generated in code (category-colored card bands + emoji icons;
a stylized procedural globe; Web Audio tones). To upgrade to real assets without code changes:

- **Card art:** drop images here and reference them from `Policy.art` (the engine already
  carries an `art` key per policy). Wire `PolicyCard` to render `<img src={/assets/${policy.art}.png}>`.
- **Globe texture:** add an equirectangular Earth texture (e.g. `earth.jpg`) and load it in
  `scene/Globe.tsx` via drei's `useTexture('/assets/earth.jpg')` on the sphere material.
- **Sound:** replace `audio/useSfx.ts` (Web Audio tones) with Howler + real audio files here,
  keyed by `eventToSound`'s event types.
