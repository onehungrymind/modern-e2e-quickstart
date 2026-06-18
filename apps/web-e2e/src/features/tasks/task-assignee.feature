@tasks @module-08
Feature: Task assignment

  Background:
    Given an E2E member is logged in
    And a project "Assignment Project" seeded via the API for the current user

  Scenario: unassigned task shows the unassigned label
    Given a task "E2E_No Owner" in "Assignment Project" with status "todo"
    When I open the project "Assignment Project"
    Then the task "E2E_No Owner" shows assignee "unassigned"

  Scenario: assigning a task to the current user via UI
    Given a task "E2E_Assign Me" in "Assignment Project" with status "todo"
    When I open the project "Assignment Project"
    And I assign the task "E2E_Assign Me" to myself
    Then the task "E2E_Assign Me" is assigned to me
