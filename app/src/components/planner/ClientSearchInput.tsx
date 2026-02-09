import { useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '../../types';

type ClientSearchInputProps = {
  clients: Client[];
  value: string;
  onSelect: (clientId: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const clientLabel = (client: Client) => {
  const base = `${client.firstName} ${client.lastName}`.trim();
  return client.fileNumber ? `${client.fileNumber} - ${base}` : base;
};

export default function ClientSearchInput({
  clients,
  value,
  onSelect,
  placeholder = 'Search client',
  disabled = false,
}: ClientSearchInputProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const selected = clients.find((client) => client.id === value);
    if (!selected) {
      setQuery('');
      return;
    }
    setQuery(clientLabel(selected));
  }, [value, clients]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (event.target instanceof Node && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clients.slice(0, 8);
    return clients
      .filter((client) => {
        const haystack = [
          client.fileNumber,
          client.firstName,
          client.lastName,
          client.phone,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 10);
  }, [clients, query]);

  const handleSelect = (client: Client) => {
    onSelect(client.id);
    setOpen(false);
  };

  return (
    <div className="search-input" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setOpen(true);
          if (!next) onSelect('');
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
      />
      {open && !disabled ? (
        <div className="search-input__list">
          {filtered.length === 0 ? (
            <div className="search-input__empty">No clients found.</div>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                className="search-input__item"
                onClick={() => handleSelect(client)}
              >
                <div className="search-input__label">{clientLabel(client)}</div>
                <div className="search-input__meta">{client.phone || 'No phone'}</div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
