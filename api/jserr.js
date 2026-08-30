/**
 * 客嗰邊出事就報返嚟 —— 因為「有時 load 唔到」我哋自己撞唔到。
 *
 * 老闆同客都反映過「白畫面，load 極都 load 唔到」。伺服器每次都 200、
 * 半秒內回，所以睇伺服器 log 永遠搵唔到 —— 出事係喺客部機度。今次修好
 * 咗三個成因（Google Fonts 阻住 render、listener 越疊越多、一次過畫
 * 千三張卡），但要證實仲有冇第四個，唯一辦法係等真實用戶撞到嗰刻，
 * 由佢部機講返俾我哋知。
 *
 * 呢度唔存 database：Vercel 嘅 serverless 冇地方寫。console 出一行就夠，
 * `vercel logs` 睇得到，而且唔使多開一個服務、唔使多一條 key。
 *
 *   vercel logs --since 1d | grep OUJI-JSERR
 *
 * 收咩：頁面、瀏覽器、出咩錯、當時 DOM 係咪真係吉。冇收任何個人資料。
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body && typeof body === 'object' ? body : {};

  // 剪短 —— 呢個 endpoint 係公開嘅，唔好畀人當 log 倉用。
  const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
  const line = {
    kind: cut(body.kind, 24),
    page: cut(body.page, 160),
    msg: cut(body.msg, 300),
    at: cut(body.at, 160),
    blank: body.blank === true,
    mainH: Number(body.mainH) || 0,
    fonts: cut(body.fonts, 16),
    ready: cut(body.ready, 16),
    ua: cut(req.headers['user-agent'], 180),
  };
  console.error('OUJI-JSERR ' + JSON.stringify(line));
  res.status(204).end();
}
