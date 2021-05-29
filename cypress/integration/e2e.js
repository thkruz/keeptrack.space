// /// <reference types="cypress" />

// context('KeepTrack Startup', () => {
//   beforeEach(() => {
//     cy.viewport(1920, 1080);
//     cy.visit('http://127.0.0.1:8080/index.htm');
//   });

//   it('Load Site', () => {
//     cy.window().then(() => {
//       cy.waitUntil(function () {
//         return cy.get('#loading-screen').should('not.be.visible');
//       });
//       cy.get('#menu-sensor-list').trigger('click');
//       cy.get('#sensor-list-content div :nth-child(6)').trigger('click');
//       cy.wait(2000);

//       cy.get('#search-icon').trigger('click');
//       cy.get('#search').type('25544');

//       cy.wait(60000); // wait 60 seconds
//     });
//   });
// });
