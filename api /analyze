function toKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function mean(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function stdev(arr){
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((s,x)=>s+(x-m)*(x-m),0)/(arr.length-1);
  return Math.sqrt(v);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

    const body = req.body || {};
    const series = Array.isArray(body.series) ? body.series : [];

    const cleaned = series
      .map(p => ({ date: toKey(p.date), value: Number(p.value) }))
      .filter(p => p.date && Number.isFinite(p.value))
      .sort((a,b)=>a.date.localeCompare(b.date));

    if (cleaned.length < 7) {
      return res.status(400).json({ error: "not_enough_data", message: "Mets au moins 7 points dans series[] (date/value)." });
    }

    const values = cleaned.map(x => x.value);
    const m = mean(values);
    const sd = stdev(values) || 1;

    const anomalies = cleaned
      .map(p => ({ ...p, z: (p.value - m)/sd }))
      .filter(p => Math.abs(p.z) >= 2.5)
      .map(p => ({ date: p.date, value: p.value, z: Math.round(p.z*100)/100 }));

    // tendance simple (diff moyenne)
    const diffs = [];
    for (let i=1;i<values.length;i++) diffs.push(values[i]-values[i-1]);
    const avgDiff = mean(diffs);

    return res.status(200).json({
      kpis: {
        points: cleaned.length,
        avg: Math.round(m*100)/100,
        min: Math.min(...values),
        max: Math.max(...values),
        avg_daily_change: Math.round(avgDiff*100)/100
      },
      anomalies
    });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err?.message || err) });
  }
}
