"""
safe_fetch — the one guarded outbound HTTP path for caller-supplied URLs.

WHY THIS EXISTS (2026-07-30, Security & Release Integrity sprint)
----------------------------------------------------------------
Three routes accepted a URL from the caller and fetched it with the server's
own network position:

  * POST /api/ai/extract-document   body.document_url
  * POST /api/docusign/send-envelope body.contract_url
  * GET  /api/lodging/unfurl         ?url=

The server sits inside a private network and (on most hosts) next to a cloud
instance-metadata endpoint. An unguarded fetch turns the backend into a proxy
for the caller: internal admin panels, databases on private IPs, and
169.254.169.254 metadata (which can hand out cloud credentials) all become
reachable. Error text echoed back to the caller turns that into an oracle even
when the body is never returned.

WHAT IS ENFORCED
----------------
  1. https only — no http, file, gopher, data, ftp.
  2. No credentials in the URL (user:pass@host).
  3. Host allowlist, matched STRUCTURALLY on the parsed hostname — never by
     substring. "evil-airbnb.com.attacker.net" does not match "airbnb.com".
  4. Every candidate host is DNS-resolved BEFORE the connect, and every
     resolved address must be a global unicast address. Loopback, private,
     link-local (this covers 169.254.169.254), multicast, reserved and
     unspecified addresses are rejected — for IPv4 and IPv6, including
     IPv4-mapped IPv6 forms.
  5. Redirects are followed MANUALLY and every hop is re-validated against all
     of the above. An allowlisted host cannot 302 the server into the private
     network.
  6. Response size is capped by streaming; the connection is dropped as soon
     as the cap is passed. No unbounded r.content.
  7. Content-Type must be in the caller's expected set.
  8. No caller-supplied headers are ever forwarded upstream, and no
     Authorization header is ever attached to a caller-supplied URL.
  9. Failures raise SafeFetchError with a SHORT, FIXED reason string. Internal
     exception text is logged server-side and never returned to the caller.

KNOWN RESIDUAL RISK — DNS rebinding (TOCTOU)
--------------------------------------------
Validation resolves the name, then httpx resolves it again to connect. A DNS
entry that changes between those two moments could point the connect at an
address the check approved. Closing that fully means pinning the connection to
the validated IP while preserving TLS SNI. We do not do that here. The
practical mitigation is requirement 3: an attacker must already control DNS for
an allowlisted host (our own Supabase project, or airbnb.com / vrbo.com). This
is documented rather than silently assumed — see
docs/security/AI_PROXY_AND_DOCUMENT_FETCH_SECURITY.md.
"""

import ipaddress
import logging
import socket
from typing import Iterable, Optional, Sequence, Tuple
from urllib.parse import urlparse

import httpx

log = logging.getLogger(__name__)

MAX_REDIRECTS = 3
DEFAULT_MAX_BYTES = 10 * 1024 * 1024      # 10 MB — a contract PDF, not a disk image
DEFAULT_TIMEOUT = httpx.Timeout(20.0, connect=5.0)


class SafeFetchError(Exception):
    """A fetch was refused or failed. `reason` is safe to show a caller."""

    def __init__(self, reason: str, status_code: int = 400, upstream_status: Optional[int] = None):
        super().__init__(reason)
        self.reason = reason
        self.status_code = status_code
        # The status the REMOTE host returned, when there was one. Callers use it
        # to write an honest host-facing message (e.g. "the site declined an
        # automated read"). It is never blended into `reason` automatically.
        self.upstream_status = upstream_status


def _ip_is_public(ip: ipaddress._BaseAddress) -> bool:
    """True only for globally routable unicast addresses."""
    # IPv4-mapped / 6to4 / teredo IPv6 forms can smuggle a private IPv4 through
    # an IPv6 check, so unwrap to the embedded v4 address first.
    if isinstance(ip, ipaddress.IPv6Address):
        mapped = ip.ipv4_mapped or getattr(ip, "sixtofour", None) or getattr(ip, "teredo", None)
        if mapped is not None:
            ip = mapped[0] if isinstance(mapped, tuple) else mapped
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local        # 169.254.0.0/16 — cloud instance metadata
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


async def _resolve_all(host: str) -> Sequence[ipaddress._BaseAddress]:
    """Resolve a hostname to every address it currently answers with."""
    try:
        infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
    except Exception as exc:            # NXDOMAIN, timeout, no such host
        log.info("safe_fetch: DNS failure for %s: %s", host, exc)
        raise SafeFetchError("That address could not be resolved.", 400)
    out = []
    for info in infos:
        try:
            out.append(ipaddress.ip_address(info[4][0]))
        except ValueError:
            continue
    if not out:
        raise SafeFetchError("That address could not be resolved.", 400)
    return out


async def validate_url(url: str, allowed_hosts: Iterable[str]) -> Tuple[str, str]:
    """
    Check one URL against every rule. Returns (hostname, normalized_url).
    Raises SafeFetchError with a caller-safe reason.
    """
    allowed = {h.strip().lower() for h in allowed_hosts if h and h.strip()}
    if not allowed:
        # Fail CLOSED. An empty allowlist means the deployment was never
        # configured for document fetch — it must not silently mean "any host".
        raise SafeFetchError("Document fetch is not configured on this server.", 503)

    try:
        p = urlparse(url)
    except Exception:
        raise SafeFetchError("That link could not be read.", 400)

    if p.scheme != "https":
        raise SafeFetchError("Only https links can be read.", 400)
    if p.username or p.password:
        raise SafeFetchError("Links containing credentials are not accepted.", 400)

    host = (p.hostname or "").lower()
    if not host:
        raise SafeFetchError("That link is missing a host.", 400)
    # STRUCTURAL match on the parsed hostname — exact, or a dotted subdomain of
    # an allowed host. Never a substring test.
    if not any(host == a or host.endswith("." + a) for a in allowed):
        raise SafeFetchError("That link is not from an approved source.", 400)

    # A literal IP in the URL is checked directly; a name is resolved first.
    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None
    addresses = [literal] if literal is not None else await _resolve_all(host)

    for ip in addresses:
        if not _ip_is_public(ip):
            log.warning("safe_fetch: BLOCKED non-public address for host=%s", host)
            raise SafeFetchError("That link resolves to a network address that cannot be read.", 400)

    return host, url


async def validate_public_url(url: str) -> Tuple[str, str]:
    """
    Validate a caller-supplied DESTINATION url for an outbound POST.

    Returns (hostname, url). Raises SafeFetchError with a caller-safe reason.

    HOW THIS DIFFERS FROM validate_url, AND WHY IT IS NOT A WEAKENING.
    `validate_url` additionally demands a host ALLOWLIST and fails closed on an
    empty one. That is right for document fetch, where the server reads a URL a
    stranger handed it and only a handful of storage hosts are ever legitimate.

    It is wrong for a webhook destination. A planner's Zapier/Make/n8n/self-hosted
    receiver is legitimately an arbitrary public host, so an allowlist would mean
    the feature is off for everyone until an operator edits an env var — and the
    pressure would then be to widen the list until it means nothing.

    So this keeps every check that actually stops SSRF and drops only the one
    that cannot apply:
      • https only — a webhook body carries event data and must not go plaintext
      • no credentials in the URL
      • the host is resolved and EVERY returned address must be global unicast,
        so loopback, private, link-local (169.254.169.254 cloud metadata),
        multicast and reserved are all refused, including IPv4-mapped IPv6 forms
    The caller must also not follow redirects, or a 302 would move the request to
    an address that was never checked.
    """
    try:
        p = urlparse(url)
    except Exception:
        raise SafeFetchError("That webhook URL could not be read.", 400)

    if p.scheme != "https":
        raise SafeFetchError("A webhook URL must start with https.", 400)
    if p.username or p.password:
        raise SafeFetchError("Webhook URLs containing credentials are not accepted.", 400)

    host = (p.hostname or "").lower()
    if not host:
        raise SafeFetchError("That webhook URL is missing a host.", 400)

    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None
    addresses = [literal] if literal is not None else await _resolve_all(host)

    for ip in addresses:
        if not _ip_is_public(ip):
            log.warning("safe_fetch: BLOCKED non-public webhook destination host=%s", host)
            raise SafeFetchError(
                "That webhook URL points at an address on this server's own network.", 400
            )

    return host, url


async def safe_get(
    url: str,
    *,
    allowed_hosts: Iterable[str],
    allowed_content_types: Sequence[str],
    max_bytes: int = DEFAULT_MAX_BYTES,
    timeout: httpx.Timeout = DEFAULT_TIMEOUT,
    user_agent: Optional[str] = None,
    truncate_at_max: bool = False,
) -> Tuple[bytes, str, str]:
    """
    Fetch a caller-supplied URL under every guard above.
    Returns (body_bytes, content_type, final_url).

    `truncate_at_max` decides what an oversized document MEANS to the caller.

    Default (False) is refusal, and that is right for anything that has to be
    whole: a truncated JSON body is not small JSON, it is corrupt JSON.

    True returns the first max_bytes and stops. Opt in only where a PREFIX is
    genuinely useful — HTML we read <head> metadata out of. The byte ceiling is
    identical either way: we stop reading and close the connection at the same
    point, so this weakens no limit. It only stops us throwing away bytes we
    already have and could use.
    """
    current = url
    # Only headers WE choose are ever sent. Nothing from the caller is forwarded,
    # and no Authorization/cookie header is ever attached to a caller URL.
    headers = {"Accept": ", ".join(allowed_content_types) or "*/*"}
    if user_agent:
        headers["User-Agent"] = user_agent

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for _ in range(MAX_REDIRECTS + 1):
            await validate_url(current, allowed_hosts)   # re-validated EVERY hop
            try:
                req = client.build_request("GET", current, headers=headers)
                resp = await client.send(req, stream=True)
            except SafeFetchError:
                raise
            except httpx.TimeoutException:
                # Distinct from a transport failure so callers can say "too slow"
                # rather than "unreachable". Carries no internal detail either.
                log.info("safe_fetch: timeout for %s", current)
                raise SafeFetchError("That link took too long to answer.", 504)
            except Exception as exc:
                log.info("safe_fetch: transport failure for %s: %s", current, exc)
                raise SafeFetchError("That link could not be reached.", 502)

            try:
                if resp.is_redirect:
                    location = resp.headers.get("location")
                    if not location:
                        raise SafeFetchError("That link could not be followed.", 400)
                    current = str(httpx.URL(current).join(location))
                    continue

                if resp.status_code >= 400:
                    log.info("safe_fetch: upstream %s for %s", resp.status_code, current)
                    raise SafeFetchError(
                        "That link could not be read.", 400, upstream_status=resp.status_code
                    )

                ctype = (resp.headers.get("content-type") or "").split(";")[0].strip().lower()
                if allowed_content_types and ctype not in allowed_content_types:
                    raise SafeFetchError("That link is not a supported document type.", 400)

                # Declared length is a hint we can reject early; the streamed cap
                # below is the real enforcement (a lying/absent header can't bypass it).
                declared = resp.headers.get("content-length")
                if declared and declared.isdigit() and int(declared) > max_bytes:
                    if not truncate_at_max:
                        raise SafeFetchError("That document is too large to read.", 400)

                chunks, total = [], 0
                async for chunk in resp.aiter_bytes():
                    total += len(chunk)
                    if total > max_bytes:
                        if not truncate_at_max:
                            raise SafeFetchError("That document is too large to read.", 400)
                        # Keep the head of the final chunk, then stop reading.
                        keep = max_bytes - (total - len(chunk))
                        if keep > 0:
                            chunks.append(chunk[:keep])
                        break
                    chunks.append(chunk)
                return b"".join(chunks), ctype, current
            finally:
                await resp.aclose()

    raise SafeFetchError("That link redirected too many times.", 400)


def storage_allowed_hosts(extra: Optional[str] = None) -> list:
    """
    The allowlist for planner documents: the deployment's own Supabase Storage
    host, plus anything explicitly named in DOCUMENT_FETCH_ALLOWED_HOSTS.
    Returns [] when nothing is configured, which makes validate_url fail closed.
    """
    import os
    from .config import SUPABASE_URL

    hosts = []
    if SUPABASE_URL:
        h = (urlparse(SUPABASE_URL).hostname or "").lower()
        if h:
            hosts.append(h)
    raw = extra if extra is not None else os.environ.get("DOCUMENT_FETCH_ALLOWED_HOSTS", "")
    hosts.extend(x.strip().lower() for x in raw.split(",") if x.strip())
    return hosts
