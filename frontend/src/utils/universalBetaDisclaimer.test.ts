import {
  isUniversalBetaDisclaimerDismissed,
  markUniversalBetaDisclaimerDismissed,
  resetUniversalBetaDisclaimerDismissed,
} from './universalBetaDisclaimer';

describe('universalBetaDisclaimer', () => {
  beforeEach(() => {
    resetUniversalBetaDisclaimerDismissed();
  });

  test('starts undismissed', () => {
    expect(isUniversalBetaDisclaimerDismissed()).toBe(false);
  });

  test('marks dismissed for the tab session', () => {
    markUniversalBetaDisclaimerDismissed();
    expect(isUniversalBetaDisclaimerDismissed()).toBe(true);
  });

  test('resets dismissed state', () => {
    markUniversalBetaDisclaimerDismissed();
    resetUniversalBetaDisclaimerDismissed();
    expect(isUniversalBetaDisclaimerDismissed()).toBe(false);
  });
});
