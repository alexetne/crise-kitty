import { ProfileClient } from '../../components/profile-client';
import { Topbar } from '../../components/topbar';

export default function ProfilePage() {
  return (
    <main className="page">
      <Topbar />
      <ProfileClient />
    </main>
  );
}
