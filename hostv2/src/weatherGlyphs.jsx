// ─── Weather glyphs (owner, 11/18/2026: "Need beautiful glyphs for weather
// made for the studio matte") ────────────────────────────────────────────────
//
// One family with the section rail (sectionIcons.jsx): a 16px grid, 1.5
// stroke, round caps and joins, no fills, drawn in currentColor so a glyph
// takes the ink of the line it sits in (muted in a forecast line, the pill's
// own tone in the weather pill) — UX_01: an icon is muted or it is semantic,
// never ornament. No emoji (standing rule).
//
// ONE CLOUD. Fog, drizzle, rain, storm, snow and sleet draw the same cloud,
// lifted to make room for what falls from it, so the set reads as one sky
// rather than ten clip-arts. Cloudy and partly draw the same lobes larger and
// lower, because alone in the box (or tucked behind the sun) they carry the
// whole mark.

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

// The cloud: flat base, a small left lobe, a tall crown, a right shoulder —
// lifted to the top of the box so what falls from it has room below.
const CLOUD_UP = 'M4.6 9.6h6.9a2.75 2.75 0 0 0 .35-5.48 4.05 4.05 0 0 0-7.82-.78A3.15 3.15 0 0 0 4.6 9.6z';

const G = {
  clear: (
    <>
      <circle cx="8" cy="8" r="2.9" />
      <path d="M8 1.4v1.3M8 13.3v1.3M1.4 8h1.3M13.3 8h1.3M3.33 3.33l.92.92M11.75 11.75l.92.92M3.33 12.67l.92-.92M11.75 4.25l.92-.92" />
    </>
  ),
  // The sun stands behind the cloud: its disc is an arc that stops where the
  // cloud begins, so no line crosses another (no fills means no hiding).
  partly: (
    <>
      <path d="M8.35 5.1A2.35 2.35 0 1 0 4.05 6.9" />
      <path d="M6 1.3v1M1.3 6h1M2.65 2.65l.7.7M9.35 2.65l-.7.7" />
      <path d="M6.3 13.8h5.5a2.35 2.35 0 0 0 .3-4.68 3.45 3.45 0 0 0-6.65-.66A2.69 2.69 0 0 0 6.3 13.8z" />
    </>
  ),
  // The standalone cloud is drawn larger: alone in its box it must hold the
  // same visual weight as the sun beside it.
  cloudy: <path d="M4.3 13.1h7.6a3.05 3.05 0 0 0 .4-6.07 4.45 4.45 0 0 0-8.6-.86A3.47 3.47 0 0 0 4.3 13.1z" />,
  // Fog: the cloud, with mist lying under it (three bare lines read as a
  // text-align control, not weather).
  fog: (
    <>
      <path d={CLOUD_UP} />
      <path d="M2.6 12.2h10.8M4.6 14.6h6.8" />
    </>
  ),
  drizzle: (
    <>
      <path d={CLOUD_UP} />
      <path d="M5.4 12.2v.9M8 13.2v.9M10.6 12.2v.9" />
    </>
  ),
  rain: (
    <>
      <path d={CLOUD_UP} />
      <path d="M5.6 11.6l-.9 2.6M8.4 11.6l-.9 2.6M11.2 11.6l-.9 2.6" />
    </>
  ),
  storm: (
    <>
      <path d={CLOUD_UP} />
      <path d="M8.7 10.6l-1.9 2.5h2.4l-1.9 2.5" />
    </>
  ),
  snow: (
    <>
      <path d={CLOUD_UP} />
      <path d="M5.3 12h.01M8 12h.01M10.7 12h.01M6.65 14.4h.01M9.35 14.4h.01" />
    </>
  ),
  sleet: (
    <>
      <path d={CLOUD_UP} />
      <path d="M5.6 11.6l-.7 2M10.1 11.6l-.7 2M7.9 12.6h.01M12.1 12.6h.01" />
    </>
  ),
  wind: (
    <>
      <path d="M1.8 6.2h8.1a2 2 0 1 0-2-2" />
      <path d="M1.8 9.4h10.6a1.9 1.9 0 1 1-1.9 1.9" />
      <path d="M1.8 12.4h4.4" />
    </>
  ),
};

export const WEATHER_GLYPH_KINDS = Object.keys(G);

/** weatherGlyph(kind, size) -> an inline <svg>, aria-hidden: the words beside
 *  it carry the meaning. An unknown kind draws the plain cloud. */
export function weatherGlyph(kind, { size = 16, className = 'wx-g' } = {}) {
  return (
    <svg className={className} viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false" data-wx-glyph={G[kind] ? kind : 'cloudy'} {...S}>
      {G[kind] || G.cloudy}
    </svg>
  );
}
