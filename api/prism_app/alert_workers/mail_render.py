"""Jinja2 email bodies (replaces ``alerting`` EJS)."""

from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TPL = Path(__file__).resolve().parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TPL)),
    autoescape=select_autoescape(["html", "xml", "j2"]),
)


def render_flood_mail(
    *,
    title: str,
    trigger_status: str,
    stations_by_status: dict[str, list[str]],
    redirect_url: str,
) -> tuple[str, str]:
    ctx = {
        "title": title,
        "trigger_status": trigger_status,
        "stations_by_status": stations_by_status,
        "redirect_url": redirect_url,
    }
    html = _env.get_template("flood_alert.html.j2").render(**ctx)
    text = _env.get_template("flood_alert.txt.j2").render(**ctx)
    return html, text


def render_storm_mail(
    *,
    alert_title: str,
    cyclone_name: str,
    cyclone_time: str,
    readiness: bool,
    activated_triggers: dict[str, str] | None,
    redirect_url: str,
) -> tuple[str, str]:
    ctx = {
        "alert_title": alert_title,
        "cyclone_name": cyclone_name,
        "cyclone_time": cyclone_time,
        "readiness": readiness,
        "activated_triggers": activated_triggers,
        "redirect_url": redirect_url,
    }
    html = _env.get_template("storm_alert.html.j2").render(**ctx)
    text = _env.get_template("storm_alert.txt.j2").render(**ctx)
    return html, text
