@auth @module-01
Feature: Logout

  Scenario: logging out returns the user to the login page
    Given I am logged in as "alice"
    When I visit the projects page
    And I log out from the top nav
    Then I land on the login page

  Scenario: logging out clears the stored session
    Given I am logged in as "alice"
    When I visit the projects page
    And I log out from the top nav
    When I open "/projects"
    Then I land on the login page with returnTo "/projects"
