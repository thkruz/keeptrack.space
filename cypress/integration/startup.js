/// <reference types="cypress" />

context('KeepTrack Startup', () => {
  beforeEach(() => {
    cy.visit('http://127.0.0.1:8080/index.htm');
  });

  it('Load Site', () => {
    cy.window().then((win) => {
      cy.wait(60000); // wait 60 seconds
    });
  });
});
