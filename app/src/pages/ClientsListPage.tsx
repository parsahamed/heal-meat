import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Client } from '../types';
import { subscribeClients } from '../services/clients';
import { formatMoney } from '../utils/format';
import Loading from '../components/Loading';

export default function ClientsListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeClients(
      (nextClients) => {
        setClients(nextClients);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => {
      const haystack = [
        client.fileNumber,
        client.firstName,
        client.lastName,
        client.phone,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [clients, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const aNum = Number(a.fileNumber);
      const bNum = Number(b.fileNumber);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(a.fileNumber || '').localeCompare(String(b.fileNumber || ''));
    });
    return list;
  }, [filtered]);

  if (loading) {
    return <Loading />;
  }

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="muted">Search, edit, and manage client profiles.</p>
        </div>
        <Link to="/clients/new" className="button primary">
          Add Client
        </Link>
      </div>

      <div className="card">
        <label className="field">
          <span>Search</span>
          <input
            type="search"
            placeholder="File #, name, phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="list">
        {sorted.map((client) => {
          const meetingsTotal = client.cachedMeetingsTotal ?? 0;
          const paidTotal = client.cachedPaidTotal ?? 0;
          const remain =
            client.cachedRemain ?? client.startingBalance + meetingsTotal - paidTotal;
          const status =
            remain > 0 ? 'owes' : remain === 0 ? 'settled' : 'credit';

          return (
            <Link to={`/clients/${client.id}`} className="list-item" key={client.id}>
              <div>
                <div className="list-title">
                  {client.firstName} {client.lastName}
                </div>
                <div className="list-subtitle">
                  File {client.fileNumber || 'â€”'} Â· {client.phone || 'No phone'}
                </div>
              </div>
              <div className="list-meta">
                <div className="meta-line">
                  {formatMoney(client.pricePerSession, client.currency)} Â·{' '}
                  {client.fixTime || 'Flexible'}
                </div>
                <span className={`badge ${status}`}>
                  {formatMoney(remain, client.currency)}
                </span>
              </div>
            </Link>
          );
        })}
        {sorted.length === 0 ? (
          <div className="empty">No clients match your search.</div>
        ) : null}
      </div>
    </section>
  );
}
