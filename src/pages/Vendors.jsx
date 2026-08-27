import { useState, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { getVendors, createVendor, updateVendor, deleteVendor, getVendorCosts, createVendorCost, updateVendorCost, deleteVendorCost } from '../api/vendors';
import { getProjects } from '../api/projects';

const formatCurrency = (val) =>
  val != null ? `€${parseFloat(val).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const emptyVendor = { name: '', tax_id: '', category: '', contact_email: '', contact_phone: '', notes: '', is_active: true };
const emptyCost   = { vendor_id: '', project_id: '', amount: '', cost_date: '', description: '', category: '' };

// ── Modale generica ──────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── TAB ALBO FORNITORI ───────────────────────────────────────────────────────
function TabAlbo() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyVendor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getVendors().then(setVendors).finally(() => setLoading(false));
  }, []);

  const filtered = vendors.filter(v =>
    `${v.name} ${v.tax_id || ''} ${v.category || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm(emptyVendor); setError(''); setShowModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({ name: v.name, tax_id: v.tax_id || '', category: v.category || '', contact_email: v.contact_email || '', contact_phone: v.contact_phone || '', notes: v.notes || '', is_active: v.is_active });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Il nome è obbligatorio'); return; }
    setSaving(true); setError('');
    try {
      const data = {
        name: form.name.trim(),
        tax_id: form.tax_id || null,
        category: form.category || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        notes: form.notes || null,
        is_active: form.is_active,
      };
      if (editing) {
        await updateVendor(editing.id, data);
        setVendors(vs => vs.map(v => v.id === editing.id ? { ...v, ...data } : v));
      } else {
        const created = await createVendor(data);
        setVendors(vs => [...vs, { ...data, id: created.id, created_at: new Date().toISOString() }]);
      }
      setShowModal(false);
    } catch { setError('Errore nel salvataggio'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (v) => {
    if (!confirm(`Eliminare il fornitore "${v.name}"?`)) return;
    await deleteVendor(v.id);
    setVendors(vs => vs.filter(x => x.id !== v.id));
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca fornitore…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
        <span className="text-xs text-gray-400">{filtered.length} fornitori</span>
        <button onClick={openCreate} className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + Nuovo Fornitore
        </button>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Caricamento…</p> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400">Nessun fornitore trovato</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Ragione Sociale</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">P.IVA / CF</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Categoria</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Contatto</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Stato</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{v.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{v.tax_id || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.contact_email || v.contact_phone || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.is_active ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <button onClick={() => openEdit(v)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Modifica</button>
                    <button onClick={() => handleDelete(v)} className="text-red-400 hover:text-red-600 text-xs font-medium">Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Modifica Fornitore' : 'Nuovo Fornitore'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ragione Sociale *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {field('P.IVA / Codice Fiscale', 'tax_id', 'text', 'es. IT01234567890')}
            {field('Categoria', 'category', 'text', 'es. Consulenza, Software, Trasferta…')}
            {field('Email', 'contact_email', 'email')}
            {field('Telefono', 'contact_phone', 'tel')}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              Fornitore attivo
            </label>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Annulla</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── TAB COSTI ESTERNI ────────────────────────────────────────────────────────
function TabCosti() {
  const [costs, setCosts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCost);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getVendorCosts(), getVendors(), getProjects()])
      .then(([c, v, p]) => {
        setCosts(c);
        setVendors(v.filter(x => x.is_active));
        setProjects(p.filter(x => !x.is_system && x.is_active !== false));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = costs.filter(c => {
    if (filterProject && c.project_id !== parseInt(filterProject)) return false;
    if (filterVendor  && c.vendor_id  !== parseInt(filterVendor))  return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, c) => s + (c.amount || 0), 0);

  const openCreate = () => { setEditing(null); setForm(emptyCost); setError(''); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ vendor_id: c.vendor_id, project_id: c.project_id, amount: c.amount, cost_date: c.cost_date || '', description: c.description || '', category: c.category || '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.vendor_id) { setError('Seleziona un fornitore'); return; }
    if (!form.project_id) { setError('Seleziona un progetto'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Inserisci un importo valido'); return; }
    setSaving(true); setError('');
    try {
      const data = {
        vendor_id: parseInt(form.vendor_id),
        project_id: parseInt(form.project_id),
        amount: parseFloat(form.amount),
        cost_date: form.cost_date || null,
        description: form.description || null,
        category: form.category || null,
      };
      if (editing) {
        await updateVendorCost(editing.id, data);
        const vName = vendors.find(v => v.id === data.vendor_id)?.name || '—';
        const pName = projects.find(p => p.id === data.project_id)?.name || '—';
        setCosts(cs => cs.map(c => c.id === editing.id ? { ...c, ...data, vendor_name: vName, project_name: pName } : c));
      } else {
        const created = await createVendorCost(data);
        const vName = vendors.find(v => v.id === data.vendor_id)?.name || '—';
        const pName = projects.find(p => p.id === data.project_id)?.name || '—';
        setCosts(cs => [{ ...data, id: created.id, vendor_name: vName, project_name: pName, created_at: new Date().toISOString() }, ...cs]);
      }
      setShowModal(false);
    } catch { setError('Errore nel salvataggio'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Eliminare questo costo (${formatCurrency(c.amount)})?`)) return;
    await deleteVendorCost(c.id);
    setCosts(cs => cs.filter(x => x.id !== c.id));
  };

  return (
    <div>
      {/* Filtri */}
      <div className="flex flex-wrap gap-3 items-end mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Progetto</label>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tutti i progetti</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fornitore</label>
          <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tutti i fornitori</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        {(filterProject || filterVendor) && (
          <button onClick={() => { setFilterProject(''); setFilterVendor(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 pb-1">✕ Cancella</button>
        )}
        <div className="ml-auto flex items-end gap-4">
          <span className="text-sm font-semibold text-blue-700 pb-1">
            Totale: {formatCurrency(totalFiltered)}
          </span>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            + Nuovo Costo
          </button>
        </div>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Caricamento…</p> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400">Nessun costo trovato</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Fornitore</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Progetto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Categoria</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Descrizione</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Data</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Importo €</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.vendor_name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.project_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{c.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.cost_date || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <button onClick={() => openEdit(c)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Modifica</button>
                    <button onClick={() => handleDelete(c)} className="text-red-400 hover:text-red-600 text-xs font-medium">Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Modifica Costo' : 'Nuovo Costo Esterno'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fornitore *</label>
              <select value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleziona fornitore…</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Progetto *</label>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleziona progetto…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.client_name ? ` — ${p.client_name}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Importo € *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data <span className="text-gray-400">(opzionale)</span></label>
              <input type="date" value={form.cost_date} onChange={e => setForm(f => ({ ...f, cost_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Categoria <span className="text-gray-400">(opzionale)</span></label>
              <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="es. Subappalto, Materiali, Trasferta…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrizione <span className="text-gray-400">(opzionale)</span></label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Annulla</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── PAGINA PRINCIPALE ────────────────────────────────────────────────────────
export default function Vendors() {
  const [tab, setTab] = useState('albo');

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🏢 Fornitori</h1>
          <p className="text-sm text-gray-400 mt-1">Albo fornitori e costi esterni su progetto</p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { id: 'albo',  label: '📋 Albo Fornitori' },
            { id: 'costi', label: '💶 Costi Esterni'   },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-6 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                tab === t.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'albo'  && <TabAlbo />}
        {tab === 'costi' && <TabCosti />}
      </div>
    </div>
  );
}
