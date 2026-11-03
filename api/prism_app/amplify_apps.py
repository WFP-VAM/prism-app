"""PRISM Amplify app ids.

Default hostnames are ``{branch}.{app_id}.amplifyapp.com``. Country keys are
labels for reviewers; allowlist matching uses the app id only.

Add an entry when a new Amplify app is created. The API deploys on merge.
Source: frontend deploy script (Amit Wadhwa, 2026-11).
"""

from typing import Final

AMPLIFY_APPS: Final[dict[str, str]] = {
    "afghanistan": "d3rltpbq0fyljk",
    "bhutan": "dweuw5nfjpcns",
    "cambodia": "d28gdhqlibsl20",
    "colombia": "d7tkjmzt6jq5o",
    "global": "dkst8jmmpydtp",
    "honduras": "d1xqvx8hnyxahr",
    "jordan": "d141seilg28x86",
    "kyrgyzstan": "d7kap759re40a",
    "lka": "d2mmxorgix2pzx",
    "malawi": "d27zw5yecfcw25",
    "mozambique": "dkr9o3t8h8nvn",
    "myanmar": "d9os8651l510p",
    "rbd": "d22me71owg663r",
    "somalia": "d3751kz7vs7gzk",
    "sudan": "dnlzkp6956kr2",
    "tanzania": "d1nngr9o5p27li",
    "zambia": "d373y8evtzjcbf",
    "zimbabwe": "dsqr7eefkaq21",
}

AMPLIFY_APP_DOMAIN_PATTERNS: Final[list[str]] = [
    f"*.{app_id}.amplifyapp.com" for app_id in AMPLIFY_APPS.values()
]
