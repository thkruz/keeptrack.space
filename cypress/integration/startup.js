/// <reference types="cypress" />

context('KeepTrack Startup', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
    cy.visit('http://127.0.0.1:8080/index.htm');
  });

  it('Load Site', () => {
    cy.window().then(() => {});
  });
});
