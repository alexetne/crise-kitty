import { AuthForm } from '../../components/auth-form';
import { Topbar } from '../../components/topbar';

export default function RegisterPage() {
  return (
    <main className="page">
      <Topbar />
      <AuthForm mode="register" />
    </main>
  );
}
