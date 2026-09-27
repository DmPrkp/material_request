/**
 * Обёртка письма. Стили только inline: почтовые клиенты (в первую очередь Gmail и
 * mail.ru) вырезают <style> из <head>, и вёрстка разъезжается.
 *
 * Ширина ограничена 560px и таблицей, а не флексом: Outlook рисует письма движком Word,
 * современную раскладку он не понимает.
 */
export type Layout = {
  title: string;
  greeting: string;
  lead: string;
  buttonLabel: string;
  link: string;
  note: string;
  footer: string;
  /** Подпись приложения внизу письма — чтобы было видно, от кого оно. */
  brand: string;
};

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  );

export function renderHtml(parts: Layout): string {
  const e = escapeHtml;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${e(parts.title)}</title></head>
<body style="margin:0;padding:24px 0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;border-collapse:collapse;background:#ffffff;border-radius:8px;">
<tr><td style="padding:32px 32px 8px;font:600 20px/1.3 Arial,sans-serif;color:#18181b;">${e(parts.greeting)}</td></tr>
<tr><td style="padding:8px 32px;font:400 15px/1.5 Arial,sans-serif;color:#3f3f46;">${e(parts.lead)}</td></tr>
<tr><td style="padding:16px 32px 8px;">
  <a href="${e(parts.link)}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#ffffff;font:600 15px/1 Arial,sans-serif;text-decoration:none;border-radius:6px;">${e(parts.buttonLabel)}</a>
</td></tr>
<tr><td style="padding:8px 32px;font:400 13px/1.5 Arial,sans-serif;color:#71717a;word-break:break-all;">${e(parts.link)}</td></tr>
<tr><td style="padding:16px 32px 8px;font:400 13px/1.5 Arial,sans-serif;color:#71717a;border-top:1px solid #e4e4e7;">${e(parts.note)}<br>${e(parts.footer)}</td></tr>
<tr><td style="padding:0 32px 32px;font:400 12px/1.5 Arial,sans-serif;color:#a1a1aa;">${e(parts.brand)}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Текстовая версия обязательна: без неё письмо заметно чаще уезжает в спам. */
export function renderText(parts: Layout): string {
  return `${parts.greeting}

${parts.lead}

${parts.link}

${parts.note}
${parts.footer}

${parts.brand}
`;
}
