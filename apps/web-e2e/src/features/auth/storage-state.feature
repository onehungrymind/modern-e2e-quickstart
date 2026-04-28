@auth @module-05 @module-08
Feature: Stored auth session skips the login UI

  Scenario: admin lands straight on /projects
    Given I am logged in as "admin"
    When I visit the projects page
    Then I see the top nav

  Scenario: alice lands straight on /projects
    Given I am logged in as "alice"
    When I visit the projects page
    Then I see the top nav
