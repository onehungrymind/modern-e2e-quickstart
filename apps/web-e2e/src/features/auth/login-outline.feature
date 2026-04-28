@auth @module-04
Feature: Login input validation (scenario outline)

  Scenario Outline: login rejects bad credentials
    Given I am on the login page
    When I sign in with email "<email>" and password "<password>"
    Then I see the error "<message>"

    Examples:
      | email                | password    | message                    |
      | unknown@example.com  | Password1!  | Invalid email or password  |
      | not-an-email         | Password1!  | Invalid email or password  |
      | admin@example.com    | wrong       | Invalid email or password  |
