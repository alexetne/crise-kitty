import { AuthForm } from '../../components/auth-form';
import { Topbar } from '../../components/topbar';

export default function LoginPage() {
  return (
    <main className="page">
      <Topbar />
      <AuthForm mode="login" />
    </main>
  );
}
