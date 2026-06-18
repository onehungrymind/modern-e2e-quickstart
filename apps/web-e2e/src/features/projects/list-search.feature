@projects @module-08
Feature: Project list and search

  Background:
    Given an E2E member is logged in
    And a project "Apollo Rollout" seeded via the API for the current user
    And a project "Beacon Sync" seeded via the API for the current user
    And a project "Cascade Refresh" seeded via the API for the current user

  Scenario: seeded projects appear in the list
    When I visit the projects page
    Then I see the project "Apollo Rollout" in the list
    And I see the project "Beacon Sync" in the list
    And I see the project "Cascade Refresh" in the list

  Scenario: searching narrows the list by name
    When I visit the projects page
    And I search for "Apollo"
    Then I see the project "Apollo Rollout" in the list
    And I do not see the project "Beacon Sync" in the list
    And I do not see the project "Cascade Refresh" in the list

  Scenario: search is case-insensitive
    When I visit the projects page
    And I search for "beacon"
    Then I see the project "Beacon Sync" in the list
    And I do not see the project "Apollo Rollout" in the list

  Scenario: search with no matches shows the empty state
    When I visit the projects page
    And I search for "zzzz_nothing"
    Then I see the projects empty state
