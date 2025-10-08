/// <reference types="cypress" />
import { describe, it } from "vitest"

describe('Material Request App', () => {
  it('Visits the app root url', () => {
    cy.visit('/')
    cy.contains('ion-content')
  })

  it('Should display main page content', () => {
    cy.visit('/')
    cy.get('ion-page').should('exist')
    cy.get('ion-content').should('exist')
  })
})
