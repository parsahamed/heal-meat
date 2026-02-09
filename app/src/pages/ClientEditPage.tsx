import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ClientForm from '../components/ClientForm';
import Loading from '../components/Loading';
import { getClient, updateClient } from '../services/clients';
import { ClientInput } from '../types';

export default function ClientEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialValues, setInitialValues] = useState<ClientInput | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getClient(id)
      .then((client) => {
        if (!client) {
          setError('Client not found.');
          return;
        }
        setInitialValues({
          fileNumber: client.fileNumber,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          email: client.email,
          pricePerSession: client.pricePerSession,
          currency: client.currency,
          fixTime: client.fixTime,
          source: client.source,
          startingBalance: client.startingBalance,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: ClientInput) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateClient(id, values);
      navigate(`/clients/${id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="stack">
        <div className="error">{error}</div>
        <Link to="/clients" className="button ghost">
          Back to Clients
        </Link>
      </div>
    );
  }

  if (!initialValues) {
    return null;
  }

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h1>Edit Client</h1>
          <p className="muted">Update client details and pricing.</p>
        </div>
      </div>
      <div className="card">
        <ClientForm
          initialValues={initialValues}
          submitLabel="Save Changes"
          loading={saving}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}
