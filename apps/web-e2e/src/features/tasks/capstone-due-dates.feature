@tasks @capstone @module-15
Feature: Task due dates (capstone)

  As a participant capstone, demonstrate seeding via API,
  asserting via UI, and exercising both happy and edge paths
  for a feature the rest of the suite doesn't cover.

  Background:
    Given an E2E member is logged in
    And a project "Due Date Project" seeded via the API for the current user

  Scenario: a seeded task with a due date displays it in the row
    Given a task "E2E_Has Due" in "Due Date Project" due "2026-12-31"
    When I open the project "Due Date Project"
    Then the task "E2E_Has Due" shows due date "2026-12-31"

  Scenario: a task without a due date hides the due display
    Given a task "E2E_No Due" in "Due Date Project" with status "todo"
    When I open the project "Due Date Project"
    Then the task "E2E_No Due" has no due date

  Scenario: editing a task to add a due date updates the row
    Given a task "E2E_Add Due Later" in "Due Date Project" with status "todo"
    When I open the project "Due Date Project"
    And I edit the task "E2E_Add Due Later" setting due date to "2027-03-15"
    Then the task "E2E_Add Due Later" shows due date "2027-03-15"

  Scenario: editing a task to clear its due date removes the display
    Given a task "E2E_Drop Due" in "Due Date Project" due "2026-09-01"
    When I open the project "Due Date Project"
    And I edit the task "E2E_Drop Due" clearing the due date
    Then the task "E2E_Drop Due" has no due date
