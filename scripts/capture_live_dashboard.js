const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '..', '.chrome-temp');

function req(urlPath, method, body, cookie) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, 'https://mastery-key-coach.netlify.app');
    const r = https.request(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d), headers: res.headers }); }
        catch(e) { resolve({ status: res.statusCode, data: d, headers: res.headers }); }
      });
    });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  const ts = Date.now();
  const testUser = {
    email: `dash_verify_${ts}@test.com`,
    username: `dash_verify_${ts}`,
    password: `TestPass123!Safe`,
    full_name: `Dashboard QA User`
  };

  console.log('Registering test user for browser verification...');
  const reg = await req('/api/auth/register', 'POST', testUser);
  console.log('Register status:', reg.status);
  const cookieHeader = (reg.headers['set-cookie'] || [])[0];
  const tokenMatch = cookieHeader ? cookieHeader.match(/mkc_session=([^;]+)/) : null;
  const token = tokenMatch ? tokenMatch[1] : null;

  if (!token) {
    console.error('Failed to get session cookie');
    return;
  }
  console.log('Session token acquired successfully.');

  // Launch Chrome headless with debugging port
  const port = 9222;
  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const targets = await getJson(`http://127.0.0.1:${port}/json`);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    console.log('Connecting to page WebSocket:', pageTarget.webSocketDebuggerUrl);

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const res = JSON.parse(event.data);
      if (res.id && callbacks.has(res.id)) {
        const { resolve, reject } = callbacks.get(res.id);
        callbacks.delete(res.id);
        if (res.error) reject(res.error);
        else resolve(res.result);
      }
      if (res.method === 'Runtime.consoleAPICalled') {
        const text = (res.params.args || []).map(a => a.value || a.description || '').join(' ');
        if (res.params.type === 'error') {
          console.error('[Browser Console ERROR]:', text);
        } else if (res.params.type === 'warning') {
          console.warn('[Browser Console WARN]:', text);
        }
      }
      if (res.method === 'Runtime.exceptionThrown') {
        console.error('[Browser Exception]:', res.params.exceptionDetails?.exception?.description || res.params.exceptionDetails?.text);
      }
    };

    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await new Promise(r => (ws.onopen = r));
    console.log('Connected to Chrome DevTools Protocol.');

    await sendCommand('Network.enable');
    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');

    // Set cookie
    await sendCommand('Network.setCookie', {
      name: 'mkc_session',
      value: token,
      domain: 'mastery-key-coach.netlify.app',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax'
    });
    console.log('Injected mkc_session cookie.');

    // Navigate to dashboard
    console.log('Navigating to https://mastery-key-coach.netlify.app/dashboard...');
    await sendCommand('Page.navigate', { url: 'https://mastery-key-coach.netlify.app/dashboard' });

    // Wait 8 seconds to allow all background fetches and timers to run
    console.log('Waiting 8 seconds for data loading and rendering stability...');
    await new Promise(r => setTimeout(r, 8000));

    // Capture screenshot
    const screenshot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');

    const dest = path.join(
      process.env.USERPROFILE,
      '.gemini',
      'antigravity',
      'brain',
      'cdd6c173-2f76-4d70-8b15-e05792da3f06',
      'live_dashboard_screenshot.png'
    );
    fs.writeFileSync(dest, buffer);
    console.log('Saved live dashboard screenshot to:', dest);

    // Check if "Something went wrong" is in the DOM
    const evalRes = await sendCommand('Runtime.evaluate', {
      expression: 'document.body.innerText.includes("Something went wrong")'
    });
    console.log('Did "Something went wrong" render?', evalRes.result.value ? 'YES (CRASH!)' : 'NO (100% HEALTHY!)');

    const evalTitle = await sendCommand('Runtime.evaluate', {
      expression: 'document.querySelector("h1, h2")?.innerText || document.title'
    });
    console.log('Rendered Heading/Title:', evalTitle.result.value);

    ws.close();
  } finally {
    chromeProcess.kill();
    fs.rmSync(userDataDir, { recursive: true, force: true });

    // Clean up test account
    await req('/api/users/account', 'DELETE', null, `mkc_session=${token}`);
    console.log('Cleaned up test user.');
  }
}

main().catch(console.error);
