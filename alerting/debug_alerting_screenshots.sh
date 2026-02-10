#!/usr/bin/env bash
set -euo pipefail

echo "===== BASIC SYSTEM INFO ====="
date
uname -a || true

echo
echo "===== DOCKER / NODE ====="
docker --version || echo "docker not found"
node -v || echo "node not found on host (ok if only inside container)"

echo
echo "===== ALERTING DIR CHECK ====="
ALERTING_DIR="$HOME/prism-app/alerting"
echo "Using ALERTING_DIR=$ALERTING_DIR"
if [ ! -d "$ALERTING_DIR" ]; then
  echo "ERROR: $ALERTING_DIR does not exist"
  exit 1
fi
cd "$ALERTING_DIR"

echo
echo "===== CRON ENTRIES FOR STORM SCRIPT (LAST 20) ====="
if [ -f /var/log/syslog ]; then
  sudo grep 'cron_aa_storm_alert_run.sh' /var/log/syslog | tail -20 || echo "No recent cron entries for storm script"
else
  echo "/var/log/syslog not found"
fi

echo
echo "===== CRON SCRIPTS PERMISSIONS ====="
ls -la "$ALERTING_DIR/crons"

echo
echo "===== LAST 50 LINES OF STORM WORKER LOG ====="
STORM_LOG="$ALERTING_DIR/aa_storm_alert_worker.log"
if [ -f "$STORM_LOG" ]; then
  tail -50 "$STORM_LOG"
else
  echo "Storm log not found at $STORM_LOG"
fi

echo
echo "===== DOCKER COMPOSE CONFIG (ALERTING) ====="
docker compose config | sed -n '1,80p' || echo "docker compose config failed"

echo
echo "===== MINIMAL PUPPETEER WEBGL TEST INSIDE CONTAINER ====="
docker compose run --rm --entrypoint "node" alerting-node <<'EOF'
const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Starting minimal Puppeteer WebGL test...');

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--use-gl=swiftshader',
        '--ignore-gpu-blacklist',
        '--window-size=1920,1080',
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });

    // Simple blank page; we only care about WebGL capability
    await page.goto('data:text/html,<html><body><canvas id="c"></canvas></body></html>', {
      waitUntil: 'load',
      timeout: 60000,
    });

    const webglSupport = await page.evaluate(() => {
      const canvas = document.getElementById('c') || document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl') ||
        canvas.getContext('webgl2');
      return !!gl;
    });

    console.log('Puppeteer WebGL support inside container:', webglSupport);

    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('Error in minimal Puppeteer WebGL test:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
EOF

echo
echo "===== DONE ====="

