"""A real shelf price is kept, and only when it is attributable.

Until 2026-09-24 every price `/api/shopping/kroger/search-list` returned was
shown to one host and discarded, while the corpus those prices could re-verify
sat at one vintage (529 of 533 dated rows stamped August 2026). These cover the
record-building half — pure, no DB — because that is where the judgments live.

The rules under test, each of which is a way this could quietly go wrong:
  • no store, no playbook, no purchase id  -> no observation (never guess a row)
  • a match with no price                  -> no observation (a match is not a price)
  • same row + store + month               -> ONE record (no manufactured corroboration)
  • different store or month               -> separate records (real independence)
  • the record carries no host identity
"""
import datetime

from app.routers.kroger import LineItem, SearchListRequest, _price_observations, _slug

AT = datetime.datetime(2026, 9, 24, 12, 0, tzinfo=datetime.timezone.utc)

ICE = {"name": "Ice (for chilling + drinks)", "matched": True, "price": 2.99,
       "size": "7 lb", "soldBy": "UNIT", "productId": "0001111041660",
       "description": "Kroger Ice Bag"}


def _req(location="01400376", asset="Get-Together", purchase_id="p_ice"):
    return SearchListRequest(
        items=[LineItem(name=ICE["name"], term="ice", purchaseId=purchase_id)],
        locationId=location, assetId=asset,
    )


def test_a_priced_attributable_line_is_recorded():
    obs = _price_observations(_req(), [ICE], AT)
    assert len(obs) == 1
    o = obs[0]
    assert o["kind"] == "pricing"
    assert o["assetId"] == "Get-Together"
    # Pointed at the field a later KCR would target, not just at the row.
    assert o["fieldPath"] == "p_ice.unitCostRange"
    assert o["price"]["regular"] == 2.99
    assert o["price"]["locationId"] == "01400376"
    assert o["price"]["size"] == "7 lb"
    assert o["source"] == "kroger-api"


def test_NO_STORE_NO_OBSERVATION():
    # Kroger returns prices only with a locationId, so a price without one did
    # not come from a shelf. Recording it would attribute a national figure to
    # a store.
    assert _price_observations(_req(location=None), [ICE], AT) == []


def test_NO_PLAYBOOK_AND_NO_PURCHASE_ID_MEAN_NO_OBSERVATION():
    # The anti-guessing rule. Without an id there is nothing to match a free-text
    # product name back to except a string comparison, which is the guess
    # geoItemMap refuses to make.
    assert _price_observations(_req(asset=None), [ICE], AT) == []
    assert _price_observations(_req(purchase_id=None), [ICE], AT) == []


def test_A_MATCH_WITHOUT_A_PRICE_IS_NOT_A_PRICE():
    # The same rule the client's three-layer resolver applies. A matched product
    # with no number is a product lookup, not evidence.
    matched_only = {"name": ICE["name"], "matched": True, "productId": "x"}
    assert _price_observations(_req(), [matched_only], AT) == []
    # And zero is not a price either — Kroger sends 0 for "no promo".
    assert _price_observations(_req(), [{**ICE, "price": 0}], AT) == []


def test_SAME_ROW_SAME_STORE_SAME_MONTH_IS_ONE_NOTICE():
    # Two hosts pricing ice at the same store this month saw ONE shelf. Counting
    # it twice would manufacture corroboration, which is the failure that makes
    # a later "N independent observations agree" rule meaningless.
    a = _price_observations(_req(), [ICE], AT)[0]
    later = AT + datetime.timedelta(days=3)
    b = _price_observations(_req(), [{**ICE, "price": 3.49}], later)[0]
    assert a["id"] == b["id"]


def test_A_DIFFERENT_STORE_OR_MONTH_IS_A_DIFFERENT_NOTICE():
    a = _price_observations(_req(), [ICE], AT)[0]
    other_store = _price_observations(_req(location="01400999"), [ICE], AT)[0]
    next_month = _price_observations(_req(), [ICE], AT.replace(month=10))[0]
    assert len({a["id"], other_store["id"], next_month["id"]}) == 3


def test_THE_RECORD_CARRIES_NO_HOST_IDENTITY():
    # kas_records is declared "admin-scoped governance metadata: no host data,
    # no PII". A store id is a shop, not a person; nothing else may leak in.
    blob = str(_price_observations(_req(), [ICE], AT)[0]).lower()
    for forbidden in ("eventid", "event_id", "zip", "userid", "user_id", "email", "hostid"):
        assert forbidden not in blob


def test_the_promo_price_is_kept_but_is_not_the_figure():
    # A band rebuilt from sale prices would under-state the corpus for everyone
    # shopping off-sale, so `regular` is the observation's number and the promo
    # rides alongside it.
    o = _price_observations(_req(), [{**ICE, "promoPrice": 1.99}], AT)[0]
    assert o["price"]["regular"] == 2.99
    assert o["price"]["promo"] == 1.99


def test_THE_RECORD_SHAPE_MATCHES_THE_JS_MODEL():
    # A CROSS-LANGUAGE SEAM, pinned because it cannot be imported.
    # `createObservation()` in src/lib/knowledge/observation.js defines this
    # shape, and the Admin Console reads these rows through that model. Python
    # cannot import it, so the field set is asserted literally here: if the JS
    # model gains or renames a field, this is the one place that says so.
    # `price` is the addition this writer makes — numbers a corroboration rule
    # can read without parsing the statement prose.
    js_fields = {
        "id", "kind", "statement", "source", "gapType", "assetId", "assetKind",
        "fieldPath", "region", "noticedAt", "status", "linkedEvidence",
        "linkedFindings", "audit",
    }
    keys = set(_price_observations(_req(), [ICE], AT)[0].keys())
    assert keys == js_fields | {"price"}


def test_STATUS_REPORTS_PRICING_AND_RECORDING_SEPARATELY(monkeypatch):
    # Two capabilities, two answers. A deployment can price lists perfectly
    # (Kroger keys present) while recording nothing (no database) — and that is
    # precisely the state worth being able to see, because it is invisible from
    # the host's side and from the response. Collapsing them into one flag would
    # hide it.
    from app.routers import kroger as k

    monkeypatch.setattr(k, "KROGER_CLIENT_ID", "id", raising=False)
    monkeypatch.setattr(k, "KROGER_CLIENT_SECRET", "secret", raising=False)
    monkeypatch.setattr("app.config.DATABASE_URL", "", raising=False)
    assert k.kroger_status() == {"configured": True, "recording": False}

    monkeypatch.setattr("app.config.DATABASE_URL", "postgres://x", raising=False)
    assert k.kroger_status() == {"configured": True, "recording": True}


def test_slug_matches_the_js_rule():
    # Two slug functions that disagree produce two records for one notice.
    assert _slug("Get-Together") == "get-together"
    assert _slug("p_ice") == "p-ice"
    assert _slug("PTA / Booster Fundraiser") == "pta-booster-fundraiser"
    assert _slug("--x--") == "x"
