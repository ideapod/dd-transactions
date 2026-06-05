import { Box, TextField, IconButton, Button, MenuItem, Select, Typography, FormControl, InputLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';

const VALIDATION_TYPES = [
  { value: 'required', label: 'Required' },
  { value: 'pattern', label: 'Pattern (regex)' },
  { value: 'min-length', label: 'Min length' },
  { value: 'max-length', label: 'Max length' },
];

export default function ValidationEditor({ validate, onChange }) {
  const [addType, setAddType] = useState('pattern');

  const update = (i, patch) => onChange(validate.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  const remove = (i) => onChange(validate.filter((_, idx) => idx !== i));

  const add = () => {
    if (addType === 'required' && validate.find((v) => v.type === 'required')) return;
    const defaults = {
      required: { type: 'required' },
      pattern: { type: 'pattern', pattern: '', message: '' },
      'min-length': { type: 'min-length', threshold: 1 },
      'max-length': { type: 'max-length', threshold: 100 },
    };
    onChange([...validate, defaults[addType]]);
  };

  const hasRequired = validate.some((v) => v.type === 'required');

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Validations</Typography>
      {validate.map((v, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ minWidth: 90, color: 'text.secondary' }}>{v.type}</Typography>
          {v.type === 'pattern' && (
            <>
              <TextField size="small" label="Regex" value={v.pattern} onChange={(e) => update(i, { pattern: e.target.value })} sx={{ flex: 2 }} />
              <TextField size="small" label="Message" value={v.message} onChange={(e) => update(i, { message: e.target.value })} sx={{ flex: 2 }} />
            </>
          )}
          {(v.type === 'min-length' || v.type === 'max-length') && (
            <TextField size="small" label="Value" type="number" value={v.threshold} onChange={(e) => update(i, { threshold: parseInt(e.target.value) || 0 })} sx={{ width: 100 }} />
          )}
          <IconButton size="small" onClick={() => remove(i)}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ))}
      <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Add validation</InputLabel>
          <Select value={addType} label="Add validation" onChange={(e) => setAddType(e.target.value)}>
            {VALIDATION_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value} disabled={t.value === 'required' && hasRequired}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<AddIcon />} onClick={add}>Add</Button>
      </Box>
    </Box>
  );
}
