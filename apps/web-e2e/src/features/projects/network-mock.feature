@projects @module-10
Feature: Network interception for error states

  Background:
    Given an E2E member is logged in

  Scenario: server error on project list surfaces an error message
    Given the API returns 500 for the projects list
    When I visit the projects page
    Then I see a projects error message
