import { useEffect, useMemo, useState } from 'react';
import AppHeader from '../components/AppHeader';
import { getUsers } from '../api/users';
import {
  getWeekendAuthorizations,
  createWeekendAuthorization,
  deleteWeekendAuthorization,
} from '../api/weekendAuth';

const padDate = (n) => String(n).padStart(2, '0');

const isoDate = (d) => `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;

const addDaysIso = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
};

const getFirstSaturdayOfMonth = (year, month) => {
  // month: 1-12
  const d = new Date(year, month - 1, 1);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1); // JS: 6 = Saturday
  return isoDate(d);
};

export default function WeekendAuthorizations() {
  const today = new Date();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [saturdayDate, setSaturdayDate] = useState(() => getFirstSaturdayOfMonth(today.getFullYear(), today.getMonth() + 1));
  const [note, setNote] = useState('');

  const [authorizations, setAuthorizations] = useState([]);
  const [loadingAuths, setLoadingAuths] = useState(false);
  const [message, setMessage] = useState('');

  const selectedYear = useMemo(() => parseInt((saturdayDate || '').split('-')[0] || '0', 10), [saturdayDate]);
  const selectedMonth = useMemo(() => parseInt((saturdayDate || '').split('-')[1] || '0', 10), [saturdayDate]);

  const refreshAuthorizations = async () => {
    if (!selectedYear || !selectedMonth) return;
    setLoadingAuths(true);
    try {
      const res = await getWeekendAuthorizations({ year: selectedYear, month: selectedMonth });
      setAuthorizations(res);
    } catch {
      setMessage('❌ Errore nel caricamento autorizzazioni');
    } finally {
      setLoadingAuths(false);
    }
  };

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    refreshAuthorizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth]);

  const monthAuthorizationsForUser = useMemo(() => {
    if (!selectedUserId) return [];
    return authorizations.filter(a => String(a.user_id) === String(selectedUserId));
  }, [authorizations, selectedUserId]);

  const handleCreateWeekend = async () => {
    if (!selectedUserId) {
      setMessage('Seleziona un utente');
      return;
    }
    if (!saturdayDate) {
      setMessage('Seleziona un sabato');
      return;
    }

    const sat = new Date(`${saturdayDate}T00:00:00`);
    if (sat.getDay() !== 6) {
      setMessage('La data selezionata deve essere un sabato');
      return;
    }
    const sun = addDaysIso(saturdayDate, 1);

    setMessage('');
    try {
      const payloadBase = { user_id: parseInt(selectedUserId, 10), note: note ? note : undefined };
      await createWeekendAuthorization({ ...payloadBase, auth_date: saturdayDate });
      await createWeekendAuthorization({ ...payloadBase, auth_date: sun });
      setMessage('✅ Weekend autorizzato');
      setTimeout(() => setMessage(''), 2500);
      await refreshAuthorizations();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setMessage(typeof detail === 'string' ? detail : '❌ Errore nella creazione autorizzazioni');
    }
  };

  const handleDelete = async (authId) => {
    if (!window.confirm('Eliminare questa autorizzazione?')) return;
    try {
      await deleteWeekendAuthorization(authId);
      setMessage('✅ Autorizzazione eliminata');
      setTimeout(() => setMessage(''), 2000);
      await refreshAuthorizations();
    } catch {
      setMessage('❌ Errore nell\'eliminazione');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">🗓 Weekend autorizzazioni</h1>
          <p className="text-sm text-gray-500 mt-1">
            Abilita sabato + domenica per utenti specifici (le festività restano sempre bloccate).
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Utente</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sabato</label>
              <input
                type="date"
                value={saturdayDate}
                onChange={(e) => setSaturdayDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nota (opzionale)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="es. Cambio turno"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreateWeekend}
              disabled={loadingAuths || loadingUsers}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Abilita weekend
            </button>
            {message && <span className="text-sm self-center">{message}</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-800">
              Autorizzazioni per {selectedMonth ? selectedMonth.toString().padStart(2, '0') : '??'}/{selectedYear || '????'}
            </h2>
          </div>

          {loadingUsers ? (
            <div className="p-6 text-center text-gray-500">Caricamento utenti...</div>
          ) : loadingAuths ? (
            <div className="p-6 text-center text-gray-500">Caricamento autorizzazioni...</div>
          ) : (
            <div className="p-4">
              {selectedUserId ? (
                monthAuthorizationsForUser.length === 0 ? (
                  <div className="text-gray-500 text-sm">Nessuna autorizzazione per questo utente nel mese.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-semibold text-gray-700">Data</th>
                          <th className="text-left py-2 pr-4 font-semibold text-gray-700">Nota</th>
                          <th className="py-2 font-semibold text-gray-700">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthAuthorizationsForUser
                          .slice()
                          .sort((a, b) => String(a.auth_date).localeCompare(String(b.auth_date)))
                          .map(auth => (
                            <tr key={auth.id} className="border-b last:border-b-0">
                              <td className="py-2 pr-4 text-gray-800">{auth.auth_date}</td>
                              <td className="py-2 pr-4 text-gray-600">{auth.note || '—'}</td>
                              <td className="py-2">
                                <button
                                  onClick={() => handleDelete(auth.id)}
                                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                  Elimina
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="text-gray-500 text-sm">Seleziona un utente per vedere le autorizzazioni.</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

