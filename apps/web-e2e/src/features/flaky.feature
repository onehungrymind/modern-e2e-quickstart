@module-09 @flaky
Feature: Deliberate flake demo

  # This scenario INTENTIONALLY violates the isolation pattern — no E2E_
  # prefix, no scenario-unique name, no cleanup tracking. Run with:
  #   npx playwright test --grep @flaky --repeat-each 5 --workers 4
  # to reproduce the flake. Fix: give each scenario a unique project name
  # and track it in scenarioWorld for cleanup (see features/projects/
  # project-crud.feature for the right pattern).

  Scenario: two workers race on a shared project name
    Given an E2E member is logged in
    When I create a project named "Shared Project"
    Then I see the project "Shared Project" in the list
