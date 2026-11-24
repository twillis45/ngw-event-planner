"""The store's own product category reaches the client (option B, step 1).

A store that sells no alcohol answers "white wine" with White Cooking Wine
(probed live 2026-11-24 at a Baltimore store). The client's word check
(storeUnitMap.matchLooksLikeTheLine) catches the cases seen so far; the
durable check is the store's own category, which this endpoint used to
throw away. Owner, 11/24/2026: approved as the follow-up.

This step only passes the field through, verbatim. Nothing reads it yet:
which category names mean "alcohol" is a fact about Kroger's catalogue that
a live probe must establish before any rule is written against it.
"""
from app.routers.kroger import _result_row

PRODUCT = {
    "productId": "0001",
    "description": "Holland House White Cooking Wine",
    "brand": "Holland House",
    "categories": ["Condiment & Sauces"],
    "items": [{"price": {"regular": 3.99, "promo": 0}, "size": "16 fl oz", "soldBy": "UNIT"}],
}


def test_the_category_is_passed_through_verbatim():
    row = _result_row("White wine", PRODUCT, "09700376")
    assert row["categories"] == ["Condiment & Sauces"]


def test_no_category_from_the_store_means_no_field():
    # Absent is absent: never an empty list standing in for "not alcohol".
    p = {k: v for k, v in PRODUCT.items() if k != "categories"}
    assert "categories" not in _result_row("White wine", p, "09700376")
    assert "categories" not in _result_row("White wine", {**PRODUCT, "categories": []}, "09700376")


def test_only_strings_pass():
    row = _result_row("White wine", {**PRODUCT, "categories": ["Beer", 7, None, ""]}, "09700376")
    assert row["categories"] == ["Beer"]


def test_the_rest_of_the_row_is_unchanged():
    row = _result_row("White wine", PRODUCT, "09700376")
    assert row == {
        "name": "White wine", "matched": True, "productId": "0001",
        "description": "Holland House White Cooking Wine", "brand": "Holland House",
        "categories": ["Condiment & Sauces"],
        "price": 3.99, "size": "16 fl oz", "soldBy": "UNIT",
    }
    # No location, no price (Kroger sends none without one).
    assert "price" not in _result_row("White wine", PRODUCT, None)
