@auth @module-01
Feature: Login edge cases

  Background:
    Given a seeded E2E member user

  Scenario: email with surrounding whitespace is still rejected
    Given I am on the login page
    When I sign in with email "  unknown@example.com  " and password "Password1!"
    Then I see the error "Invalid email or password"

  Scenario: already authenticated user visiting /login bounces to /projects
    Given I am logged in as "alice"
    When I open "/login"
    Then I am on the projects page
