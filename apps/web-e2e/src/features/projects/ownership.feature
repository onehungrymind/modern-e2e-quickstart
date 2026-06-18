@projects @module-08
Feature: Project ownership rules

  Scenario: owner can delete their own project
    Given an E2E member is logged in
    And a project "Owner Deletes" seeded via the API for the current user
    When I visit the projects page
    And I open the project "Owner Deletes"
    And I delete the current project
    Then I am on the projects page
    And I do not see the project "Owner Deletes" in the list

  Scenario: non-owner member does not see the delete button
    Given an E2E admin user owns a project "Admins Project"
    And an E2E member is logged in
    When I open the admin's project
    Then the delete project button is hidden

  Scenario: admin can delete any project
    Given an E2E member user owns a project "Members Project"
    And an E2E admin is logged in
    When I open the member's project
    And I delete the current project
    Then I am on the projects page
