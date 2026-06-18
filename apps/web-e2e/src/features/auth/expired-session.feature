@auth @module-10
Feature: Expired / invalid session redirects to login

  Scenario: 401 on a protected request redirects to login with returnTo
    Given I am logged in as "alice"
    And the API returns 401 for authenticated requests
    When I open "/users"
    Then I land on the login page with returnTo "/users"

  Scenario: 401 on the projects list redirects and preserves returnTo
    Given I am logged in as "alice"
    And the API returns 401 for authenticated requests
    When I open "/projects"
    Then I land on the login page with returnTo "/projects"
