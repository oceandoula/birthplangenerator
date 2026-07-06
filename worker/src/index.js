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
    const isEN = body.lang === 'en';

    // 前端傳來的附件清單：[{ filename, type, content(base64) }, ...]（PDF + PNG）
    // 舊版前端（快取）可能還是傳單一 pdfBase64，這裡一起相容。
    let attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 12) : [];
    if (body.pdfBase64) {
      attachments.push({
        filename: isEN ? 'WAVE-Birth-Plan.pdf' : 'WAVE_生產計畫書.pdf',
        type: 'application/pdf',
        content: body.pdfBase64.toString(),
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email' }, 400, cors);
    }
    if (!planHtml) return json({ error: 'Missing plan content' }, 400, cors);
    // 粗略上限保護，避免超大 payload
    if (planHtml.length > 200000) return json({ error: 'Plan too large' }, 413, cors);
    let attachTotal = 0;
    for (const a of attachments) attachTotal += (a && a.content ? a.content.length : 0);
    if (attachTotal > 25000000) return json({ error: 'Attachments too large' }, 413, cors);

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

    // A. 每封計畫書密件副本給自己（BCC_EMAIL 設在 wrangler.toml）
    // SendGrid 不允許 to 和 bcc 同一個地址，所以自己測試時要跳過
    if (env.BCC_EMAIL && env.BCC_EMAIL.toLowerCase() !== email.toLowerCase()) {
      payload.personalizations[0].bcc = [{ email: env.BCC_EMAIL }];
    }

    const cleanAttachments = attachments
      .filter((a) => a && a.content && a.filename)
      .map((a) => ({
        content: a.content.toString(),
        filename: a.filename.toString(),
        type: (a.type || 'application/octet-stream').toString(),
        disposition: 'attachment',
      }));
    if (cleanAttachments.length) payload.attachments = cleanAttachments;

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

    // B. 寫入 D1 資料庫（誰、何時、語言、內容）。
    // 用 try/catch 包住：記錄失敗絕不影響寄信成功的回應。
    if (env.DB) {
      try {
        await env.DB.prepare(
          'INSERT INTO plans (name, email, lang, plan_html, attachments) VALUES (?1, ?2, ?3, ?4, ?5)'
        ).bind(name, email, isEN ? 'en' : 'zh', planHtml, cleanAttachments.length).run();
      } catch (e) {
        console.log('D1 insert failed:', e.message);
      }
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

  // ── 回饋區：五星（連到預填 Google 表單）+ 簡短問題 ──
  const formId = isEN
    ? '1FAIpQLSecFLWo4F89NUffi5nmer6nEYO65x16HBbtI8tP54MYiKfxVg'
    : '1FAIpQLSfXL5ktgF0fTI38a63bakLJAIcF_Z9L6yXU4jUs9vMfzwXQnA';
  const formBase = `https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url&entry.785284528=`;
  const stars = [1, 2, 3, 4, 5].map((n) =>
    `<a href="${formBase}${n}" target="_blank" style="text-decoration:none;font-size:34px;color:#D98E5C;line-height:1;margin:0 3px;">&#9733;</a>`
  ).join('');
  const rateTitle = isEN ? 'How was your WAVE experience?' : '喜歡妳的 WAVE 計畫書嗎？';
  const rateSub = isEN
    ? 'Tap a star — then tell us what you loved most and who you would recommend WAVE to. Takes 30 seconds 💛'
    : '點顆星，順便告訴我：妳最喜歡哪個部分？會推薦給誰？只要 30 秒 💛';

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
        <tr><td style="padding:0 32px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F3;border-radius:12px;">
            <tr><td style="padding:22px 24px;text-align:center;">
              <div style="font-size:16px;font-weight:700;color:#0B3D45;margin-bottom:4px;">${rateTitle}</div>
              <div style="font-size:13px;color:#1A6B72;line-height:1.6;margin-bottom:12px;">${rateSub}</div>
              <div style="white-space:nowrap;">${stars}</div>
            </td></tr>
          </table>
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
