declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * switch the UI language to the given langcode using the top right toggle
       */
      switchLanguage(langcode: string): Chainable<JQuery<HTMLElement>>;
      /**
       * Custom command to activate a layer using a sequence of clicks
       * List the names of Menu/submenu as they appear on screen
       * @example cy.activateLayer('Rainfall', 'Rainfall Amount', 'Rainfall aggregate');
       */
      activateLayer(
        group1: string,
        group2: string,
        layerName: string,
      ): Chainable<JQuery<HTMLElement>>;
      /**
       * Custom command to deactivate a layer
       * @example cy.deactivateLayer('Rainfall', 'Rainfall Amount', 'Rainfall aggregate');
       */
      deactivateLayer(
        group1: string,
        group2: string,
        layerName: string,
      ): Chainable<JQuery<HTMLElement>>;
      /**
       * Custom command to scroll left in the timeline
       * @example cy.scrollLeft();
       */
      scrollLeft(): Chainable<JQuery<HTMLElement>>;
      /**
       * Custom command to scroll right in the timeline
       * @example cy.scrollRight();
       */
      scrollRight(): Chainable<JQuery<HTMLElement>>;
      /**
       * Wait for the map to be fully loaded and ready.
       * More reliable than waiting for MapTiler attribution text.
       * @example cy.waitForMapLoad();
       * @example cy.waitForMapLoad({ timeout: 20000 });
       */
      waitForMapLoad(options?: { timeout?: number }): Chainable<void>;
    }
  }
}

export {};
