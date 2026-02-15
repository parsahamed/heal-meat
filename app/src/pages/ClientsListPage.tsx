import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading';
import { subscribeClients } from '../services/clients';
import { Client } from '../types';
import { formatMoney } from '../utils/format';

type BalanceFilter = 'all' | 'debt' | 'settled' | 'credit';
type SortBy = 'file' | 'remain-desc' | 'remain-asc' | 'price-desc' | 'price-asc';

type ClientWithBalance = {
  client: Client;
  remain: number;
  status: 'owes' | 'settled' | 'credit';
};

const BALANCE_FILTER_STORAGE_KEY = 'clients.balanceFilter';
const SORT_BY_STORAGE_KEY = 'clients.sortBy';

const BALANCE_FILTER_VALUES: BalanceFilter[] = ['all', 'debt', 'settled', 'credit'];
const SORT_BY_VALUES: SortBy[] = ['file', 'remain-desc', 'remain-asc', 'price-desc', 'price-asc'];

function readBalanceFilter(): BalanceFilter {
  try {
    const value = localStorage.getItem(BALANCE_FILTER_STORAGE_KEY);
    if (value && BALANCE_FILTER_VALUES.includes(value as BalanceFilter)) {
      return value as BalanceFilter;
    }
  } catch {
    return 'all';
  }
  return 'all';
}

function readSortBy(): SortBy {
  try {
    const value = localStorage.getItem(SORT_BY_STORAGE_KEY);
    if (value && SORT_BY_VALUES.includes(value as SortBy)) {
      return value as SortBy;
    }
  } catch {
    return 'file';
  }
  return 'file';
}

export default function ClientsListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>(() => readBalanceFilter());
  const [sortBy, setSortBy] = useState<SortBy>(() => readSortBy());
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

  useEffect(() => {
    try {
      localStorage.setItem(BALANCE_FILTER_STORAGE_KEY, balanceFilter);
    } catch {
      // Ignore storage write failures.
    }
  }, [balanceFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_BY_STORAGE_KEY, sortBy);
    } catch {
      // Ignore storage write failures.
    }
  }, [sortBy]);

  const clientsWithBalance = useMemo<ClientWithBalance[]>(() => {
    return clients.map((client) => {
      const startingBalance = Number(client.startingBalance ?? 0);
      const meetingsTotal = Number(client.cachedMeetingsTotal ?? 0);
      const paidTotal = Number(client.cachedPaidTotal ?? 0);
      const remain = startingBalance + meetingsTotal - paidTotal;
      const status = remain > 0 ? 'owes' : remain === 0 ? 'settled' : 'credit';

      return { client, remain, status };
    });
  }, [clients]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clientsWithBalance.filter(({ client, status }) => {
      if (balanceFilter !== 'all') {
        const matchesBalance =
          (balanceFilter === 'debt' && status === 'owes') ||
          (balanceFilter === 'settled' && status === 'settled') ||
          (balanceFilter === 'credit' && status === 'credit');
        if (!matchesBalance) return false;
      }

      if (!query) return true;

      const haystack = [client.fileNumber, client.firstName, client.lastName, client.phone]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [clientsWithBalance, search, balanceFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];

    list.sort((a, b) => {
      if (sortBy === 'remain-desc') return b.remain - a.remain;
      if (sortBy === 'remain-asc') return a.remain - b.remain;
      if (sortBy === 'price-desc') return b.client.pricePerSession - a.client.pricePerSession;
      if (sortBy === 'price-asc') return a.client.pricePerSession - b.client.pricePerSession;

      const aNum = Number(a.client.fileNumber);
      const bNum = Number(b.client.fileNumber);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(a.client.fileNumber || '').localeCompare(String(b.client.fileNumber || ''));
    });

    return list;
  }, [filtered, sortBy]);

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
        <div className="grid">
          <label className="field">
            <span>Search</span>
            <input
              type="search"
              placeholder="File #, name, phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Balance Filter</span>
            <select
              value={balanceFilter}
              onChange={(event) => setBalanceFilter(event.target.value as BalanceFilter)}
            >
              <option value="all">All</option>
              <option value="debt">Debt (Owes)</option>
              <option value="credit">Credit (Overpaid)</option>
              <option value="settled">Settled (Zero)</option>
            </select>
          </label>

          <label className="field">
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}>
              <option value="file">File Number</option>
              <option value="remain-desc">Balance High to Low</option>
              <option value="remain-asc">Balance Low to High</option>
              <option value="price-desc">Session Price High to Low</option>
              <option value="price-asc">Session Price Low to High</option>
            </select>
          </label>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="list">
        {sorted.map(({ client, remain, status }) => (
          <Link to={`/clients/${client.id}`} className="list-item" key={client.id}>
            <div>
              <div className="list-title">
                {client.firstName} {client.lastName}
              </div>
              <div className="list-subtitle">
                File {client.fileNumber || '-'} | {client.phone || 'No phone'}
              </div>
            </div>
            <div className="list-meta">
              <div className="meta-line">
                {formatMoney(client.pricePerSession, client.currency)} | {client.fixTime || 'Flexible'}
              </div>
              <span className={`badge ${status}`}>{formatMoney(remain, client.currency)}</span>
            </div>
          </Link>
        ))}

        {sorted.length === 0 ? <div className="empty">No clients match your filters.</div> : null}
      </div>
    </section>
  );
}
