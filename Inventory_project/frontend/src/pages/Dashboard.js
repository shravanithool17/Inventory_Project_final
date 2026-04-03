import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertCircle, CheckCircle2, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import InventoryTable from '../components/InventoryTable';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const [components, setComponents] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [maxProduction, setMaxProduction] = useState({ '3HP': 0, '5HP': 0, '7.5HP': 0 });
  const [criticalComponents, setCriticalComponents] = useState({ '3HP': null, '5HP': null, '7.5HP': null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [componentsRes, requirementsRes, maxProdRes] = await Promise.all([
        axios.get(`${API}/components`),
        axios.get(`${API}/motor-requirements`),
        axios.get(`${API}/calculate-max-production`)
      ]);
      setComponents(componentsRes.data);
      setRequirements(requirementsRes.data);
      setMaxProduction(maxProdRes.data.production);
      setCriticalComponents(maxProdRes.data.critical_components);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateComponentQuantity = async (componentId, newQuantity) => {
    try {
      await axios.put(`${API}/components/${componentId}`, {
        quantity: newQuantity
      });
      await fetchData();
      toast.success('Quantity updated');
    } catch (error) {
      console.error('Error updating component:', error);
      toast.error('Failed to update quantity');
    }
  };

  // Calculate stats with intelligent thresholds
  const getLowStockThreshold = (componentId) => {
    const maxReq = requirements
      .filter(r => r.component_id === componentId)
      .reduce((max, r) => Math.max(max, r.required_quantity), 0);
    return maxReq > 0 ? maxReq * 5 : 10;
  };

  const totalComponents = components.length;
  const lowStockCount = components.filter(c => {
    const threshold = getLowStockThreshold(c.id);
    return c.quantity < threshold && c.quantity > 0;
  }).length;
  const criticalCount = components.filter(c => c.quantity === 0).length;
  const totalValue = components.reduce((sum, c) => sum + c.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#3A5C45' }} />
          <p style={{ color: '#596157' }}>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F0', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E2D9' }}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#E8F0EA' }}>
                <Zap className="w-6 h-6" style={{ color: '#3A5C45' }} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: '#1E231D', fontFamily: 'Outfit, sans-serif' }}>
                  Solar Pump Inventory Dashboard
                </h1>
                <p className="text-sm mt-1" style={{ color: '#596157' }}>Balance of System Components Management & Analysis</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-6">
        <nav className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: '#E2E2D9' }}>
          <div className="flex flex-wrap gap-3">
            <Link to="/" className="px-6 py-2 rounded-lg font-medium transition-all" style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              📊 Dashboard
            </Link>
            <Link to="/3hp" className="px-6 py-2 rounded-lg font-medium transition-all" style={{ backgroundColor: '#f8f9fa', color: '#2c3e50' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#3498db'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#2c3e50'; }}>
              🔧 3HP System
            </Link>
            <Link to="/5hp" className="px-6 py-2 rounded-lg font-medium transition-all" style={{ backgroundColor: '#f8f9fa', color: '#2c3e50' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#3498db'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#2c3e50'; }}>
              🔧 5HP System
            </Link>
            <Link to="/7-5hp" className="px-6 py-2 rounded-lg font-medium transition-all" style={{ backgroundColor: '#f8f9fa', color: '#2c3e50' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#3498db'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#2c3e50'; }}>
              🔧 7.5HP System
            </Link>
          </div>
        </nav>
      </div>

      <main className="max-w-[1600px] mx-auto p-4 md:p-8">
        {/* Alert Messages */}
        {criticalCount > 0 && (
          <div className="mb-6 p-4 rounded-lg border-l-4" style={{ backgroundColor: '#f8d7da', borderColor: '#e74c3c', color: '#721c24' }}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              <div>
                <strong className="font-semibold">🚨 Critical Alert!</strong>
                <p className="text-sm mt-1">{criticalCount} component(s) are completely out of stock. Production is halted!</p>
              </div>
            </div>
          </div>
        )}

        {lowStockCount > 0 && criticalCount === 0 && (
          <div className="mb-6 p-4 rounded-lg border-l-4" style={{ backgroundColor: '#fff3cd', borderColor: '#f39c12', color: '#856404' }}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              <div>
                <strong className="font-semibold">⚠️ Low Stock Warning!</strong>
                <p className="text-sm mt-1">{lowStockCount} component(s) are running low (below 10 units). Please restock soon.</p>
              </div>
            </div>
          </div>
        )}

        {criticalCount === 0 && lowStockCount === 0 && (
          <div className="mb-6 p-4 rounded-lg border-l-4" style={{ backgroundColor: '#d4edda', borderColor: '#27ae60', color: '#155724' }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <strong className="font-semibold">✅ All Systems Operational!</strong>
                <p className="text-sm mt-1">Inventory levels are healthy. All motor types can be produced.</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - ENHANCED */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #3498db' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#3498db' }}>📦 TOTAL COMPONENTS</p>
                <p className="text-5xl font-extrabold" style={{ color: '#3498db' }}>{totalComponents}</p>
                <small className="text-gray-500 mt-2 block">Different types</small>
              </div>
              <Package className="w-16 h-16" style={{ color: '#3498db', opacity: 0.3 }} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #27ae60' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#27ae60' }}>📊 TOTAL STOCK</p>
                <p className="text-5xl font-extrabold" style={{ color: '#27ae60' }}>{totalValue.toFixed(0)}</p>
                <small className="text-gray-500 mt-2 block">Total units</small>
              </div>
              <TrendingUp className="w-16 h-16" style={{ color: '#27ae60', opacity: 0.3 }} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #f39c12' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#f39c12' }}>⚠️ LOW STOCK</p>
                <p className="text-5xl font-extrabold" style={{ color: '#f39c12' }}>{lowStockCount}</p>
                <small className="text-gray-500 mt-2 block">Components</small>
              </div>
              <AlertCircle className="w-16 h-16" style={{ color: '#f39c12', opacity: 0.3 }} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #e74c3c' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#e74c3c' }}>🚨 CRITICAL</p>
                <p className="text-5xl font-extrabold" style={{ color: '#e74c3c' }}>{criticalCount}</p>
                <small className="text-gray-500 mt-2 block">Out of stock</small>
              </div>
              <AlertCircle className="w-16 h-16" style={{ color: '#e74c3c', opacity: 0.3 }} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #9b59b6' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#9b59b6' }}>🎯 MAX PRODUCTION</p>
                <p className="text-5xl font-extrabold" style={{ color: '#9b59b6' }}>{maxProduction['3HP'] || 0}</p>
                <small className="text-gray-500 mt-2 block">3HP motors</small>
              </div>
              <CheckCircle2 className="w-16 h-16" style={{ color: '#9b59b6', opacity: 0.3 }} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #16a085' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#16a085' }}>✅ HEALTHY</p>
                <p className="text-5xl font-extrabold" style={{ color: '#16a085' }}>{totalComponents - lowStockCount - criticalCount}</p>
                <small className="text-gray-500 mt-2 block">Components OK</small>
              </div>
              <CheckCircle2 className="w-16 h-16" style={{ color: '#16a085', opacity: 0.3 }} />
            </div>
          </div>
        </div>

        {/* Production Capacity Analysis */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
          <h2 className="text-xl font-semibold mb-6" style={{ color: '#1E231D', fontFamily: 'Outfit, sans-serif' }}>🏭 Production Capacity Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-xl" style={{ backgroundColor: '#e3f2fd' }}>
              <div className="inline-block px-6 py-2 rounded-full font-bold text-lg mb-3" style={{ background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', color: 'white' }}>3HP</div>
              <div className="text-4xl font-bold mb-2" style={{ color: '#3498db' }}>{maxProduction['3HP'] || 0}</div>
              <p className="text-sm" style={{ color: '#7f8c8d' }}>Maximum motors</p>
              {criticalComponents['3HP'] && (
                <div className="mt-3 p-2 rounded text-xs font-medium" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
                  🎯 Limited by: <strong>{criticalComponents['3HP']}</strong>
                </div>
              )}
            </div>
            <div className="text-center p-6 rounded-xl" style={{ backgroundColor: '#fff8e1' }}>
              <div className="inline-block px-6 py-2 rounded-full font-bold text-lg mb-3" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', color: 'white' }}>5HP</div>
              <div className="text-4xl font-bold mb-2" style={{ color: '#f39c12' }}>{maxProduction['5HP'] || 0}</div>
              <p className="text-sm" style={{ color: '#7f8c8d' }}>Maximum motors</p>
              {criticalComponents['5HP'] && (
                <div className="mt-3 p-2 rounded text-xs font-medium" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
                  🎯 Limited by: <strong>{criticalComponents['5HP']}</strong>
                </div>
              )}
            </div>
            <div className="text-center p-6 rounded-xl" style={{ backgroundColor: '#ffebee' }}>
              <div className="inline-block px-6 py-2 rounded-full font-bold text-lg mb-3" style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', color: 'white' }}>7.5HP</div>
              <div className="text-4xl font-bold mb-2" style={{ color: '#e74c3c' }}>{maxProduction['7.5HP'] || 0}</div>
              <p className="text-sm" style={{ color: '#7f8c8d' }}>Maximum motors</p>
              {criticalComponents['7.5HP'] && (
                <div className="mt-3 p-2 rounded text-xs font-medium" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
                  🎯 Limited by: <strong>{criticalComponents['7.5HP']}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <InventoryTable 
          components={components}
          requirements={requirements}
          onUpdateQuantity={updateComponentQuantity}
        />
      </main>
    </div>
  );
}
