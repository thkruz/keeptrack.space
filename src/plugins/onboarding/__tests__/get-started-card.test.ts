import { GetStartedCard } from '../get-started-card';

describe('GetStartedCard narrow collapse (#172)', () => {
  const makeCard = () =>
    new GetStartedCard({
      getState: () => ({ isCardDismissed: false, status: 'skipped', checklist: {} }) as never,
      getMissions: () =>
        [
          { id: 'a', label: () => 'Mission A' },
          { id: 'b', label: () => 'Mission B' },
        ] as never,
      onDismiss: () => undefined,
      onLaunch: () => undefined,
    } as never);

  beforeEach(() => {
    document.body.innerHTML = '<div id="drawer-getting-started-slot"></div>';
  });

  it('renders collapsed with a toggle that expands and re-collapses the rows', () => {
    const card = makeCard();

    card.render();
    const root = () => document.querySelector('.kt-get-started-card') as HTMLElement;

    expect(root().classList.contains('kt-get-started-open')).toBe(false);

    (document.querySelector('.kt-get-started-toggle') as HTMLElement).click();
    expect(root().classList.contains('kt-get-started-open')).toBe(true);
    expect(document.querySelector('.kt-get-started-toggle')?.getAttribute('aria-expanded')).toBe('true');

    (document.querySelector('.kt-get-started-toggle') as HTMLElement).click();
    expect(root().classList.contains('kt-get-started-open')).toBe(false);
  });
});
