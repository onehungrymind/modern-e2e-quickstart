@auth @module-01
Feature: Login

  Background:
    Given a seeded E2E member user

  @smoke
  Scenario: successful login with seeded member credentials
    Given I am on the login page
    When I sign in with the seeded user's credentials
    Then I land on the projects page

  Scenario: login rejects wrong password
    Given I am on the login page
    When I sign in with the seeded user's email and password "wrong-password"
    Then I see the error "Invalid email or password"
