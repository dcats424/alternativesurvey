async function sendSms(args) {
  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
  const to = args.to;
  const message = args.message;

  if (!to) {
    return { ok: false, provider, skipped: true, reason: 'missing_phone' };
  }

  if (provider === 'mock') {
    console.log('[SMS MOCK]', { to, message });
    return { ok: true, provider: 'mock' };
  }

  if (provider === 'webhook') {
    const webhook = process.env.SMS_WEBHOOK_URL;
    if (!webhook) {
      console.log('[SMS WEBHOOK PLACEHOLDER]', { to, message });
      return { ok: true, provider: 'webhook_placeholder' };
    }

    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (process.env.SMS_API_KEY || '')
      },
      body: JSON.stringify({ to: to, message: message })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error('sms_webhook_failed: ' + text);
    }

    return { ok: true, provider: 'webhook' };
  }

  console.log('[SMS UNKNOWN PROVIDER -> FALLBACK MOCK]', { provider, to, message });
  return { ok: true, provider: 'mock_fallback' };
}

module.exports = { sendSms };
