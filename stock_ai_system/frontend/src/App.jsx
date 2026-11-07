import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Activity, ShieldCheck, RefreshCw, BarChart2 } from 'lucide-react';

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/stocks')
      .then(res => {
        setStocks(res.data);
        if (res.data.length > 0) setSelectedStock(res.data[0].symbol);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedStock) return;
    setLoading(true);
    axios.get(`http://127.0.0.1:8000/api/stock/${selectedStock}`)
      .then(res => {
        setStockData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedStock]);

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

          {/* Interactive Responsive Stock Chart */}
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-400" /> Price History & Trend Analysis ({selectedStock})
            </h2>
            <div className="h-72 sm:h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockData?.prices || []}>
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

          {/* Audit Logs Table */}
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">📜 Historical Prediction Audit Logs</h2>
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
                  {stockData?.audit_logs?.map((log, index) => {
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}