import { Box, TextField, IconButton, Button, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function OptionsEditor({ options, onChange }) {
  const update = (i, key, value) => {
    const next = options.map((o, idx) => idx === i ? { ...o, [key]: value } : o);
    onChange(next);
  };
  const remove = (i) => onChange(options.filter((_, idx) => idx !== i));
  const add = () => onChange([...options, { label: '', value: '' }]);

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Options</Typography>
      {options.map((opt, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
          <TextField size="small" label="Label" value={opt.label} onChange={(e) => update(i, 'label', e.target.value)} sx={{ flex: 1 }} />
          <TextField size="small" label="Value" value={opt.value} onChange={(e) => update(i, 'value', e.target.value)} sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => remove(i)}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={add} sx={{ mt: 0.5 }}>Add option</Button>
    </Box>
  );
}
