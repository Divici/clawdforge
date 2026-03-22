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

test('renders thinking indicator initially', () => {
  const { container } = render(<PresearchWizard />);
  const thinking = container.querySelector('.presearch-wizard__thinking');
  expect(thinking).toBeTruthy();
  expect(screen.getByText(/Analyzing your project/i)).toBeTruthy();
});

test('renders two-column layout', () => {
  const { container } = render(<PresearchWizard />);
  expect(container.querySelector('.presearch-wizard__content')).toBeTruthy();
  expect(container.querySelector('.presearch-wizard__left')).toBeTruthy();
  expect(container.querySelector('.presearch-wizard__right')).toBeTruthy();
});
