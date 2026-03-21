import { useState, useEffect, useCallback } from 'react';
import {
  getTimesheets, getTimesheet, createTimesheet,
  saveEntries, submitTimesheet, getProjects, getHolidays
} from '../api/timesheets';
import AppHeader from '../components/AppHeader';

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const isWeekend = (year, month, day) => {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
};
const padDate = (n) => String(n).padStart(2, '0');

export default function Timesheet() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [timesheet, setTimesheet] = useState(null);
  const [projects, setProjects] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const holidayDates = holidays.map(h => h.holiday_date);
  const systemProjects = projects.filter(p => p.is_system);
  const normalProjects = projects.filter(p => !p.is_system);

  const isHoliday = (day) => {
    const dateStr = `${year}-${padDate(month)}-${padDate(day)}`;
    return holidayDates.includes(dateStr);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTimesheets, projs, hols] = await Promise.all([
        getTimesheets({ year, month }),
        getProjects(),
        getHolidays(year),
      ]);
      setProjects(projs);
      setHolidays(hols);

      if (allTimesheets.length > 0) {
        const full = await getTimesheet(allTimesheets[0].id);
        setTimesheet(full);
        const map = {};
        full.entries.forEach(e => {
          const day = parseInt(e.entry_date.split('-')[2]);
          map[`${e.project_id}-${day}`] = e.hours;
        });
        setEntries(map);
      } else {
        setTimesheet(null);
        setEntries({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCellChange = (projectId, day, value) => {
    if (timesheet?.status === 'submitted' || timesheet?.status === 'approved') return;
    const hours = parseFloat(value) || 0;
    setEntries(prev => ({ ...prev, [`${projectId}-${day}`]: hours }));
  };

  const buildEntriesArray = () => {
    const result = [];
    Object.entries(entries).forEach(([key, hours]) => {
      if (hours > 0) {
        const [projectId, day] = key.split('-');
        result.push({
          project_id: parseInt(projectId),
          entry_date: `${year}-${padDate(month)}-${padDate(parseInt(day))}`,
          hours,
        });
      }
    });
    return result;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let ts = timesheet;
      if (!ts) {
        ts = await createTimesheet({ year, month });
        setTimesheet(ts);
      }
      const updated = await saveEntries(ts.id, buildEntriesArray());
      setTimesheet(updated);
      setMessage('✅ Salvato!');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('❌ Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!timesheet) return;
    if (!window.confirm('Inviare il timesheet per approvazione?')) return;
    try {
      const updated = await submitTimesheet(timesheet.id);
      setTimesheet(updated);
      setMessage('✅ Timesheet inviato per approvazione!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('❌ Errore nell\'invio');
    }
  };

  const totalHours = Object.values(entries).reduce((sum, h) => sum + (h || 0), 0);
  const workingDays = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)
    .filter(d => !isWeekend(year, month, d) && !isHoliday(d)).length;
  const expectedHours = workingDays * 8;
  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);

  const statusColor = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const canEdit = !timesheet || timesheet.status === 'draft' || timesheet.status === 'rejected';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Caricamento...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-full mx-auto px-4 py-6">
        {/* Selettore mese + azioni */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
              className="p-2 rounded-lg hover:bg-gray-200"
            >←</button>
            <h2 className="text-xl font-semibold text-gray-800 min-w-48 text-center">
              {MONTHS[month - 1]} {year}
            </h2>
            <button
              onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
              className="p-2 rounded-lg hover:bg-gray-200"
            >→</button>
            {timesheet && (
              <span className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${statusColor[timesheet.status]}`}>
                {timesheet.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {message && <span className="text-sm">{message}</span>}
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvo...' : '💾 Salva'}
              </button>
            )}
            {timesheet?.status === 'draft' && (
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
              >
                📤 Invia
              </button>
            )}
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{totalHours}h</p>
            <p className="text-sm text-gray-500">Ore inserite</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-700">{expectedHours}h</p>
            <p className="text-sm text-gray-500">Ore previste</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${totalHours >= expectedHours ? 'text-green-600' : 'text-orange-500'}`}>
              {totalHours - expectedHours > 0 ? '+' : ''}{totalHours - expectedHours}h
            </p>
            <p className="text-sm text-gray-500">Differenza</p>
          </div>
        </div>

        {/* Griglia timesheet */}
        {normalProjects.length === 0 && systemProjects.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            Nessun progetto assegnato. Contatta il tuo amministratore.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 bg-white px-4 py-3 text-left font-semibold text-gray-700 min-w-40">
                    Progetto
                  </th>
                  {days.map(day => (
                    <th key={day} className={`px-1 py-3 text-center font-medium min-w-10
                      ${isWeekend(year, month, day) ? 'bg-gray-50 text-gray-400' : ''}
                      ${isHoliday(day) ? 'bg-orange-50 text-orange-400' : ''}
                    `}>
                      <div>{day}</div>
                      <div className="text-xs text-gray-400">
                        {['D','L','M','M','G','V','S'][new Date(year, month-1, day).getDay()]}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Tot</th>
                </tr>
              </thead>
              <tbody>
                {normalProjects.map(project => {
                  const projectTotal = days.reduce((sum, day) =>
                    sum + (entries[`${project.id}-${day}`] || 0), 0);
                  return (
                    <tr key={project.id} className="border-b hover:bg-gray-50">
                      <td className="sticky left-0 bg-white px-4 py-2 font-medium text-gray-800">
                        {project.name}
                      </td>
                      {days.map(day => {
                        const key = `${project.id}-${day}`;
                        const val = entries[key] || '';
                        const weekend = isWeekend(year, month, day);
                        const holiday = isHoliday(day);
                        return (
                          <td key={day} className={`px-1 py-1 text-center
                            ${weekend ? 'bg-gray-50' : ''}
                            ${holiday ? 'bg-orange-50' : ''}
                          `}>
                            {!weekend && !holiday && canEdit ? (
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={val}
                                onChange={(e) => handleCellChange(project.id, day, e.target.value)}
                                className="w-10 text-center border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:border-blue-400"
                              />
                            ) : (
                              <span className="text-gray-400 text-xs">
                                {weekend || holiday ? '—' : val || ''}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-center font-semibold text-blue-600">
                        {projectTotal > 0 ? `${projectTotal}h` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="sticky left-0 bg-gray-50 px-4 py-3 text-gray-700">Totale giorno</td>
                  {days.map(day => {
                    const dayTotal = normalProjects.reduce((sum, p) =>
                      sum + (entries[`${p.id}-${day}`] || 0), 0);
                    return (
                      <td key={day} className={`px-1 py-3 text-center text-xs
                        ${isWeekend(year, month, day) ? 'bg-gray-100' : ''}
                        ${isHoliday(day) ? 'bg-orange-100' : ''}
                      `}>
                        {dayTotal > 0 ? <span className="text-blue-600">{dayTotal}</span> : ''}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-blue-600">{totalHours}h</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

{/* Sezione progetti di sistema */}
        {systemProjects.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-700">📋 Assenze & Straordinari</h3>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 bg-white px-4 py-3 text-left font-semibold text-gray-700 min-w-40">
                    Voce
                  </th>
                  {days.map(day => (
                    <th key={day} className={`px-1 py-3 text-center font-medium min-w-10
                      ${isWeekend(year, month, day) ? 'bg-gray-50 text-gray-400' : ''}
                      ${isHoliday(day) ? 'bg-orange-50 text-orange-400' : ''}
                    `}>
                      <div>{day}</div>
                      <div className="text-xs text-gray-400">
                        {['D','L','M','M','G','V','S'][new Date(year, month-1, day).getDay()]}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Tot</th>
                </tr>
              </thead>
              <tbody>
                {systemProjects.map(project => {
                  const projectTotal = days.reduce((sum, day) =>
                    sum + (entries[`${project.id}-${day}`] || 0), 0);
                  return (
                    <tr key={project.id} className="border-b hover:bg-gray-50">
                      <td className="sticky left-0 bg-white px-4 py-2 font-medium text-gray-800">
                        {project.name}
                      </td>
                      {days.map(day => {
                        const key = `${project.id}-${day}`;
                        const val = entries[key] || '';
                        const weekend = isWeekend(year, month, day);
                        const holiday = isHoliday(day);
                        return (
                          <td key={day} className={`px-1 py-1 text-center
                            ${weekend ? 'bg-gray-50' : ''}
                            ${holiday ? 'bg-orange-50' : ''}
                          `}>
                            {!weekend && !holiday && canEdit ? (
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={val}
                                onChange={(e) => handleCellChange(project.id, day, e.target.value)}
                                className="w-10 text-center border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:border-blue-400"
                              />
                            ) : (
                              <span className="text-gray-400 text-xs">
                                {weekend || holiday ? '—' : val || ''}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-center font-semibold text-blue-600">
                        {projectTotal > 0 ? `${projectTotal}h` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="sticky left-0 bg-gray-50 px-4 py-3 text-gray-700">Totale giorno</td>
                  {days.map(day => {
                    const dayTotal = systemProjects.reduce((sum, p) =>
                      sum + (entries[`${p.id}-${day}`] || 0), 0);
                    return (
                      <td key={day} className={`px-1 py-3 text-center text-xs
                        ${isWeekend(year, month, day) ? 'bg-gray-100' : ''}
                        ${isHoliday(day) ? 'bg-orange-100' : ''}
                      `}>
                        {dayTotal > 0 ? <span className="text-blue-600">{dayTotal}</span> : ''}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-blue-600">
                    {systemProjects.reduce((sum, p) =>
                      sum + days.reduce((s, d) => s + (entries[`${p.id}-${d}`] || 0), 0), 0)}h
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Totale generale */}
        <div className="mt-4 bg-blue-50 rounded-xl p-4 flex justify-between items-center">
          <span className="font-semibold text-gray-700">Totale generale (Progetti + Assenze)</span>
          <span className="text-2xl font-bold text-blue-600">
            {Object.values(entries).reduce((sum, h) => sum + (h || 0), 0)}h
          </span>
	</div>
      </div>
    </div>
  );
}