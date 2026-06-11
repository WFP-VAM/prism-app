"""SMTP sending (parity with ``alerting`` nodemailer + inline CID images)."""

from __future__ import annotations

import logging
import os
import re
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import make_msgid
from typing import Iterable

import httpx

logger = logging.getLogger(__name__)

DEFAULT_HOST = "email-smtp.eu-west-1.amazonaws.com"
_ETHEREAL_HOST = "smtp.ethereal.email"
_DEFAULT_ETHEREAL_WEB = "https://ethereal.email"
_NODEMAILER_USER_API = "https://api.nodemailer.com/user"
_ETHEREAL_REQUESTOR = "prism-app"


def _ethereal_requestor_version() -> str:
    try:
        from importlib.metadata import version

        return version(_ETHEREAL_REQUESTOR)
    except Exception:
        pass
    try:
        import tomllib
        from pathlib import Path

        root = Path(__file__).resolve().parents[2]
        data = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
        return str(data["tool"]["poetry"]["version"])
    except Exception:
        return "0.0.0"


def _parse_ethereal_msgid_from_smtp_reply(repl: bytes) -> str | None:
    """Match Nodemailer ``getTestMessageUrl`` — Ethereal puts ``MSGID`` in the 250 line, not RFC Message-ID."""
    s = repl.decode("utf-8", errors="replace").strip()
    # Multiline reply: bracket block is always last (smtplib joins with ``\\n``).
    bracket = None
    for line in s.split("\n"):
        m = re.search(r"\[([^\]]+)\]\s*$", line.strip())
        if m:
            bracket = m
    if not bracket:
        bracket = re.search(r"\[([^\]]+)\]\s*$", s)
    if not bracket:
        return None
    props: dict[str, str] = {}
    for m in re.finditer(r"\b([A-Z0-9]+)=([^\s]+)", bracket.group(1)):
        props[m.group(1)] = m.group(2)
    if "STATUS" in props and "MSGID" in props:
        return props["MSGID"]
    return None


def _ethereal_preview_url_from_smtp(
    *, web_base: str, smtp_data_reply: bytes | None
) -> str | None:
    if not smtp_data_reply:
        return None
    msgid = _parse_ethereal_msgid_from_smtp_reply(smtp_data_reply)
    if not msgid:
        return None
    return f"{web_base.rstrip('/')}/message/{msgid}"


class _CaptureSmtpDataReplyMixin:
    """Record final ``DATA`` reply so Ethereal ``MSGID`` can be read (see ``nodemailer.getTestMessageUrl``)."""

    last_smtp_data_reply: bytes | None = None

    def data(self, msg):  # type: ignore[no-untyped-def]
        code, repl = super().data(msg)
        self.last_smtp_data_reply = repl
        return code, repl


class CapturingSMTP(_CaptureSmtpDataReplyMixin, smtplib.SMTP):
    pass


class CapturingSMTP_SSL(_CaptureSmtpDataReplyMixin, smtplib.SMTP_SSL):
    pass


def _is_ethereal_host(host: str) -> bool:
    return host.rstrip("/").endswith(_ETHEREAL_HOST)


def create_ethereal_test_account() -> dict:
    """Create disposable inbox via Nodemailer Ethereal API (same payload as ``nodemailer.createTestAccount``)."""
    r = httpx.post(
        _NODEMAILER_USER_API,
        json={
            "requestor": _ETHEREAL_REQUESTOR,
            "version": _ethereal_requestor_version(),
        },
        timeout=30.0,
    )
    r.raise_for_status()
    data = r.json()
    if not isinstance(data, dict):
        raise ValueError("unexpected Ethereal API response")
    if data.get("status") != "success" or data.get("error"):
        raise ValueError(data.get("error") or "Ethereal API request failed")
    if "user" not in data or "smtp" not in data:
        raise ValueError("unexpected Ethereal API response")
    return data


def _log_ethereal_preview(url: str) -> None:
    logger.info("Ethereal message preview: %s", url)
    print(url, flush=True)


def send_email(
    *,
    from_addr: str,
    to_addrs: str | Iterable[str],
    subject: str,
    text_body: str,
    html_body: str | None = None,
    bcc: str | Iterable[str] | None = None,
    attachments: list[dict] | None = None,
) -> None:
    password = os.environ.get("PRISM_ALERTS_EMAIL_PASSWORD")
    user = os.environ.get("PRISM_ALERTS_EMAIL_USER", "")
    host = os.environ.get("PRISM_ALERTS_EMAIL_HOST", DEFAULT_HOST)
    port = int(os.environ.get("PRISM_ALERTS_EMAIL_PORT", "0") or "0")
    use_starttls = os.environ.get("PRISM_ALERTS_EMAIL_STARTTLS", "").lower() in (
        "1",
        "true",
        "yes",
    )

    use_ethereal_auto = os.environ.get("PRISM_ALERTS_USE_ETHEREAL", "").lower() in (
        "1",
        "true",
        "yes",
    )
    ethereal_preview = False
    # Public web UI base for preview links (from API when auto-creating Ethereal inbox).
    ethereal_web = _DEFAULT_ETHEREAL_WEB
    if use_ethereal_auto:
        acc = create_ethereal_test_account()
        user = acc["user"]
        password = acc["pass"]
        smtp_cfg = acc["smtp"]
        host = str(smtp_cfg["host"])
        port = int(smtp_cfg.get("port") or 587)
        use_starttls = not bool(smtp_cfg.get("secure"))
        ethereal_preview = True
        w = acc.get("web")
        if w:
            ethereal_web = str(w).rstrip("/")
        logger.info(
            "Using auto-created Ethereal account (set PRISM_ALERTS_USE_ETHEREAL=0 for real SMTP)",
        )

    if _is_ethereal_host(host) and not ethereal_preview:
        ethereal_preview = True

    if (
        host.rstrip("/").endswith(_ETHEREAL_HOST)
        and not use_starttls
        and port in (0, 465)
    ):
        use_starttls = True
        port = 587
    if not port:
        port = 587 if use_starttls else 465

    to_list = [to_addrs] if isinstance(to_addrs, str) else list(to_addrs)
    bcc_list = [bcc] if isinstance(bcc, str) else list(bcc or []) if bcc else []
    to_list = [a for a in to_list if a]
    bcc_list = [a for a in bcc_list if a]

    root = MIMEMultipart("related")
    root["Message-ID"] = make_msgid()
    root["Subject"] = subject
    root["From"] = from_addr
    if to_list:
        root["To"] = ", ".join(to_list)
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text_body, "plain", "utf-8"))
    if html_body:
        alt.attach(MIMEText(html_body, "html", "utf-8"))
    root.attach(alt)

    if attachments:
        for att in attachments:
            raw: bytes
            if "path" in att:
                with open(att["path"], "rb") as f:
                    raw = f.read()
            elif "content" in att:
                c = att["content"]
                raw = c if isinstance(c, bytes) else bytes(c)
            else:
                continue
            img = MIMEImage(raw, _subtype=att.get("subtype", "png"))
            cid = att["cid"]
            img.add_header("Content-ID", f"<{cid}>")
            img.add_header(
                "Content-Disposition",
                "inline",
                filename=att.get("filename", "img.png"),
            )
            root.attach(img)

    if password and user:
        smtp_cls = (
            (CapturingSMTP if use_starttls else CapturingSMTP_SSL)
            if ethereal_preview
            else (smtplib.SMTP if use_starttls else smtplib.SMTP_SSL)
        )
        if use_starttls:
            with smtp_cls(host, port, timeout=120) as smtp:
                smtp.starttls()
                smtp.login(user, password)
                smtp.send_message(
                    root,
                    from_addr=from_addr,
                    to_addrs=[*to_list, *bcc_list],
                )
                data_reply = getattr(smtp, "last_smtp_data_reply", None)
        else:
            with smtp_cls(host, port, timeout=120) as smtp:
                smtp.login(user, password)
                smtp.send_message(
                    root,
                    from_addr=from_addr,
                    to_addrs=[*to_list, *bcc_list],
                )
                data_reply = getattr(smtp, "last_smtp_data_reply", None)
        logger.debug("Message sent using %s", user)
        if ethereal_preview:
            preview = _ethereal_preview_url_from_smtp(
                web_base=ethereal_web,
                smtp_data_reply=data_reply,
            )
            if preview:
                _log_ethereal_preview(preview)
            else:
                logger.warning(
                    "Ethereal SMTP accepted mail but could not parse MSGID from "
                    "server reply (expected '[STATUS=... MSGID=...]'): %r",
                    data_reply,
                )
        return

    logger.warning(
        "PRISM_ALERTS_EMAIL_USER / PRISM_ALERTS_EMAIL_PASSWORD not set; "
        "skipping outbound mail (dev). For Ethereal, set PRISM_ALERTS_USE_ETHEREAL=true",
    )
