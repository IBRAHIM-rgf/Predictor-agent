function toKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function addDays(key, n) {
  const dt = new Date(key + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function dow(key) {
  return new Date(key + "T00:00:00Z").getUTCDay(); // 0..6
}

function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function linreg(y) {
  const n = y.length;
  if (n < 2) return { a: y[0] || 0, b: 0 };
  let sumT = 0, sumY = 0, sumTT = 0, sumTY = 0;
  for (let t = 0; t < n; t++) {
    sumT += t; sumY += y[t]; sumTT += t * t; sumTY += t * y[t];
  }
  const denom = n * sumTT - sumT * sumT;
  const b = denom === 0 ? 0 : (n * sumTY - sumT * sumY) / denom;
  const a = (sumY - b * sumT) / n;
  return { a, b };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

    const body = req.body || {};
    const horizon = Math.max(1, Math.min(60, Number(body.horizon || 14)));
    const series = Array.isArray(body.series) ? body.series : [];

    const cleaned = series
      .map(p => ({ date: toKey(p.date), value: Number(p.value) }))
      .filter(p => p.date && Number.isFinite(p.value))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (cleaned.length < 14) {
      return res.status(400).json({ error: "not_enough_data", message: "Mets au moins 14 points (jours) dans series[] pour une prédiction correcte." });
    }

    // saisonnalité jour de semaine
    const buckets = Array.from({ length: 7 }, () => []);
    for (const p of cleaned) buckets[dow(p.date)].push(p.value);
    const season = buckets.map(mean);

    // trend sur la série désaisonnalisée
    const deseason = cleaned.map(p => p.value - season[dow(p.date)]);
    const { a, b } = linreg(deseason);

    const last = cleaned[cleaned.length - 1].date;
    const startT = cleaned.length;

    const forecast = [];
    for (let i = 1; i <= horizon; i++) {
      const date = addDays(last, i);
      const yTrend = a + b * (startT + (i - 1));
      const y = Math.max(0, season[dow(date)] + yTrend);
      forecast.push({ date, prediction: Math.round(y * 100) / 100 });
    }

    return res.status(200).json({
      horizon,
      seasonality_dow: season.map(v => Math.round(v * 100) / 100),
      trend: { a: Math.round(a * 1000) / 1000, b: Math.round(b * 1000) / 1000 },
      forecast
    });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err?.message || err) });
  }
}
