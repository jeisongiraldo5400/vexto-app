import { SelectEmpresaList } from '@/admin/auth/components/select-empresa-list';
import { useAuthStore } from '@/admin/auth/store/auth-store';
import { Redirect } from 'expo-router';

export default function SelectEmpresaScreen() {
  const isReady = useAuthStore((s) => s.isReady);
  const user = useAuthStore((s) => s.user);
  const needsCompanyPick = useAuthStore((s) => s.needsCompanyPick);

  if (isReady && (!user || !needsCompanyPick)) {
    return <Redirect href="/" />;
  }

  return <SelectEmpresaList />;
}
