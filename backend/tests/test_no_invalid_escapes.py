"""Every backend module compiles with SyntaxWarning as an error.

An invalid escape like "\;" works today with a warning (Render's log showed
one at startup, 11/16/2026, in calendar_feed.py) and becomes a SyntaxError in
a later Python: the API would not start. Compile them all here, warnings fatal.
"""
import pathlib
import warnings

APP = pathlib.Path(__file__).resolve().parent.parent / "app"


def test_no_module_has_an_invalid_escape():
    bad = []
    for f in sorted(APP.rglob("*.py")):
        with warnings.catch_warnings():
            warnings.simplefilter("error", SyntaxWarning)
            try:
                compile(f.read_text(encoding="utf-8"), str(f), "exec")
            except SyntaxError as e:
                bad.append(f"{f.relative_to(APP.parent)}:{e.lineno} {e.msg}")
    assert bad == []
