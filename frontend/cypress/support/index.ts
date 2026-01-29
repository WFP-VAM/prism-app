/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      activateLayer(
        group1: string,
        group2: string,
        layerName: string,
      ): Chainable<void>;
      deactivateLayer(
        group1: string,
        group2: string,
        layerName: string,
      ): Chainable<void>;
      switchLanguage(langcode: string): Chainable<void>;
      scrollLeft(): Chainable<void>;
      scrollRight(): Chainable<void>;
    }
  }
}

export {};
