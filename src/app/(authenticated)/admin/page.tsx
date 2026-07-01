'use client';

import { useState, useEffect, FormEvent } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  _count: { actionLogs: number };
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create user form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('VIEWER');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = () => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create user');
        setFormLoading(false);
        return;
      }

      // Reset form and refresh
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormRole('VIEWER');
      setShowCreateForm(false);
      setFormLoading(false);
      fetchUsers();
    } catch {
      setFormError('Network error');
      setFormLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    SUPERADMIN: 'badge-danger',
    MANAGER: 'badge-warning',
    OPERATOR: 'badge-primary',
    VIEWER: 'badge-info',
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage users and system roles</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '+ New User'}
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="card animate-slide-up" style={{ marginBottom: 'var(--space-xl)', maxWidth: '520px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>
            Create New User
          </h3>

          {formError && <div className="login-error">{formError}</div>}

          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label htmlFor="user-name" className="form-label">Full Name</label>
              <input
                id="user-name"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-email" className="form-label">Email</label>
              <input
                id="user-email"
                type="email"
                className="form-input"
                placeholder="user@wkm.co.id"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-password" className="form-label">Password</label>
              <input
                id="user-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-role" className="form-label">Role</label>
              <select
                id="user-role"
                className="form-select"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
              >
                <option value="VIEWER">Viewer</option>
                <option value="OPERATOR">Operator</option>
                <option value="MANAGER">Manager</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={formLoading}
            >
              {formLoading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-text" style={{ height: '48px', marginBottom: '8px' }} />
          ))}
        </div>
      ) : users.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {user.name}
                  </td>
                  <td className="text-mono" style={{ fontSize: '0.8rem' }}>
                    {user.email}
                  </td>
                  <td>
                    <span className={`badge ${roleColors[user.role] || 'badge-info'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user._count.actionLogs}</td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No users found</div>
            <p className="text-muted">Create your first user to get started.</p>
          </div>
        </div>
      )}
    </div>
  );
}
