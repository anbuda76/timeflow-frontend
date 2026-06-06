import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import AppHeader from '../components/AppHeader';

// Descrizioni tooltip per ogni card
const TOOLTIPS = {
  '/settings':                'Configura parametri aziendali, tariffe orarie e preferenze generali del sistema.',
  '/users':                   'Gestisci gli utenti: crea account, assegna ruoli e manager, attiva o disattiva profili.',
  '/projects':                'Crea e gestisci i progetti: clienti, budget ore e importi, stato di avanzamento.',
  '/calendar':                'Visualizza e gestisci il calendario aziendale: festività, ponti e giorni lavorativi.',
  '/weekend-authorizations':  'Rivedi e approva le richieste di lavoro nei weekend e nei giorni festivi.',
  '/approvals':               'Revisiona e approva (o rifiuta) i timesheet inviati dal team.',
  '/reports':                 'Analizza i costi per progetto e utente: snapshot annuale/mensile e andamento cumulato.',
  '/organizations':           'Gestisci le organizzazioni registrate nella piattaforma.',
  '/timesheet':               'Compila e invia il tuo timesheet mensile con le ore lavorate per progetto.',
};

// Colori accent per categoria
const ACCENT = {
  top:       'border-blue-400  group-hover:border-blue-500  group-hover:shadow-blue-100',
  anagrafica:'border-indigo-400 group-hover:border-indigo-500 group-hover:shadow-indigo-100',
  operativa: 'border-emerald-400 group-hover:border-emerald-500 group-hover:shadow-emerald-100',
  default:   'border-gray-300  group-hover:border-blue-400  group-hover:shadow-blue-100',
};

function DashCard({ icon, label, path, accent = 'default', navigate }) {
  const [showTip, setShowTip] = useState(false);
  const tip = TOOLTIPS[path];

  return (
    <div className="relative">
      <button
        onClick={() => navigate(path)}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className={`
          group w-full bg-white rounded-2xl border-2 p-6 text-left
          shadow-sm transition-all duration-200
          hover:shadow-lg hover:-translate-y-0.5 hover:bg-gradient-to-br hover:from-white hover:to-slate-50
          ${ACCENT[accent]}
        `}
      >
        <span className="text-3xl block mb-3 transition-transform duration-200 group-hover:scale-110">{icon}</span>
        <p className="font-semibold text-gray-800 text-sm leading-snug">{label}</p>
        <span className="mt-2 block text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          Vai →
        </span>
      </button>

      {/* Tooltip */}
      {showTip && tip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none">
          {tip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

function SectionDivider({ title }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const role = user?.role;

  // Layout strutturato per ruolo
  const layouts = {
    admin: {
      top: [
        { icon: '⚙️', label: 'Impostazioni', path: '/settings', accent: 'top' },
      ],
      anagrafiche: [
        { icon: '👥', label: 'Utenti',                    path: '/users',                   accent: 'anagrafica' },
        { icon: '📁', label: 'Progetti',                  path: '/projects',                accent: 'anagrafica' },
        { icon: '📅', label: 'Calendario',                path: '/calendar',                accent: 'anagrafica' },
        { icon: '🗓', label: 'Autorizzazioni Weekend',    path: '/weekend-authorizations',  accent: 'anagrafica' },
      ],
      operative: [
        { icon: '✅', label: 'Approvazioni',   path: '/approvals', accent: 'operativa' },
        { icon: '📊', label: 'Report Costi',   path: '/reports',   accent: 'operativa' },
      ],
    },
    super_admin: {
      top: [
        { icon: '🏢', label: 'Organizzazioni', path: '/organizations', accent: 'top' },
      ],
      anagrafiche: [
        { icon: '👥', label: 'Utenti',                    path: '/users',                   accent: 'anagrafica' },
        { icon: '📁', label: 'Progetti',                  path: '/projects',                accent: 'anagrafica' },
        { icon: '📅', label: 'Calendario',                path: '/calendar',                accent: 'anagrafica' },
        { icon: '🗓', label: 'Autorizzazioni Weekend',    path: '/weekend-authorizations',  accent: 'anagrafica' },
      ],
      operative: [
        { icon: '📊', label: 'Report Costi', path: '/reports', accent: 'operativa' },
      ],
    },
    manager: {
      operative: [
        { icon: '✅', label: 'Approvazioni',        path: '/approvals',  accent: 'operativa' },
        { icon: '⏱',  label: 'Il Mio Timesheet',   path: '/timesheet',  accent: 'operativa' },
        { icon: '📊', label: 'Report Costi',        path: '/reports',    accent: 'operativa' },
      ],
    },
    employee: {
      operative: [
        { icon: '⏱', label: 'Il Mio Timesheet', path: '/timesheet', accent: 'operativa' },
      ],
    },
  };

  const layout = layouts[role] || layouts.employee;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">

        <h2 className="text-2xl font-bold text-gray-800 mb-1">
          Benvenuto, {user?.first_name}! 👋
        </h2>
        <p className="text-sm text-gray-400 mb-6">Seleziona una sezione per iniziare.</p>

        {/* Card in evidenza (es. Impostazioni / Organizzazioni) */}
        {layout.top && (
          <div className="grid grid-cols-1 gap-4 mb-2">
            {layout.top.map(item => (
              <DashCard key={item.path} {...item} navigate={navigate} />
            ))}
          </div>
        )}

        {/* Sezione Anagrafiche */}
        {layout.anagrafiche && (
          <>
            <SectionDivider title="Anagrafiche" />
            <div className="grid grid-cols-2 gap-4">
              {layout.anagrafiche.map(item => (
                <DashCard key={item.path} {...item} navigate={navigate} />
              ))}
            </div>
          </>
        )}

        {/* Sezione Operative */}
        {layout.operative && (
          <>
            <SectionDivider title="Operative" />
            <div className="grid grid-cols-2 gap-4">
              {layout.operative.map(item => (
                <DashCard key={item.path} {...item} navigate={navigate} />
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  );
}
