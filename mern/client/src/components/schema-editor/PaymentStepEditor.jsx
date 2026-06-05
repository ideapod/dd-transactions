import { Box, TextField, Typography } from '@mui/material';

export default function PaymentStepEditor({ step, onChange }) {
  const update = (patch) => onChange({ ...step, ...patch });

  return (
    <Box sx={{ p: 2, bgcolor: '#fff8f2', border: '1px solid #e3710a', borderRadius: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#e3710a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment step</Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small" label="Step title" value={step.title}
          onChange={(e) => update({ title: e.target.value })} sx={{ flex: 2, minWidth: 160 }}
        />
        <TextField
          size="small" label="Step name (key)" value={step.name}
          onChange={(e) => update({ name: e.target.value })} sx={{ flex: 1, minWidth: 120 }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
        <TextField
          size="small" label="Amount (cents)" type="number" value={step.amount_cents}
          onChange={(e) => update({ amount_cents: parseInt(e.target.value) || 0 })} sx={{ width: 160 }}
          helperText="e.g. 5000 = $50.00"
        />
        <TextField
          size="small" label="Currency" value={step.currency}
          onChange={(e) => update({ currency: e.target.value.toLowerCase() })} sx={{ width: 100 }}
        />
        <TextField
          size="small" label="Description" value={step.description}
          onChange={(e) => update({ description: e.target.value })} sx={{ flex: 2, minWidth: 160 }}
          helperText="Shown on the Stripe checkout page"
        />
      </Box>
    </Box>
  );
}
