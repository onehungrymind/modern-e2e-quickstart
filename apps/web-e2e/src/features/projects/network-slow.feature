@projects @module-10
Feature: Network interception — slow responses and POST errors

  Background:
    Given an E2E member is logged in

  Scenario: slow projects response shows loading state
    Given the API takes 800ms to return the projects list
    When I visit the projects page
    Then I briefly see the projects loading state

  Scenario: POST /projects validation error surfaces in the new-project form
    Given the API rejects POST requests to projects with a 400
    When I visit the projects page
    And I open the new project form
    And I fill the new project name "Should Fail"
    And I submit the new project form
    Then I see a new-project form error
