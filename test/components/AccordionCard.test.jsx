import { render, screen } from '@testing-library/preact';
import { AccordionCard } from '../../src/components/presearch/AccordionCard';

const sections = [
  { title: 'Database' },
  { title: 'Auth' },
  { title: 'API' },
];

test('renders title', () => {
  render(<AccordionCard id="a1" title="Architecture" sections={sections} completedSections={[]} activeSection={0} />);
  expect(screen.getByText('Architecture')).toBeTruthy();
});

test('shows section count', () => {
  render(<AccordionCard id="a1" title="Architecture" sections={sections} completedSections={[0]} activeSection={1} />);
  expect(screen.getByText('1/3')).toBeTruthy();
});

test('renders all section titles', () => {
  render(<AccordionCard id="a1" title="Architecture" sections={sections} completedSections={[]} activeSection={0} />);
  expect(screen.getByText('Database')).toBeTruthy();
  expect(screen.getByText('Auth')).toBeTruthy();
  expect(screen.getByText('API')).toBeTruthy();
});

test('shows children in active section', () => {
  render(
    <AccordionCard id="a1" title="Architecture" sections={sections} completedSections={[]} activeSection={1}>
      <div>Active content</div>
    </AccordionCard>
  );
  expect(screen.getByText('Active content')).toBeTruthy();
});

test('marks completed sections', () => {
  const { container } = render(
    <AccordionCard id="a1" title="Architecture" sections={sections} completedSections={[0]} activeSection={1} />
  );
  const sectionEls = container.querySelectorAll('.accordion-card__section');
  expect(sectionEls[0].classList.contains('accordion-card__section--complete')).toBe(true);
  expect(sectionEls[1].classList.contains('accordion-card__section--active')).toBe(true);
});

test('shows locked label on completed sections', () => {
  render(
    <AccordionCard id="a1" title="Architecture" sections={sections} completedSections={[0]} activeSection={1} />
  );
  expect(screen.getByText('locked')).toBeTruthy();
});
