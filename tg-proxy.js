export default async function handler(req, res) {
  const { action, ...restQuery } = req.query;
  if (!action) return res.status(400).json({ error: 'Action required' });

  const token = process.env.PETR_BOT_TOKEN;
  const queryString = new URLSearchParams(restQuery).toString();
  const url = `https://api.telegram.org/bot${token}/${action}${queryString ? '?' + queryString : ''}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}