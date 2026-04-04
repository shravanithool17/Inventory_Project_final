import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Zap, AlertCircle, ArrowLeft, Download, BarChart2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import InventoryTable from '../components/InventoryTable';
import { downloadReport } from '../utils/reportGenerator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const MOTOR_TYPE = '5HP';
const ACCENT = '#f39c12';
const GRADIENT = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';

export default function ThreeHP() {
  const [components, setComponents] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [allRequirements, setAllRequirements] = useState([]);
  const [maxProduction, setMaxProduction] = useState(0);
  const [criticalComponent, setCriticalComponent] = useState(null);
  const [withdrawQty, setWithdrawQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [usageHistory, setUsageHistory] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

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
      setAllRequirements(requirementsRes.data);
      const motorReqs = requirementsRes.data.filter(r => r.motor_type === MOTOR_TYPE);
      setRequirements(motorReqs);
      setMaxProduction(maxProdRes.data.production[MOTOR_TYPE] || 0);
      setCriticalComponent(maxProdRes.data.critical_components[MOTOR_TYPE]);
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

  const handleWithdraw = async () => {
    if (withdrawQty <= 0) { toast.error('Please enter a valid quantity'); return; }
    if (withdrawQty > maxProduction) { toast.error(`Cannot produce ${withdrawQty} motors. Maximum: ${maxProduction}`); return; }
    try {
      const response = await axios.post(`${API}/withdraw`, { motor_type: MOTOR_TYPE, quantity: withdrawQty });
      if (response.data.success) {
        toast.success(response.data.message);
        setWithdrawQty(1);
        await fetchData();
      } else {
        const shortage = response.data.insufficient_components.map(c => `${c.component}: need ${c.shortage.toFixed(1)} more`).join(', ');
        toast.error(`Insufficient stock: ${shortage}`);
      }
    } catch (error) { toast.error('Failed to withdraw components'); }
  };

  const handleGetAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const maxProdRes = await axios.get(`${API}/calculate-max-production`);
      const prod = maxProdRes.data.production[MOTOR_TYPE] || 0;
      const critical = maxProdRes.data.critical_components[MOTOR_TYPE];
      const lowStock = requirements.filter(req => {
        const comp = components.find(c => c.id === req.component_id);
        return comp && comp.quantity < req.required_quantity;
      });
      const shortages = requirements.filter(req => {
        const comp = components.find(c => c.id === req.component_id);
        return comp && comp.quantity < req.required_quantity * withdrawQty;
      });
      setAnalysisResult({ prod, critical, lowStock, shortages });
      toast.success('Analysis complete!');
    } catch (error) { toast.error('Analysis failed'); }
    setAnalysisLoading(false);
  };

  // Common components — used in all 3 motor types
  const commonComponentIds = (() => {
    const motorTypes = ['3HP', '5HP', '7.5HP'];
    const usedIn = {};
    allRequirements.forEach(r => {
      if (!usedIn[r.component_id]) usedIn[r.component_id] = new Set();
      usedIn[r.component_id].add(r.motor_type);
    });
    return Object.keys(usedIn).filter(id => motorTypes.every(mt => usedIn[id].has(mt)));
  })();

  // Usage history for last 5 days filtered for this motor type
  const myUsage = usageHistory.filter(r => r.motor_type === MOTOR_TYPE);
  const last5Days = [...new Set(usageHistory.map(r => r.date))].sort((a, b) => b.localeCompare(a)).slice(0, 5);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F0' }}>
      <p style={{ color: '#596157' }}>Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F0', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <header className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E2D9' }}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff8e1' }}>
              <Zap className="w-6 h-6" style={{ color: '#f39c12' }} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold" style={{ color: '#1E231D', fontFamily: 'Outfit, sans-serif' }}>5HP Motor System</h1>
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
          {[
            { label: '📦 TOTAL AVAILABLE', color: '#3498db', value: components.reduce((s, c) => s + c.quantity, 0).toFixed(0), sub: 'All components stock' },
            { label: '📉 TOTAL USED', color: '#f39c12', value: requirements.reduce((s, r) => s + r.required_quantity * withdrawQty, 0).toFixed(0), sub: 'Based on production' },
            { label: '✅ REMAINING', color: '#27ae60', value: (components.reduce((s, c) => s + c.quantity, 0) - requirements.reduce((s, r) => s + r.required_quantity * withdrawQty, 0)).toFixed(0), sub: 'After production' },
            { label: '🎯 MAX PRODUCTION', color: '#9b59b6', value: maxProduction, sub: 'motors possible' },
            { label: '⚠️ SHORTAGES', color: '#e74c3c', value: requirements.filter(req => { const c = components.find(x => x.id === req.component_id); return c && c.quantity < req.required_quantity * withdrawQty; }).length, sub: 'Components short' },
            { label: '🔋 LOW STOCK', color: '#f39c12', value: requirements.filter(req => { const c = components.find(x => x.id === req.component_id); return c && c.quantity < req.required_quantity; }).length, sub: 'Below threshold' },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-105 transition-all" style={{ borderLeft: `8px solid ${card.color}` }}>
              <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: card.color }}>{card.label}</p>
              <p className="text-5xl font-extrabold" style={{ color: card.color }}>{card.value}</p>
              <small className="text-gray-500 mt-2 block">{card.sub}</small>
            </div>
          ))}

          {/* Efficiency */}
          <div className="bg-white rounded-xl shadow-lg p-8 md:col-span-2 lg:col-span-3" style={{ borderLeft: '8px solid #1abc9c' }}>
            <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#1abc9c' }}>EFFICIENCY</p>
            {(() => {
              const total = components.reduce((s, c) => s + c.quantity, 0);
              const used = requirements.reduce((s, r) => s + r.required_quantity * withdrawQty, 0);
              const eff = total > 0 ? ((used / total) * 100).toFixed(1) : '0.0';
              const n = parseFloat(eff);
              const col = n < 30 ? '#27ae60' : n < 60 ? '#f39c12' : n < 80 ? '#e67e22' : '#e74c3c';
              return <>
                <div className="flex items-end gap-4 mb-3">
                  <p className="text-5xl font-extrabold" style={{ color: '#1abc9c' }}>{eff}%</p>
                  <span className="text-sm pb-2" style={{ color: '#7f8c8d' }}>Resource Utilization ({used.toFixed(0)} / {total.toFixed(0)} units)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="h-4 rounded-full transition-all duration-500" style={{ width: `${Math.min(n, 100)}%`, backgroundColor: col }} />
                </div>
                <small className="text-gray-500 mt-2 block">{n < 30 ? 'LOW' : n < 60 ? 'MODERATE' : n < 80 ? 'HIGH - Monitor stock' : 'CRITICAL - Restock immediately'}</small>
              </>;
            })()}
          </div>
        </div>

        {/* GET ANALYSIS BUTTON */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>🔍 Production Analysis</h2>
            <button
              onClick={handleGetAnalysis}
              disabled={analysisLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)', opacity: analysisLoading ? 0.7 : 1 }}
            >
              <BarChart2 className="w-5 h-5" />
              {analysisLoading ? 'Analysing...' : 'Get Analysis'}
            </button>
          </div>

          {analysisResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#e8f8f5', border: '1px solid #1abc9c' }}>
                <p className="font-bold" style={{ color: '#1abc9c' }}>✅ Max Possible Motors</p>
                <p className="text-4xl font-extrabold mt-1" style={{ color: '#1abc9c' }}>{analysisResult.prod}</p>
                {analysisResult.critical && <p className="text-sm mt-2" style={{ color: '#596157' }}>🎯 Limited by: <strong>{analysisResult.critical}</strong></p>}
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: analysisResult.shortages.length > 0 ? '#fdf2f2' : '#f0fff4', border: `1px solid ${analysisResult.shortages.length > 0 ? '#e74c3c' : '#27ae60'}` }}>
                <p className="font-bold" style={{ color: analysisResult.shortages.length > 0 ? '#e74c3c' : '#27ae60' }}>
                  {analysisResult.shortages.length > 0 ? `⚠️ ${analysisResult.shortages.length} Shortage(s) for ${withdrawQty} motor(s)` : '✅ No Shortages'}
                </p>
                {analysisResult.shortages.map((req, i) => {
                  const comp = components.find(c => c.id === req.component_id);
                  return comp ? <p key={i} className="text-xs mt-1" style={{ color: '#e74c3c' }}>• {req.component_name}: need {(req.required_quantity * withdrawQty).toFixed(0)}, have {comp.quantity.toFixed(0)}</p> : null;
                })}
              </div>

              {analysisResult.lowStock.length > 0 && (
                <div className="p-4 rounded-lg md:col-span-2" style={{ backgroundColor: '#fffbeb', border: '1px solid #f39c12' }}>
                  <p className="font-bold mb-2" style={{ color: '#f39c12' }}>🔋 {analysisResult.lowStock.length} Low Stock Component(s)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {analysisResult.lowStock.map((req, i) => {
                      const comp = components.find(c => c.id === req.component_id);
                      return comp ? (
                        <div key={i} className="text-xs p-2 rounded" style={{ backgroundColor: '#fff3cd' }}>
                          <p className="font-semibold">{req.component_name}</p>
                          <p style={{ color: '#856404' }}>Have: {comp.quantity.toFixed(0)} | Need: {req.required_quantity}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* USAGE TRACKING — LAST 5 DAYS */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Clock className="w-5 h-5" style={{ color: '#f39c12' }} /> Usage History — Last 5 Days
          </h2>
          {last5Days.length === 0 ? (
            <p className="text-sm" style={{ color: '#596157' }}>No usage recorded yet. Withdraw components to start tracking.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center">3HP Used</th>
                    <th className="px-4 py-3 text-center">5HP Used</th>
                    <th className="px-4 py-3 text-center">7.5HP Used</th>
                    <th className="px-4 py-3 text-center">Total Motors</th>
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
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: hp3 > 0 ? '#e3f2fd' : '#f8f9fa', color: hp3 > 0 ? '#3498db' : '#aaa' }}>{hp3 || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: hp5 > 0 ? '#fff8e1' : '#f8f9fa', color: hp5 > 0 ? '#f39c12' : '#aaa' }}>{hp5 || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: hp75 > 0 ? '#ffebee' : '#f8f9fa', color: hp75 > 0 ? '#e74c3c' : '#aaa' }}>{hp75 || '-'}</span>
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

        {/* COMMON COMPONENTS */}
        {commonComponentIds.length > 0 && (
          <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>🔗 Common Components (Used in All 3 Pump Types)</h2>
            <p className="text-sm mb-4" style={{ color: '#596157' }}>These components are shared across 3HP, 5HP and 7.5HP. Monitor them closely.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#8e44ad', color: 'white' }}>
                    <th className="px-4 py-3 text-left">Component</th>
                    <th className="px-4 py-3 text-center">Available</th>
                    <th className="px-4 py-3 text-center">3HP Req</th>
                    <th className="px-4 py-3 text-center">5HP Req</th>
                    <th className="px-4 py-3 text-center">7.5HP Req</th>
                    <th className="px-4 py-3 text-center">Total Used (this run)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commonComponentIds.map((compId, i) => {
                    const comp = components.find(c => c.id === compId);
                    if (!comp) return null;
                    const req3 = allRequirements.find(r => r.component_id === compId && r.motor_type === '3HP');
                    const req5 = allRequirements.find(r => r.component_id === compId && r.motor_type === '5HP');
                    const req75 = allRequirements.find(r => r.component_id === compId && r.motor_type === '7.5HP');
                    const usedThis = (req3?.required_quantity || 0) * withdrawQty;
                    const isLow = comp.quantity < (req3?.required_quantity || 0);
                    return (
                      <tr key={compId} className="border-b" style={{ borderColor: '#E2E2D9', backgroundColor: isLow ? '#fdf2f2' : i % 2 === 0 ? '#faf5ff' : 'white' }}>
                        <td className="px-4 py-3 font-medium">{comp.name}</td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: isLow ? '#e74c3c' : '#27ae60' }}>{comp.quantity.toFixed(0)} {comp.unit}</td>
                        <td className="px-4 py-3 text-center">{req3?.required_quantity || '-'}</td>
                        <td className="px-4 py-3 text-center">{req5?.required_quantity || '-'}</td>
                        <td className="px-4 py-3 text-center">{req75?.required_quantity || '-'}</td>
                        <td className="px-4 py-3 text-center" style={{ color: '#e67e22' }}>{usedThis.toFixed(0)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: isLow ? '#f8d7da' : '#d4edda', color: isLow ? '#721c24' : '#155724' }}>
                            {isLow ? 'LOW' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Production Card */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
          <h2 className="text-xl font-semibold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="inline-block px-6 py-2 rounded-full font-bold" style={{ background: GRADIENT, color: 'white' }}>3HP</span>
            <span className="ml-3">Production Capacity</span>
          </h2>
          <div className="text-center mb-6">
            <div className="text-6xl font-bold mb-2" style={{ color: maxProduction === 0 ? '#e74c3c' : '#27ae60' }}>{maxProduction}</div>
            <p className="text-lg" style={{ color: '#7f8c8d' }}>Maximum motors that can be produced</p>
          </div>
          {maxProduction === 0 && (
            <div className="p-4 rounded-lg border-l-4 mb-6" style={{ backgroundColor: '#f8d7da', borderColor: '#e74c3c', color: '#721c24' }}>
              <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5" /><strong>🚨 Production Halted!</strong></div>
              <p className="text-sm mt-1">Cannot produce any motors. Some components are out of stock.</p>
            </div>
          )}
          {criticalComponent && maxProduction > 0 && (
            <div className="p-4 rounded-lg border-l-4 mb-6" style={{ backgroundColor: '#fff3cd', borderColor: '#f39c12', color: '#856404' }}>
              <strong>🎯 Critical Component:</strong> {criticalComponent}
              <p className="text-sm mt-1">This component limits production. Restock to increase capacity.</p>
            </div>
          )}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#f8f9fa' }}>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#596157' }}>Enter Quantity to Produce:</label>
            <div className="flex gap-3">
              <input type="number" value={withdrawQty} onChange={(e) => setWithdrawQty(parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-3 border-2 rounded-lg text-center font-medium text-lg" style={{ borderColor: '#E2E2D9' }} min="1" max={maxProduction} />
              <button onClick={handleWithdraw} disabled={withdrawQty <= 0 || withdrawQty > maxProduction}
                className="px-8 py-3 rounded-lg font-semibold"
                style={{ background: withdrawQty > 0 && withdrawQty <= maxProduction ? 'linear-gradient(135deg, #27ae60 0%, #229954 100%)' : '#dfe6e9', color: withdrawQty > 0 && withdrawQty <= maxProduction ? 'white' : '#636e72', cursor: withdrawQty > 0 && withdrawQty <= maxProduction ? 'pointer' : 'not-allowed' }}>
                🚀 Withdraw Components
              </button>
            </div>
          </div>
        </div>

        {/* Requirements Table */}
        <div className="bg-white border rounded-xl shadow-sm p-6 mb-8" style={{ borderColor: '#E2E2D9' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Component Requirements & Usage Analysis</h2>
            <button onClick={() => downloadReport(MOTOR_TYPE, components, requirements, maxProduction, criticalComponent, withdrawQty)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm"
              style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)', color: 'white' }}>
              <Download className="w-4 h-4" /> Download Report
            </button>
          </div>
          <p className="text-sm mb-4" style={{ color: '#596157' }}>Showing usage for <strong>{withdrawQty}</strong> motor(s).</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Component Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Req/Motor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Available</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ backgroundColor: '#2c3e50' }}>Used Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ backgroundColor: '#2c3e50' }}>Remaining</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Can Produce</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Common?</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => {
                  const component = components.find(c => c.id === req.component_id);
                  if (!component) return null;
                  const canProduce = Math.floor(component.quantity / req.required_quantity);
                  const isCritical = component.name === criticalComponent;
                  const isCommon = commonComponentIds.includes(req.component_id);
                  const usedQty = req.required_quantity * withdrawQty;
                  const remaining = component.quantity - usedQty;
                  const isShortage = remaining < 0;
                  return (
                    <tr key={req.component_id} className="border-b" style={{ borderColor: '#E2E2D9', backgroundColor: isShortage ? '#ffe6e6' : component.quantity === 0 ? '#ffe6e6' : isCritical ? '#fff9e6' : 'transparent' }}>
                      <td className="px-4 py-3 font-medium">{req.component_name} {isCritical && '🎯'}</td>
                      <td className="px-4 py-3"><strong>{req.required_quantity}</strong> {component.unit}</td>
                      <td className="px-4 py-3">{component.quantity.toFixed(1)} {component.unit}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: '#e67e22' }}>{usedQty.toFixed(1)} {component.unit}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: isShortage ? '#e74c3c' : '#27ae60' }}>
                        {remaining.toFixed(1)} {component.unit}{isShortage && <span className="ml-1 text-xs">(SHORTAGE)</span>}
                      </td>
                      <td className="px-4 py-3"><strong style={{ color: canProduce === 0 ? '#e74c3c' : '#27ae60' }}>{canProduce}</strong> motors</td>
                      <td className="px-4 py-3 text-center">
                        {isCommon && <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#ede9fe', color: '#8e44ad' }}>Common</span>}
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

        <InventoryTable components={components} onUpdateQuantity={updateComponentQuantity} />
      </div>
    </div>
  );
}