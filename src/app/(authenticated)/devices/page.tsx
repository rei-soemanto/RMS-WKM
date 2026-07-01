'use client';

import { useState, useEffect } from 'react';
import DeviceCard from '@/components/DeviceCard';

interface Device {
  id: string;
  name: string;
  macAddress: string | null;
  serialNumber: string | null;
  isActive: boolean;
  _count: { actionLogs: number };
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');

  useEffect(() => {
    fetch('/api/devices')
      .then((res) => res.json())
      .then((data) => {
        setDevices(data.devices || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(search.toLowerCase()) ||
      device.id.toLowerCase().includes(search.toLowerCase()) ||
      (device.macAddress || '').toLowerCase().includes(search.toLowerCase()) ||
      (device.serialNumber || '').toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'online' && device.isActive) ||
      (filter === 'offline' && !device.isActive);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Devices</h1>
        <p className="page-subtitle">
          Manage your Teltonika networking fleet
        </p>
      </div>

      {/* Search & Filters */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, ID, MAC, or serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={{ maxWidth: '160px' }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'online' | 'offline')}
        >
          <option value="all">All Devices</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Device Grid */}
      {loading ? (
        <div className="device-grid stagger-children">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : filteredDevices.length > 0 ? (
        <div className="device-grid stagger-children">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              id={device.id}
              name={device.name}
              macAddress={device.macAddress}
              serialNumber={device.serialNumber}
              isActive={device.isActive}
              actionCount={device._count.actionLogs}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <div className="empty-state-title">
              {search || filter !== 'all'
                ? 'No devices match your filters'
                : 'No devices found'}
            </div>
            <p className="text-muted">
              {search || filter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Devices will appear here once synced from Teltonika RMS.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
