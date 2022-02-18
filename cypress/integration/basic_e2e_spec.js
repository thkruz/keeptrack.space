/* global cy */

describe('Site Initializes', () => {
  it('clicking "type" navigates to a new url', () => {
    const port = '8080';
    const url = `http://localhost:${port}`;
    cy.visit(url);
  });
});
