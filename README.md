# test-three-modules-of-PBM

Playwright + TypeScript automation framework for the PBM (Pharmacy Benefit Management) application,
covering the **Payer Management** and **Network Management** modules end to end, including the
maker-checker Approval Management review flow.

## Tech stack

- Playwright Test (TypeScript)
- - Page Object Model (POM) -- one class per module in `pages/`
  - - Custom fixtures with auto-login in `fixtures/auth.fixture.ts`
    - - Reusable utilities in `utils/`
      - - Centralized test data builders in `data/`
        - - Centralized URLs and UI text constants in `constants/`
         
          - ## Project structure
         
          - ```
            constants/            Shared URLs and UI text (toasts, dialog copy)
            data/                 Credentials and test data builders (buildPayerData, buildNetworkData)
            fixtures/             auth.fixture.ts -- auto-login fixture, exposes payerPage/networkPage/approvalPage
            pages/                Page Object classes: BasePage, LoginPage, PayerManagementPage,
                                  NetworkManagementPage, ApprovalManagementPage
            tests/
              payer-management/   Payer Management acceptance tests
              network-management/ Network Management acceptance tests
            utils/                Shared helper functions (retry, status helpers)
            playwright.config.ts  Playwright configuration (base URL, reporters, tracing)
            tsconfig.json         TypeScript configuration
            ```

            ## Prerequisites

            - Node.js 18+
            - - Access to the PBM application (default base URL: `http://20.75.201.176`)
             
              - ## Setup
             
              - ```bash
                npm install
                npm run install:browsers
                ```

                Credentials and base URL can be overridden with environment variables instead of the built-in
                defaults (`careconnect` / `Admin@123` against `http://20.75.201.176`):

                ```bash
                BASE_URL=http://20.75.201.176 PBM_USERNAME=careconnect PBM_PASSWORD=Admin@123 npm test
                ```

                ## Running the tests

                ```bash
                npm test                # run the full suite headless
                npm run test:headed     # run with a visible browser
                npm run test:ui         # open the Playwright UI runner
                npm run test:payer      # Payer Management suite only
                npm run test:network    # Network Management suite only
                npm run report          # open the last HTML report
                ```

                ## What's covered

                **Payer Management:** dashboard summary counters, create-and-save-as-draft, send for approval,
                approval publishes the record as Active, editing a published payer creates a new working draft,
                rejecting an update reverts to the last published state, the cascading impact warning shown when
                inactivating a payer, and the mandatory inactivation reason requirement.

                **Network Management:** dashboard summary counters, the Add Network wizard has no Payer field,
                create-and-save-as-draft, send for approval, approval publishes the record, assigning a facility
                is itself a draft action until approved, rejecting an update discards the change, and a regression
                check confirming that assigning a facility to an already-Pending network does not by itself flip
                it to Active (the Active/Pending decision is made once, at approval time, based on the effective
                date).

                Each test creates its own uniquely-named payer or network record via the data builders in
                `data/testData.ts`, so tests do not depend on each other's data or on manual cleanup.
                
