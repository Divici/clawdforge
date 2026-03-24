import { useState, useCallback } from 'preact/hooks';
import { Button } from '../shared/Button';
import './ConfigScreen.css';

function EnvVarInput({ envVar, value, onChange }) {
  return (
    <div className="config-env-var">
      <div className="config-env-var__header">
        <code className="config-env-var__key">{envVar.key}</code>
        {envVar.required && <span className="config-env-var__required">required</span>}
      </div>
      <p className="config-env-var__desc">{envVar.description}</p>
      <input
        type="password"
        className="config-env-var__input"
        placeholder={envVar.placeholder || `Enter ${envVar.key}...`}
        value={value || ''}
        onInput={(e) => onChange(envVar.key, e.target.value)}
      />
    </div>
  );
}

export function ConfigScreen({ config, summary, projectName, elapsed, onDone, onSkip }) {
  const [values, setValues] = useState({});
  const [saved, setSaved] = useState(false);

  const envVars = config?.envVars || [];
  const deployment = config?.deployment || null;
  const postBuildSteps = config?.postBuildSteps || [];
  const hasEnvVars = envVars.length > 0;
  const hasDeployment = !!deployment;
  const hasPostSteps = postBuildSteps.length > 0;
  const hasConfig = hasEnvVars || hasDeployment || hasPostSteps;

  const requiredKeys = envVars.filter(v => v.required).map(v => v.key);
  const allRequiredFilled = requiredKeys.every(k => values[k]?.trim());

  const handleChange = useCallback((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!window.forgeAPI) return;
    // Write .env file to project via IPC
    const envContent = envVars
      .filter(v => values[v.key]?.trim())
      .map(v => `${v.key}=${values[v.key]}`)
      .join('\n');

    if (envContent) {
      const envFile = deployment?.envFile || '.env';
      window.forgeAPI.sendForgeResponse('write-env', {
        envFile,
        content: envContent,
      });
    }
    setSaved(true);
  }, [values, envVars, deployment]);

  const s = summary || {};
  const hasError = !!s.error;

  return (
    <div className="config-screen">
      {/* Status banner */}
      <div className={`config-screen__banner ${hasError ? 'config-screen__banner--error' : 'config-screen__banner--success'}`}>
        <div className="config-screen__banner-left">
          <span className="config-screen__banner-icon">{hasError ? '\u2717' : '\u2713'}</span>
          <div className="config-screen__banner-text">
            <span className="config-screen__banner-status">
              {hasError ? 'BUILD FAILED' : 'BUILD COMPLETE'}
            </span>
            <span className="config-screen__banner-project">{projectName || 'Project'}</span>
          </div>
        </div>
        <div className="config-screen__banner-stats">
          {s.tests && <span className="config-screen__stat">{s.tests} tests</span>}
          {s.phases && <span className="config-screen__stat">{s.phases} phases</span>}
          {elapsed && <span className="config-screen__stat">{elapsed}</span>}
        </div>
      </div>

      {hasError && (
        <div className="config-screen__error">
          <p className="config-screen__error-text">{s.error}</p>
        </div>
      )}

      {/* Configuration section */}
      {hasConfig && !hasError && (
        <div className="config-screen__config">
          <h3 className="config-screen__heading">Post-Build Configuration</h3>

          {/* Environment variables */}
          {hasEnvVars && (
            <section className="config-screen__section">
              <h4 className="config-screen__subheading">Environment Variables</h4>
              <p className="config-screen__hint">
                These values are written to <code>{deployment?.envFile || '.env'}</code> in your project. They are never sent externally.
              </p>
              <div className="config-screen__env-list">
                {envVars.map(v => (
                  <EnvVarInput
                    key={v.key}
                    envVar={v}
                    value={values[v.key]}
                    onChange={handleChange}
                  />
                ))}
              </div>
              <div className="config-screen__save-row">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={!allRequiredFilled}
                >
                  {saved ? '\u2713 Saved to .env' : 'Save Environment Variables'}
                </Button>
                {!allRequiredFilled && (
                  <span className="config-screen__save-hint">Fill all required fields</span>
                )}
              </div>
            </section>
          )}

          {/* Post-build steps */}
          {hasPostSteps && (
            <section className="config-screen__section">
              <h4 className="config-screen__subheading">Post-Build Steps</h4>
              <ol className="config-screen__steps">
                {postBuildSteps.map((step, i) => (
                  <li key={i} className="config-screen__step">
                    <code>{step}</code>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Deployment */}
          {hasDeployment && (
            <section className="config-screen__section">
              <h4 className="config-screen__subheading">Deployment</h4>
              <div className="config-screen__deploy">
                <div className="config-screen__deploy-target">
                  <span className="config-screen__deploy-label">Target:</span>
                  <span className="config-screen__deploy-value">{deployment.target}</span>
                </div>
                {deployment.command && (
                  <div className="config-screen__deploy-cmd">
                    <code>{deployment.command}</code>
                  </div>
                )}
                {deployment.instructions && (
                  <p className="config-screen__deploy-instructions">{deployment.instructions}</p>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* No config needed */}
      {!hasConfig && !hasError && (
        <div className="config-screen__no-config">
          <p>No additional configuration required. Your project is ready to run.</p>
        </div>
      )}

      {/* Actions */}
      <div className="config-screen__actions">
        {onSkip && (
          <Button variant="secondary" size="large" onClick={onSkip}>New Project</Button>
        )}
        {onDone && (
          <Button variant="primary" size="large" onClick={onDone}>Done</Button>
        )}
      </div>
    </div>
  );
}
