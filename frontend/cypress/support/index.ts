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
       * @example cy.toggleLayer('Rainfall', 'Rainfall Amount', 'Rainfall aggregate');
       */
      toggleLayer(
        group1: string,
        group2: string,
        layerName: string,
      ): Chainable<JQuery<HTMLElement>>;
    }
  }
}
