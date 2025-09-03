declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to activate a layer using a sequence of clicks
       * List the names of Menu/submenu as they appear on screen
       * @example cy.toggleLayer('Rainfall', 'Rainfall Amount', 'Rainfall aggregate');
       */
      toggleLayer(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}
