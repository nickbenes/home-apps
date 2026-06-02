# Entity Relationship Diagrams

Generated from SQLite migration files. All dates are ISO 8601 `TEXT`; amounts are `REAL` (negative = outflow, positive = income).

## Finance

```mermaid
erDiagram
    budget_categories {
        TEXT category_id PK
        TEXT name
        INT  display_order
    }
    budget_items {
        TEXT budget_item_id PK
        TEXT category_id    FK
        TEXT name
        REAL expected_amount
        TEXT notes
    }
    accounts {
        TEXT account_id       PK
        TEXT creditor
        TEXT account_type
        TEXT status
        REAL original_amount
        REAL current_balance
        TEXT balance_date
        REAL interest_rate_pct
        TEXT account_number
        TEXT portal_url
        TEXT payoff_date_est
        TEXT phone
        TEXT email
        TEXT notes
    }
    recurring_items {
        TEXT recurring_item_id  PK
        TEXT budget_item_id     FK
        TEXT account_id         FK
        TEXT name
        REAL amount
        TEXT frequency
        REAL payments_per_year
        REAL effective_monthly
        TEXT projected_start_date
        TEXT projected_stop_date
        INT  is_active
        TEXT notes
    }
    transactions {
        TEXT transaction_id      PK
        TEXT account_id          FK
        TEXT transaction_date
        TEXT posted_date
        REAL amount
        TEXT merchant_text
        TEXT merchant_normalized
        TEXT transaction_type
        TEXT source
        TEXT import_batch_id
    }
    scheduled_payments {
        TEXT scheduled_payment_id   PK
        TEXT recurring_item_id      FK
        TEXT account_id             FK
        TEXT actual_transaction_id  FK
        TEXT due_date
        REAL amount
        TEXT status
        TEXT postponed_from_date
        TEXT notes
    }
    transaction_budget_item_mappings {
        TEXT mapping_id      PK
        TEXT transaction_id  FK
        TEXT budget_item_id  FK
        REAL allocated_amount
        TEXT confidence
        TEXT classified_by
        TEXT notes
    }
    classification_audit_log {
        TEXT log_id               PK
        TEXT mapping_id
        TEXT transaction_id
        TEXT budget_item_id
        TEXT action
        TEXT old_budget_item_id
        REAL old_allocated_amount
        REAL new_allocated_amount
        TEXT changed_by
        TEXT notes
    }
    classification_rules {
        TEXT rule_id        PK
        TEXT budget_item_id FK
        TEXT pattern
        TEXT match_field
        TEXT match_type
        TEXT confidence
        INT  priority
        INT  is_active
        TEXT source
        TEXT notes
    }
    tags {
        TEXT tag_id      PK
        TEXT entity_type
        TEXT entity_id
        TEXT tag_name
    }
    forecast_items {
        TEXT forecast_item_id      PK
        TEXT account_id            FK
        TEXT name
        REAL amount
        TEXT item_date
        TEXT notes
        INT  is_active
        INT  is_extra_debt_payment
    }
    feature_requests {
        TEXT    request_id            PK
        TEXT    title
        TEXT    description
        TEXT    submitted_by
        TEXT    status
        INTEGER github_issue_number
        TEXT    github_issue_status
        TEXT    github_issue_url
    }

    budget_categories      ||--o{ budget_items                    : "contains"
    budget_items           ||--o{ recurring_items                 : "templates"
    budget_items           ||--o{ transaction_budget_item_mappings: "classified as"
    budget_items           ||--o{ classification_rules            : "targets"
    accounts               ||--o{ recurring_items                 : "pays via"
    accounts               ||--o{ transactions                    : "source"
    accounts               ||--o{ scheduled_payments              : "for"
    accounts               ||--o{ forecast_items                  : "for"
    recurring_items        ||--o{ scheduled_payments              : "generates"
    transactions           ||--o{ transaction_budget_item_mappings: "classified by"
    transactions           |o--o| scheduled_payments              : "fulfills"
```

**Views**

| View | Purpose |
|---|---|
| `active_recurring_items` | Recurring items whose date range includes today |
| `monthly_outflow_by_category` | Effective monthly spend per budget category (from templates, not actuals) |
| `unmatched_transactions` | Transactions with no budget-item mapping |

---

## Food

```mermaid
erDiagram
    ingredient_categories {
        TEXT id           PK
        TEXT name
        TEXT store_section
        INT  sort_order
    }
    ingredients {
        TEXT id           PK
        TEXT category_id  FK
        TEXT name
        TEXT default_unit
        INT  pantry_staple
    }
    recipes {
        TEXT id           PK
        TEXT title
        INT  servings
        TEXT instructions
        TEXT tags
        TEXT source_url
        TEXT notes
    }
    recipe_ingredients {
        INT  id            PK
        TEXT recipe_id     FK
        TEXT ingredient_id FK
        REAL quantity
        TEXT unit
        TEXT notes
        INT  sort_order
    }
    recipe_variants {
        TEXT id        PK
        TEXT recipe_id FK
        TEXT name
        TEXT notes
    }
    recipe_variant_ingredients {
        INT  id                     PK
        TEXT variant_id             FK
        TEXT ingredient_id          FK
        TEXT replaces_ingredient_id FK
        REAL quantity
        TEXT unit
        TEXT notes
    }
    family_members {
        TEXT id            PK
        TEXT display_name
        TEXT dietary_flags
        TEXT notes
    }
    menu_plans {
        TEXT id         PK
        TEXT name
        TEXT week_start
    }
    menu_plan_slots {
        INT  id              PK
        TEXT menu_plan_id    FK
        TEXT recipe_id       FK
        INT  day_of_week
        TEXT meal_slot
        INT  servings_override
        TEXT notes
    }
    shopping_lists {
        TEXT id           PK
        TEXT menu_plan_id FK
        TEXT name
        TEXT status
    }
    shopping_list_items {
        INT  id               PK
        TEXT shopping_list_id FK
        TEXT ingredient_id    FK
        TEXT category_id      FK
        TEXT name
        REAL quantity
        TEXT unit
        TEXT notes
        INT  checked
        INT  sort_order
    }

    ingredient_categories ||--o{ ingredients          : "classifies"
    ingredient_categories ||--o{ shopping_list_items  : "groups"
    ingredients           ||--o{ recipe_ingredients           : "used in"
    ingredients           ||--o{ recipe_variant_ingredients   : "used in"
    ingredients           ||--o{ shopping_list_items           : "reference"
    recipes               ||--o{ recipe_ingredients    : "has"
    recipes               ||--o{ recipe_variants       : "has"
    recipes               ||--o{ menu_plan_slots       : "scheduled in"
    recipe_variants       ||--o{ recipe_variant_ingredients: "overrides"
    menu_plans            ||--o{ menu_plan_slots       : "contains"
    menu_plans            ||--o{ shopping_lists        : "generates"
    shopping_lists        ||--o{ shopping_list_items   : "contains"
```

> `meal_slot` values: `breakfast`, `lunch`, `dinner`, `snack`  
> `day_of_week`: 0 = Monday … 6 = Sunday  
> `tags` and `dietary_flags` are JSON arrays stored as TEXT
