import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './services/auth'
import { ConfirmProvider, ToastProvider } from './components/ui'
import { AdminLayout } from './components/layout/AdminLayout'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Dashboard from './pages/dashboard/Dashboard'
import ProductList from './pages/products/ProductList'
import ProductForm from './pages/products/ProductForm'
import ProductDetails from './pages/products/ProductDetails'
import OrderList from './pages/orders/OrderList'
import OrderDetails from './pages/orders/OrderDetails'
import PriceManagement from './pages/prices/PriceManagement'
import Inventory from './pages/inventory/Inventory'
import BranchList from './pages/branches/BranchList'
import BranchDetails from './pages/branches/BranchDetails'
import CustomerList from './pages/customers/CustomerList'
import CustomerDetails from './pages/customers/CustomerDetails'
import Marketing from './pages/marketing/Marketing'
import WhatsAppAutomation from './pages/whatsapp/WhatsAppAutomation'
import AIChatbot from './pages/chatbot/AIChatbot'
import Reports from './pages/reports/Reports'
import Settings from './pages/settings/Settings'

// HashRouter keeps deep links working on any static host (and in the single-file preview).
export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<ProductList />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id" element={<ProductDetails />} />
                <Route path="products/:id/edit" element={<ProductForm />} />
                <Route path="orders" element={<OrderList />} />
                <Route path="orders/:id" element={<OrderDetails />} />
                <Route path="price-management" element={<PriceManagement />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="branches" element={<BranchList />} />
                <Route path="branches/:id" element={<BranchDetails />} />
                <Route path="customers" element={<CustomerList />} />
                <Route path="customers/:id" element={<CustomerDetails />} />
                <Route path="marketing" element={<Marketing />} />
                <Route path="whatsapp" element={<WhatsAppAutomation />} />
                <Route path="ai-chatbot" element={<AIChatbot />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </HashRouter>
  )
}
