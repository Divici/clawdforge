import { Button } from '../shared/Button';
import './CompletionScreen.css';

export function CompletionScreen({ summary, onNewProject }) {
  return (
    <div className="completion-screen">
      <h2 className="completion-screen__title">✓ Build Complete</h2>
      {summary && (
        <div className="completion-screen__stats">
          {summary.phases && <p>Phases completed: {summary.phases}</p>}
          {summary.tests && <p>Tests passing: {summary.tests}</p>}
          {summary.elapsed && <p>Time elapsed: {summary.elapsed}</p>}
          {summary.deployed && <p>Deployed: <a href={summary.deployed}>{summary.deployed}</a></p>}
        </div>
      )}
      {summary?.issues && summary.issues.length > 0 && (
        <div className="completion-screen__issues">
          <h3>Known issues:</h3>
          {summary.issues.map((issue, i) => <p key={i}>- {issue}</p>)}
        </div>
      )}
      <div className="completion-screen__actions">
        {onNewProject && <Button variant="secondary" onClick={onNewProject}>New Project</Button>}
      </div>
    </div>
  );
}
