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
const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Il file è troppo grande (max 5MB)');
      return;
    }
    setUploadingLogo(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'TimeFlow');
      const res = await fetch('https://api.cloudinary.com/v1_1/dat6vpnc8/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setForm(f => ({ ...f, logo_url: data.secure_url }));
      } else {
        setUploadError('Errore nel caricamento');
      }
    } catch {
      setUploadError('Errore di connessione');
    } finally {
      setUploadingLogo(false);
    }
  };

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

         {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo aziendale</label>
            
            {/* Upload file */}
            <div className="mb-3">
              <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-4 cursor-pointer 		hover:border-blue-400 hover:bg-blue-50 transition">
                <span className="text-2xl">📁</span>
                <span className="text-sm text-gray-600">
                  {uploadingLogo ? 'Caricamento...' : 'Clicca per caricare un file'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={handleLogoUpload}
                />
              </label>
              {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
            </div>

            {/* URL manuale */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">oppure inserisci URL</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <input
              type="url"
              value={form.logo_url}
              onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="https://esempio.com/logo.png"
            />

            {/* Anteprima + rimozione */}
            {form.logo_url && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={form.logo_url} alt="Logo preview" className="h-10 object-contain"
                    onError={e => { e.target.style.display = 'none'; }} />
                  <span className="text-xs text-gray-500">Logo attuale</span>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  ✕ Rimuovi
                </button>
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