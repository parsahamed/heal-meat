import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientForm from '../components/ClientForm';
import { createClient } from '../services/clients';
import { ClientInput } from '../types';

const emptyClient: ClientInput = {
  fileNumber: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  pricePerSession: 0,
  currency: 'TMN',
  fixTime: '',
  source: '',
  startingBalance: 0,
};

export default function ClientNewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: ClientInput) => {
    setLoading(true);
    try {
      const clientId = await createClient(values);
      navigate(`/clients/${clientId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h1>New Client</h1>
          <p className="muted">Add a new counseling client.</p>
        </div>
      </div>
      <div className="card">
        <ClientForm
          initialValues={emptyClient}
          submitLabel="Create Client"
          loading={loading}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}
