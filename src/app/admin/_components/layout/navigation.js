import { Award, BarChart3, Bot, Building2, FileText, FolderTree, LayoutDashboard, MessageCircle, Package, Quote, Settings, ShoppingCart, Tags, Ticket, Users, Warehouse } from 'lucide-react'

// Sidebar order is fixed by the spec. `module` maps to role permissions in settings.roles.
export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard', end: true },
  { to: '/products', label: 'Products', icon: Package, module: 'products' },
  { to: '/categories', label: 'Categories', icon: FolderTree, module: 'categories' },
  { to: '/brands', label: 'Brands', icon: Award, module: 'brands' },
  { to: '/orders', label: 'Orders', icon: ShoppingCart, module: 'orders' },
  { to: '/price-management', label: 'Price Management', icon: Tags, module: 'prices' },
  { to: '/inventory', label: 'Inventory', icon: Warehouse, module: 'inventory' },
  { to: '/branches', label: 'Branches', icon: Building2, module: 'branches' },
  { to: '/customers', label: 'Customers', icon: Users, module: 'customers' },
  { to: '/marketing', label: 'Coupons', icon: Ticket, module: 'marketing' },
  { to: '/blogs', label: 'Blogs', icon: FileText, module: 'marketing' },
  { to: '/testimonials', label: 'Testimonials', icon: Quote, module: 'marketing' },
  { to: '/whatsapp', label: 'WhatsApp Automation', icon: MessageCircle, module: 'whatsapp' },
  { to: '/ai-chatbot', label: 'AI Chatbot', icon: Bot, module: 'chatbot' },
  { to: '/reports', label: 'Reports', icon: BarChart3, module: 'reports' },
  { to: '/settings', label: 'Settings', icon: Settings, module: 'settings' },
]
