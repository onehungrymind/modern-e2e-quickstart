@auth @module-06 @anonymous
Feature: Anonymous users are redirected

  Scenario: accessing a protected page redirects to login with returnTo
    Given I am not logged in
    When I open "/projects"
    Then I land on the login page with returnTo "/projects"
