let dismissedThisTabSession = false;

export function isUniversalBetaDisclaimerDismissed(): boolean {
  return dismissedThisTabSession;
}

export function markUniversalBetaDisclaimerDismissed(): void {
  dismissedThisTabSession = true;
}

export function resetUniversalBetaDisclaimerDismissed(): void {
  dismissedThisTabSession = false;
}
