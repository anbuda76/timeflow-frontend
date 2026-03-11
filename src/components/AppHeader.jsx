import { useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { useBrand } from '../context/BrandContext';
import useAuthStore from '../store/authStore';

export default function AppHeader() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { primaryColor, logoUrl, orgName } = useBrand();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <header style={{ backgroundColor: primaryColor }} className="shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
          ) : (
            <span className="text-white font-bold text-xl">⏱ {orgName}</span>
          )}
        </button>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <button
              onClick={() => navigate('/settings')}
              className="text-white opacity-70 hover:opacity-100 text-sm"
              title="Impostazioni azienda"
            >
              ⚙️
            </button>
          )}
          <span className="text-white opacity-90 text-sm">
            {user?.first_name} {user?.last_name}
            <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
              {user?.role}
            </span>
          </span>
          <button
            onClick={logout}
            className="text-sm text-white opacity-70 hover:opacity-100"
          >
            Esci
          </button>
        </div>
      </div>
    </header>
  );
}