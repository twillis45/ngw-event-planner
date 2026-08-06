// A REAL Vrbo results page, captured 2026-08-05 ───────────────────────────────
// Search: Santa Fe, NM · 2027-06-17 → 2027-06-21 · 10 adults — reached by the
// very URL lodgingSearchLinks() builds for the Vrbo door, which does land on a
// real 41-card results page.
//
// REDUCED, NOT INVENTED, exactly like the Airbnb fixture: real hrefs, real photo
// URLs, real card lines in real order. Vrbo's shapes differ from Airbnb's in
// every way that matters to the parser, and each difference here is real:
//   · the card link is a BARE NUMERIC relative path ("/963775"), not "/rooms/N"
//   · beds and bedrooms arrive on ONE line ("House · 5 bedrooms · 6 beds")
//   · the price is prose ("The current price is $889")
//   · a discounted card lists the OLD price before the new one, and may also
//     carry a saving ("Early booking $580 off") — three money figures, only the
//     last of which is what the stay costs
//   · "10 out of 10" review scores put bare numbers in the text
export const VRBO_SANTA_FE_RESULTS_HTML = `<div><a href="/963775"></a><img src="https://media.vrbo.com/lodging/34000000/33750000/33744300/33744282/4d382651.jpg"><span>Photo gallery for Hillside Hacienda - Relax in the Sangre de Christo Foothills -</span><span>Image of Hillside Hacienda - Relax in the Sangre de Christo Foothills -</span><span>Loved by Guests</span><span>Within North Hills</span><span>Hillside Hacienda - Relax in the Sangre de Christo Foothills -</span><span>House · 5 bedrooms · 6 beds</span><span>Free cancellation until Apr 18</span><span>10</span><span>10 out of 10</span><span>Exceptional</span><span>exceptional</span><span>164 reviews</span><span>(164 reviews)</span><span>The current price is $889</span></div>
<div><a href="/2315557"></a><img src="https://media.vrbo.com/lodging/68000000/67630000/67628800/67628732/4975e4a6.jpg"><span>Photo gallery for Dorthia Garden Retreat &amp; Views | Stunning 360 View</span><span>Image of Dorthia Garden Retreat &amp; Views | Stunning 360 View</span><span>Premier Host</span><span>1.5 mi (2.4 km) to Santa Fe center</span><span>Dorthia Garden Retreat &amp; Views | Stunning 360 View</span><span>House · 5 bedrooms · 5 beds</span><span>Free cancellation until May 18</span><span>9.4</span><span>9.4 out of 10</span><span>Exceptional</span><span>exceptional</span><span>114 reviews</span><span>(114 reviews)</span><span>Early booking $145 off</span></div>
<div><a href="/139308"></a><img src="https://media.vrbo.com/lodging/34000000/33970000/33969000/33968903/c45c5e2f.jpg"><span>Photo gallery for Unique combination of Space, Views, Plaza, Privacy, and Garden</span><span>Image of Unique combination of Space, Views, Plaza, Privacy, and Garden</span><span>Within Downtown Santa Fe</span><span>Unique combination of Space, Views, Plaza, Privacy, and Garden</span><span>House · 7 bedrooms · 8 beds</span><span>Free cancellation until May 18</span><span>9.6</span><span>9.6 out of 10</span><span>Exceptional</span><span>exceptional</span><span>134 reviews</span><span>(134 reviews)</span><span>The current price is $1,524</span><span>$1,524</span></div>
<div><a href="/2213855"></a><span>Within Historic Eastside</span><span>Stunning Historic Eastside Adobe Estate with Casita</span><span>House · 6 bedrooms · 7 beds</span><span>Free cancellation until May 18</span><span>9.6</span><span>9.6 out of 10</span><span>Exceptional</span><span>exceptional</span><span>31 reviews</span><span>(31 reviews)</span><span>Early booking $580 off</span><span>The previous price was $1,850</span><span>$1,850</span><span>The current price is $1,705</span></div>`;
