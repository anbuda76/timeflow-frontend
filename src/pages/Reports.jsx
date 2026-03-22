import { useState, useEffect } from 'react';
import { getCostReport, getMonthlyTrend } from '../api/reports';
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

  // Dati per istogramma ore
  const barDataHours = report?.projects?.map(p => ({
    name: p.project_name,
    'Consuntivo h': p.consuntivo_hours,
    'Budget h': p.budget_hours || 0,
  })) || [];

  // Dati per istogramma €
  const barDataAmount = report?.projects?.map(p => ({
    name: p.project_name,
    'Consuntivo €': p.consuntivo_amount,
    'Budget €': p.budget_amount || 0,
  })) || [];

  // Dati trend mensile — un punto per mese con tutti i progetti
  const trendMonthlyData = MONTH_SHORT.map((m, i) => {
    const point = { month: m };
    trend?.forEach(p => {
      point[`${p.project_name} cumulato`] = p.monthly[i]?.cumulative_cost || 0;
      point[`${p.project_name} target`] = p.monthly[i]?.budget_target || null;
    });
    return point;
  });

  // Dati trend mensile ore
  const trendMonthlyHours = MONTH_SHORT.map((m, i) => {
    const point = { month: m };
    trend?.forEach(p => {
      point[p.project_name] = p.monthly[i]?.hours || 0;
    });
    return point;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-4">📊 Report Costi</h1>

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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                    <p className="text-2xl font-bold text-blue-600">{report.total_hours}h</p>
                    <p className="text-sm text-gray-500">Ore totali</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(report.total_cost)}</p>
                    <p className="text-sm text-gray-500">Costo totale</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                    <p className="text-2xl font-bold text-gray-700">{report.projects?.length || 0}</p>
                    <p className="text-sm text-gray-500">Progetti</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                    <p className="text-2xl font-bold text-gray-700">{report.users?.length || 0}</p>
                    <p className="text-sm text-gray-500">Utenti coinvolti</p>
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
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Progetto</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Budget €</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Consuntivo €</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Delta €</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Budget h</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Consuntivo h</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Delta h</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.projects.map(p => (
                          <tr key={p.project_id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{p.project_name}</td>
                            <td className="px-4 py-3 text-gray-500">{p.client_name || '—'}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(p.budget_amount)}</td>
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
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Consuntivo h</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Costo/h</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Consuntivo €</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.users.map(u => (
                          <tr key={u.user_id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{u.user_name}</td>
                            <td className="px-4 py-3 text-right text-blue-600 font-medium">{u.hours}h</td>
                            <td className="px-4 py-3 text-right text-gray-500">
                              {u.hourly_rate ? `€${u.hourly_rate}/h` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
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
                          <Bar dataKey="Consuntivo h" fill="#3b82f6" />
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
                          <Bar dataKey="Consuntivo €" fill="#10b981" />
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
                  <h2 className="font-semibold text-gray-800 mb-4">📈 Costo cumulato vs Budget target (mensile)</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={trendMonthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => val ? `€${parseFloat(val).toLocaleString('it-IT')}` : '—'} />
                      <Legend />
                      {trend.map((p, i) => (
                        <Line
                          key={`${p.project_id}-cum`}
                          type="monotone"
                          dataKey={`${p.project_name} cumulato`}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
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
                  <h2 className="font-semibold text-gray-800 mb-4">⏱ Ore mensili per progetto</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trendMonthlyHours} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      {trend.map((p, i) => (
                        <Bar
                          key={p.project_id}
                          dataKey={p.project_name}
                          fill={COLORS[i % COLORS.length]}
                          stackId="a"
                        />
                      ))}
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
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Ore</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Costo mese</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Cumulato €</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-700">Target €</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.monthly.filter(m => m.hours > 0).map(m => (
                          <tr key={m.month} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-700">{MONTHS[m.month - 1]}</td>
                            <td className="px-4 py-2 text-right text-blue-600 font-medium">{m.hours}h</td>
                            <td className="px-4 py-2 text-right text-gray-700">{formatCurrency(m.cost)}</td>
                            <td className="px-4 py-2 text-right font-medium text-green-600">{formatCurrency(m.cumulative_cost)}</td>
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