import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, createUser, updateUser } from '../api/users';

const ROLES = ['employee', 'manager', 'admin'];
const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-green-100 text-green-700',
  employee: 'bg-gray-100 text-gray-600',
};

const emptyForm = {
  first_name: '', last_name: '', email: '',
  password: '', role: 'employee', hourly_rate: '', manager_id: '',
};

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
      role: user.role,
      hourly_rate: user.hourly_rate || '',
      manager_id: user.manager_id || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editUser && form.password.length < 8) {
      setError('La password deve avere almeno 8 caratteri');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editUser) {
        const data = {
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
          manager_id: form.manager_id ? parseInt(form.manager_id) : null,
          is_active: editUser.is_active,
        };
        const updated = await updateUser(editUser.id, data);
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      } else {
        const data = {
          ...form,
          hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
          manager_id: form.manager_id ? parseInt(form.manager_id) : null,
        };
        const created = await createUser(data);
        setUsers(prev => [...prev, created]);
      }
      setShowModal(false);
    } catch (err) {
      const detail = err.response?.data?.detail;
      console.log('Errore API:', JSON.stringify(err.response?.data));
      setError(typeof detail === 'string' ? detail : 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const updated = await updateUser(user.id, { is_active: !user.is_active });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch (err) {
      alert('Errore nell\'aggiornamento');
    }
  };

  const getManagerName = (managerId) => {
    const m = users.find(u => u.id === managerId);
    return m ? `${m.first_name} ${m.last_name}` : '—';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Caricamento...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600">
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold text-blue-600">👥 Gestione Utenti</h1>
          </div>
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            + Nuovo Utente
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-6 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{users.length}</p>
            <p className="text-sm text-gray-500">Utenti totali</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">{users.filter(u => u.is_active).length}</p>
            <p className="text-sm text-gray-500">Attivi</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-500">{users.filter(u => !u.is_active).length}</p>
            <p className="text-sm text-gray-500">Disattivati</p>
          </div>
        </div>

        {/* Tabella */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Ruolo</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Manager</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Costo/h</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Stato</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.manager_id ? getManagerName(user.manager_id) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.hourly_rate ? `€${user.hourly_rate}/h` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {user.is_active ? 'Attivo' : 'Disattivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`text-xs font-medium ${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {user.is_active ? 'Disattiva' : 'Attiva'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">Nessun utente trovato</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editUser ? 'Modifica Utente' : 'Nuovo Utente'}
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cognome</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  disabled={!!editUser}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              {!editUser && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      form.password && form.password.length < 8
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {form.password && form.password.length < 8 && (
                    <p className="text-red-500 text-xs mt-1">
                      Minimo 8 caratteri ({form.password.length}/8)
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ruolo</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value, manager_id: '' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Costo orario (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.hourly_rate}
                    onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="es. 35"
                  />
                </div>
              </div>

              {form.role === 'employee' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Manager</label>
                  <select
                    value={form.manager_id || ''}
                    onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Nessun manager —</option>
                    {users.filter(u => u.role === 'manager' || u.role === 'admin' || u.role === 'super_admin').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvo...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}