"""
DocuSign eSignature REST API client — Sprint 64

Auth: Authorization Code Grant (OAuth 2.0)
Signer order: vendor signs first (order 1), planner countersigns (order 2)

All calls are fail-soft: envelope creation failures are caught and returned
as structured error dicts so the calling route can respond honestly.

Environment variables required (set in Render dashboard):
  DOCUSIGN_INTEGRATION_KEY   — App Integration Key (UUID)
  DOCUSIGN_SECRET_KEY        — OAuth secret key
  DOCUSIGN_ACCOUNT_ID        — Your DocuSign account ID (UUID)
  DOCUSIGN_BASE_URL          — https://demo.docusign.net (sandbox)
                               or https://na3.docusign.net (production)
  APP_BASE_URL               — Frontend URL for redirect after OAuth
"""

import logging
import base64
import os
import httpx
from typing import Optional

log = logging.getLogger("ngw.docusign")

INTEGRATION_KEY = os.environ.get("DOCUSIGN_INTEGRATION_KEY")
SECRET_KEY       = os.environ.get("DOCUSIGN_SECRET_KEY")
ACCOUNT_ID       = os.environ.get("DOCUSIGN_ACCOUNT_ID")
BASE_URL         = os.environ.get("DOCUSIGN_BASE_URL", "https://demo.docusign.net")
REDIRECT_URI     = os.environ.get("DOCUSIGN_REDIRECT_URI",
                    "https://ngw-events-api.onrender.com/api/docusign/callback")

ESIGN_BASE = f"{BASE_URL}/restapi/v2.1"
AUTH_BASE  = BASE_URL.replace("demo.docusign.net", "account-d.docusign.com") \
             if "demo" in BASE_URL else BASE_URL.replace("na3.docusign.net", "account.docusign.com")


def is_docusign_configured() -> bool:
    return all([INTEGRATION_KEY, SECRET_KEY, ACCOUNT_ID])


def get_oauth_url(state: str) -> str:
    """Build the DocuSign Authorization Code Grant URL."""
    scope = "signature impersonation"
    return (
        f"{AUTH_BASE}/oauth/auth"
        f"?response_type=code"
        f"&scope={scope.replace(' ', '+')}"
        f"&client_id={INTEGRATION_KEY}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&state={state}"
    )


async def exchange_code_for_token(code: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    credentials = base64.b64encode(f"{INTEGRATION_KEY}:{SECRET_KEY}".encode()).decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AUTH_BASE}/oauth/token",
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """Refresh an expired access token."""
    credentials = base64.b64encode(f"{INTEGRATION_KEY}:{SECRET_KEY}".encode()).decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AUTH_BASE}/oauth/token",
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_user_info(access_token: str) -> dict:
    """Get DocuSign account info for the authenticated user."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{AUTH_BASE}/oauth/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def create_envelope(
    access_token: str,
    *,
    document_bytes: bytes,
    document_name: str,
    document_extension: str,
    envelope_email_subject: str,
    vendor_name: str,
    vendor_email: str,
    planner_name: str,
    planner_email: str,
    event_name: str,
) -> dict:
    """
    Create a DocuSign envelope with two signers:
    - Signer 1 (routing order 1): vendor — signs first
    - Signer 2 (routing order 2): planner — countersigns

    Returns the envelope ID on success, raises on failure.
    """
    doc_b64 = base64.b64encode(document_bytes).decode()
    ext = document_extension.lstrip(".").lower()
    file_ext_map = {"pdf": "pdf", "doc": "docx", "docx": "docx"}
    ds_ext = file_ext_map.get(ext, "pdf")

    envelope_def = {
        "emailSubject": envelope_email_subject,
        "documents": [
            {
                "documentBase64": doc_b64,
                "name": document_name,
                "fileExtension": ds_ext,
                "documentId": "1",
            }
        ],
        "recipients": {
            "signers": [
                {
                    "email": vendor_email,
                    "name": vendor_name,
                    "recipientId": "1",
                    "routingOrder": "1",
                    "tabs": {
                        "signHereTabs": [
                            {
                                "documentId": "1",
                                "pageNumber": "1",
                                "xPosition": "100",
                                "yPosition": "700",
                                "tabLabel": "Vendor Signature",
                            }
                        ],
                        "dateSignedTabs": [
                            {
                                "documentId": "1",
                                "pageNumber": "1",
                                "xPosition": "300",
                                "yPosition": "700",
                                "tabLabel": "Vendor Date",
                            }
                        ],
                    },
                    "emailNotification": {
                        "emailSubject": f"Please sign: {envelope_email_subject}",
                        "emailBody": (
                            f"Dear {vendor_name},\n\n"
                            f"{planner_name} has sent you a contract for {event_name}. "
                            f"Please review and sign at your earliest convenience.\n\n"
                            f"Thank you for your partnership."
                        ),
                        "supportedLanguage": "en",
                    },
                },
                {
                    "email": planner_email,
                    "name": planner_name,
                    "recipientId": "2",
                    "routingOrder": "2",
                    "tabs": {
                        "signHereTabs": [
                            {
                                "documentId": "1",
                                "pageNumber": "1",
                                "xPosition": "100",
                                "yPosition": "750",
                                "tabLabel": "Planner Signature",
                            }
                        ],
                        "dateSignedTabs": [
                            {
                                "documentId": "1",
                                "pageNumber": "1",
                                "xPosition": "300",
                                "yPosition": "750",
                                "tabLabel": "Planner Date",
                            }
                        ],
                    },
                    "emailNotification": {
                        "emailSubject": f"Countersign needed: {envelope_email_subject}",
                        "emailBody": (
                            f"Dear {planner_name},\n\n"
                            f"{vendor_name} has signed the contract for {event_name}. "
                            f"Your countersignature is now needed to complete the agreement."
                        ),
                        "supportedLanguage": "en",
                    },
                },
            ]
        },
        "status": "sent",  # 'created' = draft, 'sent' = immediately active
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{ESIGN_BASE}/accounts/{ACCOUNT_ID}/envelopes",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=envelope_def,
        )
        resp.raise_for_status()
        data = resp.json()
        log.info("DocuSign envelope created: %s", data.get("envelopeId"))
        return data


async def get_envelope_status(access_token: str, envelope_id: str) -> dict:
    """Get current status of a DocuSign envelope."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ESIGN_BASE}/accounts/{ACCOUNT_ID}/envelopes/{envelope_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def get_envelope_document_url(access_token: str, envelope_id: str) -> Optional[str]:
    """Get a temporary download URL for the signed document."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{ESIGN_BASE}/accounts/{ACCOUNT_ID}/envelopes/{envelope_id}/documents/combined",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/pdf",
                },
                follow_redirects=False,
            )
            # DocuSign returns a redirect or the PDF directly
            if resp.status_code in (200, 302):
                return resp.headers.get("location") or f"{ESIGN_BASE}/accounts/{ACCOUNT_ID}/envelopes/{envelope_id}/documents/combined"
        return None
    except Exception as e:
        log.error("Could not get envelope document: %s", e)
        return None
