import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  let totalDevices = 0;
  let onlineDevices = 0;
  let offlineDevices = 0;
  let recentLogs: {
    id: string;
    actionType: string;
    status: string;
    executedAt: Date;
    device: { name: string };
    user: { name: string };
  }[] = [];

  try {
    totalDevices = await prisma.device.count();
    onlineDevices = await prisma.device.count({ where: { isActive: true } });
    offlineDevices = totalDevices - onlineDevices;
    recentLogs = await prisma.deviceActionLog.findMany({
      orderBy: { executedAt: 'desc' },
      take: 10,
      include: {
        device: { select: { name: true } },
        user: { select: { name: true } },
      },
    });
  } catch {
    // Database might not be migrated yet — show empty state
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Overview of your Teltonika device fleet
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stagger-children">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Total Devices</div>
              <div className="card-value">{totalDevices}</div>
            </div>
            <div className="card-icon primary">📡</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Online</div>
              <div className="card-value" style={{ color: 'var(--accent-success)' }}>
                {onlineDevices}
              </div>
            </div>
            <div className="card-icon success">✓</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Offline</div>
              <div className="card-value" style={{ color: 'var(--accent-danger)' }}>
                {offlineDevices}
              </div>
            </div>
            <div className="card-icon danger">✕</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Actions</div>
              <div className="card-value">{recentLogs.length}</div>
            </div>
            <div className="card-icon warning">📋</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-lg)',
        }}>
          Recent Activity
        </h2>

        {recentLogs.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Device</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="text-mono" style={{ fontSize: '0.8rem' }}>
                        {log.actionType}
                      </span>
                    </td>
                    <td>{log.device.name}</td>
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
                      {log.executedAt.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No activity yet</div>
              <p className="text-muted">
                Device actions will appear here once you start executing commands.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
