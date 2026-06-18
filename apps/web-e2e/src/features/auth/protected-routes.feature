@auth @module-06
Feature: Protected routes redirect with returnTo

  Background:
    Given I am not logged in

  Scenario Outline: anonymous user is bounced from <path>
    When I open "<path>"
    Then I land on the login page with returnTo "<path>"

    Examples:
      | path       |
      | /projects  |
      | /users     |
      | /profile   |
