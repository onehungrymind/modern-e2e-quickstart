@projects @module-08
Feature: Create project validation

  Background:
    Given an E2E member is logged in

  Scenario: creating a project with a name succeeds
    When I visit the projects page
    And I create a project named "Typed In Project"
    Then I see the project "Typed In Project" in the list

  Scenario: creating a project with a description succeeds
    When I visit the projects page
    And I create a project named "With Description" with description "A short description"
    Then I see the project "With Description" in the list
    When I open the project "With Description"
    Then the project description reads "A short description"
