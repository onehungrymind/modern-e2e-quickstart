@tasks @module-08
Feature: Filter tasks by status

  Background:
    Given an E2E member is logged in
    And a project "Filter Project" seeded via the API for the current user with tasks:
      | title                  | status | priority |
      | Plan                   | todo   | medium   |
      | Execute                | doing  | high     |
      | Review                 | done   | low      |
      | Retrospect             | done   | medium   |

  Scenario: all tasks are visible by default
    When I open the project "Filter Project"
    Then I see tasks:
      | title          |
      | E2E_Plan       |
      | E2E_Execute    |
      | E2E_Review     |
      | E2E_Retrospect |

  Scenario: filtering by "todo" hides non-todo tasks
    When I open the project "Filter Project"
    And I filter tasks by status "todo"
    Then I see tasks:
      | title    |
      | E2E_Plan |
    And I do not see the task "E2E_Execute" in the project

  Scenario: filtering by "doing" shows only in-flight tasks
    When I open the project "Filter Project"
    And I filter tasks by status "doing"
    Then I see tasks:
      | title       |
      | E2E_Execute |
    And I do not see the task "E2E_Plan" in the project

  Scenario: filtering by "done" shows completed tasks
    When I open the project "Filter Project"
    And I filter tasks by status "done"
    Then I see tasks:
      | title          |
      | E2E_Review     |
      | E2E_Retrospect |
