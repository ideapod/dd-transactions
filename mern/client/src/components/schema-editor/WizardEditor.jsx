import { Box, Button, IconButton, Typography, Paper, Chip, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import FlatFieldList from './FlatFieldList';
import PaymentStepEditor from './PaymentStepEditor';
import { TextField } from '@mui/material';

const newNormalStep = (i) => ({
  id: crypto.randomUUID(),
  name: `step-${i + 1}`,
  title: `Step ${i + 1}`,
  type: 'normal',
  fields: [],
  amount_cents: 0,
  currency: 'aud',
  description: '',
});

const newPaymentStep = () => ({
  id: crypto.randomUUID(),
  name: 'payment',
  title: 'Payment',
  type: 'payment',
  fields: [],
  amount_cents: 5000,
  currency: 'aud',
  description: 'Payment',
});

export default function WizardEditor({ steps, expandedIndex, onStepsChange, onExpandedChange }) {
  const update = (i, patch) => onStepsChange(steps.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const remove = (i) => { onStepsChange(steps.filter((_, idx) => idx !== i)); if (expandedIndex === i) onExpandedChange(null); };
  const move = (i, dir) => {
    const next = [...steps];
    const swap = i + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[i], next[swap]] = [next[swap], next[i]];
    onStepsChange(next);
  };
  const toggle = (i) => onExpandedChange(expandedIndex === i ? null : i);
  const addNormal = () => { onStepsChange([...steps, newNormalStep(steps.length)]); onExpandedChange(steps.length); };
  const addPayment = () => { onStepsChange([...steps, newPaymentStep()]); onExpandedChange(steps.length); };

  return (
    <Box>
      {steps.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No steps yet. Add a step to get started.</Typography>
      )}
      {steps.map((step, i) => (
        <Paper key={step.id} variant="outlined" sx={{ mb: 1.5, overflow: 'hidden' }}>
          {/* Step header row */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1.2, cursor: 'pointer', bgcolor: expandedIndex === i ? '#fff8f2' : 'white', '&:hover': { bgcolor: '#fafafa' } }}
            onClick={() => toggle(i)}
          >
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e3710a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, mr: 1.5, flexShrink: 0 }}>
              {i + 1}
            </Box>
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#3c4a60' }}>
              {step.title || step.name || <em style={{ color: '#aaa' }}>Unnamed step</em>}
            </Typography>
            {step.type === 'payment' && (
              <Chip icon={<PaymentIcon />} label="Payment" size="small" sx={{ mr: 1, bgcolor: '#fff0e0', color: '#e3710a', borderColor: '#e3710a' }} variant="outlined" />
            )}
            {step.type === 'normal' && (
              <Chip label={`${step.fields.length} field${step.fields.length !== 1 ? 's' : ''}`} size="small" sx={{ mr: 1 }} />
            )}
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); move(i, -1); }} disabled={i === 0}><ArrowUpwardIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); move(i, 1); }} disabled={i === steps.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); remove(i); }}><DeleteIcon fontSize="small" /></IconButton>
          </Box>

          {/* Expanded body */}
          {expandedIndex === i && (
            <Box sx={{ p: 2, borderTop: '1px solid #f0f0f0' }}>
              {step.type === 'normal' && (
                <>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <TextField size="small" label="Step title" value={step.title} onChange={(e) => update(i, { title: e.target.value })} sx={{ flex: 2, minWidth: 160 }} />
                    <TextField size="small" label="Step name (key)" value={step.name} onChange={(e) => update(i, { name: e.target.value })} sx={{ flex: 1, minWidth: 120 }} />
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#3c4a60', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>Fields</Typography>
                  <FlatFieldList fields={step.fields} onChange={(fields) => update(i, { fields })} />
                </>
              )}
              {step.type === 'payment' && (
                <PaymentStepEditor step={step} onChange={(updated) => update(i, updated)} />
              )}
            </Box>
          )}
        </Paper>
      ))}

      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button size="small" startIcon={<AddIcon />} onClick={addNormal}>Add step</Button>
        <Button size="small" startIcon={<PaymentIcon />} onClick={addPayment} sx={{ color: '#e3710a', borderColor: '#e3710a' }} variant="outlined">Add payment step</Button>
      </Box>
    </Box>
  );
}
