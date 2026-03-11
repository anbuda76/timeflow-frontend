import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganizations, updateOrganization } from '../api/organizations';
import AppHeader from '../components/AppHeader';

export default function Organizations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getOrganizations()
      .then(setOrgs)
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (org) => {
    const updated = await updateOrganization(org.id, { is_active: !org.is_active });
    setOrgs(orgs.map(o => o.id === org.id ? updated : o));
  };

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: orgs.length,
    active: orgs.filter(o => o.is_active).length,
    free: orgs.filter(o => o.subscription_plan === 'free').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-gray-800 mb-6">🏢 Organizzazioni</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-1">Totale</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-gray-500 mt-1">Attive</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-gray-600">{stats.free}</p>
            <p className="text-sm text-gray-500 mt-1">Piano Free</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o slug..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500 text-center py-12">Caricamento...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Azienda</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Slug</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Piano</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Utenti max</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Creata</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Stato</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      Nessuna organizzazione trovata
                    </td>
                  </tr>
                ) : filtered.map(org => (
                  <tr key={org.id} className={`hover:bg-gray-50 ${!org.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {org.logo_url && (
                          <img src={org.logo_url} alt="" className="h-6 w-6 object-contain rounded" />
                        )}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: org.primary_color || '#1d4ed8' }}
                        />
                        <span className="font-medium text-gray-800">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{org.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        org.subscription_plan === 'free'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {org.subscription_plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{org.max_users}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {new Date(org.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        org.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {org.is_active ? 'Attiva' : 'Disattiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(org)}
                        className={`text-xs px-3 py-1 rounded-lg transition ${
                          org.is_active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {org.is_active ? 'Disattiva' : 'Attiva'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}