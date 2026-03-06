// Shared email HTML layout for ViaHub transactional emails

export function buildEmailHtml({
  title,
  body,
  ctaText,
  ctaUrl,
  showFooter = true,
}: {
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  showFooter?: boolean;
}): string {
  const cta = ctaText && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0">
        <tr><td align="center" style="border-radius:6px;background:#2563EB">
          <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px">${ctaText}</a>
        </td></tr>
       </table>`
    : "";

  const footer = showFooter
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px">
        <tr><td align="center" style="padding:24px 20px;border-top:1px solid #E5E7EB">
          <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;font-family:Inter,Arial,sans-serif">
            ViaHub — powered by Maralto Tecnologia<br/>
            CNPJ: 00.000.000/0001-00
          </p>
          <p style="margin:0;font-size:12px;color:#9CA3AF;font-family:Inter,Arial,sans-serif">
            <a href="https://viahub.app/termos" style="color:#6B7280;text-decoration:underline">Termos de Uso</a> · 
            <a href="https://viahub.app/privacidade" style="color:#6B7280;text-decoration:underline">Política de Privacidade</a>
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;font-family:Inter,Arial,sans-serif">
            Dúvidas? <a href="mailto:suporte@viahub.app" style="color:#2563EB;text-decoration:none">suporte@viahub.app</a>
          </p>
        </td></tr>
       </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:Inter,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:#1E3A5F;padding:24px;text-align:center">
          <span style="font-size:24px;font-weight:800;color:#ffffff;font-family:Inter,Arial,sans-serif;letter-spacing:-0.5px">Via<span style="font-weight:900">Hub</span></span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 28px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1F2937;font-family:Inter,Arial,sans-serif">${title}</h1>
          <div style="font-size:15px;line-height:1.6;color:#1F2937;font-family:Inter,Arial,sans-serif">${body}</div>
          ${cta}
        </td></tr>
        <!-- Footer -->
        <tr><td>${footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
