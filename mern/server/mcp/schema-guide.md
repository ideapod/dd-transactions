# Authoring dd-transactions schemas

A transaction definition (TxnDef) holds a `@data-driven-forms` schema: `{ "fields": [ ... ] }`.
Every field needs a `component` and a `name` unique across the whole schema. Submitted
values are keyed by `name`, so pick stable, descriptive names such as `first-name` or `abn`.

## Components

| component | notes |
|---|---|
| `text-field` | `label`, optional `type` (`email`, `number`, `tel`…), `helperText`, `placeholder` |
| `textarea` | multi-line text |
| `select` | `options: [{ "label", "value" }]`, optional `isMulti: true` |
| `radio` | `options: [{ "label", "value" }]` |
| `checkbox` | single boolean, or `options` for a checkbox group |
| `switch` | boolean toggle |
| `date-picker`, `time-picker` | dates and times |
| `slider` | `min`, `max`, `step` |
| `dual-list-select` | `options`; pick many from a long list |
| `plain-text` | static text: `label` is the text, `element` + `variant` set the style (`h1`…`h5`, `body1`) |
| `bullet-list` | static bullet list: `items: ["…", "…"]` |
| `sub-form` | groups fields: `title`, `description`, `fields: [...]` |
| `field-array` | repeatable group: `fields: [...]` is the template for each row |
| `tabs` | `fields: [{ "name", "title", "fields": [...] }]` (the tab items have no `component`) |
| `wizard` | multi-step form, described below |

## Validation

```json
{ "component": "text-field", "name": "email", "label": "Email", "isRequired": true,
  "validate": [{ "type": "required" },
               { "type": "pattern", "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", "message": "Enter a valid email" }] }
```

Validator types: `required`, `pattern`, `min-length`, `max-length`, `min-number-value`, `max-number-value`, `url`.
Set `isRequired: true` alongside `required` so the asterisk shows.

Show a field only when another field has a value:
`"condition": { "when": "has-abn", "is": "yes" }`

## Multi-step forms (wizard)

A wizard must be the **only** top-level field. Its steps are items with no `component`:

```json
{ "fields": [{
  "component": "wizard", "name": "wizard",
  "fields": [
    { "name": "step-details", "title": "Your details", "nextStep": "step-confirm", "fields": [ ... ] },
    { "name": "step-confirm", "title": "Confirm", "fields": [ ... ] }
  ]
}]}
```

`nextStep` is a step `name`. To branch on an answer:
`"nextStep": { "when": "applicant-type", "stepMapper": { "business": "step-abn", "individual": "step-person" } }`

## Payments

A form takes payment when a step in its top-level wizard has `"type": "payment"`, usually the last step.
The app fills that step with an amount summary and sends the user to Stripe Checkout when they submit the
form. Payment steps need no `fields`, and a wizard can have only one:

```json
{ "name": "payment", "title": "Payment", "type": "payment",
  "amount_cents": 5000, "currency": "aud", "description": "Registration fee" }
```

`amount_cents` is a positive integer in the currency's minor unit. `currency` is a lowercase ISO code.
Forms without a payment step are saved straight away with status `free`.

## House style (Service Victoria)

- Open each wizard step, or the whole form, with a `plain-text` heading (`"element": "h2", "variant": "h2"`)
  and a short `body1` paragraph explaining what the step is for.
- Use `bullet-list` for "before you start" checklists.
- Use `tabs` for reference information (for example "Before you start", "How it works", "FAQ").
- Use plain language, with labels in sentence case.

## Transactions

Submitted transactions have `status` of `free` (saved, no payment), `pending` (sent to Stripe but not paid yet)
or `complete` (paid). `data` holds the submitted values keyed by field `name`.
