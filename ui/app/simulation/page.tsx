import { Topbar } from '../../components/topbar';
import { SimulationWorkspace } from '../../components/simulation-workspace';

export default function SimulationPage() {
  return (
    <main className="page">
      <Topbar />
      <SimulationWorkspace />
    </main>
  );
}
