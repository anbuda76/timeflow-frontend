import { useState, useEffect } from 'react';
import { getProjects } from '../api/projects';
import { getUsers } from '../api/users';
import { getTimesheets } from '../api/timesheets';
import AppHeader from '../components/AppHeader';
import { getCostReport, getMonthlyTrend, exportExcel } from '../api/reports';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

// ── Costanti ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];
const MONTH_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
const YEARS = [2024, 2025, 2026, 2027];

const STATUS_COLORS = {
  approved:  '#22c55e',
  submitted: '#3b82f6',
  rejected:  '#ef4444',
  draft:     '#94a3b8',
};

// ── Helpers UI ────────────────────────────────────────────────────────────────

const formatCurrency = (val) =>
  val != null ? `€${parseFloat(val).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const STATUS_META = {
  approved:  { label: 'Approvato',       color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  submitted: { label: 'In approvazione', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'  },
  rejected:  { label: 'Rifiutato',       color: 'bg-red-100 text-red-700',      dot: 'bg-red-500'   },
  draft:     { label: 'Bozza',           color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400'  },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

const DeltaBadge = ({ value, pct }) => {
  if (value == null) return <span className="text-gray-400">—</span>;
  const positive = value > 0;
  return (
    <span
      title={positive ? 'Sforamento budget' : 'Risparmio vs budget'}
      className={`px-2 py-1 rounded-full text-xs font-medium cursor-help ${
        positive ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
      }`}
    >
      {positive ? '↑ +' : '↓ '}{Math.abs(value)}{pct != null ? ` (${pct}%)` : ''}
    </span>
  );
};

const KpiCard = ({ value, label, color = 'border-gray-300', textColor = 'text-gray-700', small = false }) => (
  <div className={`bg-white rounded-xl p-4 shadow-sm text-center border-t-4 ${color}`}>
    <p className={`font-bold ${small ? 'text-xl' : 'text-2xl'} ${textColor}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
  </div>
);

// ── Selettori riutilizzabili ──────────────────────────────────────────────────

const SelectYear = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">Anno</label>
    <select value={value} onChange={e => onChange(parseInt(e.target.value))}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  </div>
);

const SelectMonth = ({ value, onChange, optional = false }) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      Mese {optional ? <span className="text-gray-400">(opzionale)</span> : <span className="text-red-500">*</span>}
    </label>
    <select value={value || ''} onChange={e => onChange(e.target.value ? parseInt(e.target.value) : null)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      {optional && <option value="">Tutti i mesi</option>}
      {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
    </select>
  </div>
);

// =============================================================================
// TAB TIMESHEET
// =============================================================================

function TabTimesheet() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [timesheets, setTimesheets] = useState(null);
  const [yearData, setYearData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getUsers().then(setUsers).catch(console.error);
  }, []);

  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const loadReport = async () => {
    setLoading(true);
    try {
      const [monthData, allYear] = await Promise.all([
        getTimesheets({ year, month }),
        getTimesheets({ year }),
      ]);
      setTimesheets(monthData);
      setYearData(allYear);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // KPI mese
  const total      = timesheets?.length ?? 0;
  const approved   = timesheets?.filter(t => t.status === 'approved').length  ?? 0;
  const submitted  = timesheets?.filter(t => t.status === 'submitted').length ?? 0;
  const rejected   = timesheets?.filter(t => t.status === 'rejected').length  ?? 0;
  const draft      = timesheets?.filter(t => t.status === 'draft').length     ?? 0;

  const orePrevist = timesheets
    ? timesheets.reduce((s, t) => s + (t.total_hours || 0), 0).toFixed(1)
    : '—';
  const oreApprova = timesheets
    ? timesheets.filter(t => t.status === 'approved').reduce((s, t) => s + (t.total_hours || 0), 0).toFixed(1)
    : '—';

  // Istogramma trend annuale (12 mesi)
  const barYearData = MONTH_SHORT.map((label, i) => {
    const mNum = i + 1;
    const mRows = yearData?.filter(t => t.month === mNum) ?? [];
    return {
      mese: label,
      'Ore previste':  parseFloat(mRows.reduce((s, t) => s + (t.total_hours || 0), 0).toFixed(1)),
      'Ore approvate': parseFloat(mRows.filter(t => t.status === 'approved').reduce((s, t) => s + (t.total_hours || 0), 0).toFixed(1)),
    };
  });

  // Torta distribuzione ore mese per stato
  const pieData = timesheets
    ? [
        { name: 'Approvate',       value: parseFloat(timesheets.filter(t => t.status === 'approved').reduce((s,t)  => s+(t.total_hours||0),0).toFixed(1)), color: STATUS_COLORS.approved  },
        { name: 'In approvazione', value: parseFloat(timesheets.filter(t => t.status === 'submitted').reduce((s,t) => s+(t.total_hours||0),0).toFixed(1)), color: STATUS_COLORS.submitted },
        { name: 'Rifiutate',       value: parseFloat(timesheets.filter(t => t.status === 'rejected').reduce((s,t)  => s+(t.total_hours||0),0).toFixed(1)), color: STATUS_COLORS.rejected  },
        { name: 'Bozza',           value: parseFloat(timesheets.filter(t => t.status === 'draft').reduce((s,t)     => s+(t.total_hours||0),0).toFixed(1)), color: STATUS_COLORS.draft     },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div>
      {/* Filtri + Export */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
        <SelectYear value={year} onChange={v => { setYear(v); setTimesheets(null); setYearData(null); }} />
        <SelectMonth value={month} onChange={v => { setMonth(v); setTimesheets(null); }} optional={false} />
        <button
          onClick={loadReport}
          disabled={loading || !month}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Carico…' : '🔍 Genera Report'}
        </button>
        <div className="ml-auto">
          <button
            onClick={async () => {
              setExporting(true);
              try { await exportExcel({ year, month }); }
              catch (err) { console.error(err); }
              finally { setExporting(false); }
            }}
            disabled={exporting || !month}
            className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {exporting ? 'Generazione…' : '📥 Esporta Excel'}
          </button>
        </div>
      </div>

      {/* Stato vuoto */}
      {!timesheets && !loading && (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          Seleziona anno e mese, poi clicca "Genera Report"
        </div>
      )}

      {timesheets && (
        <>
          {/* KPI — conteggi timesheet */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-3">
            <KpiCard value={total}     label="Compilati"           color="border-blue-400"  textColor="text-blue-600" />
            <KpiCard value={approved}  label="Approvati"           color="border-green-500" textColor="text-green-600" />
            <KpiCard value={submitted} label="In approvazione"     color="border-blue-300"  textColor="text-blue-500" />
            <KpiCard value={rejected}  label="Rifiutati"           color="border-red-400"   textColor="text-red-600" />
            <KpiCard value={draft}     label="Bozza / Non inviati" color="border-gray-300"  textColor="text-gray-600" />
          </div>

          {/* KPI — ore */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <KpiCard value={`${orePrevist}h`} label="Ore previste (tutti gli stati)" color="border-indigo-300" textColor="text-indigo-500" small />
            <KpiCard value={`${oreApprova}h`} label="Ore approvate"                  color="border-indigo-600" textColor="text-indigo-700" small />
          </div>

          {/* Grafici */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Istogramma trend annuale */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-800 mb-1">📊 Trend annuale ore — {year}</h2>
              <p className="text-xs text-gray-400 mb-4">Ore previste (tutti gli stati) vs ore approvate, per mese</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barYearData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Ore previste"  fill="#a5b4fc" radius={[3,3,0,0]} />
                  <Bar dataKey="Ore approvate" fill="#22c55e" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Torta distribuzione ore mese */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-800 mb-1">🥧 Distribuzione ore — {MONTHS[month - 1]} {year}</h2>
              <p className="text-xs text-gray-400 mb-2">Ripartizione delle ore previste per stato del timesheet</p>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value, percent }) =>
                        `${name}: ${value}h (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => `${val}h`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
                  Nessuna ora registrata per questo mese
                </div>
              )}
            </div>
          </div>

          {/* Tabella dettaglio utenti */}
          {timesheets.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <div className="px-4 py-3 border-b">
                <h2 className="font-semibold text-gray-800">
                  Dettaglio per utente — {MONTHS[month - 1]} {year}
                </h2>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Utente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Stato</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Ore</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets
                    .slice()
                    .sort((a, b) => {
                      const order = { approved: 0, submitted: 1, rejected: 2, draft: 3 };
                      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
                    })
                    .map(t => {
                      const u = userMap[t.user_id];
                      const name = u ? `${u.first_name} ${u.last_name}` : `Utente #${t.user_id}`;
                      return (
                        <tr key={t.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{name}</td>
                          <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                          <td className="px-4 py-3 text-right text-gray-700 font-medium">
                            {t.total_hours > 0 ? `${t.total_hours}h` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-10 text-center text-gray-400">
              Nessun timesheet trovato per {MONTHS[month - 1]} {year}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// TAB COST CENTER
// =============================================================================

function TabCostCenter() {
  const today = new Date();
  const [costTab, setCostTab] = useState('anno');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [report, setReport] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProjects().then(data => setProjects(data.filter(p => !p.is_system)));
  }, []);

  useEffect(() => {
    if (costTab === 'mese' && !selectedProject && projects.length > 0) {
      setSelectedProject(projects[0].id);
    }
  }, [costTab, projects]);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (costTab === 'anno') {
        const params = { year };
        if (month) params.month = month;
        if (selectedProject) params.project_id = selectedProject;
        setReport(await getCostReport(params));
      } else {
        const params = { year };
        if (selectedProject) params.project_id = selectedProject;
        setTrend(await getMonthlyTrend(params));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const barDataAmount = report?.projects?.map(p => ({
    name: p.project_name,
    'Costo approvato': p.approved_amount,
    'Costo in attesa': p.pending_amount,
    'Budget €': p.budget_amount || 0,
  })) || [];

  const lastMonthWithData = trend
    ? Math.max(0, ...trend.flatMap(p => p.monthly.filter(m => m.hours > 0).map(m => m.month)))
    : 0;
  const cutoffMonth = Math.max(lastMonthWithData, today.getFullYear() === year ? today.getMonth() + 1 : 12);
  const visibleMonths = MONTH_SHORT.slice(0, cutoffMonth);

  const trendMonthlyData = visibleMonths.map((m, i) => {
    const point = { month: m };
    trend?.forEach(p => {
      point[`${p.project_name} approvato`] = p.monthly[i]?.cumulative_approved || 0;
      point[`${p.project_name} totale`]    = p.monthly[i]?.cumulative_cost     || 0;
      point[`${p.project_name} target`]    = p.monthly[i]?.budget_target       || null;
    });
    return point;
  });

  const trendMonthlyHours = visibleMonths.map((m, i) => {
    const point = { month: m };
    trend?.forEach(p => {
      point[`${p.project_name} appr.`] = p.monthly[i]?.approved_hours || 0;
      point[`${p.project_name} att.`]  = p.monthly[i]?.pending_hours  || 0;
    });
    return point;
  });

  return (
    <div>
      {/* Legenda */}
      <div className="flex gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="text-gray-600">Ore approvate</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
          <span className="text-gray-600">Ore in attesa (bozza / inviate / rifiutate)</span>
        </span>
      </div>

      {/* Sub-tab */}
      <div className="flex gap-2 mb-6">
        {['anno', 'mese'].map(tab => (
          <button
            key={tab}
            onClick={() => { setCostTab(tab); setReport(null); setTrend(null); }}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
              costTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab === 'anno' ? '📅 Snapshot Costi (anno / mese)' : '📈 Andamento Mensile (cumulato)'}
          </button>
        ))}
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
        <SelectYear value={year} onChange={v => { setYear(v); setReport(null); setTrend(null); }} />
        {costTab === 'anno' && (
          <SelectMonth value={month} onChange={v => { setMonth(v); setReport(null); }} optional />
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Progetto {costTab === 'mese' ? <span className="text-red-500">*</span> : <span className="text-gray-400">(opzionale)</span>}
          </label>
          <select
            value={selectedProject || ''}
            onChange={e => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {costTab === 'anno' && <option value="">Tutti i progetti</option>}
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button
          onClick={loadReport}
          disabled={loading || (costTab === 'mese' && !selectedProject)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Carico…' : '🔍 Genera Report'}
        </button>
      </div>

      {/* SUB-TAB ANNO */}
      {costTab === 'anno' && (
        <>
          {!report && !loading && (
            <div className="bg-white rounded-xl p-12 text-center text-gray-400">
              Seleziona i filtri e clicca "Genera Report"
            </div>
          )}
          {report && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <KpiCard value={formatCurrency(report.total_approved_cost)} label="Costo approvato" color="border-green-500" textColor="text-green-600" small />
                <KpiCard value={formatCurrency(report.total_pending_cost)}  label="Costo in attesa" color="border-amber-400" textColor="text-amber-500" small />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Copertura</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <KpiCard value={report.projects?.length || 0} label="Progetti"         color="border-gray-300" textColor="text-gray-700" />
                <KpiCard value={report.users?.length || 0}    label="Utenti coinvolti" color="border-gray-300" textColor="text-gray-700" />
              </div>

              {report.month && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 text-sm text-amber-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>I valori <strong>Budget €</strong> e <strong>Budget h</strong> si riferiscono al budget annuale del progetto, non proporzionati al singolo mese.</span>
                </div>
              )}

              {report.projects?.length > 0 && (
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
                        <th className="px-3 py-3 text-right font-semibold text-green-700 bg-green-50 border-x border-green-100">Appr. €</th>
                        <th className="px-3 py-3 text-right font-semibold text-amber-600 bg-amber-50 border-x border-amber-100">Att. €</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Totale €</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Delta €</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.projects.map(p => (
                        <tr key={p.project_id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{p.project_name}</td>
                          <td className="px-4 py-3 text-gray-500">{p.client_name || '—'}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(p.budget_amount)}</td>
                          <td className="px-3 py-3 text-right text-green-600 font-medium bg-green-50 border-x border-green-100">{p.approved_amount > 0 ? formatCurrency(p.approved_amount) : '—'}</td>
                          <td className="px-3 py-3 text-right text-amber-600 font-medium bg-amber-50 border-x border-amber-100">{p.pending_amount > 0 ? formatCurrency(p.pending_amount) : '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(p.consuntivo_amount)}</td>
                          <td className="px-4 py-3 text-right"><DeltaBadge value={p.delta_amount} pct={p.delta_amount_pct} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {report.users?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
                  <div className="px-4 py-3 border-b">
                    <h2 className="font-semibold text-gray-800">Analisi per Utente</h2>
                  </div>
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Utente</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Costo/h</th>
                        <th className="px-3 py-3 text-right font-semibold text-green-700 bg-green-50 border-x border-green-100">Costo appr.</th>
                        <th className="px-3 py-3 text-right font-semibold text-amber-600 bg-amber-50 border-x border-amber-100">Costo att.</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Totale €</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.users.map(u => (
                        <tr key={u.user_id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{u.user_name}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{u.hourly_rate ? `€${u.hourly_rate}/h` : '—'}</td>
                          <td className="px-3 py-3 text-right text-green-600 font-medium bg-green-50 border-x border-green-100">{u.approved_cost > 0 ? formatCurrency(u.approved_cost) : '—'}</td>
                          <td className="px-3 py-3 text-right text-amber-600 font-medium bg-amber-50 border-x border-amber-100">{u.pending_cost > 0 ? formatCurrency(u.pending_cost) : '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(u.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {report.projects?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h2 className="font-semibold text-gray-800 mb-4">💶 Budget vs Consuntivo (€)</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barDataAmount} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => `€${val.toLocaleString('it-IT')}`} />
                      <Legend />
                      <Bar dataKey="Budget €"        fill="#94a3b8" />
                      <Bar dataKey="Costo approvato" fill="#22c55e" stackId="cons" />
                      <Bar dataKey="Costo in attesa" fill="#f59e0b" stackId="cons" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* SUB-TAB MESE */}
      {costTab === 'mese' && (
        <>
          {!trend && !loading && (
            <div className="bg-white rounded-xl p-12 text-center text-gray-400">
              Seleziona anno e progetto, poi clicca "Genera Report"
            </div>
          )}
          {trend && trend.length > 0 && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <h2 className="font-semibold text-gray-800 mb-1">📈 Costo cumulato vs Budget target (mensile)</h2>
                <p className="text-xs text-gray-400 mb-4">Linea continua = approvato · Tratteggiata = totale · Puntinata = target budget</p>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trendMonthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val) => val ? `€${parseFloat(val).toLocaleString('it-IT')}` : '—'} />
                    <Legend />
                    {trend.map((p, i) => (
                      <Line key={`${p.project_id}-appr`} type="monotone" dataKey={`${p.project_name} approvato`}
                        stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
                    ))}
                    {trend.map((p, i) => (
                      <Line key={`${p.project_id}-tot`} type="monotone" dataKey={`${p.project_name} totale`}
                        stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                    ))}
                    {trend.map((p, i) => p.budget_amount && (
                      <Line key={`${p.project_id}-target`} type="monotone" dataKey={`${p.project_name} target`}
                        stroke={COLORS[i % COLORS.length]} strokeWidth={2} strokeDasharray="5 5" dot={false}
                        name={`${p.project_name} budget target`} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

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
                      <Bar key={`${p.project_id}-appr`} dataKey={`${p.project_name} appr.`}
                        fill={COLORS[i % COLORS.length]} stackId={`p${p.project_id}`} />,
                      <Bar key={`${p.project_id}-att`} dataKey={`${p.project_name} att.`}
                        fill={COLORS[i % COLORS.length]} stackId={`p${p.project_id}`} opacity={0.4} />,
                    ]))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

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
                      {p.monthly.slice(0, cutoffMonth).map(m => {
                        const noData = m.hours === 0;
                        return (
                          <tr key={m.month} className={`border-b hover:bg-gray-50 ${noData ? 'opacity-40' : ''}`}>
                            <td className="px-4 py-2 text-gray-700 flex items-center gap-1">
                              {MONTHS[m.month - 1]}
                              {noData && <span className="text-xs text-gray-400 ml-1">nessuna attività</span>}
                            </td>
                            <td className="px-3 py-2 text-right text-green-600 font-medium bg-green-50 border-x border-green-100">{m.approved_hours > 0 ? `${m.approved_hours}h` : '—'}</td>
                            <td className="px-3 py-2 text-right text-amber-600 font-medium bg-amber-50 border-x border-amber-100">{m.pending_hours > 0 ? `${m.pending_hours}h` : '—'}</td>
                            <td className="px-3 py-2 text-right text-green-600 bg-green-50 border-x border-green-100">{m.approved_cost > 0 ? formatCurrency(m.approved_cost) : '—'}</td>
                            <td className="px-3 py-2 text-right text-amber-600 bg-amber-50 border-x border-amber-100">{m.pending_cost > 0 ? formatCurrency(m.pending_cost) : '—'}</td>
                            <td className="px-4 py-2 text-right font-medium text-green-600">{noData ? '—' : formatCurrency(m.cumulative_approved)}</td>
                            <td className="px-4 py-2 text-right font-medium text-blue-600">{noData ? '—' : formatCurrency(m.cumulative_cost)}</td>
                            <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(m.budget_target)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// PAGINA PRINCIPALE
// =============================================================================

export default function Reports() {
  const [activeTab, setActiveTab] = useState('timesheet');

  const TABS = [
    { id: 'timesheet',   label: '📋 Timesheet'  },
    { id: 'cost-center', label: '💶 Cost Center' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🔬 Neo Insight</h1>
          <p className="text-sm text-gray-400 mt-1">Reportistica e analisi costi</p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 text-sm font-medium rounded-t-lg transition border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'timesheet'   && <TabTimesheet />}
        {activeTab === 'cost-center' && <TabCostCenter />}

      </div>
    </div>
  );
}
