import useFormApi from '@data-driven-forms/react-form-renderer/use-form-api';

/**
 * Custom @data-driven-forms field component.
 * Reads all current form values and renders them as a read-only confirmation
 * summary before the user submits payment.
 */
export default function PaymentSummary({ amountCents, currency, description }) {
  const formOptions = useFormApi();
  const values = formOptions.getState().values;

  const displayAmount = amountCents
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: currency || 'AUD' }).format(amountCents / 100)
    : null;

  // filter out internal wizard keys (they start with "wizard")
  const entries = Object.entries(values).filter(([key]) => key !== 'wizard');

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: '#3c4a60', fontWeight: 700, marginBottom: 16, fontSize: 16 }}>
        Please confirm your details
      </h3>
      <div style={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '10px 16px' }}>
            <span style={{ width: 160, fontWeight: 600, color: '#3c4a60', textTransform: 'capitalize', flexShrink: 0 }}>
              {key.replace(/_/g, ' ')}
            </span>
            <span style={{ color: '#3c4a60' }}>{String(value)}</span>
          </div>
        ))}
      </div>
      {displayAmount && (
        <div style={{ background: '#fff8f2', border: '1px solid #e3710a', borderRadius: 2, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#3c4a60', fontWeight: 600 }}>{description || 'Payment due'}</span>
          <span style={{ color: '#e3710a', fontWeight: 700, fontSize: 20 }}>{displayAmount}</span>
        </div>
      )}
    </div>
  );
}
