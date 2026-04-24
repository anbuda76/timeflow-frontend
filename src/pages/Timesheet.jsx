import { useState, useEffect, useCallback } from 'react';
import {
  getTimesheets, getTimesheet, createTimesheet,
  saveEntries, submitTimesheet, getProjects, getHolidays
} from '../api/timesheets';
import { getMyWeekendAuthorizations } from '../api/weekendAuth';
import AppHeader from '../components/AppHeader';

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const isWeekend = (year, month, day) => {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
};
const padDate = (n) => String(n).padStart(2, '0');

const getHoursPerDay = (contractType) => {
  return String(contractType || 'full_time').toLowerCase() === 'part_time' ? 4 : 8;
};

export default function Timesheet() {
  const today = new Date();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const hoursPerDay = getHoursPerDay(currentUser.contract_type);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [timesheet, setTimesheet] = useState(null);
  const [projects, setProjects] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [weekendAuthorizations, setWeekendAuthorizations] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const holidayDates = holidays.map(h => h.holiday_date);
  const weekendAuthDateSet = new Set(weekendAuthorizations.map(a => a.auth_date));
  const systemProjects = projects.filter(p => p.is_system);
  const normalProjects = projects.filter(p => !p.is_system);
  const filteredNormalProjects = [...normalProjects]
    .sort((a, b) => {
      const ca = (a.client_name || '').toLowerCase();
      const cb = (b.client_name || '').toLowerCase();
      if (ca !== cb) return ca < cb ? -1 : 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    })
    .filter(p =>
      (!filterClient || (p.client_name || '').toLowerCase().includes(filterClient.toLowerCase())) &&
      (!filterProject || p.name.toLowerCase().includes(filterProject.toLowerCase()))
    );

  const isHoliday = (day) => {
    const dateStr = `${year}-${padDate(month)}-${padDate(day)}`;
    return holidayDates.includes(dateStr);
  };

  const isWeekendAuthorized = (day) => {
    const dateStr = `${year}-${padDate(month)}-${padDate(day)}`;
    return weekendAuthDateSet.has(dateStr);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTimesheets, projs, hols, myWeekendAuth] = await Promise.all([
        getTimesheets({ year, month }),
        getProjects(),
        getHolidays(year),
        getMyWeekendAuthorizations({ year, month }),
      ]);
      setProjects(projs);
      setHolidays(hols);
      setWeekendAuthorizations(myWeekendAuth);

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
    const weekend = isWeekend(year, month, day);
    const holiday = isHoliday(day);
    if (holiday) return; // le festività restano sempre bloccate
    if (weekend && !isWeekendAuthorized(day)) return; // weekend solo se autorizzato
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
    } catch (err) {
      const detail = err.response?.data?.detail;
      setMessage(typeof detail === 'string' ? detail : '❌ Errore nel salvataggio');
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
    .filter(d => {
      if (isHoliday(d)) return false;
      if (isWeekend(year, month, d)) return isWeekendAuthorized(d);
      return true;
    }).length;
  const expectedHours = workingDays * hoursPerDay;
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
            {(timesheet?.status === 'draft' || timesheet?.status === 'rejected') && (
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
          <div className="bg-white rounded-xl shadow-sm">
            {/* Barra filtri - fuori dalla tabella, non scorre */}
            <div className="flex gap-4 px-4 py-2 border-b border-gray-100">
              <input
                type="text"
                placeholder="Filtra cliente..."
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className="w-40 min-w-[10rem] text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
              />
              <input
                type="text"
                placeholder="Filtra progetto..."
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
                className="w-64 min-w-[16rem] text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
              />
            </div>
            {/* Tabella scrollabile */}
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b-2 border-red-500">
                  <th className="sticky left-0 top-0 z-20 bg-white px-4 py-3 text-left font-semibold text-gray-700 w-40 min-w-[10rem] max-w-[10rem]">
                    Cliente / Sistema
                  </th>
                  <th className="sticky left-40 top-0 z-20 bg-white px-4 py-3 text-left font-semibold text-gray-700 w-64 min-w-[16rem] max-w-[16rem] border-r border-gray-200">
                    Progetto / Voce
                  </th>
                  {days.map(day => (
                    <th key={day} className={`sticky top-0 z-10 px-1 py-3 text-center font-medium min-w-10
                      ${isWeekend(year, month, day) ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                      ${isHoliday(day) ? 'bg-orange-50 text-orange-400' : ''}
                    `}>
                      <div>{day}</div>
                      <div className="text-xs text-gray-400">
                        {['D', 'L', 'M', 'M', 'G', 'V', 'S'][new Date(year, month - 1, day).getDay()]}
                      </div>
                    </th>
                  ))}
                  <th className="sticky top-0 z-10 bg-white px-4 py-3 text-center font-semibold text-gray-700">Tot</th>
                </tr>
              </thead>
              
              {/* Progetti Lavorativi */}
              {normalProjects.length > 0 && (
                <tbody>
                  {filteredNormalProjects.map(project => {
                    const projectTotal = days.reduce((sum, day) =>
                      sum + (entries[`${project.id}-${day}`] || 0), 0);
                    return (
                      <tr key={project.id} className="border-b hover:bg-gray-50">
                        <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-gray-600 w-40 min-w-[10rem] max-w-[10rem] truncate" title={project.client_name}>
                          {project.client_name ? (project.client_name.length > 25 ? project.client_name.substring(0, 25) + '...' : project.client_name) : '—'}
                        </td>
                        <td className="sticky left-40 bg-white px-4 py-2 font-medium text-gray-800 z-10 hover:z-50 w-64 min-w-[16rem] max-w-[16rem] border-r border-gray-200">
                          <span className="relative inline-flex items-center group w-full">
                            <span className="truncate w-full block" title={project.name}>
                              {project.name.length > 50 ? project.name.substring(0, 50) + '...' : project.name}
                            </span>
                            {project.note && (
                              <span
                                className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-72 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg group-hover:block"
                              >
                                <span className="absolute -top-2 left-4 h-3 w-3 rotate-45 border-l border-t border-gray-200 bg-white" />
                                <span className="font-semibold text-gray-800">Note</span>
                                <div className="mt-1 whitespace-pre-wrap text-gray-700">{project.note}</div>
                              </span>
                            )}
                          </span>
                        </td>
                        {days.map(day => {
                          const key = `${project.id}-${day}`;
                          const val = entries[key] || '';
                          const weekend = isWeekend(year, month, day);
                          const holiday = isHoliday(day);
                          const canShowValue = !holiday && (!weekend || isWeekendAuthorized(day));
                          return (
                            <td key={day} className={`px-1 py-1 text-center
                              ${weekend ? 'bg-gray-50' : ''}
                              ${holiday ? 'bg-orange-50' : ''}
                            `}>
                              {canShowValue && canEdit ? (
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
                                  {canShowValue ? (val || '') : '—'}
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
              )}

              {/* Voci di Sistema (Assenze & Straordinari) */}
              {systemProjects.length > 0 && (
                <>
                  <tbody>
                    <tr className="bg-gray-100">
                      <td className="sticky left-0 z-10 bg-gray-100 px-4 py-2 font-semibold text-gray-700 w-40 min-w-[10rem] max-w-[10rem]"></td>
                      <td className="sticky left-40 z-10 bg-gray-100 px-4 py-2 font-semibold text-gray-700 w-64 min-w-[16rem] max-w-[16rem] border-r border-gray-200">
                      </td>
                      <td colSpan={days.length + 1} className="bg-gray-100"></td>
                    </tr>
                  </tbody>
                  <tbody>
                    {systemProjects.map(project => {
                      const projectTotal = days.reduce((sum, day) =>
                        sum + (entries[`${project.id}-${day}`] || 0), 0);
                      return (
                        <tr key={project.id} className="border-b hover:bg-gray-50">
                          <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-gray-400 w-40 min-w-[10rem] max-w-[10rem] text-left">
                            Sistema
                          </td>
                          <td className="sticky left-40 z-10 bg-white px-4 py-2 font-medium text-gray-800 w-64 min-w-[16rem] max-w-[16rem] border-r border-gray-200 truncate" title={project.name}>
                            {(() => {
                              const formatted = project.name.charAt(0).toUpperCase() + project.name.slice(1).toLowerCase();
                              return formatted.length > 50 ? formatted.substring(0, 50) + '...' : formatted;
                            })()}
                          </td>
                          {days.map(day => {
                            const key = `${project.id}-${day}`;
                            const val = entries[key] || '';
                            const weekend = isWeekend(year, month, day);
                            const holiday = isHoliday(day);
                            const canShowValue = !holiday && (!weekend || isWeekendAuthorized(day));
                            return (
                              <td key={day} className={`px-1 py-1 text-center
                                ${weekend ? 'bg-gray-50' : ''}
                                ${holiday ? 'bg-orange-50' : ''}
                              `}>
                                {canShowValue && canEdit ? (
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
                                    {canShowValue ? (val || '') : '—'}
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
                </>
              )}

              {/* Totali */}
              <tfoot>
                {/* Lavorato */}
                {normalProjects.length > 0 && (
                  <tr className="bg-gray-50 font-semibold border-t-[3px] border-gray-300">
                    <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-gray-700 w-40 min-w-[10rem] max-w-[10rem]"></td>
                    <td className="sticky left-40 z-10 bg-gray-50 px-4 py-3 text-gray-800 w-64 min-w-[16rem] max-w-[16rem] border-r border-gray-200 text-right">Totale progetti</td>
                    {days.map(day => {
                      const dayTotal = normalProjects.reduce((sum, p) =>
                        sum + (entries[`${p.id}-${day}`] || 0), 0);
                      return (
                        <td key={day} className={`px-1 py-3 text-center text-xs
                          ${isWeekend(year, month, day) ? 'bg-gray-100' : ''}
                          ${isHoliday(day) ? 'bg-orange-100' : ''}
                        `}>
                          {dayTotal > 0 ? <span className="text-gray-600">{dayTotal}</span> : ''}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-gray-600">
                      {normalProjects.reduce((sum, p) =>
                        sum + days.reduce((s, d) => s + (entries[`${p.id}-${d}`] || 0), 0), 0)}h
                    </td>
                  </tr>
                )}

                {/* Assenze */}
                {systemProjects.length > 0 && (
                  <tr className={`bg-gray-50 font-semibold ${normalProjects.length === 0 ? 'border-t-[3px] border-gray-300' : 'border-t border-gray-200'}`}>
                    <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-gray-700 w-40 min-w-[10rem] max-w-[10rem]"></td>
                    <td className="sticky left-40 z-10 bg-gray-50 px-4 py-3 text-gray-800 w-64 min-w-[16rem] max-w-[16rem] border-r border-gray-200 text-right">Totale assenze</td>
                    {days.map(day => {
                      const dayTotal = systemProjects.reduce((sum, p) =>
                        sum + (entries[`${p.id}-${day}`] || 0), 0);
                      return (
                        <td key={day} className={`px-1 py-3 text-center text-xs
                          ${isWeekend(year, month, day) ? 'bg-gray-100' : ''}
                          ${isHoliday(day) ? 'bg-orange-100' : ''}
                        `}>
                          {dayTotal > 0 ? <span className="text-gray-600">{dayTotal}</span> : ''}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-gray-600">
                      {systemProjects.reduce((sum, p) =>
                        sum + days.reduce((s, d) => s + (entries[`${p.id}-${d}`] || 0), 0), 0)}h
                    </td>
                  </tr>
                )}

                {/* Totale Generale */}
                <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
                  <td className="sticky left-0 z-10 bg-blue-50 px-4 py-3 text-blue-700 w-40 min-w-[10rem] max-w-[10rem]"></td>
                  <td className="sticky left-40 z-10 bg-blue-50 px-4 py-3 text-blue-800 w-64 min-w-[16rem] max-w-[16rem] border-r border-gray-200 text-right">Totale generale</td>
                  {days.map(day => {
                    const dayTotal = [...normalProjects, ...systemProjects].reduce((sum, p) =>
                      sum + (entries[`${p.id}-${day}`] || 0), 0);
                    return (
                      <td key={day} className={`px-1 py-3 text-center text-xs
                        ${isWeekend(year, month, day) ? 'bg-blue-100' : ''}
                        ${isHoliday(day) ? 'bg-orange-100' : ''}
                      `}>
                        {dayTotal > 0 ? <span className="text-blue-700 font-bold">{dayTotal}</span> : ''}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-blue-700 font-bold">
                    {totalHours}h
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        )}

        {timesheet?.rejection_note && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 font-medium">Motivo rifiuto:</p>
            <p className="text-red-600">{timesheet.rejection_note}</p>
          </div>
        )}
      </div>
    </div>
  );
}