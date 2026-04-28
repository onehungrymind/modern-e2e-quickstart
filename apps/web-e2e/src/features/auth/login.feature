@auth @module-01
Feature: Login

  @smoke
  Scenario: successful login with admin credentials
    Given I am on the login page
    When I sign in with email "admin@example.com" and password "Admin123!"
    Then I land on the projects page

  Scenario: login rejects wrong password
    Given I am on the login page
    When I sign in with email "admin@example.com" and password "wrong-password"
    Then I see the error "Invalid email or password"

  Scenario: an already-authenticated user is bounced from the login page
    Given I am on the login page
    When I sign in with email "admin@example.com" and password "Admin123!"
    Then I land on the projects page
    When I open the login page again
    Then I land on the projects page
