import { useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import useAuthStore from '../store/authStore';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const menuItems = {
    super_admin: [
      { label: '🏢 Organizzazioni', path: '/organizations' },
      { label: '👥 Utenti', path: '/users' },
      { label: '📁 Progetti', path: '/projects' },
      { label: '📊 Report Costi', path: '/reports' },
    ],
    admin: [
      { label: '👥 Utenti', path: '/users' },
      { label: '📁 Progetti', path: '/projects' },
      { label: '📊 Report Costi', path: '/reports' },
      { label: '📅 Calendario', path: '/calendar' },
      { label: '⚙️ Impostazioni', path: '/settings' },
    ],
    manager: [
      { label: '✅ Approvazioni', path: '/approvals' },
      { label: '📁 Progetti', path: '/projects' },
      { label: '📊 Report Costi', path: '/reports' },
    ],
    employee: [
      { label: '⏱ Il Mio Timesheet', path: '/timesheet' },
      { label: '📁 I Miei Progetti', path: '/projects' },
    ],
  };

  const items = menuItems[user?.role] || menuItems.employee;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">⏱ TimeFlow</h1>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => navigate('/settings')}
                className="text-sm text-gray-500 hover:text-gray-700"
                title="Impostazioni azienda"
              >
                ⚙️
              </button>
            )}
            <span className="text-gray-600">
              {user?.first_name} {user?.last_name}
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {user?.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
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