import { useState, useEffect, useRef } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FlatFieldList from './FlatFieldList';
import WizardEditor from './WizardEditor';
import { schemaToVisual, visualToSchema } from './schemaConverter';

export default function VisualEditor({ schema, onChange, isActive }) {
  const [visual, setVisual] = useState(() => schemaToVisual(schema));
  const lastSyncedSchema = useRef(schema);

  // Re-sync from schema prop when JSON tab edits come in
  useEffect(() => {
    if (!isActive) return;
    const incoming = JSON.stringify(schema);
    const last = JSON.stringify(lastSyncedSchema.current);
    if (incoming !== last) {
      setVisual(schemaToVisual(schema));
      lastSyncedSchema.current = schema;
    }
  }, [schema, isActive]);

  const commit = (nextVisual) => {
    setVisual(nextVisual);
    const nextSchema = visualToSchema(nextVisual);
    lastSyncedSchema.current = nextSchema;
    onChange(nextSchema);
  };

  const setMode = (_, mode) => {
    if (!mode) return;
    commit({ ...visual, mode, expandedStepIndex: null });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#3c4a60' }}>Form type:</Typography>
        <ToggleButtonGroup value={visual.mode} exclusive onChange={setMode} size="small">
          <ToggleButton value="flat">
            <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} /> Flat form
          </ToggleButton>
          <ToggleButton value="wizard">
            <AccountTreeIcon fontSize="small" sx={{ mr: 0.5 }} /> Wizard (multi-step)
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {visual.mode === 'flat' && (
        <FlatFieldList
          fields={visual.fields}
          onChange={(fields) => commit({ ...visual, fields })}
        />
      )}

      {visual.mode === 'wizard' && (
        <WizardEditor
          steps={visual.steps}
          expandedIndex={visual.expandedStepIndex}
          onStepsChange={(steps) => commit({ ...visual, steps })}
          onExpandedChange={(expandedStepIndex) => setVisual({ ...visual, expandedStepIndex })}
        />
      )}
    </Box>
  );
}
