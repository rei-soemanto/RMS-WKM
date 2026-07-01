'use client';

import Link from 'next/link';

interface DeviceCardProps {
  id: string;
  name: string;
  macAddress: string | null;
  serialNumber: string | null;
  isActive: boolean;
  actionCount?: number;
}

export default function DeviceCard({
  id,
  name,
  macAddress,
  serialNumber,
  isActive,
  actionCount = 0,
}: DeviceCardProps) {
  return (
    <Link href={`/devices/${id}`} style={{ textDecoration: 'none' }}>
      <div className="device-card">
        <div className="device-card-header">
          <div>
            <div className="device-card-name">{name}</div>
            <div className="device-card-id">ID: {id}</div>
          </div>
          <div className={`device-status ${isActive ? 'online' : 'offline'}`}>
            <span className="device-status-dot" />
            {isActive ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="device-card-meta">
          {macAddress && (
            <div className="device-card-meta-row">
              <span className="device-card-meta-label">MAC</span>
              <span className="device-card-meta-value">{macAddress}</span>
            </div>
          )}
          {serialNumber && (
            <div className="device-card-meta-row">
              <span className="device-card-meta-label">Serial</span>
              <span className="device-card-meta-value">{serialNumber}</span>
            </div>
          )}
          <div className="device-card-meta-row">
            <span className="device-card-meta-label">Actions</span>
            <span className="device-card-meta-value">{actionCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
