import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Activity, ShieldCheck, RefreshCw, BarChart2, Filter, Calendar } from 'lucide-react';

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Timeframe filter state for Price Chart ('1M', '6M', '1Y', 'ALL')
  const [chartTimeframe, setChartTimeframe] = useState('ALL');

  // Audit Logs Filter States
  const [auditPreset, setAuditPreset] = useState('ALL'); // '7D', '30D', 'ALL', 'CUSTOM'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch initial stocks list
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/stocks')
      .then(res => {
        setStocks(res.data);
        if (res.data.length > 0) setSelectedStock(res.data[0].symbol);
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch stock details when stock or audit date range changes
  useEffect(() => {
    if (!selectedStock) return;
    setLoading(true);

    let query = `http://127.0.0.1:8000/api/stock/${selectedStock}`;
    const params = new URLSearchParams();

    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    if (params.toString()) {
      query += `?${params.toString()}`;
    }

    axios.get(query)
      .then(res => {
        setStockData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedStock, startDate, endDate]);

  // Handle Quick Audit Filter Button Clicks
  const handlePresetChange = (preset) => {
    setAuditPreset(preset);
    const today = new Date();

    if (preset === '7D') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === '30D') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter prices data for Chart timeframe switcher
  const filteredPrices = useMemo(() => {
    if (!stockData?.prices || stockData.prices.length === 0) return [];
    if (chartTimeframe === 'ALL') return stockData.prices;

    const totalPoints = stockData.prices.length;
    let daysCutoff = totalPoints;

    if (chartTimeframe === '1M') daysCutoff = 30;
    else if (chartTimeframe === '6M') daysCutoff = 180;
    else if (chartTimeframe === '1Y') daysCutoff = 365;

    return stockData.prices.slice(Math.max(0, totalPoints - daysCutoff));
  }, [stockData?.prices, chartTimeframe]);

  const latestPrice = stockData?.prices?.length > 0 ? stockData.prices[stockData.prices.length - 1].close : 0;
  const latestPred = stockData?.latest_prediction;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            AheadTrends AI Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">Automated Multi-Stock Technical Analytics & Prediction Audit Log</p>
        </div>

        {/* Responsive Dropdown Selector */}
        <div className="w-full md:w-64">
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Select Market Asset</label>
          <select 
            value={selectedStock} 
            onChange={(e) => setSelectedStock(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none p-3 shadow-lg"
          >
            {stocks.map(st => (
              <option key={st.id} value={st.symbol}>{st.symbol} - {st.company_name}</option>
            ))}
          </select>
        </div>
      </header>

      {loading ? (
        <div className="h-96 flex flex-col justify-center items-center gap-3">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-slate-400 text-sm">Syncing Real-time Market Analytics...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium">LATEST CLOSE PRICE</span>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-2">₹{latestPrice?.toFixed(2)}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium">PREDICTED DIRECTION</span>
              <div className="flex items-center gap-2 mt-2">
                {latestPred?.predicted_direction === 'UP' ? (
                  <span className="text-emerald-400 text-2xl font-bold flex items-center gap-1">
                    <TrendingUp className="w-7 h-7" /> UP
                  </span>
                ) : (
                  <span className="text-rose-400 text-2xl font-bold flex items-center gap-1">
                    <TrendingDown className="w-7 h-7" /> DOWN
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium">MODEL CONFIDENCE</span>
              <p className="text-2xl sm:text-3xl font-bold text-blue-400 mt-2">
                {latestPred ? `${(latestPred.probability * 100).toFixed(1)}%` : 'N/A'}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium">PREDICTION VERSION</span>
              <p className="text-lg font-semibold text-slate-300 mt-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                {latestPred?.model_version || 'RandomForest_v1'}
              </p>
            </div>
          </div>

          {/* Interactive Responsive Stock Chart with Timeframe Switcher */}
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-400" /> Price History & Trend Analysis ({selectedStock})
              </h2>
              {/* Timeframe Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {['1M', '6M', '1Y', 'ALL'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setChartTimeframe(tf)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      chartTimeframe === tf 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 sm:h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredPrices}>
                  <defs>
                    <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 12}} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }} />
                  <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorClose)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Audit Logs Table with Filters */}
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                📜 Historical Prediction Audit Logs
              </h2>

              {/* Filter Controls Bar */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Quick Presets */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => handlePresetChange('7D')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      auditPreset === '7D' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => handlePresetChange('30D')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      auditPreset === '30D' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    30 Days
                  </button>
                  <button
                    onClick={() => handlePresetChange('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      auditPreset === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Time
                  </button>
                </div>

                {/* Custom Date Pickers */}
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setAuditPreset('CUSTOM'); }}
                    className="bg-transparent text-slate-200 focus:outline-none"
                  />
                  <span className="text-slate-600">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setAuditPreset('CUSTOM'); }}
                    className="bg-transparent text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="text-xs uppercase bg-slate-950 text-slate-300 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Predicted Dir</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Actual Dir</th>
                    <th className="py-3 px-4">Audit Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {stockData?.audit_logs?.length > 0 ? (
                    stockData.audit_logs.map((log, index) => {
                      const audit = log.prediction_results?.[0];
                      return (
                        <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-200">{log.prediction_date}</td>
                          <td className="py-3 px-4 font-semibold">{log.predicted_direction}</td>
                          <td className="py-3 px-4">{(log.probability * 100).toFixed(1)}%</td>
                          <td className="py-3 px-4">{audit?.actual_direction || 'Pending'}</td>
                          <td className="py-3 px-4">
                            {audit?.result === 'CORRECT' ? (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">CORRECT</span>
                            ) : audit?.result === 'WRONG' ? (
                              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">WRONG</span>
                            ) : (
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">SETTLING</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-500 text-sm">
                        No audit records found for the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}