import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import AppHeader from '../components/AppHeader';

// Descrizioni tooltip per ogni card
const TOOLTIPS = {
  '/settings':                'Configura parametri aziendali e preferenze generali del sistema.',
  '/users':                   'Gestisci gli utenti: crea account, assegna ruoli, attiva o disattiva profili.',
  '/projects':                'Gestisci i progetti: crea i progetti, i clienti, i budget ore e importi, attiva o disattiva profili, assegna le risorse al progetto.',
  '/calendar':                'Gestisci il calendario aziendale: festività, ponti e giorni lavorativi.',
  '/weekend-authorizations':  'Gestisci le richieste di lavoro nei weekend e nei giorni festivi.',
  '/approvals':               'Gestisci i timesheet: visualizza e approva (o rifiuta) i timesheet inviati dal team.',
  '/reports':                 'Neo Insight: reportistica timesheet (KPI per stato, dettaglio utenti) e analisi costi per progetto con snapshot e andamento mensile.',
  '/organizations':           'Gestisci le organizzazioni registrate nella piattaforma.',
  '/timesheet':               'Compila e invia il tuo timesheet mensile con le ore lavorate per progetto.',
};

function DashCard({ icon, label, path, navigate }) {
  const [showTip, setShowTip] = useState(false);
  const tip = TOOLTIPS[path];

  return (
    <div className="relative">
      <button
        onClick={() => navigate(path)}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className="group w-full bg-white rounded-2xl border border-gray-200 p-6 text-left shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:bg-gradient-to-br hover:from-white hover:to-slate-50 hover:border-gray-300"
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
      operative: [
        { icon: '✅', label: 'Approvazioni', path: '/approvals' },
        { icon: '🔬', label: 'Neo Insight',  path: '/reports'   },
      ],
      anagrafiche: [
        { icon: '👥', label: 'Utenti',                 path: '/users'                  },
        { icon: '📁', label: 'Progetti',               path: '/projects'               },
        { icon: '📅', label: 'Calendario',             path: '/calendar'               },
        { icon: '🗓', label: 'Autorizzazioni Weekend', path: '/weekend-authorizations' },
      ],
      setup: [
        { icon: '⚙️', label: 'Impostazioni', path: '/settings' },
      ],
    },
    super_admin: {
      operative: [
        { icon: '🔬', label: 'Neo Insight', path: '/reports' },
      ],
      anagrafiche: [
        { icon: '👥', label: 'Utenti',                 path: '/users'                  },
        { icon: '📁', label: 'Progetti',               path: '/projects'               },
        { icon: '📅', label: 'Calendario',             path: '/calendar'               },
        { icon: '🗓', label: 'Autorizzazioni Weekend', path: '/weekend-authorizations' },
      ],
      setup: [
        { icon: '🏢', label: 'Organizzazioni', path: '/organizations' },
      ],
    },
    manager: {
      operative: [
        { icon: '✅', label: 'Approvazioni',      path: '/approvals' },
        { icon: '⏱',  label: 'Il Mio Timesheet', path: '/timesheet' },
        { icon: '🔬', label: 'Neo Insight',       path: '/reports'   },
      ],
    },
    employee: {
      operative: [
        { icon: '⏱', label: 'Il Mio Timesheet', path: '/timesheet' },
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

        {/* Sezione Setup */}
        {layout.setup && (
          <>
            <SectionDivider title="Setup" />
            <div className="grid grid-cols-1 gap-4">
              {layout.setup.map(item => (
                <DashCard key={item.path} {...item} navigate={navigate} />
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  );
}
