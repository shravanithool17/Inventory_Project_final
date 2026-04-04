import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Zap, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import InventoryTable from '../components/InventoryTable';
import { downloadReport } from '../utils/reportGenerator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MOTOR_TYPE = '7.5HP';

export default function SevenHalfHP() {
  const [components, setComponents] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [maxProduction, setMaxProduction] = useState(0);
  const [criticalComponent, setCriticalComponent] = useState(null);
  const [withdrawQty, setWithdrawQty] = useState(1);
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
      const motorReqs = requirementsRes.data.filter(r => r.motor_type === MOTOR_TYPE);
      setRequirements(motorReqs);
      setMaxProduction(maxProdRes.data.production[MOTOR_TYPE] || 0);
      setCriticalComponent(maxProdRes.data.critical_components[MOTOR_TYPE]);
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

  const handleWithdraw = async () => {
    if (withdrawQty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (withdrawQty > maxProduction) {
      toast.error(`Cannot produce ${withdrawQty} motors. Maximum capacity: ${maxProduction}`);
      return;
    }

    try {
      const response = await axios.post(`${API}/withdraw`, {
        motor_type: MOTOR_TYPE,
        quantity: withdrawQty
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setWithdrawQty(1);
        await fetchData();
      } else {
        const shortage = response.data.insufficient_components
          .map(comp => `${comp.component}: need ${comp.shortage.toFixed(1)} more`)
          .join(', ');
        toast.error(`Insufficient stock: ${shortage}`);
      }
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast.error('Failed to withdraw components');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F0' }}>
        <p style={{ color: '#596157' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F0', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <header className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E2D9' }}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#ffebee' }}>
              <Zap className="w-6 h-6" style={{ color: '#e74c3c' }} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold" style={{ color: '#1E231D', fontFamily: 'Outfit, sans-serif' }}>7.5HP Motor System</h1>
              <p className="text-sm" style={{ color: '#596157' }}>Component Requirements & Production Management</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-4 md:p-8">
        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-lg font-medium" style={{ backgroundColor: '#f8f9fa', color: '#2c3e50' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* ANALYSIS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #3498db' }}>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#3498db' }}>📦 TOTAL AVAILABLE</p>
              <p className="text-5xl font-extrabold" style={{ color: '#3498db' }}>
                {components.reduce((sum, c) => sum + c.quantity, 0).toFixed(0)}
              </p>
              <small className="text-gray-500 mt-2 block">All components stock</small>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #f39c12' }}>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#f39c12' }}>📉 TOTAL USED</p>
              <p className="text-5xl font-extrabold" style={{ color: '#f39c12' }}>
                {withdrawQty > 0 ? requirements.reduce((sum, req) => {
                  return sum + (req.required_quantity * withdrawQty);
                }, 0).toFixed(0) : '0'}
              </p>
              <small className="text-gray-500 mt-2 block">Based on production</small>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #27ae60' }}>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#27ae60' }}>✅ REMAINING</p>
              <p className="text-5xl font-extrabold" style={{ color: '#27ae60' }}>
                {withdrawQty > 0 ? (
                  components.reduce((sum, c) => sum + c.quantity, 0) - 
                  requirements.reduce((sum, req) => sum + (req.required_quantity * withdrawQty), 0)
                ).toFixed(0) : components.reduce((sum, c) => sum + c.quantity, 0).toFixed(0)}
              </p>
              <small className="text-gray-500 mt-2 block">After production</small>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #9b59b6' }}>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#9b59b6' }}>🎯 MAX PRODUCTION</p>
              <p className="text-5xl font-extrabold" style={{ color: '#9b59b6' }}>{maxProduction}</p>
              <small className="text-gray-500 mt-2 block">motors possible</small>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #e74c3c' }}>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#e74c3c' }}>⚠️ SHORTAGES</p>
              <p className="text-5xl font-extrabold" style={{ color: '#e74c3c' }}>
                {withdrawQty > 0 ? requirements.filter(req => {
                  const comp = components.find(c => c.id === req.component_id);
                  return comp && (comp.quantity < req.required_quantity * withdrawQty);
                }).length : 0}
              </p>
              <small className="text-gray-500 mt-2 block">Components short</small>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: '8px solid #f39c12' }}>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#f39c12' }}>🔋 LOW STOCK</p>
              <p className="text-5xl font-extrabold" style={{ color: '#f39c12' }}>
                {requirements.filter(req => {
                  const comp = components.find(c => c.id === req.component_id);
                  return comp && comp.quantity < req.required_quantity;
                }).length}
              </p>
              <small className="text-gray-500 mt-2 block">Below threshold</small>
            </div>
          </div>

          {/* Efficiency Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all md:col-span-2 lg:col-span-3" style={{ borderLeft: '8px solid #1abc9c' }} data-testid="efficiency-card">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#1abc9c' }}>EFFICIENCY</p>
              {(() => {
                const totalAvailable = components.reduce((sum, c) => sum + c.quantity, 0);
                const totalUsed = withdrawQty > 0 ? requirements.reduce((sum, req) => sum + (req.required_quantity * withdrawQty), 0) : 0;
                const efficiency = totalAvailable > 0 ? ((totalUsed / totalAvailable) * 100).toFixed(1) : '0.0';
                const effNum = parseFloat(efficiency);
                const barColor = effNum < 30 ? '#27ae60' : effNum < 60 ? '#f39c12' : effNum < 80 ? '#e67e22' : '#e74c3c';
                return (
                  <>
                    <div className="flex items-end gap-4 mb-3">
                      <p className="text-5xl font-extrabold" style={{ color: '#1abc9c' }}>{efficiency}%</p>
                      <span className="text-sm font-medium pb-2" style={{ color: '#7f8c8d' }}>
                        Resource Utilization ({totalUsed.toFixed(0)} / {totalAvailable.toFixed(0)} units)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className="h-4 rounded-full transition-all duration-500" style={{ width: `${Math.min(effNum, 100)}%`, backgroundColor: barColor }} />
                    </div>
                    <small className="text-gray-500 mt-2 block">
                      {effNum < 30 ? 'LOW - Minimal resource utilization' : effNum < 60 ? 'MODERATE - Balanced utilization' : effNum < 80 ? 'HIGH - Monitor stock levels' : 'CRITICAL - Immediate restocking required'}
                    </small>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Production Card */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <span className="inline-block px-6 py-2 rounded-full font-bold" style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', color: 'white' }}>7.5HP</span>
              <span className="ml-3">Production Capacity</span>
            </h2>
          </div>

          <div className="text-center mb-6">
            <div className="text-6xl font-bold mb-2" style={{ color: maxProduction === 0 ? '#e74c3c' : '#27ae60' }}>{maxProduction}</div>
            <p className="text-lg" style={{ color: '#7f8c8d' }}>Maximum motors that can be produced</p>
          </div>

          {maxProduction === 0 && (
            <div className="p-4 rounded-lg border-l-4 mb-6" style={{ backgroundColor: '#f8d7da', borderColor: '#e74c3c', color: '#721c24' }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <strong>🚨 Production Halted!</strong>
              </div>
              <p className="text-sm mt-1">Cannot produce any motors. Some components are out of stock.</p>
            </div>
          )}

          {criticalComponent && maxProduction > 0 && (
            <div className="p-4 rounded-lg border-l-4 mb-6" style={{ backgroundColor: '#fff3cd', borderColor: '#f39c12', color: '#856404' }}>
              <strong>🎯 Critical Component:</strong> {criticalComponent}<br />
              <p className="text-sm mt-1">This component is limiting your production capacity. Restock it to increase production.</p>
            </div>
          )}

          {/* Withdraw Form */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#f8f9fa' }}>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#596157' }}>Enter Quantity to Produce:</label>
            <div className="flex gap-3">
              <input
                type="number"
                value={withdrawQty}
                onChange={(e) => setWithdrawQty(parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-3 border-2 rounded-lg text-center font-medium text-lg"
                style={{ borderColor: '#E2E2D9' }}
                min="1"
                max={maxProduction}
              />
              <button
                onClick={handleWithdraw}
                disabled={withdrawQty <= 0 || withdrawQty > maxProduction}
                className="px-8 py-3 rounded-lg font-semibold"
                style={{
                  background: withdrawQty > 0 && withdrawQty <= maxProduction ? 'linear-gradient(135deg, #27ae60 0%, #229954 100%)' : '#dfe6e9',
                  color: withdrawQty > 0 && withdrawQty <= maxProduction ? 'white' : '#636e72',
                  cursor: withdrawQty > 0 && withdrawQty <= maxProduction ? 'pointer' : 'not-allowed'
                }}
              >
                🚀 Withdraw Components
              </button>
            </div>
          </div>
        </div>

        {/* Requirements Table with Use Columns */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Component Requirements & Usage Analysis</h2>
            <button
              onClick={() => downloadReport(MOTOR_TYPE, components, requirements, maxProduction, criticalComponent, withdrawQty)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
              style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)', color: 'white' }}
              data-testid="download-report-btn"
            >
              <Download className="w-4 h-4" /> Download Report
            </button>
          </div>
          <p className="text-sm mb-4" style={{ color: '#596157' }}>
            Showing usage for <strong>{withdrawQty}</strong> motor(s) — adjust the production quantity above to see updated calculations.
          </p>
          <div className="overflow-x-auto" data-testid="requirements-table">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y" style={{ backgroundColor: '#34495e', borderColor: '#2c3e50', color: 'white' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Component Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Req/Motor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Available</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ backgroundColor: '#2c3e50' }}>Used Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ backgroundColor: '#2c3e50' }}>Remaining</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Can Produce</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => {
                  const component = components.find(c => c.id === req.component_id);
                  if (!component) return null;
                  
                  const canProduce = Math.floor(component.quantity / req.required_quantity);
                  const isCritical = component.name === criticalComponent;
                  const usedQty = req.required_quantity * withdrawQty;
                  const remaining = component.quantity - usedQty;
                  const isShortage = remaining < 0;
                  const bgColor = isShortage ? '#ffe6e6' : component.quantity === 0 ? '#ffe6e6' : canProduce === maxProduction && isCritical ? '#fff9e6' : 'transparent';
                  
                  return (
                    <tr key={req.component_id} className="border-b" style={{ borderColor: '#E2E2D9', backgroundColor: bgColor }} data-testid={`req-row-${req.component_id}`}>
                      <td className="px-4 py-3 font-medium">
                        {req.component_name} {isCritical && <span className="ml-2">🎯</span>}
                      </td>
                      <td className="px-4 py-3"><strong>{req.required_quantity}</strong> {component.unit}</td>
                      <td className="px-4 py-3">{component.quantity.toFixed(1)} {component.unit}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: '#e67e22', backgroundColor: 'rgba(243, 156, 18, 0.05)' }} data-testid={`used-${req.component_id}`}>
                        {usedQty.toFixed(1)} {component.unit}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: isShortage ? '#e74c3c' : '#27ae60', backgroundColor: isShortage ? 'rgba(231, 76, 60, 0.05)' : 'rgba(39, 174, 96, 0.05)' }} data-testid={`remaining-${req.component_id}`}>
                        {remaining.toFixed(1)} {component.unit}
                        {isShortage && <span className="ml-1 text-xs">(SHORTAGE)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <strong style={{ color: canProduce === 0 ? '#e74c3c' : '#27ae60' }}>{canProduce}</strong> motors
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                          backgroundColor: isShortage ? '#f8d7da' : component.quantity === 0 ? '#f8d7da' : component.quantity < req.required_quantity ? '#fff3cd' : '#d4edda',
                          color: isShortage ? '#721c24' : component.quantity === 0 ? '#721c24' : component.quantity < req.required_quantity ? '#856404' : '#155724'
                        }}>
                          {isShortage ? 'Shortage' : component.quantity === 0 ? 'Critical' : component.quantity < req.required_quantity ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full Inventory */}
        <InventoryTable components={components} onUpdateQuantity={updateComponentQuantity} />
      </div>
    </div>
  );
}
