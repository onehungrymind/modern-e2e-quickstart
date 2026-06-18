@projects @module-07
Feature: Project CRUD (API seed + UI assert)

  Background:
    Given an E2E member is logged in

  @smoke
  Scenario: the user's seeded project appears in the list
    Given a project "First Client Launch" seeded via the API for the current user
    When I visit the projects page
    Then I see the project "First Client Launch" in the list

  Scenario: create a new project via the UI
    Given I visit the projects page
    When I create a project named "My UI Project"
    Then I see the project "My UI Project" in the list

  @module-04
  Scenario: seed a project with a data table of tasks (API seed)
    Given a project "Planning Session" seeded via the API for the current user with tasks:
      | title                     | status  | priority |
      | Draft agenda              | todo    | high     |
      | Book conference room      | doing   | medium   |
      | Send invites              | done    | medium   |
    When I open the project "Planning Session"
    Then I see tasks:
      | title                 |
      | E2E_Draft agenda      |
      | E2E_Book conference room |
      | E2E_Send invites      |
