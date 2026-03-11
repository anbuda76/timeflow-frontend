import { useState, useEffect } from 'react';
import { getCostReport } from '../api/reports';
import { getProjects } from '../api/projects';
import AppHeader from '../components/AppHeader';

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

export default function Reports() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = { year };
      if (month) params.month = month;
      if (selectedProject) params.project_id = selectedProject;
      const data = await getCostReport(params);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    val != null ? `€${parseFloat(val).toFixed(2)}` : '—';

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-4">📊 Report Costi</h1>

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

        {/* Placeholder */}
        {!report && !loading && (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400">
            Seleziona i filtri e clicca "Genera Report"
          </div>
        )}

        {report && (
          <>
            {/* KPI totali */}
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

            {/* Per progetto */}
            {report.projects && report.projects.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
                <div className="px-4 py-3 border-b">
                  <h2 className="font-semibold text-gray-800">Costi per Progetto</h2>
                </div>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Progetto</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Ore</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Costo</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Budget</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">% Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.projects.map(p => {
                      const percent = p.budget_hours
                        ? Math.round((p.hours / p.budget_hours) * 100)
                        : null;
                      return (
                        <tr key={p.project_id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{p.project_name}</td>
                          <td className="px-4 py-3 text-gray-500">{p.client_name || '—'}</td>
                          <td className="px-4 py-3 text-right text-blue-600 font-medium">{p.hours}h</td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(p.cost)}</td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {p.budget_hours ? `${p.budget_hours}h` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {percent != null ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                percent >= 90 ? 'bg-red-100 text-red-600' :
                                percent >= 70 ? 'bg-yellow-100 text-yellow-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                                {percent}%
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Per utente */}
            {report.users && report.users.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b">
                  <h2 className="font-semibold text-gray-800">Costi per Utente</h2>
                </div>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Utente</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Ore totali</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Costo/h</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Costo totale</th>
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
          </>
        )}
      </div>
    </div>
  );
}