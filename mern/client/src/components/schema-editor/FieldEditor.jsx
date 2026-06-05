import { Box, TextField, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Switch, Divider, Typography } from '@mui/material';
import OptionsEditor from './OptionsEditor';
import ValidationEditor from './ValidationEditor';

const COMPONENT_TYPES = [
  { value: 'text-field', label: 'Text field' },
  { value: 'textarea', label: 'Text area' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select (dropdown)' },
  { value: 'radio', label: 'Radio buttons' },
  { value: 'date-picker', label: 'Date picker' },
];

export default function FieldEditor({ field, onChange }) {
  const update = (patch) => onChange({ ...field, ...patch });
  const needsOptions = field.component === 'select' || field.component === 'radio';

  return (
    <Box sx={{ p: 2, bgcolor: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#3c4a60', textTransform: 'uppercase', letterSpacing: 0.5 }}>Field settings</Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select value={field.component} label="Type" onChange={(e) => update({ component: e.target.value, options: [] })}>
            {COMPONENT_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="Field name (key)" value={field.name} onChange={(e) => update({ name: e.target.value })} sx={{ flex: 1, minWidth: 140 }} />
        <TextField size="small" label="Label" value={field.label} onChange={(e) => update({ label: e.target.value })} sx={{ flex: 1, minWidth: 140 }} />
        <FormControlLabel
          control={<Switch size="small" checked={field.isRequired} onChange={(e) => update({ isRequired: e.target.checked })} />}
          label="Required"
        />
      </Box>
      {needsOptions && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <OptionsEditor options={field.options} onChange={(options) => update({ options })} />
        </>
      )}
      <Divider sx={{ my: 1.5 }} />
      <ValidationEditor validate={field.validate} onChange={(validate) => update({ validate })} />
    </Box>
  );
}
