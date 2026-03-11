import { useState, useEffect } from 'react';
import { getMyOrganization, updateMyOrganization } from '../api/register';
import { useBrand } from '../context/BrandContext';
import AppHeader from '../components/AppHeader';

const PRESET_COLORS = [
  '#1d4ed8', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#db2777', '#374151',
];

export default function Settings() {
  const { refreshBrand } = useBrand();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    primary_color: '#1d4ed8',
    logo_url: '',
  });

  useEffect(() => {
    getMyOrganization()
      .then(data => {
        setOrg(data);
        setForm({
          name: data.name,
          primary_color: data.primary_color || '#1d4ed8',
          logo_url: data.logo_url || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateMyOrganization({
        name: form.name,
        primary_color: form.primary_color,
        logo_url: form.logo_url || null,
      });
      setOrg(updated);
      await refreshBrand();
      setMessage('✅ Impostazioni salvate!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Errore nel salvataggio');
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

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">⚙️ Impostazioni Azienda</h1>
          {message && <span className="text-sm">{message}</span>}
        </div>

        {/* Anteprima header con colore scelto */}
        <div className="mb-6 rounded-xl overflow-hidden shadow-sm">
          <div style={{ backgroundColor: form.primary_color }} className="px-6 py-4 flex items-center gap-3">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="h-8 object-contain"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <span className="text-white font-bold text-lg">⏱ {form.name || 'TimeFlow'}</span>
            )}
            <span className="text-white opacity-60 text-sm ml-auto">Anteprima</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Nome azienda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome azienda</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo</label>
            <input
              type="url"
              value={form.logo_url}
              onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://esempio.com/logo.png"
            />
            <p className="text-xs text-gray-400 mt-1">
              Inserisci l'URL pubblico del tuo logo. Puoi usare imgur.com per ospitare l'immagine.
            </p>
            {form.logo_url && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Anteprima logo:</p>
                <img src={form.logo_url} alt="Logo preview" className="h-12 object-contain"
                  onError={e => { e.target.style.display = 'none'; }} />
              </div>
            )}
          </div>

          {/* Colore primario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Colore header</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(f => ({ ...f, primary_color: color }))}
                  style={{ backgroundColor: color }}
                  className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                    form.primary_color === color ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="w-12 h-10 rounded cursor-pointer border border-gray-300"
              />
              <span className="text-sm text-gray-600">Colore personalizzato: {form.primary_color}</span>
            </div>
          </div>

          {/* Info piano */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Piano attuale</p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
                {org?.subscription_plan || 'free'}
              </span>
              <span className="text-sm text-gray-500">Max {org?.max_users} utenti</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? 'Salvataggio...' : '💾 Salva impostazioni'}
          </button>
        </div>
      </div>
    </div>
  );
}