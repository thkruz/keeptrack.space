/// <reference types="cypress" />

context('KeepTrack Startup', () => {
  beforeEach(() => {
    cy.visit('http://127.0.0.1:8080/index.htm');
  });

  it('Gremlins', () => {
    cy.window().then((win) => {
      cy.wait(30000); // wait 10 seconds
      cy.on('uncaught:exception', (err, runnable) => {
        expect(err.message).to.include('something about the error');
        return false;
      });
      win.db.gremlins();
    });
  });

  it('Load Site', () => {
    cy.window().then((win) => {
      cy.wait(60000); // wait 10 seconds
      cy.on('uncaught:exception', (err, runnable) => {
        expect(err.message).to.include('something about the error');
        return false;
      });
      cy.get('#menu-time-machine').trigger('click'); // Trigger mousedown event on link
    });
  });
});
