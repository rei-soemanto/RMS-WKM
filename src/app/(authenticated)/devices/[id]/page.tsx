'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Terminal from '@/components/Terminal';

interface ActionLog {
  id: string;
  actionType: string;
  scopeUsed: string;
  status: string;
  errorMessage: string | null;
  executedAt: string;
  user: { name: string; email: string };
}

interface Device {
  id: string;
  name: string;
  macAddress: string | null;
  serialNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  actionLogs: ActionLog[];
}

interface RemoteAccessConfig {
  id: number;
  name: string;
  type: string;   // 'http' | 'ssh' | 'tcp'
  port: number;
  enabled: boolean;
}

interface ActiveSession {
  configId: number;
  url: string;
  expiresAt: string;
}

const typeIcon: Record<string, string> = {
  http: '🌐',
  https: '🔒',
  ssh: '🖥️',
  tcp: '🔌',
};

export default function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Remote Access state
  const [remoteConfigs, setRemoteConfigs] = useState<RemoteAccessConfig[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState('');
  const [activeSessions, setActiveSessions] = useState<Record<number, ActiveSession>>({});
  const [connectingId, setConnectingId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/devices/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Device not found');
        return res.json();
      })
      .then((data) => {
        setDevice(data.device);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const loadRemoteConfigs = useCallback(async () => {
    setRemoteLoading(true);
    setRemoteError('');
    try {
      const res = await fetch(`/api/devices/${id}/remote-access`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setRemoteConfigs(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setRemoteError(err instanceof Error ? err.message : 'Failed to load remote access configs');
    } finally {
      setRemoteLoading(false);
    }
  }, [id]);

  const openRemoteSession = async (config: RemoteAccessConfig) => {
    setConnectingId(config.id);
    try {
      const res = await fetch(`/api/devices/${id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_id: config.id, duration: 3600 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create session');

      // Store and open
      setActiveSessions((prev) => ({
        ...prev,
        [config.id]: {
          configId: config.id,
          url: data.url,
          expiresAt: data.expires_at,
        },
      }));
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" style={{ width: '40%' }} />
        <div className="mt-3">
          <div className="skeleton skeleton-card" />
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-title">{error || 'Device not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">{device.name}</h1>
          <p className="page-subtitle">
            Device ID: <span className="text-mono">{device.id}</span>
          </p>
        </div>
        <div className={`device-status ${device.isActive ? 'online' : 'offline'}`}>
          <span className="device-status-dot" />
          {device.isActive ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Device Info Cards */}
      <div className="stats-grid stagger-children" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="card">
          <div className="card-title">MAC Address</div>
          <div className="card-value text-mono" style={{ fontSize: '1rem' }}>
            {device.macAddress || '—'}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Serial Number</div>
          <div className="card-value text-mono" style={{ fontSize: '1rem' }}>
            {device.serialNumber || '—'}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Total Actions</div>
          <div className="card-value">{device.actionLogs.length}</div>
        </div>
        <div className="card">
          <div className="card-title">Last Updated</div>
          <div className="card-value" style={{ fontSize: '0.85rem' }}>
            {new Date(device.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Remote Access Panel ─────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Remote Access (RMS Connect)
          </h2>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            onClick={loadRemoteConfigs}
            disabled={remoteLoading}
          >
            {remoteLoading ? '⏳ Loading…' : remoteConfigs.length === 0 ? '🔌 Load Configs' : '↺ Refresh'}
          </button>
        </div>

        {remoteError && (
          <div className="login-error" style={{ marginBottom: 'var(--space-md)' }}>
            {remoteError}
          </div>
        )}

        {remoteConfigs.length > 0 ? (
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            {remoteConfigs.map((cfg) => {
              const session = activeSessions[cfg.id];
              const isConnecting = connectingId === cfg.id;

              return (
                <div
                  key={cfg.id}
                  className="card"
                  style={{ minWidth: '220px', flex: '1 1 220px', maxWidth: '320px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-sm)' }}>
                    <span style={{ fontSize: '1.4rem' }}>{typeIcon[cfg.type] ?? '🔗'}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {cfg.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {cfg.type} · Port {cfg.port}
                      </div>
                    </div>
                  </div>

                  {session && (
                    <div style={{
                      fontSize: '0.72rem',
                      color: 'var(--accent-success)',
                      marginBottom: 'var(--space-sm)',
                      wordBreak: 'break-all',
                    }}>
                      ✓ Session active until {new Date(session.expiresAt).toLocaleTimeString()}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '6px 14px', flex: 1 }}
                      disabled={isConnecting || !cfg.enabled}
                      onClick={() => openRemoteSession(cfg)}
                    >
                      {isConnecting ? '⏳ Connecting…' : session ? '↗ Open Again' : '↗ Open GUI'}
                    </button>
                    {session && (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                        onClick={() => window.open(session.url, '_blank', 'noopener,noreferrer')}
                        title={session.url}
                      >
                        🔗
                      </button>
                    )}
                  </div>

                  {!cfg.enabled && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-warning)', marginTop: '6px' }}>
                      ⚠ Disabled on device
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : !remoteLoading && (
          <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Click <strong>Load Configs</strong> to fetch RMS Connect configurations for this device
              (HTTP web GUI, SSH, TCP tunnels). Requires the <code>device_remote_access:write</code> scope on your API token.
            </p>
          </div>
        )}
      </div>

      {/* Terminal */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-lg)',
        }}>
          CLI Terminal
        </h2>
        <Terminal deviceId={device.id} deviceName={device.name} />
      </div>

      {/* Action Logs */}
      <div>
        <h2 style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-lg)',
        }}>
          Action History
        </h2>

        {device.actionLogs.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Scope</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {device.actionLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-mono" style={{ fontSize: '0.8rem' }}>
                      {log.actionType}
                    </td>
                    <td className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {log.scopeUsed}
                    </td>
                    <td>{log.user.name}</td>
                    <td>
                      <span
                        className={`badge ${
                          log.status === 'SUCCESS'
                            ? 'badge-success'
                            : log.status === 'FAILED'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {new Date(log.executedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No actions recorded</div>
              <p className="text-muted">
                Use the terminal above to execute commands on this device.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
