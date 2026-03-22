import { ClawdStage } from './clawd/ClawdStage';

export function App() {
  return (
    <div className="app-layout">
      <div className="app-layout__dashboard">
        <p>Dashboard</p>
      </div>
      <div className="app-layout__stage">
        <ClawdStage />
      </div>
    </div>
  );
}
