import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Eye, Trash2, CheckCircle2, AlertCircle, X, KeyRound } from 'lucide-react';
import { AppUser, UserRole, CustomFirebaseConfig } from '../types';
import { subscribeUsers, createUser, updateUserRole, deleteUser } from '../firebaseService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  firebaseConfig: CustomFirebaseConfig | null;
}

export default function UserManagementModal({
  isOpen,
  onClose,
  currentUser,
  firebaseConfig
}: UserManagementModalProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeUsers(firebaseConfig, (fetchedUsers) => {
      setUsers(fetchedUsers);
    });
    return () => unsubscribe();
  }, [isOpen, firebaseConfig]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setActionLoading(true);

    try {
      if (!newUsername.trim()) throw new Error('Username / ID is required.');
      if (!newPassword.trim()) throw new Error('Password is required.');

      await createUser(
        firebaseConfig,
        {
          username: newUsername.trim(),
          password: newPassword.trim(),
          displayName: newDisplayName.trim() || newUsername.trim(),
          role: newRole
        },
        currentUser
      );

      setSuccess(`User "${newUsername}" created successfully with ${newRole} role.`);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('viewer');
      setIsAddingUser(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRole = async (user: AppUser) => {
    setError(null);
    setSuccess(null);
    const targetRole: UserRole = user.role === 'admin' ? 'viewer' : 'admin';

    // Prevent demoting self
    if (user.id === currentUser?.id && targetRole === 'viewer') {
      setError('You cannot demote your own active account to Viewer.');
      return;
    }

    try {
      await updateUserRole(firebaseConfig, user.id, targetRole, currentUser);
      setSuccess(`Updated ${user.username}'s role to ${targetRole}.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to update user role.');
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) return;
    setError(null);
    setSuccess(null);

    try {
      await deleteUser(firebaseConfig, user.id, currentUser);
      setSuccess(`User "${user.username}" was deleted.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">User Management</h3>
              <p className="text-xs text-slate-400">Manage dispatch accounts and role permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts */}
        <div className="px-6 pt-4 space-y-2">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-800">Registered Accounts</h4>
              <p className="text-xs text-slate-500">Admins have write permissions; Viewers have read-only live view</p>
            </div>
            {!isAddingUser && (
              <button
                onClick={() => setIsAddingUser(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0e5697] hover:bg-[#0b4880] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add New User</span>
              </button>
            )}
          </div>

          {/* Add User Form Drawer */}
          {isAddingUser && (
            <form onSubmit={handleCreateUser} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">New User Account Details</span>
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    User ID / Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. jdoe or john@kft.com"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Permission Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                  >
                    <option value="viewer">Viewer (Read-only)</option>
                    <option value="admin">Admin (Full Edit & Dispatch)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#0e5697] hover:bg-[#0b4880] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          )}

          {/* User List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{u.displayName || u.username}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-normal">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.username}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Shield className="w-3 h-3 text-indigo-600" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>Viewer</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleRole(u)}
                            className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                            title={`Switch role to ${u.role === 'admin' ? 'Viewer' : 'Admin'}`}
                          >
                            Set to {u.role === 'admin' ? 'Viewer' : 'Admin'}
                          </button>
                          
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Role Capabilities:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><strong>Admin</strong>: Complete control over transport operations (dispatching rigs, editing fleet status, adding/deleting resources, and managing users).</li>
              <li><strong>Viewer</strong>: View-only access across live tracking, active transits, fleet status, and log exports without permissions to modify or delete.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
