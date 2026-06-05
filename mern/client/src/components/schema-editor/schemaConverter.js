const newId = () => crypto.randomUUID();

const EMPTY_VISUAL = {
  mode: 'flat',
  fields: [],
  steps: [],
  expandedStepIndex: null,
};

// ─── schema → visual ────────────────────────────────────────────────────────

function fieldToVisual(f) {
  const isRequired = !!f.isRequired;
  const validate = (f.validate || []).filter((v) => v.type !== 'required');
  return {
    id: newId(),
    component: f.component || 'text-field',
    name: f.name || '',
    label: f.label || '',
    isRequired,
    options: f.options ? f.options.map((o) => ({ ...o })) : [],
    validate: validate.map((v) => ({ ...v })),
  };
}

export function schemaToVisual(schema) {
  if (!schema || !schema.fields || schema.fields.length === 0) {
    return { ...EMPTY_VISUAL, fields: [], steps: [] };
  }

  const first = schema.fields[0];

  // wizard mode
  if (first.component === 'wizard') {
    const steps = (first.fields || []).map((step) => {
      if (step.type === 'payment') {
        return {
          id: newId(),
          name: step.name || '',
          title: step.title || '',
          type: 'payment',
          fields: [],
          amount_cents: step.amount_cents || 0,
          currency: step.currency || 'aud',
          description: step.description || '',
        };
      }
      return {
        id: newId(),
        name: step.name || '',
        title: step.title || '',
        type: 'normal',
        fields: (step.fields || []).map(fieldToVisual),
        amount_cents: 0,
        currency: 'aud',
        description: '',
      };
    });
    return { mode: 'wizard', fields: [], steps, expandedStepIndex: null };
  }

  // flat mode
  return {
    mode: 'flat',
    fields: schema.fields.map(fieldToVisual),
    steps: [],
    expandedStepIndex: null,
  };
}

// ─── visual → schema ────────────────────────────────────────────────────────

function fieldToSchema(f) {
  const out = {
    component: f.component,
    name: f.name,
    label: f.label,
  };
  if (f.isRequired) {
    out.isRequired = true;
  }
  if (f.options && f.options.length > 0) {
    out.options = f.options.map(({ label, value }) => ({ label, value }));
  }
  const validate = [];
  if (f.isRequired) validate.push({ type: 'required' });
  validate.push(...(f.validate || []));
  if (validate.length > 0) out.validate = validate;
  return out;
}

export function visualToSchema(visual) {
  if (visual.mode === 'flat') {
    return { fields: visual.fields.map(fieldToSchema) };
  }

  // wizard mode — auto-compute nextStep from position
  const steps = visual.steps.map((step, i) => {
    const next = visual.steps[i + 1];

    if (step.type === 'payment') {
      const out = {
        name: step.name,
        title: step.title,
        type: 'payment',
        amount_cents: step.amount_cents,
        currency: step.currency,
        description: step.description,
      };
      if (next) out.nextStep = next.name;
      return out;
    }

    const out = {
      name: step.name,
      title: step.title,
      fields: step.fields.map(fieldToSchema),
    };
    if (next) out.nextStep = next.name;
    return out;
  });

  return {
    fields: [{ component: 'wizard', name: 'wizard', fields: steps }],
  };
}
