import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const formatCurrency = (val) =>
  val != null ? `€${parseFloat(val).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const formatDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = String(d).split('-');
  return `${day}/${m}/${y}`;
};

// ── KPI box ──────────────────────────────────────────────────────────────────
function Kpi({ label, value, color = 'text-gray-700', border = 'border-gray-300', sub }) {
  return (
    <div className={`bg-white rounded-xl border-t-4 ${border} shadow-sm px-4 py-3 text-center`}>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Barra di incidenza ───────────────────────────────────────────────────────
function PctBar({ pct, color = 'bg-blue-400' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct || 0, 100)}%` }} />
      </div>
      <span className="text-gray-500 w-10 text-right text-xs">{pct ?? 0}%</span>
    </div>
  );
}

export default function SchedaCommessa({ detail, loading, periodLabel, onClose }) {
  if (loading || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-2xl px-8 py-10 shadow-xl">
          <p className="text-gray-500 text-sm">Caricamento scheda commessa…</p>
        </div>
      </div>
    );
  }

  const budget    = detail.budget_amount || 0;
  const delta     = detail.delta_amount;
  const deltaPos  = delta != null && delta >= 0;
  const internalPct = detail.total_cost ? Math.round(detail.internal_cost / detail.total_cost * 100) : 0;

  const chartData = (detail.timeline || []).map(t => ({
    label: t.label,
    'Costo cumulato': t.cumulative_cost,
    'Budget':         t.budget_line,
  }));

  const barData = (detail.timeline || []).map(t => ({
    label: t.label,
    'Approvato': t.approved_cost,
    'In attesa': t.pending_cost,
    'Fornitori': t.vendor_cost,
  }));

  const hasTimeline = chartData.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 overflow-y-auto"
         onClick={onClose}>
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-5xl my-6"
           onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="bg-white rounded-t-2xl border-b px-6 py-4 flex items-start justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800">{detail.project_name}</h2>
              <span className="text-xs text-gray-400 font-mono">#{detail.project_id}</span>
              {detail.is_active === false && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Chiuso</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {detail.client_name || 'Cliente non specificato'}
              <span className="text-gray-300 mx-2">·</span>
              <span className="text-gray-400">{periodLabel}</span>
            </p>
            {(detail.start_date || detail.end_date) && (
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(detail.start_date)} → {formatDate(detail.end_date)}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2">✕</button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── KPI periodo ── */}
          <div>
            {detail.is_filtered && (
              <p className="text-xs text-gray-400 mb-2">
                Costi del periodo <span className="font-medium text-gray-600">{periodLabel}</span>
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Costi interni"   value={formatCurrency(detail.internal_cost)}
                   color="text-indigo-600" border="border-indigo-400"
                   sub={`${internalPct}% del totale`} />
              <Kpi label="Costi fornitori" value={formatCurrency(detail.vendor_cost)}
                   color="text-purple-600" border="border-purple-400"
                   sub={`${detail.vendor_pct ?? 0}% del totale`} />
              <Kpi label={detail.is_filtered ? 'Totale periodo' : 'Totale commessa'}
                   value={formatCurrency(detail.total_cost)}
                   color="text-gray-800"   border="border-gray-400" />
              <Kpi label="Budget commessa" value={budget ? formatCurrency(budget) : '—'}
                   color="text-blue-600"   border="border-blue-400" />
            </div>
          </div>

          {/* ── Situazione complessiva commessa ── */}
          <div className={`rounded-xl border p-4 ${
            delta == null ? 'bg-gray-50 border-gray-200'
              : deltaPos ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Situazione complessiva commessa
                </p>
                <p className="text-xs text-gray-500">
                  Consuntivo totale dall'inizio: <span className="font-medium text-gray-700">{formatCurrency(detail.lifetime_cost)}</span>
                  <span className="text-gray-300 mx-1.5">·</span>
                  interni {formatCurrency(detail.lifetime_internal)}
                  <span className="text-gray-300 mx-1.5">·</span>
                  fornitori {formatCurrency(detail.lifetime_vendor)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  delta == null ? 'text-gray-400' : deltaPos ? 'text-green-600' : 'text-red-600'
                }`}>
                  {delta != null ? `${deltaPos ? '+' : '−'}${formatCurrency(Math.abs(delta))}` : '—'}
                </p>
                <p className={`text-xs font-medium ${
                  delta == null ? 'text-gray-500' : deltaPos ? 'text-green-600' : 'text-red-600'
                }`}>
                  {delta == null ? 'Budget non impostato'
                    : deltaPos ? '✓ Margine residuo' : '⚠ Sforamento budget'}
                  {detail.delta_amount_pct != null && ` (${Math.abs(detail.delta_amount_pct)}%)`}
                </p>
              </div>
            </div>
          </div>

          {/* ── Grafico andamento cumulato ── */}
          {hasTimeline && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-gray-800 text-sm">📈 Andamento cumulato</h3>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Intera commessa
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Costo progressivo dall'inizio della commessa confrontato con il budget complessivo
                {detail.timeline_granularity === 'year' && ' · vista per annualità'}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v, n) => [formatCurrency(v), n]} />
                  {budget > 0 && (
                    <Line type="monotone" dataKey="Budget" stroke="#94a3b8" strokeWidth={2}
                          strokeDasharray="6 3" dot={false} />
                  )}
                  <Line type="monotone" dataKey="Costo cumulato" stroke="#3b82f6" strokeWidth={2.5}
                        dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-1 px-2 text-xs text-gray-500">
                {budget > 0 && (
                  <span className="flex items-center gap-1.5">
                    <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 3"/></svg>
                    Budget ({formatCurrency(budget)})
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#3b82f6" strokeWidth="2.5"/></svg>
                  Costo cumulato
                </span>
              </div>
              {detail.undated_vendor_cost > 0 && (
                <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                  ℹ La colonna <strong>n.d.</strong> raccoglie {formatCurrency(detail.undated_vendor_cost)} di costi fornitori senza data, non collocabili nel tempo.
                </p>
              )}
            </div>
          )}

          {/* ── Grafico costi per periodo ── */}
          {hasTimeline && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-1">💶 Costi per periodo</h3>
              <p className="text-xs text-gray-400 mb-3">Ripartizione tra costi approvati, in attesa e fornitori</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v, n) => [formatCurrency(v), n]} />
                  <Bar dataKey="Approvato" stackId="c" fill="#22c55e" />
                  <Bar dataKey="In attesa" stackId="c" fill="#f59e0b" />
                  <Bar dataKey="Fornitori" stackId="c" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 mt-1 px-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Approvato</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />In attesa</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" />Fornitori</span>
              </div>
            </div>
          )}

          {/* ── Risorse interne ── */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">👥 Risorse interne</h3>
              <span className="text-xs text-gray-400">
                {detail.users.length} risorse · {formatCurrency(detail.internal_cost)}
              </span>
            </div>
            {detail.users.length > 0 ? (
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-gray-600">
                    <th className="px-4 py-2 text-left font-semibold">Risorsa</th>
                    <th className="px-3 py-2 text-right font-semibold">Tariffa</th>
                    <th className="px-3 py-2 text-right font-semibold">Ore appr.</th>
                    <th className="px-3 py-2 text-right font-semibold">Ore att.</th>
                    <th className="px-3 py-2 text-right font-semibold">Ore tot.</th>
                    <th className="px-3 py-2 text-right font-semibold">Costo €</th>
                    <th className="px-4 py-2 text-left font-semibold w-40">Incidenza</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.users.map(u => (
                    <tr key={u.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{u.user_name}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{u.hourly_rate ? `€${u.hourly_rate}/h` : '—'}</td>
                      <td className="px-3 py-2 text-right text-green-600">{u.approved_hours > 0 ? `${u.approved_hours}h` : '—'}</td>
                      <td className="px-3 py-2 text-right text-amber-600">{u.pending_hours > 0 ? `${u.pending_hours}h` : '—'}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-700">{u.total_hours}h</td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-600">{formatCurrency(u.total_cost)}</td>
                      <td className="px-4 py-2"><PctBar pct={u.pct} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-center text-gray-400 text-xs">Nessuna ora registrata nel periodo</p>
            )}
          </div>

          {/* ── Costi fornitori ── */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">🏢 Costi fornitori</h3>
              <span className="text-xs text-gray-400">
                {detail.vendor_costs?.length || 0} voci · {formatCurrency(detail.vendor_cost)}
              </span>
            </div>
            {detail.vendor_costs?.length > 0 ? (
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-gray-600">
                    <th className="px-4 py-2 text-left font-semibold">Fornitore</th>
                    <th className="px-3 py-2 text-left font-semibold">Categoria</th>
                    <th className="px-3 py-2 text-left font-semibold">Descrizione</th>
                    <th className="px-3 py-2 text-left font-semibold">Data</th>
                    <th className="px-3 py-2 text-right font-semibold">Importo €</th>
                    <th className="px-4 py-2 text-left font-semibold w-40">Incidenza</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.vendor_costs.map(v => (
                    <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{v.vendor_name}</td>
                      <td className="px-3 py-2 text-gray-500">{v.category || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{v.description || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{v.cost_date ? formatDate(v.cost_date) : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-purple-600">{formatCurrency(v.amount)}</td>
                      <td className="px-4 py-2"><PctBar pct={v.pct} color="bg-purple-400" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-center text-gray-400 text-xs">Nessun costo fornitore imputato nel periodo</p>
            )}
          </div>

          {/* ── Riepilogo finale ── */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">📊 Riepilogo economico</h3>
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Intera commessa</span>
            </div>
            <table className="min-w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">Budget di commessa</td>
                  <td className="py-2 text-right font-medium text-blue-600">{budget ? formatCurrency(budget) : '—'}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600 pl-4">− Costi interni (ore × tariffa)</td>
                  <td className="py-2 text-right text-indigo-600">{formatCurrency(detail.lifetime_internal)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600 pl-4">− Costi fornitori</td>
                  <td className="py-2 text-right text-purple-600">{formatCurrency(detail.lifetime_vendor)}</td>
                </tr>
                <tr className="border-b-2 border-gray-300">
                  <td className="py-2 font-medium text-gray-700 pl-4">= Totale consuntivo</td>
                  <td className="py-2 text-right font-semibold text-gray-800">{formatCurrency(detail.lifetime_cost)}</td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-gray-800">
                    {delta == null ? 'Delta' : deltaPos ? 'Margine residuo' : 'Sforamento budget'}
                  </td>
                  <td className={`py-3 text-right font-bold text-base ${
                    delta == null ? 'text-gray-400' : deltaPos ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {delta != null ? `${deltaPos ? '+' : '−'}${formatCurrency(Math.abs(delta))}` : '—'}
                    {detail.delta_amount_pct != null && (
                      <span className="text-xs font-normal ml-1">({Math.abs(detail.delta_amount_pct)}%)</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            {detail.note && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note progetto</p>
                <p className="text-xs text-gray-600">{detail.note}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-white rounded-b-2xl border-t px-6 py-3 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
