'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { apiRequest } from '@/lib/api';
import type { SubscriptionPlan, SubscriptionPlanFeatures } from '@/types/superAdmin';
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, Star } from 'lucide-react';

const FEATURE_LABELS: { key: keyof SubscriptionPlanFeatures; label: string }[] = [
  { key: 'bulkFeeGeneration',     label: 'Bulk Fee Generation' },
  { key: 'smsNotifications',      label: 'SMS Notifications' },
  { key: 'incomeExpenseTracking', label: 'Income/Expense Tracking' },
  { key: 'multipleRoles',         label: 'Multiple Roles' },
  { key: 'guardianAccess',        label: 'Guardian Access' },
  { key: 'exportReports',         label: 'Export Reports' },
  { key: 'autoIncomeTracking',    label: 'Auto Income Tracking' },
];

const EMPTY_FEATURES: SubscriptionPlanFeatures = {
  bulkFeeGeneration: false,
  smsNotifications: false,
  incomeExpenseTracking: false,
  multipleRoles: false,
  guardianAccess: false,
  exportReports: false,
  autoIncomeTracking: false,
};

type PlanFormState = {
  name: string;
  slug: string;
  price: string;
  currency: string;
  maxStudents: string;
  maxAdmins: string;
  features: SubscriptionPlanFeatures;
  isActive: boolean;
  mostPopular: boolean;
  order: string;
};

const DEFAULT_FORM: PlanFormState = {
  name: '', slug: '', price: '0', currency: 'BDT',
  maxStudents: '50', maxAdmins: '1',
  features: { ...EMPTY_FEATURES },
  isActive: true, mostPopular: false, order: '0',
};

export default function SuperAdminPlansPage() {
  const { token } = useSuperAdmin();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<PlanFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: SubscriptionPlan[] }>(
        '/api/super-admin/plans',
        { token: token! }
      );
      if (res.success) setPlans(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  function openCreate() {
    setEditPlan(null);
    setForm(DEFAULT_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      price: String(plan.price),
      currency: plan.currency,
      maxStudents: String(plan.maxStudents),
      maxAdmins: String(plan.maxAdmins),
      features: { ...plan.features },
      isActive: plan.isActive,
      mostPopular: plan.mostPopular ?? false,
      order: String(plan.order),
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      price: Number(form.price),
      currency: form.currency,
      maxStudents: Number(form.maxStudents),
      maxAdmins: Number(form.maxAdmins),
      features: form.features,
      isActive: form.isActive,
      mostPopular: form.mostPopular,
      order: Number(form.order),
    };
    try {
      if (editPlan) {
        await apiRequest(`/api/super-admin/plans/${editPlan._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
          token: token!,
        });
      } else {
        await apiRequest('/api/super-admin/plans', {
          method: 'POST',
          body: JSON.stringify(payload),
          token: token!,
        });
      }
      setShowModal(false);
      fetchPlans();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/super-admin/plans/${deleteTarget._id}`, {
        method: 'DELETE',
        token: token!,
      });
      setDeleteTarget(null);
      fetchPlans();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(plan: SubscriptionPlan) {
    try {
      await apiRequest(`/api/super-admin/plans/${plan._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !plan.isActive }),
        token: token!,
      });
      fetchPlans();
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleMostPopular(plan: SubscriptionPlan) {
    try {
      await apiRequest(`/api/super-admin/plans/${plan._id}`, {
        method: 'PUT',
        body: JSON.stringify({ mostPopular: !plan.mostPopular }),
        token: token!,
      });
      fetchPlans();
    } catch (err) {
      console.error(err);
    }
  }

  const planColors: Record<string, string> = {
    free:     'bg-zinc-700/50 text-zinc-300',
    standard: 'bg-indigo-500/15 text-indigo-300',
    pro:      'bg-violet-500/15 text-violet-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Subscription Plans</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{plans.length} plan{plans.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <p>No plans yet.</p>
          <button onClick={openCreate} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">Create the first plan →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan._id} className={`bg-zinc-900 border rounded-2xl p-5 space-y-4 relative transition-all ${plan.isActive ? 'border-zinc-800/60' : 'border-zinc-800/30 opacity-60'} ${plan.mostPopular ? 'ring-1 ring-amber-500/40' : ''}`}>
              {plan.mostPopular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 rounded-full text-[10px] font-bold text-black tracking-wide uppercase whitespace-nowrap">
                  Most Popular
                </div>
              )}
              {/* Badge + toggles */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${planColors[plan.slug] || planColors.free}`}>
                    {plan.slug}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-2">{plan.name}</h3>
                  <p className="text-2xl font-extrabold text-white mt-1">
                    ৳{plan.price.toLocaleString()}
                    <span className="text-sm font-normal text-zinc-500">/mo</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-1 shrink-0">
                  <button
                    onClick={() => toggleMostPopular(plan)}
                    title={plan.mostPopular ? 'Remove Most Popular' : 'Mark as Most Popular'}
                    className={`transition-colors ${plan.mostPopular ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-amber-500'}`}
                  >
                    <Star className={`w-5 h-5 ${plan.mostPopular ? 'fill-amber-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => toggleActive(plan)}
                    title={plan.isActive ? 'Deactivate' : 'Activate'}
                    className={`transition-colors ${plan.isActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {plan.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* Limits */}
              <div className="flex gap-3 text-xs">
                <div className="flex-1 bg-zinc-800/50 rounded-lg px-3 py-2 text-center">
                  <p className="text-zinc-500">Students</p>
                  <p className="font-semibold text-zinc-200 mt-0.5">{plan.maxStudents === -1 ? '∞' : plan.maxStudents}</p>
                </div>
                <div className="flex-1 bg-zinc-800/50 rounded-lg px-3 py-2 text-center">
                  <p className="text-zinc-500">Admins</p>
                  <p className="font-semibold text-zinc-200 mt-0.5">{plan.maxAdmins === -1 ? '∞' : plan.maxAdmins}</p>
                </div>
                <div className="flex-1 bg-zinc-800/50 rounded-lg px-3 py-2 text-center">
                  <p className="text-zinc-500">Order</p>
                  <p className="font-semibold text-zinc-200 mt-0.5">{plan.order}</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-1.5">
                {FEATURE_LABELS.map(({ key, label }) => (
                  <li key={key} className={`flex items-center gap-2 text-xs ${plan.features[key] ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {plan.features[key]
                      ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <X className="w-3.5 h-3.5 shrink-0" />}
                    {label}
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-zinc-800/60">
                <button
                  onClick={() => openEdit(plan)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-700/60 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(plan)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="font-semibold text-white">{editPlan ? 'Edit Plan' : 'New Plan'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name + Slug */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Plan Name *</label>
                  <input
                    required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Pro"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Slug *</label>
                  <input
                    required value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. pro"
                  />
                </div>
              </div>

              {/* Price + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Price</label>
                  <input
                    type="number" min="0" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Currency</label>
                  <input
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                    placeholder="BDT"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Max Students</label>
                  <input
                    type="number" min="-1" value={form.maxStudents}
                    onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-zinc-600 mt-0.5">-1 = unlimited</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Max Admins</label>
                  <input
                    type="number" min="-1" value={form.maxAdmins}
                    onChange={e => setForm(f => ({ ...f, maxAdmins: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-zinc-600 mt-0.5">-1 = unlimited</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Order</label>
                  <input
                    type="number" min="0" value={form.order}
                    onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Features</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURE_LABELS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.features[key]}
                        onChange={e => setForm(f => ({ ...f, features: { ...f.features, [key]: e.target.checked } }))}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
                      />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Active + Most Popular toggles */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
                  />
                  <span className="text-sm text-zinc-300">Active (visible to schools)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.mostPopular}
                    onChange={e => setForm(f => ({ ...f, mostPopular: e.target.checked }))}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-amber-500"
                  />
                  <span className="text-sm text-zinc-300 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400" /> Most Popular badge
                  </span>
                </label>
              </div>

              {formError && <p className="text-sm text-red-400">{formError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-colors">
                  {saving ? 'Saving…' : editPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-red-900/50 rounded-2xl p-6">
            <h2 className="font-semibold text-red-400 mb-2">Delete Plan</h2>
            <p className="text-sm text-zinc-400 mb-5">
              Are you sure you want to delete <strong className="text-zinc-200">{deleteTarget.name}</strong>?
              Schools currently on this plan will remain but will need to be reassigned.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded-xl transition-colors">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
