import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertCircle, CheckCircle2, TrendingUp, Zap, Clock } from 'lucide-react';
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
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [componentsRes, requirementsRes, maxProdRes, usageRes] = await Promise.all([
        axios.get(`${API}/components`),
        axios.get(`${API}/motor-requirements`),
        axios.get(`${API}/calculate-max-production`),
        axios.get(`${API}/usage/history`)
      ]);
      setComponents(componentsRes.data);
      setRequirements(requirementsRes.data);
      setMaxProduction(maxProdRes.data.production);
      setCriticalComponents(maxProdRes.data.critical_components);
      setUsageHistory(usageRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateComponentQuantity = async (componentId, newQuantity) => {
    try {
      await axios.put(`${API}/components/${componentId}`, { quantity: newQuantity });
      await fetchData();
      toast.success('Quantity updated');
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const getLowStockThreshold = (componentId) => {
    const maxReq = requirements.filter(r => r.component_id === componentId).reduce((max, r) => Math.max(max, r.required_quantity), 0);
    return maxReq > 0 ? maxReq * 5 : 10;
  };

  const totalComponents = components.length;
  const lowStockCount = components.filter(c => { const t = getLowStockThreshold(c.id); return c.quantity < t && c.quantity > 0; }).length;
  const criticalCount = components.filter(c => c.quantity === 0).length;
  const totalValue = components.reduce((sum, c) => sum + c.quantity, 0);

  // Common components — used in all 3 motor types
  const commonComponentIds = (() => {
    const motorTypes = ['3HP', '5HP', '7.5HP'];
    const usedIn = {};
    requirements.forEach(r => {
      if (!usedIn[r.component_id]) usedIn[r.component_id] = new Set();
      usedIn[r.component_id].add(r.motor_type);
    });
    return Object.keys(usedIn).filter(id => motorTypes.every(mt => usedIn[id].has(mt)));
  })();

  const last5Days = [...new Set(usageHistory.map(r => r.date))].sort((a, b) => b.localeCompare(a)).slice(0, 5);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F0' }}>
      <div className="text-center">
        <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#3A5C45' }} />
        <p style={{ color: '#596157' }}>Loading inventory...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F0', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <header className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E2D9' }}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
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
      </header>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-6">
        <nav className="bg-white border rounded-xl p-4 shadow-sm" style={{ borderColor: '#E2E2D9' }}>
          <div className="flex flex-wrap gap-3">
            <Link to="/" className="px-6 py-2 rounded-lg font-medium" style={{ backgroundColor: '#2c3e50', color: 'white' }}>📊 Dashboard</Link>
            <Link to="/3hp" className="px-6 py-2 rounded-lg font-medium" style={{ backgroundColor: '#f8f9fa', color: '#2c3e50' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#3498db'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#2c3e50'; }}>🔧 3HP System</Link>
            <Link to="/5hp" className="px-6 py-2 rounded-lg font-medium" style={{ backgroundColor: '#f8f9fa', color: '#2c3e50' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#3498db'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#2c3e50'; }}>🔧 5HP System</Link>
            <Link to="/7-5hp" className="px-6 py-2 rounded-lg font-medium" style={{ backgroundColor: '#f8f9fa', color: '#2c3e50' }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#3498db'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#f8f9fa'; e.target.style.color = '#2c3e50'; }}>🔧 7.5HP System</Link>
          </div>
        </nav>
      </div>

      <main className="max-w-[1600px] mx-auto p-4 md:p-8">
        {/* Alerts */}
        {criticalCount > 0 && (
          <div className="mb-6 p-4 rounded-lg border-l-4" style={{ backgroundColor: '#f8d7da', borderColor: '#e74c3c', color: '#721c24' }}>
            <div className="flex items-center gap-3"><AlertCircle className="w-6 h-6" /><div><strong>🚨 Critical Alert!</strong><p className="text-sm mt-1">{criticalCount} component(s) out of stock. Production halted!</p></div></div>
          </div>
        )}
        {lowStockCount > 0 && criticalCount === 0 && (
          <div className="mb-6 p-4 rounded-lg border-l-4" style={{ backgroundColor: '#fff3cd', borderColor: '#f39c12', color: '#856404' }}>
            <div className="flex items-center gap-3"><AlertCircle className="w-6 h-6" /><div><strong>⚠️ Low Stock Warning!</strong><p className="text-sm mt-1">{lowStockCount} component(s) running low. Please restock soon.</p></div></div>
          </div>
        )}
        {criticalCount === 0 && lowStockCount === 0 && (
          <div className="mb-6 p-4 rounded-lg border-l-4" style={{ backgroundColor: '#d4edda', borderColor: '#27ae60', color: '#155724' }}>
            <div className="flex items-center gap-3"><CheckCircle2 className="w-6 h-6" /><div><strong>✅ All Systems Operational!</strong><p className="text-sm mt-1">Inventory levels are healthy.</p></div></div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            { label: '📦 TOTAL COMPONENTS', color: '#3498db', value: totalComponents, sub: 'Different types', icon: <Package className="w-16 h-16" style={{ color: '#3498db', opacity: 0.3 }} /> },
            { label: '📊 TOTAL STOCK', color: '#27ae60', value: totalValue.toFixed(0), sub: 'Total units', icon: <TrendingUp className="w-16 h-16" style={{ color: '#27ae60', opacity: 0.3 }} /> },
            { label: '⚠️ LOW STOCK', color: '#f39c12', value: lowStockCount, sub: 'Components', icon: <AlertCircle className="w-16 h-16" style={{ color: '#f39c12', opacity: 0.3 }} /> },
            { label: '🚨 CRITICAL', color: '#e74c3c', value: criticalCount, sub: 'Out of stock', icon: <AlertCircle className="w-16 h-16" style={{ color: '#e74c3c', opacity: 0.3 }} /> },
            { label: '🎯 MAX PRODUCTION', color: '#9b59b6', value: maxProduction['3HP'] || 0, sub: '3HP motors', icon: <CheckCircle2 className="w-16 h-16" style={{ color: '#9b59b6', opacity: 0.3 }} /> },
            { label: '✅ HEALTHY', color: '#16a085', value: totalComponents - lowStockCount - criticalCount, sub: 'Components OK', icon: <CheckCircle2 className="w-16 h-16" style={{ color: '#16a085', opacity: 0.3 }} /> },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: `8px solid ${card.color}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: card.color }}>{card.label}</p>
                  <p className="text-5xl font-extrabold" style={{ color: card.color }}>{card.value}</p>
                  <small className="text-gray-500 mt-2 block">{card.sub}</small>
                </div>
                {card.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Production Capacity */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
          <h2 className="text-xl font-semibold mb-6" style={{ color: '#1E231D', fontFamily: 'Outfit, sans-serif' }}>🏭 Production Capacity Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { type: '3HP', color: '#3498db', bg: '#e3f2fd', gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' },
              { type: '5HP', color: '#f39c12', bg: '#fff8e1', gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' },
              { type: '7.5HP', color: '#e74c3c', bg: '#ffebee', gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' },
            ].map(({ type, color, bg, gradient }) => (
              <div key={type} className="text-center p-6 rounded-xl" style={{ backgroundColor: bg }}>
                <div className="inline-block px-6 py-2 rounded-full font-bold text-lg mb-3" style={{ background: gradient, color: 'white' }}>{type}</div>
                <div className="text-4xl font-bold mb-2" style={{ color }}>{maxProduction[type] || 0}</div>
                <p className="text-sm" style={{ color: '#7f8c8d' }}>Maximum motors</p>
                {criticalComponents[type] && (
                  <div className="mt-3 p-2 rounded text-xs font-medium" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
                    🎯 Limited by: <strong>{criticalComponents[type]}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Usage History - Last 5 Days */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Clock className="w-5 h-5" style={{ color: '#3A5C45' }} /> Usage History — Last 5 Days
          </h2>
          {last5Days.length === 0 ? (
            <p className="text-sm" style={{ color: '#596157' }}>No usage recorded yet. Withdraw components from any motor page to start tracking.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center" style={{ color: '#3498db' }}>3HP Motors</th>
                    <th className="px-4 py-3 text-center" style={{ color: '#f39c12' }}>5HP Motors</th>
                    <th className="px-4 py-3 text-center" style={{ color: '#e74c3c' }}>7.5HP Motors</th>
                    <th className="px-4 py-3 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {last5Days.map((date, i) => {
                    const dayRecords = usageHistory.filter(r => r.date === date);
                    const hp3 = dayRecords.filter(r => r.motor_type === '3HP').reduce((s, r) => s + r.quantity, 0);
                    const hp5 = dayRecords.filter(r => r.motor_type === '5HP').reduce((s, r) => s + r.quantity, 0);
                    const hp75 = dayRecords.filter(r => r.motor_type === '7.5HP').reduce((s, r) => s + r.quantity, 0);
                    return (
                      <tr key={date} className="border-b" style={{ borderColor: '#E2E2D9', backgroundColor: i % 2 === 0 ? '#f8f9fa' : 'white' }}>
                        <td className="px-4 py-3 font-medium">{date}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: hp3 > 0 ? '#e3f2fd' : '#f1f1f1', color: hp3 > 0 ? '#3498db' : '#aaa' }}>{hp3 || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: hp5 > 0 ? '#fff8e1' : '#f1f1f1', color: hp5 > 0 ? '#f39c12' : '#aaa' }}>{hp5 || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: hp75 > 0 ? '#ffebee' : '#f1f1f1', color: hp75 > 0 ? '#e74c3c' : '#aaa' }}>{hp75 || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">{hp3 + hp5 + hp75}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Common Components */}
        {commonComponentIds.length > 0 && (
          <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
            <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>🔗 Common Components</h2>
            <p className="text-sm mb-4" style={{ color: '#596157' }}>These {commonComponentIds.length} components are shared across all 3 pump types. Monitor them closely as they affect all production lines.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {commonComponentIds.map(compId => {
                const comp = components.find(c => c.id === compId);
                if (!comp) return null;
                const allReqs = requirements.filter(r => r.component_id === compId);
                const maxReq = Math.max(...allReqs.map(r => r.required_quantity));
                const isLow = comp.quantity < maxReq;
                return (
                  <div key={compId} className="p-3 rounded-lg border" style={{ backgroundColor: isLow ? '#fdf2f2' : '#faf5ff', borderColor: isLow ? '#e74c3c' : '#8e44ad' }}>
                    <p className="text-xs font-semibold" style={{ color: isLow ? '#e74c3c' : '#8e44ad' }}>{comp.name}</p>
                    <p className="text-lg font-bold mt-1" style={{ color: isLow ? '#e74c3c' : '#2c3e50' }}>{comp.quantity.toFixed(0)} {comp.unit}</p>
                    <p className="text-xs mt-1" style={{ color: '#7f8c8d' }}>Max req: {maxReq}/motor</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: isLow ? '#f8d7da' : '#ede9fe', color: isLow ? '#721c24' : '#8e44ad' }}>
                      {isLow ? '⚠️ LOW' : '✅ OK'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <InventoryTable components={components} requirements={requirements} onUpdateQuantity={updateComponentQuantity} />
      </main>
    </div>
  );
}