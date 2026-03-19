const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qr = require('qrcode');
const fs = require('fs');

let client = null;
let ready = false;

function pickExecutablePath() {
  const explicit =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    process.env.CHROMIUM_PATH;
  if (explicit && fs.existsSync(String(explicit))) return String(explicit);

  // Common Linux paths (Ubuntu/Debian)
  const candidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function startWhatsApp() {
  if (client) return client;

  const executablePath = pickExecutablePath();
  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'fuel-pass-gov' }),
    puppeteer: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--single-process',
      ],
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    },
  });

  client.on('qr', (qr) => {
    // eslint-disable-next-line no-console
    console.log('\n[WhatsApp] Scan this QR code to connect:\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    ready = true;
    // eslint-disable-next-line no-console
    console.log('[WhatsApp] Client is ready.');
  });

  client.on('disconnected', (reason) => {
    ready = false;
    // eslint-disable-next-line no-console
    console.log('[WhatsApp] Disconnected:', reason);
  });

  client.initialize().catch((err) => {
    ready = false;
    client = null;
    // eslint-disable-next-line no-console
    console.error('[WhatsApp] Initialization failed (server continues without WhatsApp):', err.message || err);
    // eslint-disable-next-line no-console
    console.error(
      '[WhatsApp] Ubuntu fix: install Chromium/Chrome and dependencies, or run with DISABLE_WHATSAPP=1. ' +
      'Optional: set CHROME_PATH or PUPPETEER_EXECUTABLE_PATH to your browser binary.'
    );
  });
  return client;
}

function isReady() {
  return ready;
}

function phone07ToWhatsAppId(phone07) {
  // 07XXXXXXXX -> 94XXXXXXXXX@c.us
  const p = String(phone07 || '').trim();
  if (!/^07\d{8}$/.test(p)) return null;
  return `94${p.slice(1)}@c.us`;
}

async function sendOtpWhatsApp(phone07, otp) {
  if (!client) throw new Error('WhatsApp client not started');
  if (!ready) throw new Error('WhatsApp client not ready');
  const wid = phone07ToWhatsAppId(phone07);
  if (!wid) throw new Error('Invalid phone format (needs 07XXXXXXXX)');

  const message =
    `Fuel Quota System OTP: ${otp}\n` +
    `This OTP expires in 5 minutes.\n` +
    `Do not share this code with anyone.`;

  await client.sendMessage(wid, message);
}

async function sendQrImageWhatsApp(phone07, qrText, caption) {
  if (!client) throw new Error('WhatsApp client not started');
  if (!ready) throw new Error('WhatsApp client not ready');
  const wid = phone07ToWhatsAppId(phone07);
  if (!wid) throw new Error('Invalid phone format (needs 07XXXXXXXX)');

  const dataUrl = await qr.toDataURL(String(qrText || ''), {
    type: 'image/png',
    width: 768,
    margin: 2,
    errorCorrectionLevel: 'H',
  });

  const base64 = String(dataUrl).split(',')[1] || '';
  if (!base64) throw new Error('Failed to generate QR image');

  const media = new MessageMedia('image/png', base64, 'fuel-quota-qr.png');
  await client.sendMessage(wid, media, { caption: caption ? String(caption) : undefined });
}

async function sendTextWhatsApp(phone07, message) {
  if (!client) throw new Error('WhatsApp client not started');
  if (!ready) throw new Error('WhatsApp client not ready');
  const wid = phone07ToWhatsAppId(phone07);
  if (!wid) throw new Error('Invalid phone format (needs 07XXXXXXXX)');
  await client.sendMessage(wid, String(message || ''));
}

module.exports = {
  startWhatsApp,
  isReady,
  sendOtpWhatsApp,
  sendQrImageWhatsApp,
  sendTextWhatsApp,
  phone07ToWhatsAppId,
};

