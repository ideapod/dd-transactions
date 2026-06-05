import { useState } from 'react';
import { Box, Button, IconButton, Typography, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import FieldEditor from './FieldEditor';

const newField = () => ({
  id: crypto.randomUUID(),
  component: 'text-field',
  name: '',
  label: '',
  isRequired: false,
  options: [],
  validate: [],
});

export default function FlatFieldList({ fields, onChange }) {
  const [expandedId, setExpandedId] = useState(null);

  const update = (id, patch) => onChange(fields.map((f) => f.id === id ? { ...f, ...patch } : f));
  const remove = (id) => { onChange(fields.filter((f) => f.id !== id)); if (expandedId === id) setExpandedId(null); };
  const move = (i, dir) => {
    const next = [...fields];
    const swap = i + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[i], next[swap]] = [next[swap], next[i]];
    onChange(next);
  };
  const add = () => {
    const f = newField();
    onChange([...fields, f]);
    setExpandedId(f.id);
  };

  return (
    <Box>
      {fields.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No fields yet.</Typography>
      )}
      {fields.map((field, i) => (
        <Paper key={field.id} variant="outlined" sx={{ mb: 1, overflow: 'hidden' }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
            onClick={() => setExpandedId(expandedId === field.id ? null : field.id)}
          >
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, color: '#3c4a60' }}>
              {field.label || field.name || <em style={{ color: '#aaa' }}>Unnamed field</em>}
              <Typography component="span" variant="caption" sx={{ ml: 1, color: '#aaa' }}>{field.component}</Typography>
            </Typography>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); move(i, -1); }} disabled={i === 0}><ArrowUpwardIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); move(i, 1); }} disabled={i === fields.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); remove(field.id); }}><DeleteIcon fontSize="small" /></IconButton>
          </Box>
          {expandedId === field.id && (
            <FieldEditor field={field} onChange={(updated) => update(field.id, updated)} />
          )}
        </Paper>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={add}>Add field</Button>
    </Box>
  );
}
