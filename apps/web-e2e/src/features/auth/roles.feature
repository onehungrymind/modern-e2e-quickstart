@auth @module-08
Feature: Role-scoped storage state

  Scenario: admin's profile page shows admin role
    Given I am logged in as "admin"
    When I open "/profile"
    Then my profile shows role "admin"

  Scenario: alice's profile page shows member role
    Given I am logged in as "alice"
    When I open "/profile"
    Then my profile shows role "member"

  Scenario: bob's profile page shows member role
    Given I am logged in as "bob"
    When I open "/profile"
    Then my profile shows role "member"
