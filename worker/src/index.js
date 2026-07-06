/**
 * WAVE Support — Email Worker
 * 接收前端送來的計畫書內容，透過 SendGrid 寄一封漂亮的 HTML 信給用戶，
 * 若有附上視覺版 PDF（base64）就當附件寄出。
 *
 * 需要設定的環境變數 / secret：
 *   SENDGRID_API_KEY (secret)  — SendGrid 的 API key，用 `wrangler secret put SENDGRID_API_KEY`
 *   FROM_EMAIL       (var)     — 寄件人 email，例如 "plans@oceandoula.com"（網域需在 SendGrid 完成 Domain Authentication）
 *   FROM_NAME        (var)     — 寄件人顯示名稱，例如 "WAVE Support"
 *   REPLY_TO         (var)     — 選填，回信信箱，例如 "hello@oceandoula.com"
 *   ALLOWED_ORIGIN   (var)     — 允許呼叫的來源，例如 "https://oceandoula.github.io"
 */

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400, cors); }

    const name = (body.name || '').toString().slice(0, 100);
    const email = (body.email || '').toString().trim();
    const planHtml = (body.planHtml || '').toString();
    const pdfBase64 = (body.pdfBase64 || '').toString();
    const isEN = body.lang === 'en';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email' }, 400, cors);
    }
    if (!planHtml) return json({ error: 'Missing plan content' }, 400, cors);
    // 粗略上限保護，避免超大 payload
    if (planHtml.length > 200000) return json({ error: 'Plan too large' }, 413, cors);
    if (pdfBase64 && pdfBase64.length > 8000000) {
      return json({ error: 'PDF attachment too large' }, 413, cors);
    }

    // SendGrid v3 mail/send payload
    const payload = {
      personalizations: [{ to: [{ email, name: name || undefined }] }],
      from: {
        email: env.FROM_EMAIL || 'plans@oceandoula.com',
        name: env.FROM_NAME || 'WAVE Support',
      },
      subject: isEN ? 'Your WAVE Birth Plan 🌊' : '妳的 WAVE 生產計畫書 🌊',
      content: [{ type: 'text/html', value: buildEmail({ name, planHtml, isEN }) }],
    };
    if (env.REPLY_TO) payload.reply_to = { email: env.REPLY_TO };
    if (pdfBase64) {
      payload.attachments = [{
        content: pdfBase64, // base64 字串（無 data: 前綴）
        filename: isEN ? 'WAVE-Birth-Plan.pdf' : 'WAVE_生產計畫書.pdf',
        type: 'application/pdf',
        disposition: 'attachment',
      }];
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // SendGrid 成功回 202（無內容）
    if (res.status !== 202) {
      const detail = await res.text();
      return json({ error: 'Send failed', detail }, 502, cors);
    }
    return json({ ok: true }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

/** 把段落式計畫書包進 Ocean Doula 品牌信件模板 */
function buildEmail({ name, planHtml, isEN }) {
  const greeting = name
    ? (isEN ? `Hi ${escapeHtml(name)},` : `${escapeHtml(name)} 妳好，`)
    : (isEN ? 'Hi there,' : '妳好，');
  const intro = isEN
    ? 'Here is the birth plan you created with WAVE. Feel free to print it or share it with your care team.'
    : '這是妳用 WAVE 完成的生產計畫書。妳可以列印出來，或直接分享給醫療團隊。';
  const footer = isEN
    ? 'With love, Ocean Doula · oceandoula.com'
    : '溫柔陪伴妳，Ocean Doula · oceandoula.com';

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF8F3;font-family:'Noto Sans TC',-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0B3D45;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F3;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,61,69,.08);">
        <tr><td style="background:#0B3D45;padding:28px 32px;">
          <div style="color:#A8D5D1;font-size:13px;letter-spacing:2px;font-weight:600;">WAVE SUPPORT</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:4px;">${isEN ? 'Your Birth Plan' : '妳的生產計畫書'}</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:15px;line-height:1.7;margin:0 0 8px;">${greeting}</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#1A6B72;">${intro}</p>
          <div style="border-top:2px solid #E8F4F1;padding-top:24px;font-size:15px;line-height:1.8;">
            ${planHtml}
          </div>
        </td></tr>
        <tr><td style="background:#E8F4F1;padding:20px 32px;text-align:center;">
          <p style="font-size:13px;color:#1A6B72;margin:0;">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
