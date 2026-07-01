'use client';

import { useState, useEffect, use } from 'react';
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

export default function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
