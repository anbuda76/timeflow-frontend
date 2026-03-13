import { useState, useEffect } from 'react';
import { getHolidays, createHoliday, deleteHoliday, preloadItalianHolidays } from '../api/holidays';
import AppHeader from '../components/AppHeader';

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

const TYPE_LABELS = {
  national: '🇮🇹 Nazionale',
  company: '🏢 Aziendale',
};

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preloading, setPreloading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    holiday_date: '',
    label: '',
    type: 'company',
  });

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await getHolidays(year);
      setHolidays(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHolidays(); }, [year]);

  const handlePreload = async () => {
    if (!window.confirm(`Caricare le festività nazionali italiane per il ${year}?`)) return;
    setPreloading(true);
    try {
      const added = await preloadItalianHolidays(year);
      setHolidays(prev => [...prev, ...added].sort((a, b) =>
        a.holiday_date.localeCompare(b.holiday_date)
      ));
      setMessage(`✅ Aggiunte ${added.length} festività nazionali`);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('❌ Errore nel caricamento');
    } finally {
      setPreloading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.holiday_date || !form.label) return;
    setSaving(true);
    try {
      const created = await createHoliday(form);
      setHolidays(prev => [...prev, created].sort((a, b) =>
        a.holiday_date.localeCompare(b.holiday_date)
      ));
      setShowModal(false);
      setForm({ holiday_date: '', label: '', type: 'company' });
      setMessage('✅ Festività aggiunta!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setMessage(typeof detail === 'string' ? detail : '❌ Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa festività?')) return;
    try {
      await deleteHoliday(id);
      setHolidays(prev => prev.filter(h => h.id !== id));
      setMessage('✅ Festività eliminata');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('❌ Errore nell\'eliminazione');
    }
  };

  // Raggruppa per mese
    const nationalLoaded = holidays.some(h => h.type === 'national');
    const byMonth = MONTHS.map((monthName, i) => ({
    monthName,
    monthNum: i + 1,
    holidays: holidays.filter(h => {
      const m = parseInt(h.holiday_date.split('-')[1]);
      return m === i + 1;
    }),
  })).filter(m => m.holidays.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Titolo + azioni */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800">📅 Calendario Festività</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setYear(y => y - 1)}
                className="p-1 rounded hover:bg-gray-200"
              >←</button>
              <span className="font-semibold text-gray-700 min-w-16 text-center">{year}</span>
              <button
                onClick={() => setYear(y => y + 1)}
                className="p-1 rounded hover:bg-gray-200"
              >→</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {message && <span className="text-sm">{message}</span>}
            <button
              onClick={handlePreload}
              disabled={preloading || nationalLoaded}
              title={nationalLoaded ? `Festività nazionali già caricate per il ${year}` : `Carica automaticamente le festività nazionali italiane per il ${year}`}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                nationalLoaded
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-70`}
            >
              {preloading ? 'Caricamento...' : nationalLoaded ? `✅ Festività ${year} caricate` : `🇮🇹 Carica festività ${year}`}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              + Aggiungi
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{holidays.length}</p>
            <p className="text-sm text-gray-500">Festività totali</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">
              {holidays.filter(h => h.type === 'national').length}
            </p>
            <p className="text-sm text-gray-500">Nazionali</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-purple-600">
              {holidays.filter(h => h.type === 'company').length}
            </p>
            <p className="text-sm text-gray-500">Aziendali</p>
          </div>
        </div>

        {/* Lista per mese */}
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            Caricamento...
          </div>
        ) : holidays.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-medium">Nessuna festività per il {year}</p>
            <p className="text-sm mt-1">Clicca "🇮🇹 Carica festività {year}" per aggiungere le festività nazionali italiane</p>
          </div>
        ) : (
          <div className="space-y-4">
            {byMonth.map(({ monthName, holidays: mh }) => (
              <div key={monthName} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h2 className="font-semibold text-gray-700">{monthName}</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {mh.map(h => (
                    <div key={h.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-12">
                          <p className="text-lg font-bold text-gray-800">
                            {parseInt(h.holiday_date.split('-')[2])}
                          </p>
                          <p className="text-xs text-gray-400">
                            {['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][new Date(h.holiday_date).getDay()]}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{h.label}</p>
                          <p className="text-xs text-gray-400">{TYPE_LABELS[h.type]}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal aggiungi */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Aggiungi Festività</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  value={form.holiday_date}
                  onChange={e => setForm(f => ({ ...f, holiday_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome festività *</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Chiusura aziendale estiva"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="company">🏢 Aziendale</option>
                  <option value="national">🇮🇹 Nazionale</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setForm({ holiday_date: '', label: '', type: 'company' }); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.holiday_date || !form.label}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvo...' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}