import api from '../api/client';
import { useState, useEffect } from 'react';
import { getTimesheet, reviewTimesheet } from '../api/approvals';
import { getUsers } from '../api/users';
import AppHeader from '../components/AppHeader';

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  draft: 'Bozza',
  submitted: 'In attesa',
  approved: 'Approvato',
  rejected: 'Rifiutato',
};

export default function Approvals() {
  const [timesheets, setTimesheets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTs, setSelectedTs] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [filter, setFilter] = useState('submitted');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/timesheets')
      .then(r => setTimesheets(r.data))
      .catch(err => console.log('ERRORE:', err.response?.status, err.response?.data));
    getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const getUserName = (userId) => {
    const u = users.find(u => u.id === userId);
    return u ? `${u.first_name} ${u.last_name}` : `Utente #${userId}`;
  };

  const filtered = timesheets.filter(ts =>
    filter === 'all' ? true : ts.status === filter
  );

  const openDetail = async (ts) => {
    setDetailLoading(true);
    setSelectedTs(null);
    try {
      const full = await getTimesheet(ts.id);
      setSelectedTs(full);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTs) return;
    setSaving(true);
    try {
      const updated = await reviewTimesheet(selectedTs.id, true, null);
      setTimesheets(prev => prev.map(ts => ts.id === updated.id ? updated : ts));
      setSelectedTs(updated);
      setMessage('✅ Timesheet approvato!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('❌ Errore nell\'approvazione');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionNote.trim()) return;
    setSaving(true);
    try {
      const updated = await reviewTimesheet(selectedTs.id, false, rejectionNote);
      setTimesheets(prev => prev.map(ts => ts.id === updated.id ? updated : ts));
      setSelectedTs(updated);
      setShowRejectModal(false);
      setRejectionNote('');
      setMessage('Timesheet rifiutato');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('❌ Errore nel rifiuto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Caricamento...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-800">✅ Approvazioni Timesheet</h1>
          {message && <span className="text-sm">{message}</span>}
        </div>

        <div className="flex gap-6">
          {/* Lista sinistra */}
          <div className="w-80 flex-shrink-0">
            <div className="flex gap-2 mb-4">
              {['submitted', 'approved', 'rejected', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                    filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300'
                  }`}
                >
                  {f === 'submitted' ? 'In attesa' : f === 'all' ? 'Tutti' : STATUS_LABELS[f]}
                  {f === 'submitted' && (
                    <span className="ml-1 bg-yellow-400 text-white rounded-full px-1.5 text-xs">
                      {timesheets.filter(ts => ts.status === 'submitted').length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">Nessun timesheet</p>
              )}
              {filtered.map(ts => (
                <button
                  key={ts.id}
                  onClick={() => openDetail(ts)}
                  className={`w-full text-left bg-white rounded-xl p-4 shadow-sm border transition hover:border-blue-300 ${
                    selectedTs?.id === ts.id ? 'border-blue-400' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{getUserName(ts.user_id)}</p>
                      <p className="text-xs text-gray-500">{MONTHS[ts.month - 1]} {ts.year}</p>
                      <p className="text-xs text-blue-600 mt-1">{ts.total_hours}h totali</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[ts.status]}`}>
                      {STATUS_LABELS[ts.status]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dettaglio destra */}
          <div className="flex-1">
            {detailLoading && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                Caricamento dettaglio...
              </div>
            )}

            {!detailLoading && !selectedTs && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                Seleziona un timesheet dalla lista per visualizzarlo
              </div>
            )}

            {!detailLoading && selectedTs && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">
                      {getUserName(selectedTs.user_id)}
                    </h2>
                    <p className="text-gray-500">{MONTHS[selectedTs.month - 1]} {selectedTs.year}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[selectedTs.status]}`}>
                    {STATUS_LABELS[selectedTs.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedTs.total_hours}h</p>
                    <p className="text-sm text-gray-500">Ore totali</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-700">{selectedTs.entries?.length || 0}</p>
                    <p className="text-sm text-gray-500">Giorni lavorati</p>
                  </div>
                </div>

                {selectedTs.notes && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600"><strong>Note:</strong> {selectedTs.notes}</p>
                  </div>
                )}

                {selectedTs.rejection_note && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700"><strong>Motivo rifiuto:</strong> {selectedTs.rejection_note}</p>
                  </div>
                )}

                {selectedTs.entries && selectedTs.entries.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Ore per giorno</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left text-gray-600">Data</th>
                            <th className="px-3 py-2 text-left text-gray-600">Progetto</th>
                            <th className="px-3 py-2 text-right text-gray-600">Ore</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTs.entries
                            .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
                            .map(entry => (
                            <tr key={entry.id} className="border-b">
                              <td className="px-3 py-2 text-gray-700">{entry.entry_date}</td>
                              <td className="px-3 py-2 text-gray-600">Progetto #{entry.project_id}</td>
                              <td className="px-3 py-2 text-right font-medium text-blue-600">{entry.hours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedTs.status === 'submitted' && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={saving}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      ✅ Approva
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={saving}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                    >
                      ❌ Rifiuta
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Rifiuto */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Rifiuta Timesheet</h2>
            <p className="text-sm text-gray-500 mb-4">Indica il motivo del rifiuto — sarà visibile al dipendente.</p>
            <textarea
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 h-24 resize-none"
              placeholder="es. Mancano le ore del 15 marzo..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowRejectModal(false); setRejectionNote(''); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleReject}
                disabled={saving || !rejectionNote.trim()}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
              >
                {saving ? 'Invio...' : 'Conferma rifiuto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}