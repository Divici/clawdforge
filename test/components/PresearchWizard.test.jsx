import { render, screen } from '@testing-library/preact';
import { PresearchWizard } from '../../src/components/presearch/PresearchWizard';

// Mock window.forgeAPI
beforeEach(() => {
  window.forgeAPI = {
    onForgeEvent: vi.fn(),
    sendForgeResponse: vi.fn(),
  };
});

afterEach(() => {
  delete window.forgeAPI;
});

test('renders stepper with initial state', () => {
  render(<PresearchWizard />);
  expect(screen.getByText('Constraints')).toBeTruthy();
  expect(screen.getByText('Discovery')).toBeTruthy();
});

test('subscribes to forge events on mount', () => {
  render(<PresearchWizard />);
  expect(window.forgeAPI.onForgeEvent).toHaveBeenCalled();
});

test('renders waiting indicator initially', () => {
  const { container } = render(<PresearchWizard />);
  const waiting = container.querySelector('.presearch-wizard__waiting');
  expect(waiting).toBeTruthy();
  expect(screen.getByText(/Starting Claude/)).toBeTruthy();
});
