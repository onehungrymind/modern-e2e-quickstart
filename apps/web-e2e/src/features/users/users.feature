@users @module-09
Feature: Users list and detail

  Background:
    Given an E2E member is logged in

  Scenario: users list shows the seeded dev users
    When I open "/users"
    Then I see a user with email "admin@example.com"
    And I see a user with email "alice@example.com"

  Scenario: user detail shows assigned tasks
    Given an E2E member "task_owner" user exists
    And a project "Assigned Tasks Project" seeded via the API for "task_owner"
    And a task "E2E_Their Task" in "Assigned Tasks Project" assigned to "task_owner"
    When I open the "task_owner" user detail page
    Then I see the assigned task "E2E_Their Task"

  Scenario: user with no assigned tasks shows empty state
    Given an E2E member "no_tasks" user exists
    When I open the "no_tasks" user detail page
    Then I see the user's empty tasks state
