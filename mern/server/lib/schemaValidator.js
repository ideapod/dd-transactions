/**
 * Lightweight structural checks for @data-driven-forms schemas, so an LLM
 * (or API client) gets actionable errors instead of a form that crashes at
 * render time. Not a full validator — it catches the mistakes that break
 * rendering or the payment flow.
 */

// @data-driven-forms/mui-component-mapper + our custom components (TransactionForm.jsx)
export const COMPONENTS = [
  "text-field", "textarea", "select", "checkbox", "radio", "switch",
  "date-picker", "time-picker", "slider", "dual-list-select",
  "plain-text", "sub-form", "field-array", "tabs", "wizard",
  "bullet-list", "payment-summary",
];

export function validateSchema(schema) {
  const errors = [];
  const names = new Map();

  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return { valid: false, errors: ["schema must be an object with a `fields` array"] };
  }
  if (!Array.isArray(schema.fields)) {
    return { valid: false, errors: ["schema.fields must be an array"] };
  }

  const recordName = (name, path) => {
    if (names.has(name)) errors.push(`${path}: duplicate name "${name}" (also at ${names.get(name)})`);
    else names.set(name, path);
  };

  function checkField(field, path) {
    if (!field || typeof field !== "object") return errors.push(`${path}: must be an object`);
    if (typeof field.component !== "string") return errors.push(`${path}: missing "component"`);
    if (!COMPONENTS.includes(field.component)) {
      errors.push(`${path}: unknown component "${field.component}" (allowed: ${COMPONENTS.join(", ")})`);
    }
    if (typeof field.name !== "string" || !field.name) errors.push(`${path}: missing "name"`);
    else recordName(field.name, path);

    switch (field.component) {
      case "wizard":
        checkWizard(field, path);
        break;
      case "tabs":
        checkContainerItems(field, path, "tab");
        break;
      case "sub-form":
      case "field-array":
        if (!Array.isArray(field.fields)) errors.push(`${path}: ${field.component} needs a "fields" array`);
        else field.fields.forEach((f, i) => checkField(f, `${path}.fields[${i}]`));
        break;
      case "select":
      case "radio":
        if (!Array.isArray(field.options) || field.options.length === 0) {
          errors.push(`${path}: ${field.component} needs a non-empty "options" array of { label, value }`);
        }
        break;
      case "bullet-list":
        if (!Array.isArray(field.items)) errors.push(`${path}: bullet-list needs an "items" array of strings`);
        break;
    }
  }

  // tabs/wizard children are items with { name, title, fields } — no component
  function checkContainerItems(field, path, kind) {
    if (!Array.isArray(field.fields) || field.fields.length === 0) {
      errors.push(`${path}: ${field.component} needs a non-empty "fields" array of ${kind}s`);
      return [];
    }
    field.fields.forEach((item, i) => {
      const itemPath = `${path}.fields[${i}]`;
      if (typeof item.name !== "string" || !item.name) errors.push(`${itemPath}: ${kind} missing "name"`);
      else recordName(item.name, itemPath);
      if (item.type === "payment") return; // payment steps get their fields injected by the client
      if (!Array.isArray(item.fields)) errors.push(`${itemPath}: ${kind} needs a "fields" array`);
      else item.fields.forEach((f, j) => checkField(f, `${itemPath}.fields[${j}]`));
    });
    return field.fields;
  }

  function checkWizard(field, path) {
    const steps = checkContainerItems(field, path, "step");
    const stepNames = new Set(steps.map((s) => s.name));

    steps.forEach((step, i) => {
      const stepPath = `${path}.fields[${i}]`;
      const targets = typeof step.nextStep === "string"
        ? [step.nextStep]
        : step.nextStep?.stepMapper ? Object.values(step.nextStep.stepMapper) : [];
      for (const t of targets) {
        if (!stepNames.has(t)) errors.push(`${stepPath}: nextStep "${t}" does not match any step name`);
      }
      if (step.type === "payment") {
        if (!/^fields\[\d+\]$/.test(path)) {
          errors.push(`${stepPath}: payment steps are only supported in a top-level wizard`);
        }
        if (!Number.isInteger(step.amount_cents) || step.amount_cents <= 0) {
          errors.push(`${stepPath}: payment step needs a positive integer "amount_cents"`);
        }
        if (step.currency !== undefined && !/^[a-z]{3}$/.test(step.currency)) {
          errors.push(`${stepPath}: currency must be a lowercase ISO code such as "aud"`);
        }
      }
    });

    if (steps.filter((s) => s.type === "payment").length > 1) {
      errors.push(`${path}: only one payment step is supported`);
    }
  }

  schema.fields.forEach((f, i) => checkField(f, `fields[${i}]`));

  const wizards = schema.fields.filter((f) => f?.component === "wizard");
  if (wizards.length && schema.fields.length > 1) {
    errors.push("a wizard must be the only top-level field (put everything else inside its steps)");
  }

  return { valid: errors.length === 0, errors };
}
