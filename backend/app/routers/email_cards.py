"""The picture at the top of every email the app sends (owner, 11/20/2026: "Do
picture for all emails"). Drawn and stored at send time by
app/email_pictures.py; this serves it to the recipient's mail app.

  GET /api/public/email-card/{token}   public; the picture, by its token only.

  - The token is 32 lowercase hex characters (128 random bits) minted for one
    picture. Any other shape is a plain 404 before storage is asked. There is
    no other way in: never by event id, never by a guest or an address.
  - Read from the private guest-photos bucket under email-cards/ with the
    service role, as routers/invite_cards.py reads an invite card.
  - Cache headers as the invite card's: a token names one picture forever.
"""
from fastapi import APIRouter, HTTPException, Response

from .. import email_pictures as ep

router = APIRouter(tags=["email-cards"])


@router.get("/api/public/email-card/{token}")
async def public_email_card(token: str):
    if not ep.TOKEN.match(token or "") or not ep._storage_configured():
        raise HTTPException(404, "not found")
    data = await ep._get(ep.card_path(token))
    if not data:
        raise HTTPException(404, "not found")
    return Response(content=data, media_type="image/jpeg",
                    headers={"Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff"})
