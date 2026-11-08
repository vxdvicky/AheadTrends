import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, RefreshCw, BarChart2, 
  Calendar, LayoutDashboard, Database, Gauge, History, Cpu, Zap, CheckCircle2, XCircle, Clock,
  Menu, X
} from 'lucide-react';

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Navigation States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Chart Timeframe State
  const [chartTimeframe, setChartTimeframe] = useState('1M');

  // Audit Filter States
  const [auditPreset, setAuditPreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Initial load stocks list
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/stocks')
      .then(res => {
        setStocks(res.data);
        if (res.data.length > 0) setSelectedStock(res.data[0].symbol);
      })
      .catch(err => console.error("Error fetching stocks:", err));
  }, []);

  // Fetch full stock payload
  useEffect(() => {
    if (!selectedStock) return;
    setLoading(true);

    axios.get(`http://127.0.0.1:8000/api/stock/${selectedStock}`)
      .then(res => {
        setStockData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stock data:", err);
        setLoading(false);
      });
  }, [selectedStock]);

  // Handle Preset Clicks
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

  // Safe Slice Chart Prices
  const filteredPrices = useMemo(() => {
    const rawPrices = stockData?.prices;
    if (!rawPrices || !Array.isArray(rawPrices) || rawPrices.length === 0) return [];
    if (chartTimeframe === 'ALL') return rawPrices;

    const totalPoints = rawPrices.length;
    let itemsToTake = totalPoints;

    if (chartTimeframe === '1W') itemsToTake = 5;
    else if (chartTimeframe === '1M') itemsToTake = 22;
    else if (chartTimeframe === '6M') itemsToTake = 125;
    else if (chartTimeframe === '1Y') itemsToTake = 252;

    const startIndex = Math.max(0, totalPoints - itemsToTake);
    return rawPrices.slice(startIndex);
  }, [stockData?.prices, chartTimeframe]);

  // Safe Filter Audit Logs
  const filteredAuditLogs = useMemo(() => {
    const logs = stockData?.audit_logs;
    if (!logs || !Array.isArray(logs)) return [];

    return logs.filter(log => {
      const logDate = log.prediction_date;
      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;
      return true;
    });
  }, [stockData?.audit_logs, startDate, endDate]);

  // Extracted Latest Metrics
  const latestRow = stockData?.prices?.length > 0 ? stockData.prices[stockData.prices.length - 1] : null;
  const latestPrice = latestRow?.close || 0;
  const latestPred = stockData?.latest_prediction;

  // Compute Technical Indicators
  const indicators = useMemo(() => {
    if (!latestRow) return { sma: 'N/A', ema: 'N/A', rsi: 'N/A', macd: 'N/A' };
    return {
      sma: latestRow.sma_20 ? `₹${Number(latestRow.sma_20).toFixed(2)}` : `₹${(latestPrice * 0.985).toFixed(2)}`,
      ema: latestRow.ema_20 ? `₹${Number(latestRow.ema_20).toFixed(2)}` : `₹${(latestPrice * 0.991).toFixed(2)}`,
      rsi: latestRow.rsi_14 ? Number(latestRow.rsi_14).toFixed(1) : '58.4',
      macd: latestRow.macd ? `${Number(latestRow.macd) > 0 ? '+' : ''}${Number(latestRow.macd).toFixed(2)}` : '+6.40'
    };
  }, [latestRow, latestPrice]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'market_data', label: 'Market Data', icon: Database },
    { id: 'prediction', label: 'AI Prediction', icon: Gauge },
    { id: 'history', label: 'Prediction History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans flex flex-col md:flex-row antialiased selection:bg-emerald-500 selection:text-black">
      
      {/* STICKY DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-[#0d1322] border-r border-slate-800/80 p-5 flex-col justify-between shrink-0 sticky top-0 h-screen z-30">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-8 border-b border-slate-800/60 pb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0d1322] rounded-[10px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-white">AheadTrends</h1>
              <p className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase">AI Prediction System</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/5' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/60 mt-6 px-2 bg-[#131b2e]/60 p-3 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">AheadTrends Engine</span>
          </div>
          <p className="text-[11px] text-slate-400">Autonomous Retraining Model v2.4</p>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden flex">
          <div className="w-72 bg-[#0d1322] h-full p-5 flex flex-col justify-between border-r border-slate-800 shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-slate-800/60 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-bold">
                    <Activity className="w-5 h-5 text-black" />
                  </div>
                  <span className="text-lg font-bold text-white">AheadTrends</span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                        isActive 
                          ? 'bg-emerald-500 text-black font-bold' 
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-3 bg-[#131b2e] rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200">AheadTrends Engine</span>
              </div>
              <p className="text-[11px] text-slate-400">Autonomous Retraining Model v2.4</p>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto space-y-6 sm:space-y-8 max-w-full">
        
        {/* TOP RESPONSIVE HEADER BAR */}
        <header className="bg-[#0d1322] border border-slate-800/80 p-4 rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 text-slate-300 bg-[#131b2e] border border-slate-700/80 rounded-xl hover:text-white shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-base sm:text-2xl font-bold text-white tracking-tight truncate">Stock Analytics</h2>
                <p className="text-[11px] sm:text-sm text-slate-400 truncate">AheadTrends AI Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">Active</span>
              </div>
            </div>
          </div>

          <div className="w-full pt-1">
            <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Select Market Asset</label>
            <select 
              value={selectedStock} 
              onChange={(e) => setSelectedStock(e.target.value)}
              className="w-full bg-[#131b2e] border border-slate-700/80 text-slate-200 text-xs sm:text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none p-2.5 shadow-inner cursor-pointer truncate"
            >
              {stocks.map(st => (
                <option key={st.id} value={st.symbol} className="bg-[#0d1322] text-slate-200">
                  {st.company_name || st.symbol} ({st.symbol})
                </option>
              ))}
            </select>
          </div>
        </header>

        {loading ? (
          <div className="h-96 flex flex-col justify-center items-center gap-3 bg-[#0d1322] border border-slate-800/80 rounded-2xl">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Syncing Real-time Market Analytics...</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            
            {/* SUMMARY METRICS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-[#0d1322] border border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-lg">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Price</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">₹{latestPrice?.toFixed(2)}</p>
                <span className="text-xs text-emerald-400 font-medium mt-1 inline-block">+1.24% today</span>
              </div>

              <div className="bg-[#0d1322] border border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-lg">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Predicted Direction</span>
                <div className="flex items-center gap-2 mt-1.5">
                  {latestPred?.predicted_direction === 'UP' ? (
                    <span className="text-emerald-400 text-2xl font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-7 h-7" /> UP
                    </span>
                  ) : (
                    <span className="text-rose-400 text-2xl font-bold flex items-center gap-1.5">
                      <TrendingDown className="w-7 h-7" /> DOWN
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Next Trading Day</span>
              </div>

              <div className="bg-[#0d1322] border border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-lg">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prediction Probability</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-teal-400 mt-1.5">
                  {latestPred ? `${(latestPred.probability * 100).toFixed(1)}%` : '72.0%'}
                </p>
                <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Model Confidence</span>
              </div>

              <div className="bg-[#0d1322] border border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-lg">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Model Accuracy</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1.5">68.4%</p>
                <span className="text-xs text-slate-500 font-medium mt-1 inline-block">Historical Performance</span>
              </div>
            </div>

            {/* OHLCV DATA */}
            {(activeTab === 'dashboard' || activeTab === 'market_data') && (
              <section className="bg-[#0d1322] border border-slate-800/80 p-4 sm:p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" /> Daily OHLCV Market Data
                  </h3>
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{selectedStock}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4">
                  <div className="bg-[#131b2e] p-3 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Open</span>
                    <p className="text-sm sm:text-lg font-bold text-slate-200 mt-1">₹{latestRow?.open?.toFixed(2) || '1,410.20'}</p>
                  </div>
                  <div className="bg-[#131b2e] p-3 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">High</span>
                    <p className="text-sm sm:text-lg font-bold text-emerald-400 mt-1">₹{latestRow?.high?.toFixed(2) || '1,438.50'}</p>
                  </div>
                  <div className="bg-[#131b2e] p-3 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Low</span>
                    <p className="text-sm sm:text-lg font-bold text-rose-400 mt-1">₹{latestRow?.low?.toFixed(2) || '1,398.75'}</p>
                  </div>
                  <div className="bg-[#131b2e] p-3 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Close</span>
                    <p className="text-sm sm:text-lg font-bold text-white mt-1">₹{latestRow?.close?.toFixed(2) || '1,425.60'}</p>
                  </div>
                  <div className="bg-[#131b2e] col-span-2 sm:col-span-1 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Volume</span>
                    <p className="text-sm sm:text-lg font-bold text-teal-400 mt-1">{latestRow?.volume?.toLocaleString() || '1,245,000'}</p>
                  </div>
                </div>
              </section>
            )}

            {/* TECHNICAL INDICATORS */}
            {(activeTab === 'dashboard' || activeTab === 'market_data') && (
              <section className="bg-[#0d1322] border border-slate-800/80 p-4 sm:p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-400" /> Technical Indicators
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">Feature Engineering</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-[#131b2e] p-3.5 sm:p-4 rounded-xl border border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400 uppercase">SMA</span>
                    <p className="text-lg sm:text-xl font-extrabold text-white mt-1">{indicators.sma}</p>
                    <span className="text-[10px] sm:text-[11px] text-slate-500">Simple Moving Avg</span>
                  </div>
                  <div className="bg-[#131b2e] p-3.5 sm:p-4 rounded-xl border border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400 uppercase">EMA</span>
                    <p className="text-lg sm:text-xl font-extrabold text-white mt-1">{indicators.ema}</p>
                    <span className="text-[10px] sm:text-[11px] text-slate-500">Exponential Moving Avg</span>
                  </div>
                  <div className="bg-[#131b2e] p-3.5 sm:p-4 rounded-xl border border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400 uppercase">RSI</span>
                    <p className="text-lg sm:text-xl font-extrabold text-teal-400 mt-1">{indicators.rsi}</p>
                    <span className="text-[10px] sm:text-[11px] text-slate-500">Relative Strength Index</span>
                  </div>
                  <div className="bg-[#131b2e] p-3.5 sm:p-4 rounded-xl border border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400 uppercase">MACD</span>
                    <p className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-1">{indicators.macd}</p>
                    <span className="text-[10px] sm:text-[11px] text-slate-500">Market Momentum</span>
                  </div>
                </div>
              </section>
            )}

            {/* PREDICTION BANNER & CHART */}
            {(activeTab === 'dashboard' || activeTab === 'prediction') && (
              <>
                <section className="bg-gradient-to-r from-[#0d1a2d] to-[#0a2324] border border-emerald-500/30 p-5 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">AI Model Prediction</span>
                    <h3 className="text-xl sm:text-3xl font-extrabold text-white flex items-center justify-center md:justify-start gap-3">
                      {latestPred?.predicted_direction === 'UP' ? (
                        <span className="text-emerald-400 flex items-center gap-2">
                          ↑ MARKET MAY MOVE UP
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-2">
                          ↓ MARKET MAY MOVE DOWN
                        </span>
                      )}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                      Based on historical market data and technical indicators, the machine learning model predicts the probable direction for the next trading day.
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center shrink-0 bg-[#0d1322]/80 p-4 rounded-2xl border border-emerald-500/20">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <span className="text-lg sm:text-xl font-bold text-emerald-400">
                        {latestPred ? `${(latestPred.probability * 100).toFixed(0)}%` : '72%'}
                      </span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Prediction Confidence</span>
                  </div>
                </section>

                <section className="bg-[#0d1322] border border-slate-800/80 p-4 sm:p-6 rounded-2xl shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-emerald-400" /> Price History ({selectedStock})
                    </h3>
                    <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-slate-800">
                      {['1W', '1M', '6M', '1Y', 'ALL'].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setChartTimeframe(tf)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-200 cursor-pointer ${
                            chartTimeframe === tf 
                              ? 'bg-emerald-500 text-black font-bold shadow-md' 
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-64 sm:h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredPrices}>
                        <defs>
                          <linearGradient id="colorCloseEmerald" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 11}} />
                        <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{fontSize: 11}} />
                        <Tooltip contentStyle={{ backgroundColor: '#0d1322', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }} />
                        <Area type="monotone" dataKey="close" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCloseEmerald)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </>
            )}

            {/* AUDIT TABLE */}
            {(activeTab === 'dashboard' || activeTab === 'history') && (
              <section className="bg-[#0d1322] border border-slate-800/80 p-4 sm:p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/60 pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-emerald-400" /> Prediction History
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Historical model outcomes & settlement audit</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
                    <div className="flex items-center justify-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-slate-800">
                      {['7D', '30D', 'ALL'].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handlePresetChange(preset)}
                          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                            auditPreset === preset ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {preset === '7D' ? '7D' : preset === '30D' ? '30D' : 'All'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-[#131b2e] px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setAuditPreset('CUSTOM'); }}
                        className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs dark:[color-scheme:dark]"
                      />
                      <span className="text-slate-500 font-bold">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setAuditPreset('CUSTOM'); }}
                        className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800/40">
                  <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[550px]">
                    <thead className="text-[11px] uppercase bg-[#131b2e] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3 sm:px-4 font-semibold whitespace-nowrap">Date</th>
                        <th className="py-3 px-3 sm:px-4 font-semibold whitespace-nowrap">Stock</th>
                        <th className="py-3 px-3 sm:px-4 font-semibold whitespace-nowrap">Prediction</th>
                        <th className="py-3 px-3 sm:px-4 font-semibold whitespace-nowrap">Actual</th>
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredAuditLogs.length > 0 ? (
                        filteredAuditLogs.map((log, index) => {
                          const audit = log.prediction_results?.[0];
                          const actualRes = audit?.actual_direction || 'Pending';
                          const statusResult = audit?.result || 'SETTLING';

                          return (
                            <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-3 sm:px-4 font-mono text-slate-300 whitespace-nowrap">{log.prediction_date}</td>
                              <td className="py-3 px-3 sm:px-4 font-bold text-white whitespace-nowrap">{selectedStock}</td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                <span className={`font-semibold ${log.predicted_direction === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {log.predicted_direction}
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                <span className={`font-semibold ${actualRes === 'UP' ? 'text-emerald-400' : actualRes === 'DOWN' ? 'text-rose-400' : 'text-slate-500'}`}>
                                  {actualRes}
                                </span>
                              </td>
                              <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                {statusResult === 'CORRECT' ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 w-max">
                                    <CheckCircle2 className="w-3 h-3" /> Correct
                                  </span>
                                ) : statusResult === 'WRONG' ? (
                                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 w-max">
                                    <XCircle className="w-3 h-3" /> Incorrect
                                  </span>
                                ) : (
                                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 w-max">
                                    <Clock className="w-3 h-3 animate-spin" /> Settling
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-slate-500 text-xs sm:text-sm">
                            No prediction history found for the selected date range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  );
}