import { LoginForm } from '@/admin/auth/components/login-form';
import { useAuthStore } from '@/admin/auth/store/auth-store';
import { Redirect } from 'expo-router';

export default function LoginScreen() {
  const isReady = useAuthStore((s) => s.isReady);
  const user = useAuthStore((s) => s.user);
  const needsCompanyPick = useAuthStore((s) => s.needsCompanyPick);

  if (isReady && user && !needsCompanyPick) {
    return <Redirect href="/" />;
  }

  return <LoginForm />;
}
