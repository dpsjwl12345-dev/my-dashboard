const SUPABASE_ORIGIN = 'https://gpzbjvumumkudarikbzm.supabase.co';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // 로컬 파일(file://)이나 다른 도메인에서 열었을 때도 되게 - 배포 사이트(같은 출처)에서는 원래도 필요 없지만 있어도 무해함.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const url = new URL(req.url, 'http://x');
  const params = url.searchParams;

  let pathAndQuery;
  const dParam = params.get('d');
  if (dParam) {
    // 경로+쿼리 전체가 base64(urlsafe)로 암호화되어 온 경우 - 방화벽이 rest/v1, select= 같은
    // REST API 패턴을 그대로 노출된 형태로 차단하는 걸 우회하기 위함.
    const b64 = dParam.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    pathAndQuery = Buffer.from(padded, 'base64').toString('utf8');
  } else {
    const pathParam = params.get('path') || '';
    params.delete('path');
    const qs = params.toString();
    pathAndQuery = pathParam + (qs ? '?' + qs : '');
  }
  const target = SUPABASE_ORIGIN + '/' + pathAndQuery;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    const k = key.toLowerCase();
    if (['host', 'connection', 'content-length', 'accept-encoding', 'origin', 'referer'].includes(k)) continue;
    headers[key] = value;
  }

  let body;
  if (!['GET', 'HEAD'].includes(req.method)) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }

  const upstream = await fetch(target, { method: req.method, headers, body });
  const buf = Buffer.from(await upstream.arrayBuffer());

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(k)) return;
    res.setHeader(key, value);
  });
  res.send(buf);
}
