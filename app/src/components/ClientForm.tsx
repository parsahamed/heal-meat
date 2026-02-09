import { FormEvent, useState } from 'react';
import { ClientInput } from '../types';

type ClientFormProps = {
  initialValues: ClientInput;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (values: ClientInput) => Promise<void>;
};

export default function ClientForm({
  initialValues,
  submitLabel,
  loading = false,
  onSubmit,
}: ClientFormProps) {
  const [values, setValues] = useState<ClientInput>(initialValues);
  const [error, setError] = useState('');

  const update = (field: keyof ClientInput, value: string | number) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({
        ...values,
        pricePerSession: Number(values.pricePerSession ?? 0),
        startingBalance: Number(values.startingBalance ?? 0),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save client.';
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form grid">
      <label className="field">
        <span>File Number</span>
        <input
          value={values.fileNumber}
          onChange={(event) => update('fileNumber', event.target.value)}
        />
      </label>
      <label className="field">
        <span>First Name</span>
        <input
          required
          value={values.firstName}
          onChange={(event) => update('firstName', event.target.value)}
        />
      </label>
      <label className="field">
        <span>Last Name</span>
        <input
          required
          value={values.lastName}
          onChange={(event) => update('lastName', event.target.value)}
        />
      </label>
      <label className="field">
        <span>Phone</span>
        <input
          value={values.phone}
          onChange={(event) => update('phone', event.target.value)}
        />
      </label>
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={values.email}
          onChange={(event) => update('email', event.target.value)}
        />
      </label>
      <label className="field">
        <span>Price Per Session</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={values.pricePerSession}
          onChange={(event) => update('pricePerSession', Number(event.target.value))}
        />
      </label>
      <label className="field">
        <span>Currency</span>
        <input
          value={values.currency}
          onChange={(event) => update('currency', event.target.value)}
        />
      </label>
      <label className="field">
        <span>Fix Time</span>
        <input
          value={values.fixTime}
          onChange={(event) => update('fixTime', event.target.value)}
        />
      </label>
      <label className="field">
        <span>Source</span>
        <input
          value={values.source}
          onChange={(event) => update('source', event.target.value)}
        />
      </label>
      <label className="field">
        <span>Starting Balance</span>
        <input
          type="number"
          step="0.01"
          value={values.startingBalance}
          onChange={(event) => update('startingBalance', Number(event.target.value))}
        />
      </label>
      {error ? <div className="error">{error}</div> : null}
      <div className="form-actions">
        <button type="submit" className="button primary" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
