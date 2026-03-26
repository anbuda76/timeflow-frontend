import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import AppHeader from '../components/AppHeader';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const menuItems = {
    super_admin: [
      { label: '🏢 Organizzazioni', path: '/organizations' },
      { label: '👥 Utenti', path: '/users' },
      { label: '📁 Progetti', path: '/projects' },
      { label: '📊 Report Costi', path: '/reports' },
      { label: '🗓 Weekend autorizzazioni', path: '/weekend-authorizations' },
    ],
    admin: [
      { label: '👥 Utenti', path: '/users' },
      { label: '📁 Progetti', path: '/projects' },
      { label: '✅ Approvazioni', path: '/approvals' },
      { label: '📊 Report Costi', path: '/reports' },
      { label: '📅 Calendario', path: '/calendar' },
      { label: '🗓 Weekend autorizzazioni', path: '/weekend-authorizations' },
      { label: '⚙️ Impostazioni', path: '/settings' },
    ],
    manager: [
      { label: '✅ Approvazioni', path: '/approvals' },
      { label: '⏱ Il Mio Timesheet', path: '/timesheet' },
      { label: '📊 Report Costi', path: '/reports' },
    ],
    employee: [
      { label: '⏱ Il Mio Timesheet', path: '/timesheet' },
    ],
  };

  const items = menuItems[user?.role] || menuItems.employee;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Benvenuto, {user?.first_name}!
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md hover:border-blue-200 border border-transparent transition"
            >
              <span className="text-2xl">{item.label.split(' ')[0]}</span>
              <p className="mt-2 font-medium text-gray-800">
                {item.label.split(' ').slice(1).join(' ')}
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}