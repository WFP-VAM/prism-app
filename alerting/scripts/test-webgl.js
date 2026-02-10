// Simple iterative WebGL diagnostics for Puppeteer inside the alerting container.
// Run with:
//   docker compose run --rm --entrypoint "node scripts/test-webgl.js" alerting-node

/* eslint-disable no-console */

const puppeteer = require('puppeteer');

const BASIC_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--window-size=1920,1080',
];

const CONFIGS = [
  {
    name: 'headless:true, basic args',
    launch: { headless: true, args: BASIC_ARGS },
  },
  {
    name: 'headless:true, use-gl=swiftshader',
    launch: {
      headless: true,
      args: [...BASIC_ARGS, '--use-gl=swiftshader', '--ignore-gpu-blacklist'],
    },
  },
  {
    name: 'headless:true, use-gl=egl + enable-webgl',
    launch: {
      headless: true,
      args: [
        ...BASIC_ARGS,
        '--use-gl=egl',
        '--enable-webgl',
        '--ignore-gpu-blacklist',
      ],
    },
  },
  {
    name: 'headless:"new", basic args',
    launch: {
      headless: 'new',
      args: BASIC_ARGS,
    },
  },
  {
    name: 'headless:false, basic args (requires X / Xvfb)',
    launch: {
      headless: false,
      args: BASIC_ARGS,
    },
  },
];

async function checkWebGLWithConfig(config) {
  console.log('\n==============================================');
  console.log(`Testing config: ${config.name}`);
  console.log('Launch options:', JSON.stringify(config.launch, null, 2));

  let browser;
  try {
    browser = await puppeteer.launch(config.launch);
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });

    // Minimal HTML with a canvas
    await page.goto(
      'data:text/html,<html><body><canvas id="c"></canvas></body></html>',
      {
        waitUntil: 'load',
        timeout: 60000,
      },
    );

    const result = await page.evaluate(() => {
      const ua = navigator.userAgent;
      const canvas =
        document.getElementById('c') || document.createElement('canvas');
      const contexts = {};

      function tryCtx(name) {
        try {
          const gl = canvas.getContext(name);
          if (!gl) return null;
          const info = {};
          try {
            info.version = gl.getParameter(gl.VERSION);
            info.renderer = gl.getParameter(gl.RENDERER);
            info.vendor = gl.getParameter(gl.VENDOR);
          } catch (e) {
            info.error = String(e);
          }
          return info;
        } catch (e) {
          return { error: String(e) };
        }
      }

      contexts.webgl = tryCtx('webgl');
      contexts.webgl2 = tryCtx('webgl2');
      contexts.experimentalWebgl = tryCtx('experimental-webgl');

      return { userAgent: ua, contexts };
    });

    console.log('User agent:', result.userAgent);
    console.log('WebGL contexts:');
    console.dir(result.contexts, { depth: null });

    const anyOk = Object.values(result.contexts).some(
      (ctx) => ctx && !ctx.error,
    );
    console.log(
      `=> WebGL available with this config? ${anyOk ? 'YES' : 'NO'}`,
    );

    await browser.close();
    return anyOk;
  } catch (e) {
    console.error('Error for config:', config.name);
    console.error(e && e.stack ? e.stack : e);
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
    return false;
  }
}

(async () => {
  console.log('Starting iterative WebGL diagnostics...\n');
  let successConfig = null;

  for (const cfg of CONFIGS) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await checkWebGLWithConfig(cfg);
    if (ok && !successConfig) {
      successConfig = cfg.name;
    }
  }

  console.log('\n==============================================');
  if (successConfig) {
    console.log(
      `At least one configuration reported WebGL available: "${successConfig}"`,
    );
    process.exit(0);
  } else {
    console.log('No configuration reported working WebGL.');
    process.exit(1);
  }
})();

