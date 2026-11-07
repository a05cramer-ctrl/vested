// Read-only Solana RPC proxy for the Vested checker. Keeps the Helius key server-side.
// Vercel env: HELIUS_API_KEY
const ALLOWED = new Set([
  'getAccountInfo', 'getSignaturesForAddress', 'getTransaction',
  'getTokenAccountsByOwner', 'getTokenAccountBalance', 'getAsset',
]);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || Array.isArray(body) || !ALLOWED.has(body.method)) {
    return res.status(400).json({ jsonrpc: '2.0', id: body && body.id, error: { code: -32601, message: 'method not allowed' } });
  }
  const key = process.env.HELIUS_API_KEY;
  const url = key ? 'https://mainnet.helius-rpc.com/?api-key=' + key : 'https://solana-rpc.publicnode.com';
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: body.id || 1, method: body.method, params: body.params || [] }),
    });
    const text = await r.text();
    res.status(r.status).setHeader('content-type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ jsonrpc: '2.0', id: body.id, error: { code: -32000, message: 'upstream unreachable' } });
  }
};
