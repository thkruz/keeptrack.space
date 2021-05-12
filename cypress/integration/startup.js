/// <reference types="cypress" />

context('KeepTrack Startup', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080/index.htm');
  });

  it('Gremlins', () => {
    cy.window().then((win) => {
      cy.wait(3500); // wait 3.5 seconds
      win.db.gremlins();
    });
  });

  it('Load Site', () => {
    cy.window().then((win) => {
      cy.wait(3500); // wait 3.5 seconds
      cy.get('#menu-time-machine').trigger('click'); // Trigger mousedown event on link
    });
  });
});
