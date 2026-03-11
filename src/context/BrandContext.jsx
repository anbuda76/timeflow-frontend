import { createContext, useContext, useEffect, useState } from 'react';
import { getMyOrganization } from '../api/register';
import useAuthStore from '../store/authStore';

const BrandContext = createContext({
  org: null,
  primaryColor: '#1d4ed8',
  logoUrl: null,
  orgName: 'TimeFlow',
  refreshBrand: () => {},
});

export function BrandProvider({ children }) {
  const user = useAuthStore((s) => s.user);
  const [org, setOrg] = useState(null);

  const fetchOrg = async () => {
    if (!user) return;
    try {
      const data = await getMyOrganization();
      setOrg(data);
    } catch {
      // non autenticato o errore
    }
  };

  useEffect(() => {
    fetchOrg();
  }, [user]);

  const value = {
    org,
    primaryColor: org?.primary_color || '#1d4ed8',
    logoUrl: org?.logo_url || null,
    orgName: org?.name || 'TimeFlow',
    refreshBrand: fetchOrg,
  };

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext);