'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface UserItem {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'guardian', label: 'Guardian' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/10 text-purple-500',
  staff: 'bg-blue-500/10 text-blue-500',
  accountant: 'bg-emerald-500/10 text-emerald-500',
  guardian: 'bg-amber-500/10 text-amber-500',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('staff');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState('');

  const loadUsers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const qs = roleFilter ? `?role=${roleFilter}` : '';
    const res = await apiRequest<{ success: boolean; data: UserItem[]; total: number }>(
      `/api/users${qs}`,
      { token }
    );
    if (res.success) {
      setUsers(res.data || []);
      setTotal(res.total || 0);
    }
    setLoading(false);
  }, [roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function openCreate() {
    setEditUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('staff');
    setFormPassword('');
    setFormError('');
    setShowModal(true);
  }

  function openEdit(user: UserItem) {
    setEditUser(user);
    setFormName(user.name);
    setFormEmail(user.email || '');
    setFormPhone(user.phone || '');
    setFormRole(user.role);
    setFormPassword('');
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const token = getToken();
    if (!token) return;
    setSaving(true);

    try {
      if (editUser) {
        // Update
        const body: Record<string, string> = { name: formName };
        if (formEmail) body.email = formEmail;
        if (formPhone) body.phone = formPhone;
        if (formRole !== editUser.role) body.role = formRole;
        if (formPassword) body.password = formPassword;

        const res = await apiRequest<{ success: boolean; error?: string }>(
          `/api/users/${editUser._id}`,
          { method: 'PATCH', token, body: JSON.stringify(body) }
        );
        if (!res.success) throw new Error(res.error || 'Update failed');
      } else {
        // Create
        const body: Record<string, string> = { name: formName, role: formRole };
        if (formRole === 'guardian') {
          body.phone = formPhone;
        } else {
          body.email = formEmail;
          body.password = formPassword;
          if (formPhone) body.phone = formPhone;
        }

        const res = await apiRequest<{ success: boolean; error?: string; message?: string }>(
          '/api/users',
          { method: 'POST', token, body: JSON.stringify(body) }
        );
        if (!res.success) throw new Error(res.error || 'Create failed');
      }

      setShowModal(false);
      loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    const token = getToken();
    if (!token) return;
    const res = await apiRequest<{ success: boolean; error?: string }>(
      `/api/users/${userId}`,
      { method: 'DELETE', token }
    );
    if (res.success) {
      loadUsers();
    } else {
      alert(res.error || 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">{total} users total</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="accountant">Accountant</option>
            <option value="guardian">Guardian</option>
          </select>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">No users found.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Name</th>
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Email / Phone</th>
                  <th className="px-4 py-2.5 text-center text-muted-foreground font-medium">Role</th>
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Created</th>
                  <th className="px-4 py-2.5 text-center text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="px-4 py-2.5 text-foreground font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {u.email || u.phone || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] || ''}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDelete(u._id, u.name)}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {formRole === 'guardian' && !editUser ? (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Password will be auto-generated and sent via SMS
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                    <input
                      type="email"
                      required={!editUser && formRole !== 'guardian'}
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      {editUser ? 'New Password (leave blank to keep)' : 'Password'}
                    </label>
                    <input
                      type="password"
                      required={!editUser}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      minLength={4}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </>
              )}

              {formError && <p className="text-sm text-red-500">{formError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
