/// <reference types="cypress" />

context('KeepTrack Startup', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080/index.htm');
  });

  it('Gremlins', () => {
    cy.window().then((win) => {
      // win is the remote window
      // of the page at: http://localhost:8080/app
      win.db.gremlins();
    });
  });

  it('Load Site', () => {
    cy.window().then((win) => {
      // win is the remote window
      // of the page at: http://localhost:8080/app
      cy.wait(2500); // wait 2.5 seconds
      cy.get('#menu-time-machine').trigger('click'); // Trigger mousedown event on link
    });
  });
});
