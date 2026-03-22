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

test('renders empty cards area initially', () => {
  const { container } = render(<PresearchWizard />);
  const cardsArea = container.querySelector('.presearch-wizard__cards');
  expect(cardsArea).toBeTruthy();
  expect(cardsArea.children.length).toBe(0);
});
