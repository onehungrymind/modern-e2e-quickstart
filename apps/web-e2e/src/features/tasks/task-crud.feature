@tasks @module-06
Feature: Task CRUD

  Background:
    Given an E2E member is logged in
    And a project "Task CRUD Project" seeded via the API for the current user

  Scenario: add a task with just a title
    When I open the project "Task CRUD Project"
    And I add a task titled "Draft the brief"
    Then I see the task "Draft the brief" in the project

  Scenario: add a task with priority high
    When I open the project "Task CRUD Project"
    And I add a task titled "Urgent item" with priority "high"
    Then I see the task "Urgent item" in the project
    And the task "Urgent item" shows priority "high"

  Scenario: edit a task's status
    Given a task "E2E_Change Status" in "Task CRUD Project" with status "todo"
    When I open the project "Task CRUD Project"
    And I edit the task "E2E_Change Status" setting status to "done"
    Then the task "E2E_Change Status" shows status "done"

  Scenario: edit a task's priority
    Given a task "E2E_Change Priority" in "Task CRUD Project" with priority "low"
    When I open the project "Task CRUD Project"
    And I edit the task "E2E_Change Priority" setting priority to "high"
    Then the task "E2E_Change Priority" shows priority "high"

  Scenario: delete a task
    Given a task "E2E_To Be Deleted" in "Task CRUD Project" with status "todo"
    When I open the project "Task CRUD Project"
    And I delete the task "E2E_To Be Deleted"
    Then I do not see the task "E2E_To Be Deleted" in the project
