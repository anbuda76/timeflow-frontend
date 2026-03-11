import { useState, useEffect } from 'react';
import { getProjects, createProject, updateProject, assignUser, unassignUser } from '../api/projects';
import { getUsers } from '../api/users';
import AppHeader from '../components/AppHeader';

const emptyForm = { name: '', client_name: '', budget_hours: '' };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [assignProject, setAssignProject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([getProjects(), getUsers()])
      .then(([projs, usrs]) => { setProjects(projs); setUsers(usrs); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    `${p.name} ${p.client_name || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditProject(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditProject(project);
    setForm({
      name: project.name,
      client_name: project.client_name || '',
      budget_hours: project.budget_hours || '',
    });
    setError('');
    setShowModal(true);
  };

  const openAssign = (project) => {
    setAssignProject(project);
    setShowAssignModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const data = {
        name: form.name,
        client_name: form.client_name || null,
        budget_hours: form.budget_hours ? parseFloat(form.budget_hours) : null,
      };
      if (editProject) {
        const updated = await updateProject(editProject.id, data);
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await createProject(data);
        setProjects(prev => [...prev, created]);
      }
      setShowModal(false);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (project) => {
    try {
      const updated = await updateProject(project.id, { is_active: !project.is_active });
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch {
      alert('Errore nell\'aggiornamento');
    }
  };

  const handleAssign = async (userId) => {
    try {
      await assignUser(assignProject.id, userId);
      const updated = await getProjects();
      setProjects(updated);
      setAssignProject(updated.find(p => p.id === assignProject.id));
    } catch {
      alert('Errore nell\'assegnazione');
    }
  };

  const handleUnassign = async (userId) => {
    try {
      await unassignUser(assignProject.id, userId);
      const updated = await getProjects();
      setProjects(updated);
      setAssignProject(updated.find(p => p.id === assignProject.id));
    } catch {
      alert('Errore nella rimozione');
    }
  };

  const budgetPercent = (project) => {
    if (!project.budget_hours || !project.used_hours) return 0;
    return Math.min(100, Math.round((project.used_hours / project.budget_hours) * 100));
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
          <h1 className="text-xl font-bold text-gray-800">📁 Gestione Progetti</h1>
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            + Nuovo Progetto
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Cerca per nome o cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-6 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
            <p className="text-sm text-gray-500">Progetti totali</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">{projects.filter(p => p.is_active).length}</p>
            <p className="text-sm text-gray-500">Attivi</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-500">
              {projects.reduce((sum, p) => sum + (p.used_hours || 0), 0)}h
            </p>
            <p className="text-sm text-gray-500">Ore totali lavorate</p>
          </div>
        </div>

        {/* Progetti cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(project => {
            const percent = budgetPercent(project);
            const isOver = percent >= 90;
            return (
              <div key={project.id} className={`bg-white rounded-xl shadow-sm p-5 border ${!project.is_active ? 'opacity-60' : 'border-transparent'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{project.name}</h3>
                    {project.client_name && (
                      <p className="text-sm text-gray-500">{project.client_name}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {project.is_active ? 'Attivo' : 'Chiuso'}
                  </span>
                </div>

                {project.budget_hours && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{project.used_hours || 0}h usate</span>
                      <span>{project.budget_hours}h budget</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
                      {percent}% del budget utilizzato
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openEdit(project)}
                    className="flex-1 text-sm border border-gray-300 text-gray-700 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    onClick={() => openAssign(project)}
                    className="flex-1 text-sm border border-blue-300 text-blue-700 py-1.5 rounded-lg hover:bg-blue-50"
                  >
                    👥 Assegna
                  </button>
                  <button
                    onClick={() => handleToggleActive(project)}
                    className={`text-sm px-3 py-1.5 rounded-lg ${
                      project.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {project.is_active ? '🔒' : '🔓'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">Nessun progetto trovato</div>
        )}
      </div>

      {/* Modal Crea/Modifica */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editProject ? 'Modifica Progetto' : 'Nuovo Progetto'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome progetto *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Sito web cliente"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Acme SRL"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Budget ore</label>
                <input
                  type="number"
                  min="0"
                  value={form.budget_hours}
                  onChange={e => setForm(f => ({ ...f, budget_hours: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 160"
                />
              </div>
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
                disabled={saving || !form.name}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvo...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assegnazione */}
      {showAssignModal && assignProject && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-1">👥 Assegna utenti</h2>
            <p className="text-sm text-gray-500 mb-4">{assignProject.name}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.filter(u => u.is_active).map(user => {
                const assigned = assignProject.assignments?.some(a => a.user_id === user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    <button
                      onClick={() => assigned ? handleUnassign(user.id) : handleAssign(user.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                        assigned ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      }`}
                    >
                      {assigned ? 'Rimuovi' : 'Assegna'}
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowAssignModal(false)}
              className="w-full mt-4 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}