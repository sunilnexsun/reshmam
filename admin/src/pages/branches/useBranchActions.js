import { useConfirm, useToast } from '../../components/ui'
import { getState, logActivity, removeItem, updateItem } from '../../services/store'

/** Activate/deactivate and delete (with dependency check) shared by list + details pages. */
export function useBranchActions() {
  const toast = useToast()
  const confirm = useConfirm()

  const toggleStatus = async (b) => {
    const next = b.status === 'Active' ? 'Inactive' : 'Active'
    if (next === 'Inactive' && !(await confirm({ title: 'Deactivate branch?', message: `${b.name} will be hidden from the storefront and new orders. Stock, prices and order history are kept.`, confirmText: 'Deactivate' }))) return false
    updateItem('branches', b.id, { status: next })
    logActivity('branch', `Branch ${next === 'Active' ? 'activated' : 'deactivated'}: ${b.name}`)
    toast.success(`${b.name} ${next === 'Active' ? 'activated' : 'deactivated'}`)
    return true
  }

  /** Returns true when the branch was deleted. */
  const remove = async (b) => {
    const s = getState()
    const variants = s.variants.filter((v) => v.branchId === b.id).length
    const orders = s.orders.filter((o) => o.branchId === b.id).length
    const users = s.settings.users.filter((u) => u.branchId === b.id).length
    if (variants || orders || users) {
      const reasons = [variants && `${variants} product variants`, orders && `${orders} orders`, users && `${users} admin users`].filter(Boolean).join(', ')
      if (b.status === 'Inactive') {
        await confirm({ title: 'Branch cannot be deleted', message: `${b.name} still has ${reasons}. It is already inactive, which keeps the history safe. Move stock and users to another branch before deleting.`, confirmText: 'OK', tone: 'primary' })
        return false
      }
      const ok = await confirm({ title: 'Branch cannot be deleted', message: `${b.name} has ${reasons}. Deleting it would break that history. Deactivate the branch instead?`, confirmText: 'Deactivate instead', tone: 'primary' })
      if (ok) {
        updateItem('branches', b.id, { status: 'Inactive' })
        logActivity('branch', `Branch deactivated: ${b.name}`)
        toast.success(`${b.name} deactivated`)
      }
      return false
    }
    if (!(await confirm({ title: 'Delete branch?', message: `Delete ${b.name} (${b.code})? This cannot be undone.`, confirmText: 'Delete' }))) return false
    removeItem('branches', b.id)
    logActivity('branch', `Branch deleted: ${b.name}`)
    toast.success('Branch deleted')
    return true
  }

  return { toggleStatus, remove }
}
