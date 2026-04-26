import { useState, useEffect } from 'react';
import { getProjects } from '../api/projects';
import AppHeader from '../components/AppHeader';
import { getCostReport, getMonthlyTrend, exportExcel } from '../api/reports';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

const MONTH_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

const formatCurrency = (val) =>
  val != null ? `€${parseFloat(val).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const DeltaBadge = ({ value, pct }) => {
  if (value == null) return <span className="text-gray-400">—</span>;
  const positive = value > 0;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      positive ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
    }`}>
      {positive ? '+' : ''}{value} {pct != null ? `(${positive ? '+' : ''}${pct}%)` : ''}
    </span>
  );
};

const HoursSplit = ({ approved, pending }) => (
  <div className="text-right">
    {approved > 0 && (
      <div className="text-green-600 font-medium text-xs">{approved}h appr.</div>
    )}
    {pending > 0 && (
      <div className="text-amber-500 font-medium text-xs">{pending}h att.</div>
    )}
    {approved === 0 && pending === 0 && <span className="text-gray-400">—</span>}
  </div>
);

const AmountSplit = ({ approved, pending }) => (
  <div className="text-right">
    {approved > 0 && (
      <div className="text-green-600 font-medium text-xs">{formatCurrency(approved)}</div>
    )}
    {pending > 0 && (
      <div className="text-amber-500 font-medium text-xs">{formatCurrency(pending)}</div>
    )}
    {approved === 0 && pending === 0 && <span className="text-gray-400">—</span>}
  </div>
);

export default function Reports() {
  const today = new Date();
  const [activeTab, setActiveTab] = useState('anno');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [report, setReport] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportMonth, setExportMonth] = useState(today.getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getProjects().then(data => setProjects(data.filter(p => !p.is_system)));
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'anno') {
        const params = { year };
        if (selectedProject) params.project_id = selectedProject;
        const data = await getCostReport(params);
        setReport(data);
      } else {
        const params = { year };
        if (selectedProject) params.project_id = selectedProject;
        const data = await getMonthlyTrend(params);
        setTrend(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Dati per istogramma ore (approvate + in attesa stacked)
  const barDataHours = report?.projects?.map(p => ({
    name: p.project_name,
    'Ore approvate': p.approved_hours,
    'Ore in attesa': p.pending_hours,
    'Budget h': p.budget_hours || 0,
  })) || [];

  // Dati per istogramma € (approvate + in attesa stacked)
  const barDataAmount = report?.projects?.map(p => ({
    name: p.project_name,
    'Costo approvato': p.approved_amount,
    'Costo in attesa': p.pending_amount,
    'Budget €': p.budget_amount || 0,
  })) || [];

  // Dati trend mensile cumulato
  const trendMonthlyData = MONTH_SHORT.map((m, i) => {
    const point = { month: m };
    trend?.forEach(p => {
      point[`${p.project_name} approvato`] = p.monthly[i]?.cumulative_approved || 0;
      point[`${p.project_name} totale`] = p.monthly[i]?.cumulative_cost || 0;
      point[`${p.project_name} target`] = p.monthly[i]?.budget_target || null;
    });
    return point;
  });

  // Dati trend mensile ore
  const trendMonthlyHours = MONTH_SHORT.map((m, i) => {
    const point = { month: m };
    trend?.forEach(p => {
      point[`${p.project_name} appr.`] = p.monthly[i]?.approved_hours || 0;
      point[`${p.project_name} att.`] = p.monthly[i]?.pending_hours || 0;
    });
    return point;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-4">📊 Report Costi</h1>

        {/* Legenda stati */}
        <div className="flex gap-4 mb-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-600">Ore approvate</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-400"></span>
            <span className="text-gray-600">Ore in attesa (bozza / inviate / rifiutate)</span>
          </span>
        </div>

        {/* Card Export */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">📥 Export Excel</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Anno</label>
              <select
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mese</label>
              <select
                value={exportMonth}
                onChange={e => setExportMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setExporting(true);
                  try {
                    await exportExcel({ year, month: exportMonth });
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting}
                className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {exporting ? 'Generazione...' : '📊 Scarica Riepilogo Giornate & Progetti'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab */}
        <div className="flex gap-2 mb-6">
          {['anno', 'mese'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setReport(null); setTrend(null); }}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab === 'anno' ? '📅 Report Annuale' : '📈 Trend Mensile'}
            </button>
          ))}
        </div>

        {/* Filtri */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Anno</label>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {activeTab === 'anno' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mese (opzionale)</label>
              <select
                value={month || ''}
                onChange={e => setMonth(e.target.value ? parseInt(e.target.value) : null)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutti i mesi</option>
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Progetto (opzionale)</label>
            <select
              value={selectedProject || ''}
              onChange={e => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti i progetti</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Carico...' : '🔍 Genera Report'}
          </button>
        </div>

        {/* TAB ANNO */}
        {activeTab === 'anno' && (
          <>
            {!report && !loading && (
              <div className="bg-white rounded-xl p-12 text-center text-gray-400">
                Seleziona i filtri e clicca "Genera Report"
              </div>
            )}

            {report && (
              <>
                {/* KPI */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center border-t-4 border-green-500">
                    <p className="text-2xl font-bold text-green-600">{report.total_approved_hours}h</p>
                    <p className="text-xs text-gray-500 mt-1">Ore approvate</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center border-t-4 border-amber-400">
                    <p className="text-2xl font-bold text-amber-500">{report.total_pending_hours}h</p>
                    <p className="text-xs text-gray-500 mt-1">Ore in attesa</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center border-t-4 border-green-500">
                    <p className="text-xl font-bold text-green-600">{formatCurrency(report.total_approved_cost)}</p>
                    <p className="text-xs text-gray-500 mt-1">Costo approvato</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center border-t-4 border-amber-400">
                    <p className="text-xl font-bold text-amber-500">{formatCurrency(report.total_pending_cost)}</p>
                    <p className="text-xs text-gray-500 mt-1">Costo in attesa</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center border-t-4 border-gray-300">
                    <p className="text-2xl font-bold text-gray-700">{report.projects?.length || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Progetti</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center border-t-4 border-gray-300">
                    <p className="text-2xl font-bold text-gray-700">{report.users?.length || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Utenti coinvolti</p>
                  </div>
                </div>

                {/* Tabella per progetto */}
                {report.projects && report.projects.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm mb-6 overflow-x-auto">
                    <div className="px-4 py-3 border-b">
                      <h2 className="font-semibold text-gray-800">Analisi per Progetto</h2>
                    </div>
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700" rowSpan={2}>Progetto</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700" rowSpan={2}>Cliente</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700" rowSpan={2}>Budget €</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600 bg-green-50 border-x border-green-100" colSpan={2}>Approvato</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-600 bg-amber-50 border-x border-amber-100" colSpan={2}>In attesa</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700" rowSpan={2}>Totale €</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700" rowSpan={2}>Delta €</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700" rowSpan={2}>Budget h</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700" rowSpan={2}>Totale h</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700" rowSpan={2}>Delta h</th>
                        </tr>
                        <tr>
                          <th className="px-3 py-2 text-right text-xs font-medium text-green-700 bg-green-50 border-l border-green-100">h</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-green-700 bg-green-50 border-r border-green-100">€</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-600 bg-amber-50 border-l border-amber-100">h</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-600 bg-amber-50 border-r border-amber-100">€</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.projects.map(p => (
                          <tr key={p.project_id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{p.project_name}</td>
                            <td className="px-4 py-3 text-gray-500">{p.client_name || '—'}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(p.budget_amount)}</td>
                            <td className="px-3 py-3 text-right text-green-600 font-medium bg-green-50 border-l border-green-100">{p.approved_hours > 0 ? `${p.approved_hours}h` : '—'}</td>
                            <td className="px-3 py-3 text-right text-green-600 font-medium bg-green-50 border-r border-green-100">{p.approved_amount > 0 ? formatCurrency(p.approved_amount) : '—'}</td>
                            <td className="px-3 py-3 text-right text-amber-600 font-medium bg-amber-50 border-l border-amber-100">{p.pending_hours > 0 ? `${p.pending_hours}h` : '—'}</td>
                            <td className="px-3 py-3 text-right text-amber-600 font-medium bg-amber-50 border-r border-amber-100">{p.pending_amount > 0 ? formatCurrency(p.pending_amount) : '—'}</td>
                            <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(p.consuntivo_amount)}</td>
                            <td className="px-4 py-3 text-right">
                              <DeltaBadge value={p.delta_amount} pct={p.delta_amount_pct} />
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">{p.budget_hours ? `${p.budget_hours}h` : '—'}</td>
                            <td className="px-4 py-3 text-right font-medium text-blue-600">{p.consuntivo_hours}h</td>
                            <td className="px-4 py-3 text-right">
                              <DeltaBadge value={p.delta_hours} pct={p.delta_hours_pct} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tabella per utente */}
                {report.users && report.users.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
                    <div className="px-4 py-3 border-b">
                      <h2 className="font-semibold text-gray-800">Analisi per Utente</h2>
                    </div>
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Utente</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Costo/h</th>
                          <th className="px-3 py-3 text-right font-semibold text-green-700 bg-green-50 border-x border-green-100">Ore appr.</th>
                          <th className="px-3 py-3 text-right font-semibold text-green-700 bg-green-50 border-x border-green-100">Costo appr.</th>
                          <th className="px-3 py-3 text-right font-semibold text-amber-600 bg-amber-50 border-x border-amber-100">Ore att.</th>
                          <th className="px-3 py-3 text-right font-semibold text-amber-600 bg-amber-50 border-x border-amber-100">Costo att.</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Totale h</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Totale €</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.users.map(u => (
                          <tr key={u.user_id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{u.user_name}</td>
                            <td className="px-4 py-3 text-right text-gray-500">
                              {u.hourly_rate ? `€${u.hourly_rate}/h` : '—'}
                            </td>
                            <td className="px-3 py-3 text-right text-green-600 font-medium bg-green-50 border-x border-green-100">
                              {u.approved_hours > 0 ? `${u.approved_hours}h` : '—'}
                            </td>
                            <td className="px-3 py-3 text-right text-green-600 font-medium bg-green-50 border-x border-green-100">
                              {u.approved_cost > 0 ? formatCurrency(u.approved_cost) : '—'}
                            </td>
                            <td className="px-3 py-3 text-right text-amber-600 font-medium bg-amber-50 border-x border-amber-100">
                              {u.pending_hours > 0 ? `${u.pending_hours}h` : '—'}
                            </td>
                            <td className="px-3 py-3 text-right text-amber-600 font-medium bg-amber-50 border-x border-amber-100">
                              {u.pending_cost > 0 ? formatCurrency(u.pending_cost) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-blue-600 font-medium">{u.hours}h</td>
                            <td className="px-4 py-3 text-right font-medium text-blue-600">
                              {formatCurrency(u.cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Grafici annuali */}
                {report.projects && report.projects.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm p-4">
                      <h2 className="font-semibold text-gray-800 mb-4">📊 Budget vs Consuntivo (ore)</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barDataHours} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Budget h" fill="#94a3b8" />
                          <Bar dataKey="Ore approvate" fill="#22c55e" stackId="cons" />
                          <Bar dataKey="Ore in attesa" fill="#f59e0b" stackId="cons" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4">
                      <h2 className="font-semibold text-gray-800 mb-4">💶 Budget vs Consuntivo (€)</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barDataAmount} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(val) => `€${val.toLocaleString('it-IT')}`} />
                          <Legend />
                          <Bar dataKey="Budget €" fill="#94a3b8" />
                          <Bar dataKey="Costo approvato" fill="#22c55e" stackId="cons" />
                          <Bar dataKey="Costo in attesa" fill="#f59e0b" stackId="cons" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* TAB MESE */}
        {activeTab === 'mese' && (
          <>
            {!trend && !loading && (
              <div className="bg-white rounded-xl p-12 text-center text-gray-400">
                Seleziona anno e progetto, poi clicca "Genera Report"
              </div>
            )}

            {trend && trend.length > 0 && (
              <>
                {/* Grafico cumulato costo vs target */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                  <h2 className="font-semibold text-gray-800 mb-1">📈 Costo cumulato vs Budget target (mensile)</h2>
                  <p className="text-xs text-gray-400 mb-4">Linea continua = approvato · Linea tratteggiata = target budget · Linea puntinata = totale (appr. + in attesa)</p>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={trendMonthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => val ? `€${parseFloat(val).toLocaleString('it-IT')}` : '—'} />
                      <Legend />
                      {trend.map((p, i) => (
                        <Line
                          key={`${p.project_id}-appr`}
                          type="monotone"
                          dataKey={`${p.project_name} approvato`}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                      {trend.map((p, i) => (
                        <Line
                          key={`${p.project_id}-tot`}
                          type="monotone"
                          dataKey={`${p.project_name} totale`}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          dot={false}
                        />
                      ))}
                      {trend.map((p, i) => p.budget_amount && (
                        <Line
                          key={`${p.project_id}-target`}
                          type="monotone"
                          dataKey={`${p.project_name} target`}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name={`${p.project_name} budget target`}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Grafico ore mensili per progetto */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                  <h2 className="font-semibold text-gray-800 mb-1">⏱ Ore mensili per progetto</h2>
                  <p className="text-xs text-gray-400 mb-4">Verde = approvate · Arancione = in attesa</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trendMonthlyHours} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      {trend.map((p, i) => ([
                        <Bar
                          key={`${p.project_id}-appr`}
                          dataKey={`${p.project_name} appr.`}
                          fill={COLORS[i % COLORS.length]}
                          stackId={`p${p.project_id}`}
                        />,
                        <Bar
                          key={`${p.project_id}-att`}
                          dataKey={`${p.project_name} att.`}
                          fill={COLORS[i % COLORS.length]}
                          stackId={`p${p.project_id}`}
                          opacity={0.4}
                        />
                      ]))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabella dettaglio mensile per progetto */}
                {trend.map(p => (
                  <div key={p.project_id} className="bg-white rounded-xl shadow-sm mb-4 overflow-x-auto">
                    <div className="px-4 py-3 border-b flex justify-between items-center">
                      <h2 className="font-semibold text-gray-800">{p.project_name}</h2>
                      {p.budget_amount && (
                        <span className="text-sm text-gray-500">Budget: {formatCurrency(p.budget_amount)}</span>
                      )}
                    </div>
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">Mese</th>
                          <th className="px-3 py-2 text-right font-semibold text-green-700 bg-green-50 border-x border-green-100">Ore appr.</th>
                          <th className="px-3 py-2 text-right font-semibold text-amber-600 bg-amber-50 border-x border-amber-100">Ore att.</th>
                          <th className="px-3 py-2 text-right font-semibold text-green-700 bg-green-50 border-x border-green-100">Costo appr.</th>
                          <th className="px-3 py-2 text-right font-semibold text-amber-600 bg-amber-50 border-x border-amber-100">Costo att.</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Cum. approvato</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Cum. totale</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Target €</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.monthly.filter(m => m.hours > 0).map(m => (
                          <tr key={m.month} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-700">{MONTHS[m.month - 1]}</td>
                            <td className="px-3 py-2 text-right text-green-600 font-medium bg-green-50 border-x border-green-100">
                              {m.approved_hours > 0 ? `${m.approved_hours}h` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-amber-600 font-medium bg-amber-50 border-x border-amber-100">
                              {m.pending_hours > 0 ? `${m.pending_hours}h` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-green-600 bg-green-50 border-x border-green-100">
                              {m.approved_cost > 0 ? formatCurrency(m.approved_cost) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-amber-600 bg-amber-50 border-x border-amber-100">
                              {m.pending_cost > 0 ? formatCurrency(m.pending_cost) : '—'}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-green-600">{formatCurrency(m.cumulative_approved)}</td>
                            <td className="px-4 py-2 text-right font-medium text-blue-600">{formatCurrency(m.cumulative_cost)}</td>
                            <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(m.budget_target)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
