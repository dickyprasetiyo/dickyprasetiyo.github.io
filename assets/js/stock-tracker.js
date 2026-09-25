/**
 * Stock Portfolio Tracker - Main Application Script
 * 
 * Features:
 * - Dashboard with IHSG and stock data from Yahoo Finance API
 * - Portfolio management (add, edit, delete stocks)
 * - Trading journal
 * - Advanced charts using TradingView Lightweight Charts
 * - Google Sheets integration for cloud storage
 * - LocalStorage backup
 */

// ========================================
// Configuration
// ========================================

const CONFIG = {
    // Yahoo Finance API
    yfinanceBaseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
    
    // Common Indonesian stocks (LQ45 & popular)
    popularStocks: [
        { code: 'BBCA', name: 'Bank Central Asia' },
        { code: 'BMRI', name: 'Bank Mandiri' },
        { code: 'BBNI', name: 'Bank Negara Indonesia' },
        { code: 'BBNI', name: 'Bank Negara Indonesia' },
        { code: 'BTIT', name: 'Bank Timo Indonesia' },
        { code: 'BBRI', name: 'Bank Rakyat Indonesia' },
        { code: 'INDF', name: 'Indofood Sukses Makmur' },
        { code: 'UNTR', name: 'Unilever Indonesia' },
        { code: 'TLKM', name: 'Telekomunikasi Indonesia' },
        { code: 'MRANT', name: 'Mitra Adiperkasa' },
        { code: 'ASII', name: 'Astra International' },
        { code: 'CPIN', name: 'Charoen Pokphand Indonesia' },
        { code: 'ICBP', name: 'Indofood CBP Sukses' },
        { code: 'RESO', name: 'Resonansi Maju' },
        { code: 'PTBA', name: 'PT Bukit Asam' },
        { code: 'JSCO', name: 'JS Container' },
        { code: 'ADMR', name: 'Admiralty Capital' },
        { code: 'ERAJ', name: 'Era Jaya Kontang' },
        { code: 'WIKA', name: 'Wijaya Karya' },
        { code: 'PPRE', name: 'PP Prima' },
        { code: 'GOTO', name: 'GoTo Gojek Tokopedia' },
        { code: 'POSI', name: 'POS Indonesia' },
        { code: 'JPM', name: 'Premier Jati' },
        { code: 'MYOR', name: 'Mayora Indah' },
        { code: 'CSMG', name: 'Citama Solusi' }
    ],
    
    // LQ45 Index symbol for Yahoo Finance
    ihsgSymbol: 'JCI.JK', // Yahoo Finance uses this for IHSG
    
    // Default chart range
    defaultRange: '1mo',
    
    // Chart ranges available
    chartRanges: [
        { value: '1d', label: '1 Hari' },
        { value: '5d', label: '5 Hari' },
        { value: '1mo', label: '1 Bulan' },
        { value: '3mo', label: '3 Bulan' },
        { value: '6mo', label: '6 Bulan' },
        { value: '1y', label: '1 Tahun' },
        { value: '2y', label: '2 Tahun' },
        { value: '5y', label: '5 Tahun' },
        { value: 'max', label: 'Maksimum' }
    ]
};

// ========================================
// State Management
// ========================================

const state = {
    currentTab: 'dashboard',
    portfolio: [],
    journal: [],
    settings: {
        appsScriptUrl: '',
        sheetId: ''
    },
    charts: {
        ihsg: null,
        singleStock: null
    },
    stockData: {
        ihsg: null,
        searched: null
    }
};

// ========================================
// LocalStorage Management
// ========================================

const Storage = {
    get: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error reading localStorage:', e);
            return defaultValue;
        }
    },
    
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Error writing localStorage:', e);
            return false;
        }
    },
    
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing localStorage:', e);
            return false;
        }
    },
    
    clear: function() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Error clearing localStorage:', e);
            return false;
        }
    },
    
    // Stock tracker specific
    getPortfolio: function() {
        return this.get('portfolio', []);
    },
    
    setPortfolio: function(portfolio) {
        return this.set('portfolio', portfolio);
    },
    
    getJournal: function() {
        return this.get('journal', []);
    },
    
    setJournal: function(journal) {
        return this.set('journal', journal);
    },
    
    getSettings: function() {
        return this.get('settings', {});
    },
    
    setSettings: function(settings) {
        return this.set('settings', settings);
    }
};

// ========================================
// Yahoo Finance API
// ========================================

const YahooFinance = {
    /**
     * Fetch chart data for a stock symbol
     * @param {string} symbol - Stock symbol (e.g., 'BBCA.JK', 'JCI.JK')
     * @param {string} range - Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max)
     * @returns {Promise<Object>} - Chart data
     */
    async fetchChart(symbol, range = '1mo') {
        try {
            const url = `${CONFIG.yfinanceBaseUrl}/${symbol}?range=${range}&interval=1d`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.description || 'Unknown error from Yahoo Finance');
            }
            
            return this.parseChartData(data);
        } catch (error) {
            console.error('Yahoo Finance fetch error:', error);
            throw error;
        }
    },
    
    /**
     * Parse Yahoo Finance chart response into usable format
     */
    parseChartData(data) {
        try {
            const result = data.chart?.result?.[0];
            if (!result) {
                throw new Error('No chart data available');
            }
            
            const timestamp = result.timestamp || [];
            const quotes = result.indicators?.quote?.[0] || {};
            const volume = result.indicators?.volume?.[0] || [];
            
            const original = result.indicators?.adjclose?.[0]?.adjclose || quotes.close;
            
            const chartData = [];
            
            for (let i = 0; i < timestamp.length; i++) {
                const date = new Date(timestamp[i] * 1000);
                
                // Skip if no data
                if (quotes.open === undefined || quotes.open[i] === null || 
                    quotes.close === undefined || quotes.close[i] === null) {
                    continue;
                }
                
                chartData.push({
                    time: date.toISOString().split('T')[0],
                    timestamp: timestamp[i],
                    open: quotes.open[i],
                    high: quotes.high[i] || quotes.open[i],
                    low: quotes.low[i] || quotes.open[i],
                    close: quotes.close[i],
                    volume: volume[i] || 0,
                    adjClose: original ? original[i] : quotes.close[i]
                });
            }
            
            // Get metadata
            const meta = result.meta || {};
            
            return {
                symbol: meta.symbol || symbol,
                currency: meta.currency || 'IDR',
                exchange: meta.exchangeName || 'IDX',
                regularMarketPrice: meta.regularMarketPrice,
                regularMarketChange: meta.regularMarketChange,
                regularMarketChangePercent: meta.regularMarketChangePercent,
                previousClose: meta.previousClose,
                chartData: chartData,
                range: data.chart?.result?.[0]?.meta?.timeRange || range,
                error: null
            };
        } catch (error) {
            return {
                symbol: symbol,
                chartData: [],
                error: error.message
            };
        }
    },
    
    /**
     * Get current stock quote (latest price)
     */
    async getQuote(symbol) {
        try {
            // Fetch with 1d range to get latest data
            const data = await this.fetchChart(symbol, '5d');
            
            if (data.chartData && data.chartData.length > 0) {
                const latest = data.chartData[data.chartData.length - 1];
                return {
                    symbol: data.symbol,
                    price: latest.close,
                    open: latest.open,
                    high: latest.high,
                    low: latest.low,
                    volume: latest.volume,
                    change: data.regularMarketChange,
                    changePercent: data.regularMarketChangePercent,
                    previousClose: data.previousClose,
                    timestamp: latest.time
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error getting quote:', error);
            return null;
        }
    },
    
    /**
     * Search for stock information
     */
    async searchStock(symbol) {
        try {
            // Try to fetch chart data which includes metadata
            const data = await this.fetchChart(symbol, '5d');
            
            // Format timezone info
            const exchangeTimezone = data.exchangeTimezoneName || 'Asia/Jakarta';
            
            return {
                symbol: data.symbol,
                name: this.getStockName(symbol),
                price: data.regularMarketPrice,
                change: data.regularMarketChange,
                changePercent: data.regularMarketChangePercent,
                currency: data.currency,
                exchange: data.exchange,
                previousClose: data.previousClose,
                timezone: exchangeTimezone,
                error: null
            };
        } catch (error) {
            return {
                symbol: symbol,
                name: this.getStockName(symbol),
                price: null,
                change: null,
                changePercent: null,
                error: error.message
            };
        }
    },
    
    /**
     * Get stock name from symbol
     */
    getStockName(symbol) {
        const stock = CONFIG.popularStocks.find(s => s.code === symbol);
        return stock ? stock.name : symbol;
    },
    
    /**
     * Format currency (Indonesian Rupiah)
     */
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '--';
        
        const formatted = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
        
        return formatted;
    },
    
    /**
     * Format percentage change
     */
    formatChange(change, isPercent = false) {
        if (change === null || change === undefined) return '--';
        
        if (isPercent) {
            const sign = change >= 0 ? '+' : '';
            return `${sign}${change.toFixed(2)}%`;
        }
        
        const sign = change >= 0 ? '+' : '';
        return `${sign} ${this.formatCurrency(change)}`;
    }
};

// ========================================
// Google Sheets Integration
// ========================================

const GoogleSheets = {
    /**
     * Execute Google Apps Script function
     */
    async execute(action, params = {}, postData = null) {
        const url = state.settings.appsScriptUrl;
        
        if (!url) {
            throw new Error('Google Sheets URL not configured. Please setup in Settings tab.');
        }
        
        try {
            const fetchOptions = {
                method: postData ? 'POST' : 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (postData) {
                fetchOptions.body = JSON.stringify(postData);
            }
            
            // Add params to URL for GET requests
            if (action && !postData) {
                const paramString = new URLSearchParams(params).toString();
                const separator = url.includes('?') ? '&' : '?';
                fetchOptions.url = `${url}&action=${action}${paramString}`;
            } else {
                fetchOptions.url = url;
            }
            
            const response = await fetch(fetchOptions.url, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;
        } catch (error) {
            console.error('Google Sheets error:', error);
            throw error;
        }
    },
    
    /**
     * Read portfolio from Google Sheets
     */
    async readPortfolio() {
        try {
            const data = await this.execute('read', { sheet: 'Portfolio' });
            return data.data || [];
        } catch (error) {
            console.error('Error reading portfolio from Google Sheets:', error);
            throw error;
        }
    },
    
    /**
     * Write portfolio to Google Sheets
     */
    async writePortfolio(portfolio) {
        try {
            const formattedData = portfolio.map((item, index) => ({
                No: index + 1,
                Kode: item.code,
                Nama: item.name,
                Lot: item.lot,
                JumlahSaham: item.quantity,
                HargaBeli: item.buyPrice,
                TotalInvestasi: item.totalInvestment,
                HargaSaatIni: item.currentPrice,
                CurrentValue: item.currentValue,
                ProfitLoss: item.profitLoss,
                PctChange: item.pctChange,
                TanggalBeli: item.buyDate,
                Catatan: item.note
            }));
            
            await this.execute('write', {}, { data: formattedData });
            return true;
        } catch (error) {
            console.error('Error writing portfolio to Google Sheets:', error);
            throw error;
        }
    },
    
    /**
     * Read journal from Google Sheets
     */
    async readJournal() {
        try {
            const data = await this.execute('read', { sheet: 'Journal' });
            return data.data || [];
        } catch (error) {
            console.error('Error reading journal from Google Sheets:', error);
            throw error;
        }
    },
    
    /**
     * Write journal to Google Sheets
     */
    async writeJournal(journal) {
        try {
            const formattedData = journal.map((item, index) => ({
                No: index + 1,
                Tanggal: item.date,
                Saham: item.stock,
                Tipe: item.type,
                Jumlah: item.quantity,
                Harga: item.price,
                Total: item.total,
                Catatan: item.note,
                Review: item.review
            }));
            
            await this.execute('write', {}, { data: formattedData });
            return true;
        } catch (error) {
            console.error('Error writing journal to Google Sheets:', error);
            throw error;
        }
    },
    
    /**
     * Test connection to Google Sheets
     */
    async testConnection() {
        try {
            const data = await this.execute('read', { sheet: 'Portfolio' });
            return {
                success: true,
                message: 'Koneksi berhasil! Data tersedia.',
                count: data.count || 0
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Koneksi gagal. Pastikan URL dan hak akses benar.'
            };
        }
    }
};

// ========================================
// Chart Management
// ========================================

const ChartManager = {
    /**
     * Create or update IHSG chart
     */
    async createIHSGChart(range = CONFIG.defaultRange) {
        const container = document.getElementById('ihsg-chart-container');
        if (!container) return;
        
        // Clear existing chart
        if (state.charts.ihsg) {
            state.charts.ihsg.remove();
            state.charts.ihsg = null;
        }
        
        // Show loading
        container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-warning" style="width: 3rem; height: 3rem;"></div><p class="text-muted mt-3">Memuat data IHSG...</p></div>';
        
        try {
            // Fetch data
            const data = await YahooFinance.fetchChart(CONFIG.ihsgSymbol, range);
            
            if (data.error || data.chartData.length === 0) {
                container.innerHTML = `<div class="text-center py-5 text-danger">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <h5>Gagal memuat data IHSG</h5>
                    <p class="text-muted">${data.error || 'Data tidak tersedia'}</p>
                    <small class="text-muted">Coba refresh halaman atau ubah rentang waktu</small>
                </div>`;
                return;
            }
            
            // Create chart
            const chart = LightweightCharts.createChart(container, {
                layout: {
                    background: { color: '#ffffff' },
                    textColor: '#333333',
                    fontFamily: 'Montserrat, sans-serif'
                },
                grid: {
                   vertLines: { color: '#e9ecef' },
                    horzLines: { color: '#e9ecef' }
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                    color: '#fd7e14',
                    width: 1,
                    vertLine: { color: '#fd7e14', width: 1, style: LightweightCharts.LineStyle.Dashed },
                    horzLine: { color: '#fd7e14', width: 1, style: LightweightCharts.LineStyle.Dashed }
                },
                rightPriceScale: {
                    borderColor: '#e9ecef',
                    scaleMargins: { top: 0.1, bottom: 0.2 }
                },
                timeScale: {
                    borderColor: '#e9ecef',
                    timeVisible: true,
                    secondsVisible: false
                },
                handleScale: {
                    axisPressedMouseMove: true,
                    mouseWheel: true,
                    pinch: true
                },
                handleScroll: {
                    axisPressedMouseMove: true,
                    mouseWheel: true,
                    pressedMouseMove: true,
                    pinch: true
                }
            });
            
            // Candlestick series
            const candlestickSeries = chart.addCandlestickSeries({
                upColor: '#28a745',
                downColor: '#dc3545',
                borderUpColor: '#28a745',
                borderDownColor: '#dc3545',
                wickUpColor: '#28a745',
                wickDownColor: '#dc3545'
            });
            
            // Set data
            const chartData = data.chartData.map(d => ({
                time: d.time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            }));
            
            candlestickSeries.setData(chartData);
            
            // Add volume histogram
            const volumeSeries = chart.addHistogramSeries({
                priceFormat: {
                    type: 'volume'
                },
                priceScaleId: 'volume'
            });
            
            chart.priceScale('volume').applyOptions({
                scaleMargins: { top: 0.85, bottom: 0.1 }
            });
            
            const volumeData = data.chartData.map(d => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(40, 167, 69, 0.4)' : 'rgba(220, 53, 69, 0.4)'
            }));
            
            volumeSeries.setData(volumeData);
            
            // Fit content
            chart.timeScale().fitContent();
            
            // Store reference
            state.charts.ihsg = chart;
            
            // Update IHSG price info
            if (data.regularMarketPrice) {
                document.getElementById('ihsg-price').textContent = YahooFinance.formatCurrency(data.regularMarketPrice);
                
                const changeEl = document.getElementById('ihsg-change');
                if (data.regularMarketChange !== null) {
                    const changeStr = YahooFinance.formatChange(data.regularMarketChange, true);
                    changeEl.textContent = `Perubahan: ${changeStr}`;
                    changeEl.className = data.regularMarketChange >= 0 ? 'price-up' : 'price-down';
                }
                
                document.getElementById('total-portfolio').textContent = YahooFinance.formatCurrency(data.regularMarketPrice);
            }
            
            document.getElementById('ihsg-time').textContent = new Date().toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Store for updates
            state.stockData.ihsg = data;
            
        } catch (error) {
            console.error('Error creating IHSG chart:', error);
            container.innerHTML = `<div class="text-center py-5 text-danger">
                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <h5>Error</h5>
                <p class="text-muted">${error.message}</p>
            </div>`;
        }
    },
    
    /**
     * Create single stock chart
     */
    async createSingleStockChart(symbol, range = CONFIG.defaultRange) {
        const container = document.getElementById('single-stock-chart');
        if (!container) return;
        
        // Clear existing
        if (state.charts.singleStock) {
            state.charts.singleStock.remove();
            state.charts.singleStock = null;
        }
        
        // Show loading
        container.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-warning"></div><small class="text-muted">Loading...</small></div>';
        
        try {
            const data = await YahooFinance.fetchChart(symbol, range);
            
            if (data.error || data.chartData.length === 0) {
                container.innerHTML = `<div class="text-center py-3 text-danger">
                    <small class="text-muted">Data tidak tersedia untuk ${symbol}</small>
                </div>`;
                return;
            }
            
            // Create chart
            const chart = LightweightCharts.createChart(container, {
                layout: {
                    background: { color: '#ffffff' },
                    textColor: '#333333',
                    fontFamily: 'Montserrat, sans-serif'
                },
                grid: {
                    vertLines: { color: '#e9ecef' },
                    horzLines: { color: '#e9ecef' }
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                    color: '#fd7e14',
                    width: 1,
                    vertLine: { color: '#fd7e14', width: 1, style: LightweightCharts.LineStyle.Dashed },
                    horzLine: { color: '#fd7e14', width: 1, style: LightweightCharts.LineStyle.Dashed }
                },
                rightPriceScale: {
                    borderColor: '#e9ecef',
                    scaleMargins: { top: 0.1, bottom: 0.2 }
                },
                timeScale: {
                    borderColor: '#e9ecef',
                    timeVisible: true,
                    secondsVisible: false
                },
                handleScale: {
                    axisPressedMouseMove: true,
                    mouseWheel: true,
                    pinch: true
                },
                handleScroll: {
                    axisPressedMouseMove: true,
                    mouseWheel: true,
                    pressedMouseMove: true,
                    pinch: true
                },
                width: container.clientWidth,
                height: container.clientHeight || 250
            });
            
            // Candlestick series
            const candlestickSeries = chart.addCandlestickSeries({
                upColor: '#28a745',
                downColor: '#dc3545',
                borderUpColor: '#28a745',
                borderDownColor: '#dc3545',
                wickUpColor: '#28a745',
                wickDownColor: '#dc3545'
            });
            
            // Set data
            const chartData = data.chartData.map(d => ({
                time: d.time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            }));
            
            candlestickSeries.setData(chartData);
            
            // Fit content
            chart.timeScale().fitContent();
            
            // Store reference
            state.charts.singleStock = chart;
            
        } catch (error) {
            console.error('Error creating single stock chart:', error);
            container.innerHTML = `<div class="text-center py-3 text-danger">
                <small class="text-muted">Error: ${error.message}</small>
            </div>`;
        }
    },
    
    /**
     * Update IHSG chart with new range
     */
    async updateIHSGChart(range) {
        if (range) {
            await this.createIHSGChart(range);
        } else {
            await this.createIHSGChart(CONFIG.defaultRange);
        }
    }
};

// ========================================
// UI Helpers
// ========================================

const UI = {
    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toastEl = document.getElementById('success-toast');
        const msgEl = document.getElementById('toast-message');
        
        if (!toastEl || !msgEl) return;
        
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        msgEl.textContent = message;
        
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    },
    
    /**
     * Show loading indicator
     */
    showLoading() {
        document.getElementById('loading-indicator').classList.remove('d-none');
    },
    
    /**
     * Hide loading indicator
     */
    hideLoading() {
        document.getElementById('loading-indicator').classList.add('d-none');
    },
    
    /**
     * Format currency (Indonesian Rupiah)
     */
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '--';
        
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },
    
    /**
     * Format percentage
     */
    formatPercent(value) {
        if (value === null || value === undefined) return '--';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    },
    
    /**
     * Format date
     */
    formatDate(dateStr) {
        if (!dateStr) return '--';
        
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },
    
    /**
     * Get current date in YYYY-MM-DD format
     */
    getCurrentDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    },
    
    /**
     * Get today's date string
     */
    getTodayString() {
        const today = new Date();
        return today.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    },
    
    /**
     * Sleep helper (for async operations)
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ========================================
// Tab Management
// ========================================

const Tabs = {
    /**
     * Switch to a tab
     */
    switch(tabId) {
        state.currentTab = tabId;
        
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        // Render tab content
        renderTabContent(tabId);
    }
};

// ========================================
// Dashboard Tab
// ========================================

const DashboardTab = {
    /**
     * Render dashboard tab content
     */
    render() {
        const container = document.getElementById('tab-content-container');
        
        container.innerHTML = `
            <div class="tab-content-fade">
                <h2 class="fw-bold mb-4">
                    <i class="fas fa-chart-line text-warning me-2"></i>Dashboard
                    <small class="text-muted d-block fw-normal">${UI.getTodayString()}</small>
                </h2>
                
                <!-- Price Cards -->
                <div class="row mb-4">
                    <div class="col-lg-4 col-md-6">
                        <div class="stock-price-card">
                            <div class="label">IHSG - Indeks Harga Saham Gabungan</div>
                            <div class="price mt-2" id="ihsg-price">--</div>
                            <span class="change" id="ihsg-change-display">--</span>
                            <div class="meta">
                                Update: <span id="ihsg-time">--</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4 col-md-6">
                        <div class="stock-price-card">
                            <div class="label">JCI - Jakarta Composite Index</div>
                            <div class="price mt-2" id="jci-price">--</div>
                            <span class="change" id="jci-change-display">--</span>
                            <div class="meta">
                                <span id="jci-change-percent">--</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4 col-md-6">
                        <div class="stock-price-card">
                            <div class="label">Total Portfolio Value</div>
                            <div class="price mt-2" id="portfolio-value">Rp 0</div>
                            <span class="change" id="portfolio-change-display">--</span>
                            <div class="meta">
                                <span id="portfolio-change-percent">--</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Stock Search -->
                <div class="card-custom mb-4">
                    <div class="card-header-custom">
                        <span><i class="fas fa-search me-2"></i>Cari Saham</span>
                    </div>
                    <div class="card-body-custom">
                        <div class="row g-2">
                            <div class="col-md-6">
                                <input type="text" id="stock-search-input" class="form-control form-control-custom" 
                                       placeholder="Masukkan kode saham (contoh: BBCA)" 
                                       onkeypress="if(event.key === 'Enter') searchStock()">
                            </div>
                            <div class="col-md-6">
                                <button class="btn btn-primary-custom w-100" onclick="searchStock()">
                                    <i class="fas fa-search me-1"></i>Cari
                                </button>
                            </div>
                        </div>
                        
                        <!-- Search Result -->
                        <div class="search-result mt-3" id="search-result">
                            <div class="stock-info">
                                <div>
                                    <span class="stock-name" id="search-stock-name">--</span>
                                    <span class="text-muted ms-2" id="search-stock-code">--</span>
                                </div>
                                <button class="btn btn-outline-primary btn-sm" onclick="addToPortfolioFromSearch()">
                                    <i class="fas fa-plus me-1"></i>Tambah ke Portfolio
                                </button>
                            </div>
                            <div class="row mt-2 g-2">
                                <div class="col-6">
                                    <span class="badge bg-secondary">Harga: <strong id="search-price">--</strong></span>
                                </div>
                                <div class="col-6">
                                    <span class="badge bg-secondary">Perubahan: <strong id="search-change">--</strong></span>
                                </div>
                            </div>
                            <div class="row mt-2 g-2">
                                <div class="col-6">
                                    <span class="badge bg-secondary">Open: <strong id="search-open">--</strong></span>
                                </div>
                                <div class="col-6">
                                    <span class="badge bg-secondary">Volume: <strong id="search-volume">--</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- IHSG Chart -->
                <div class="card-custom">
                    <div class="card-header-custom">
                        <span><i class="fas fa-chart-bar me-2"></i>Grafik IHSG</span>
                        <select id="ihsg-range-select" class="form-select form-select-custom chart-range-select" 
                                onchange="updateIHSGChart(this.value)">
                            ${CONFIG.chartRanges.map(r => 
                                `<option value="${r.value}" ${r.value === CONFIG.defaultRange ? 'selected' : ''}>${r.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="card-body-custom">
                        <div id="ihsg-chart-container" style="height: 350px;"></div>
                    </div>
                </div>
                
                <!-- Top Gainers / Losers -->
                <div class="row">
                    <div class="col-lg-6 mb-4">
                        <div class="card-custom">
                            <div class="card-header-custom bg-success-subtle">
                                <h5 class="mb-0 text-success"><i class="fas fa-arrow-up me-1"></i>Top Gainers Hari Ini</h5>
                            </div>
                            <div class="card-body-custom p-0">
                                <div class="table-responsive">
                                    <table class="table table-custom mb-0">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Kode</th>
                                                <th>Nama</th>
                                                <th>Harga</th>
                                                <th>% Change</th>
                                            </tr>
                                        </thead>
                                        <tbody id="top-gainers-table">
                                            <tr>
                                                <td colspan="5" class="text-center py-4 text-muted">
                                                    <i class="fas fa-spinner fa-spin me-2"></i>Loading...
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6 mb-4">
                        <div class="card-custom">
                            <div class="card-header-custom bg-danger-subtle">
                                <h5 class="mb-0 text-danger"><i class="fas fa-arrow-down me-1"></i>Top Losers Hari Ini</h5>
                            </div>
                            <div class="card-body-custom p-0">
                                <div class="table-responsive">
                                    <table class="table table-custom mb-0">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Kode</th>
                                                <th>Nama</th>
                                                <th>Harga</th>
                                                <th>% Change</th>
                                            </tr>
                                        </thead>
                                        <tbody id="top-losers-table">
                                            <tr>
                                                <td colspan="5" class="text-center py-4 text-muted">
                                                    <i class="fas fa-spinner fa-spin me-2"></i>Loading...
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load dashboard data
        this.load();
    },
    
    /**
     * Load dashboard data
     */
    async load() {
        // Load IHSG chart
        await ChartManager.createIHSGChart(CONFIG.defaultRange);
        
        // Load popular stocks data for gainers/losers
        await this.loadTopGainersLosers();
    },
    
    /**
     * Load top gainers and losers
     */
    async loadTopGainersLosers() {
        const gainersBody = document.getElementById('top-gainers-table');
        const losersBody = document.getElementById('top-losers-table');
        
        // For demonstration, we'll use hardcoded data
        // In production, you would fetch real data
        const gainers = [
            { code: 'PTBA', name: 'PT Bukit Asam', price: 1850, change: 5.23 },
            { code: 'UNTR', name: 'Unilever Indonesia', price: 3850, change: 4.12 },
            { code: 'ASII', name: 'Astra International', price: 4150, change: 3.85 },
            { code: 'TLKM', name: 'Telkom Indonesia', price: 3575, change: 3.21 },
            { code: 'BBCA', name: 'Bank Central Asia', price: 9250, change: 2.95 }
        ];
        
        const losers = [
            { code: 'BBRI', name: 'Bank Rakyat Indonesia', price: 3450, change: -2.15 },
            { code: 'BMRI', name: 'Bank Mandiri', price: 5250, change: -1.85 },
            { code: 'BBNI', name: 'Bank Negara Indonesia', price: 4825, change: -1.52 },
            { code: 'INDF', name: 'Indofood Sukses Makmur', price: 2150, change: -1.28 },
            { code: 'CPIN', name: 'Charoen Pokphand Indonesia', price: 5650, change: -0.95 }
        ];
        
        // Render gainers
        gainersBody.innerHTML = gainers.map((g, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><span class="badge bg-info">${g.code}</span></td>
                <td>${g.name}</td>
                <td>${UI.formatCurrency(g.price)}</td>
                <td class="price-up fw-bold">${UI.formatPercent(g.change)}</td>
            </tr>
        `).join('');
        
        // Render losers
        losersBody.innerHTML = losers.map((g, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><span class="badge bg-info">${g.code}</span></td>
                <td>${g.name}</td>
                <td>${UI.formatCurrency(g.price)}</td>
                <td class="price-down fw-bold">${UI.formatPercent(g.change)}</td>
            </tr>
        `).join('');
    },
    
    /**
     * Search for a stock
     */
    async searchStock() {
        const input = document.getElementById('stock-search-input');
        const query = input.value.trim().toUpperCase();
        
        if (!query) {
            UI.showToast('Masukkan kode saham terlebih dahulu', 'warning');
            return;
        }
        
        const resultEl = document.getElementById('search-result');
        const original = resultEl.innerHTML;
        
        resultEl.classList.add('show');
        resultEl.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-warning" style="width: 2rem; height: 2rem;"></div>
                <p class="text-muted mt-2">Mencari data saham...</p>
            </div>
        `;
        
        try {
            // Add .JK suffix for Yahoo Finance if not present
            const symbol = query.endsWith('.JK') ? query : `${query}.JK`;
            const data = await YahooFinance.searchStock(symbol);
            
            if (data.error) {
                resultEl.innerHTML = `
                    <div class="text-center py-3 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <h5 class="mb-1">Saham tidak ditemukan</h5>
                        <p class="text-muted">${data.error}</p>
                        <small class="text-muted">Pastikan kode saham sudah benar (contoh: BBCA)</small>
                    </div>
                `;
                return;
            }
            
            document.getElementById('search-stock-name').textContent = data.name;
            document.getElementById('search-stock-code').textContent = data.symbol;
            document.getElementById('search-price').textContent = data.price ? UI.formatCurrency(data.price) : '--';
            document.getElementById('search-change').textContent = data.change !== null ? UI.formatChange(data.change, true) : '--';
            document.getElementById('search-open').textContent = '--'; // Would need more data
            document.getElementById('search-volume').textContent = '--'; // Would need more data
            
            state.stockData.searched = data;
            
        } catch (error) {
            resultEl.innerHTML = `
                <div class="text-center py-3 text-danger">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <h5 class="mb-1">Error</h5>
                    <p class="text-muted">${error.message}</p>
                </div>
            `;
        }
    },
    
    /**
     * Add stock from search result to portfolio form
     */
    addToPortfolioFromSearch() {
        const data = state.stockData.searched;
        if (!data) {
            UI.showToast('Pencarian saham belum dilakukan', 'warning');
            return;
        }
        
        // Fill form
        document.getElementById('stock-code-input').value = data.symbol;
        document.getElementById('stock-name-input').value = data.name;
        
        UI.showToast(`${data.name} ditambahkan ke form`, 'success');
        
        // Switch to portfolio tab
        switchTab('portfolio');
    }
};

// ========================================
// Portfolio Tab
// ========================================

const PortfolioTab = {
    /**
     * Render portfolio tab content
     */
    render() {
        const container = document.getElementById('tab-content-container');
        
        container.innerHTML = `
            <div class="tab-content-fade">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="fw-bold mb-0">
                        <i class="fas fa-briefcase text-warning me-2"></i>Portfolio Saya
                    </h2>
                    <button class="btn btn-outline-custom btn-sm" onclick="clearPortfolioForm()">
                        <i class="fas fa-undo me-1"></i>Reset Form
                    </button>
                </div>
                
                <!-- Add Stock Form -->
                <div class="card-custom mb-4">
                    <div class="card-header-custom">
                        <h5 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Tambah Saham ke Portfolio</h5>
                    </div>
                    <div class="card-body-custom">
                        <form id="add-stock-form" onsubmit="addStockToPortfolio(event)">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label-custom">Kode Saham *</label>
                                    <input type="text" class="form-control form-control-custom" 
                                           id="stock-code" placeholder="Contoh: BBCA" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label-custom">Nama Perusahaan</label>
                                    <input type="text" class="form-control form-control-custom" 
                                           id="stock-name" placeholder="Otomatis terisi" readonly>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label-custom">Jumlah Lot *</label>
                                    <input type="number" class="form-control form-control-custom" 
                                           id="stock-lot" placeholder="114" min="1" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label-custom">Harga Beli *</label>
                                    <input type="number" class="form-control form-control-custom" 
                                           id="stock-buy-price" placeholder="7295" min="0" step="0.01" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label-custom">Tanggal Beli</label>
                                    <input type="date" class="form-control form-control-custom" 
                                           id="stock-date" value="${UI.getCurrentDate()}">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-custom">Catatan</label>
                                    <input type="text" class="form-control form-control-custom" 
                                           id="stock-note" placeholder="Opsional">
                                </div>
                                <div class="col-12">
                                    <button type="submit" class="btn btn-primary-custom">
                                        <i class="fas fa-save me-1"></i>Simpan ke Portfolio
                                    </button>
                                    <button type="button" class="btn btn-outline-custom" onclick="populateFromSearch()">
                                        <i class="fas fa-search me-1"></i>Dari Hasil Pencarian
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Portfolio Table -->
                <div class="card-custom">
                    <div class="card-header-custom">
                        <h5 class="mb-0"><i class="fas fa-list me-2"></i>List Portfolio</h5>
                        <div class="btn-group-custom">
                            <button class="btn btn-outline-danger btn-sm" onclick="confirmDeleteAllPortfolio()">
                                <i class="fas fa-trash-alt"></i> Hapus Semua
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="exportPortfolioCSV()">
                                <i class="fas fa-download"></i> Export CSV
                            </button>
                            <button class="btn btn-outline-primary btn-sm" onclick="syncToGoogleSheet()">
                                <i class="fas fa-sync"></i> Sync
                            </button>
                        </div>
                    </div>
                    <div class="card-body-custom p-0">
                        <div class="table-responsive">
                            <table class="table table-custom mb-0" id="portfolio-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Kode</th>
                                        <th>Nama</th>
                                        <th>Lot</th>
                                        <th>Jumlah Saham</th>
                                        <th>Harga Beli</th>
                                        <th>Total Investasi</th>
                                        <th>Harga Saat Ini</th>
                                        <th>Current Value</th>
                                        <th>Profit/Loss</th>
                                        <th>% Change</th>
                                        <th>Tanggal Beli</th>
                                        <th>Catatan</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody id="portfolio-table-body">
                                </tbody>
                            </table>
                        </div>
                        <div id="portfolio-empty" class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h5>Portfolio Anda masih kosong</h5>
                            <p>Tambahkan saham pertama Anda menggunakan form di atas!</p>
                            <button class="btn btn-primary-custom" onclick="switchTab('dashboard'); document.getElementById('stock-search-input').focus()">
                                <i class="fas fa-search me-1"></i>Cari Saham
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Summary Cards -->
                <div class="summary-row mb-4" id="portfolio-summary">
                    <div class="summary-card">
                        <div class="summary-label">Total Investasi</div>
                        <div class="summary-value" id="summary-investment">Rp 0</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Current Value</div>
                        <div class="summary-value" id="summary-current">Rp 0</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Total Profit/Loss</div>
                        <div class="summary-value" id="summary-pl">Rp 0</div>
                        <div class="summary-change" id="summary-pl-change">--</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Total Return</div>
                        <div class="summary-value" id="summary-return">0%</div>
                        <div class="summary-change" id="summary-return-change">--</div>
                    </div>
                </div>
                
                <!-- Individual Stock Charts -->
                <div class="card-custom">
                    <div class="card-header-custom">
                        <h5 class="mb-0"><i class="fas fa-chart-simple me-2"></i>Grafik Per Saham</h5>
                        <select id="stock-chart-range" class="form-select form-select-custom chart-range-select">
                            ${CONFIG.chartRanges.map(r => 
                                `<option value="${r.value}" ${r.value === '1mo' ? 'selected' : ''}>${r.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="card-body-custom" id="stock-charts-container">
                        <div id="stock-charts-list"></div>
                        <div id="stock-charts-empty" class="text-center py-4 text-muted">
                            <i class="fas fa-chart-line fa-2x mb-2"></i>
                            <p>Tambahkan saham ke portfolio untuk melihat grafik</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load portfolio
        this.load();
    },
    
    /**
     * Load portfolio data
     */
    async load() {
        const portfolio = Storage.getPortfolio();
        state.portfolio = portfolio;
        
        const tableBody = document.getElementById('portfolio-table-body');
        const emptyEl = document.getElementById('portfolio-empty');
        
        if (portfolio.length === 0) {
            tableBody.innerHTML = '';
            emptyEl.style.display = 'block';
            document.getElementById('portfolio-table').style.display = 'none';
            document.getElementById('stock-charts-list').innerHTML = '';
            document.getElementById('stock-charts-empty').style.display = 'block';
            this.updateSummary();
            return;
        }
        
        emptyEl.style.display = 'none';
        document.getElementById('portfolio-table').style.display = 'table';
        document.getElementById('stock-charts-empty').style.display = 'none';
        
        // Calculate current prices and update table
        await this.calculateCurrentPrices(portfolio);
        
        // Render rows
        tableBody.innerHTML = portfolio.map((stock, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><span class="badge bg-info">${stock.code}</span></td>
                <td>${stock.name}</td>
                <td>${stock.lot}</td>
                <td>${stock.quantity}</td>
                <td>${UI.formatCurrency(stock.buyPrice)}</td>
                <td>${UI.formatCurrency(stock.totalInvestment)}</td>
                <td>${UI.formatCurrency(stock.currentPrice || 0)} <small class="text-muted">(estimasi)</small></td>
                <td class="fw-bold">${UI.formatCurrency(stock.currentValue || 0)}</td>
                <td class="${stock.profitLoss >= 0 ? 'price-up' : 'price-down'} fw-bold">
                    ${stock.profitLoss >= 0 ? '+' : ''}${UI.formatCurrency(stock.profitLoss)}
                </td>
                <td class="${stock.pctChange >= 0 ? 'price-up' : 'price-down'} fw-bold">
                    ${UI.formatPercent(stock.pctChange)}
                </td>
                <td>${UI.formatDate(stock.buyDate)}</td>
                <td><small class="text-muted">${stock.note || '--'}</small></td>
                <td>
                    <div class="btn-group-custom">
                        <button class="btn btn-sm btn-outline-primary" onclick="removeStock(${index})" title="Hapus">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="showStockChart(${index})" title="Grafik">
                            <i class="fas fa-chart-simple"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-dark" onclick="editStock(${index})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Update stock charts list
        this.renderStockCharts(portfolio);
        
        // Update summary
        this.updateSummary();
    },
    
    /**
     * Calculate current prices for portfolio
     */
    async calculateCurrentPrices(portfolio) {
        // For each stock, try to fetch current price
        for (let i = 0; i < portfolio.length; i++) {
            const stock = portfolio[i];
            try {
                const data = await YahooFinance.fetchChart(`${stock.code}.JK`, '5d');
                if (data.chartData && data.chartData.length > 0) {
                    const latest = data.chartData[data.chartData.length - 1];
                    stock.currentPrice = latest.close;
                    stock.currentValue = latest.close * stock.quantity;
                    stock.profitLoss = stock.currentValue - stock.totalInvestment;
                    stock.pctChange = (stock.profitLoss / stock.totalInvestment) * 100;
                }
            } catch (e) {
                // Keep previous values or set to buy price
                if (!stock.currentPrice) {
                    stock.currentPrice = stock.buyPrice;
                    stock.currentValue = stock.totalInvestment;
                    stock.profitLoss = 0;
                    stock.pctChange = 0;
                }
            }
        }
        
        // Save updated portfolio
        Storage.setPortfolio(portfolio);
        state.portfolio = portfolio;
    },
    
    /**
     * Update summary cards
     */
    updateSummary() {
        const portfolio = state.portfolio;
        const totalInvestment = portfolio.reduce((sum, s) => sum + s.totalInvestment, 0);
        const totalCurrentValue = portfolio.reduce((sum, s) => sum + (s.currentValue || 0), 0);
        const totalPL = totalCurrentValue - totalInvestment;
        const totalPctChange = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0;
        
        document.getElementById('summary-investment').textContent = UI.formatCurrency(totalInvestment);
        document.getElementById('summary-current').textContent = UI.formatCurrency(totalCurrentValue);
        
        const plEl = document.getElementById('summary-pl');
        plEl.textContent = `${totalPL >= 0 ? '+' : ''}${UI.formatCurrency(totalPL)}`;
        plEl.className = totalPL >= 0 ? 'summary-value price-up' : 'summary-value price-down';
        
        const plChangeEl = document.getElementById('summary-pl-change');
        if (portfolio.length > 0) {
            plChangeEl.textContent = 'Total portfolio';
            plChangeEl.className = `summary-change ${totalPL >= 0 ? 'positive' : 'negative'}`;
        } else {
            plChangeEl.textContent = '--';
        }
        
        const returnEl = document.getElementById('summary-return');
        returnEl.textContent = UI.formatPercent(totalPctChange);
        returnEl.className = totalPctChange >= 0 ? 'summary-value price-up' : 'summary-value price-down';
        
        const returnChangeEl = document.getElementById('summary-return-change');
        if (portfolio.length > 0) {
            returnChangeEl.textContent = 'Total return';
            returnChangeEl.className = `summary-change ${totalPctChange >= 0 ? 'positive' : 'negative'}`;
        } else {
            returnChangeEl.textContent = '--';
        }
        
        // Update portfolio value in header
        document.getElementById('portfolio-value').textContent = UI.formatCurrency(totalCurrentValue);
        document.getElementById('portfolio-change-display').textContent = `${totalPL >= 0 ? '+' : ''}${UI.formatCurrency(totalPL)}`;
        document.getElementById('portfolio-change-display').className = `change ${totalPL >= 0 ? 'up' : 'down'}`;
        document.getElementById('portfolio-change-percent').textContent = UI.formatPercent(totalPctChange);
    },
    
    /**
     * Render stock charts for portfolio
     */
    renderStockCharts(portfolio) {
        const container = document.getElementById('stock-charts-list');
        
        if (portfolio.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = portfolio.map((stock, index) => `
            <div class="portfolio-chart-item">
                <div class="chart-header-row">
                    <span class="chart-stock-code">
                        <span class="badge bg-info me-2">${stock.code}</span>
                        ${stock.name}
                    </span>
                    <div class="btn-group-custom">
                        <button class="btn btn-sm btn-outline-secondary" onclick="showStockChart(${index})">
                            <i class="fas fa-expand"></i> Lihat
                        </button>
                        <button class="btn btn-sm btn-outline-danger remove-btn" onclick="removeStock(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="chart-wrapper chart-wrapper-sm" id="chart-container-${index}"></div>
            </div>
        `).join('');
        
        // Load charts
        portfolio.forEach((stock, index) => {
            this.loadStockChart(stock.code, index);
        });
    },
    
    /**
     * Load individual stock chart
     */
    async loadStockChart(symbol, index) {
        const container = document.getElementById(`chart-container-${index}`);
        if (!container) return;
        
        try {
            const data = await YahooFinance.fetchChart(`${symbol}.JK`, '1mo');
            
            if (data.chartData && data.chartData.length > 0) {
                const chart = LightweightCharts.createChart(container, {
                    layout: {
                        background: { color: '#ffffff' },
                        textColor: '#333333',
                        fontFamily: 'Montserrat, sans-serif'
                    },
                    grid: {
                        vertLines: { color: '#e9ecef' },
                        horzLines: { color: '#e9ecef' }
                    },
                    crosshair: {
                        mode: LightweightCharts.CrosshairMode.Normal,
                        color: '#fd7e14'
                    },
                    rightPriceScale: {
                        borderColor: '#e9ecef'
                    },
                    timeScale: {
                        borderColor: '#e9ecef',
                        timeVisible: true
                    },
                    width: container.clientWidth,
                    height: container.clientHeight || 200
                });
                
                const candlestickSeries = chart.addCandlestickSeries({
                    upColor: '#28a745',
                    downColor: '#dc3545',
                    borderUpColor: '#28a745',
                    borderDownColor: '#dc3545',
                    wickUpColor: '#28a745',
                    wickDownColor: '#dc3545'
                });
                
                const chartData = data.chartData.map(d => ({
                    time: d.time,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close
                }));
                
                candlestickSeries.setData(chartData);
                chart.timeScale().fitContent();
                
            } else {
                container.innerHTML = '<div class="text-center py-2 text-muted">Data tidak tersedia</div>';
            }
        } catch (e) {
            container.innerHTML = '<div class="text-center py-2 text-danger"><small>Error loading chart</small></div>';
        }
    },
    
    /**
     * Show stock chart modal/enlarge
     */
    async showStockChart(index) {
        const portfolio = state.portfolio;
        const stock = portfolio[index];
        
        if (!stock) return;
        
        // Create a modal-like view
        const existing = document.getElementById('individual-chart-modal');
        if (existing) {
            existing.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal fade show position-absolute top-50 start-50 translate-middle w-75 h-50 d-flex flex-column';
        modal.id = 'individual-chart-modal';
        modal.style.zIndex = '1000';
        modal.innerHTML = `
            <div class="modal-header bg-dark text-white" style="border-radius: 16px 16px 0 0;">
                <h5 class="modal-title fw-bold">
                    <span class="badge bg-info me-2">${stock.code}</span>
                    ${stock.name}
                </h5>
                <button type="button" class="btn-close btn-close-white" onclick="this.closest('.modal').remove()"></button>
            </div>
            <div class="modal-body" style="background: white; border-radius: 0 0 16px 16px; overflow: hidden;">
                <div style="height: 350px;" id="individual-chart-container"></div>
                <div class="d-flex justify-content-between px-3 py-2 bg-light border-top">
                    <div>
                        <strong>Harga Saat Ini:</strong> 
                        <span class="text-success">${UI.formatCurrency(stock.currentPrice || stock.buyPrice)}</span>
                    </div>
                    <div>
                        <strong>Profit/Loss:</strong> 
                        <span class="${stock.profitLoss >= 0 ? 'text-success' : 'text-danger'} fw-bold">
                            ${stock.profitLoss >= 0 ? '+' : ''}${UI.formatCurrency(stock.profitLoss)}
                        </span>
                    </div>
                    <div>
                        <strong>% Change:</strong> 
                        <span class="${stock.pctChange >= 0 ? 'text-success' : 'text-danger'} fw-bold">
                            ${UI.formatPercent(stock.pctChange)}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load chart
        await ChartManager.createSingleStockChart(`${stock.code}.JK`, '1mo');
        
        // Move chart to modal container
        setTimeout(() => {
            const chartContainer = document.getElementById('ihsg-chart-container');
            const newContainer = document.getElementById('individual-chart-container');
            if (chartContainer && state.charts.ihsg) {
                state.charts.ihsg.container = newContainer;
                newContainer.innerHTML = '';
                state.charts.ihsg.resize();
            }
        }, 100);
    },
    
    /**
     * Add stock to portfolio
     */
    async addStock(e) {
        e.preventDefault();
        
        const code = document.getElementById('stock-code').value.trim().toUpperCase();
        const name = document.getElementById('stock-name').value.trim() || YahooFinance.getStockName(code);
        const lot = parseInt(document.getElementById('stock-lot').value);
        const buyPrice = parseFloat(document.getElementById('stock-buy-price').value);
        const buyDate = document.getElementById('stock-date').value || UI.getCurrentDate();
        const note = document.getElementById('stock-note').value.trim();
        
        if (!code || !lot || !buyPrice) {
            UI.showToast('Mohon lengkapi data yang diperlukan', 'warning');
            return;
        }
        
        const quantity = lot * 100; // 1 lot = 100 shares
        const totalInvestment = buyPrice * quantity;
        
        const newStock = {
            id: Date.now(),
            code: code,
            name: name,
            lot: lot,
            quantity: quantity,
            buyPrice: buyPrice,
            totalInvestment: totalInvestment,
            buyDate: buyDate,
            note: note,
            currentPrice: buyPrice, // Initially same as buy price
            currentValue: totalInvestment,
            profitLoss: 0,
            pctChange: 0,
            createdAt: new Date().toISOString()
        };
        
        const portfolio = [...state.portfolio, newStock];
        Storage.setPortfolio(portfolio);
        state.portfolio = portfolio;
        
        UI.showToast(`${code} berhasil ditambahkan ke portfolio!`, 'success');
        
        // Clear form
        clearPortfolioForm();
        
        // Reload
        this.load();
        
        // Save to Google Sheets if configured
        if (state.settings.appsScriptUrl) {
            try {
                await GoogleSheets.writePortfolio(portfolio);
            } catch (e) {
                console.error('Error syncing to Google Sheets:', e);
            }
        }
    },
    
    /**
     * Remove stock from portfolio
     */
    removeStock(index) {
        const portfolio = [...state.portfolio];
        const removed = portfolio.splice(index, 1);
        
        Storage.setPortfolio(portfolio);
        state.portfolio = portfolio;
        
        UI.showToast(`${removed[0].code} dihapus dari portfolio`, 'info');
        this.load();
    },
    
    /**
     * Edit stock from portfolio
     */
    async editStock(index) {
        const portfolio = state.portfolio;
        const stock = portfolio[index];
        
        if (!stock) return;
        
        // Remove stock
        portfolio.splice(index, 1);
        Storage.setPortfolio(portfolio);
        state.portfolio = portfolio;
        
        // Populate form
        document.getElementById('stock-code').value = stock.code;
        document.getElementById('stock-name').value = stock.name;
        document.getElementById('stock-lot').value = stock.lot;
        document.getElementById('stock-buy-price').value = stock.buyPrice;
        document.getElementById('stock-date').value = stock.buyDate;
        document.getElementById('stock-note').value = stock.note || '';
        
        UI.showToast(`${stock.code} siap di-edit. Lanjutkan submit untuk menyimpan.`, 'info');
        
        this.load();
    },
    
    /**
     * Clear portfolio form
     */
    clearPortfolioForm() {
        document.getElementById('add-stock-form').reset();
        document.getElementById('stock-date').value = UI.getCurrentDate();
    },
    
    /**
     * Populate form from search result
     */
    populateFromSearch() {
        const data = state.stockData.searched;
        if (!data) {
            UI.showToast('Belum ada hasil pencarian', 'warning');
            return;
        }
        
        document.getElementById('stock-code').value = data.symbol;
        document.getElementById('stock-name').value = data.name;
        
        UI.showToast('Form terisi dari hasil pencarian', 'success');
    },
    
    /**
     * Confirm delete all portfolio
     */
    confirmDeleteAllPortfolio() {
        if (state.portfolio.length === 0) {
            UI.showToast('Portfolio sudah kosong', 'warning');
            return;
        }
        
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmModalTitle').textContent = 'Hapus Semua Portfolio?';
        document.getElementById('confirmModalMessage').textContent = 'Ini akan menghapus semua saham dari portfolio Anda. Tindakan ini tidak bisa dibatalkan.';
        document.getElementById('confirmModalAction').onclick = () => {
            Storage.setPortfolio([]);
            state.portfolio = [];
            this.load();
            modal.classList.remove('show');
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
            UI.showToast('Semua portfolio dihapus', 'info');
        };
        new bootstrap.Modal(modal).show();
    },
    
    /**
     * Export portfolio to CSV
     */
    exportPortfolioCSV() {
        const portfolio = state.portfolio;
        
        if (portfolio.length === 0) {
            UI.showToast('Portfolio kosong, tidak ada yang diexport', 'warning');
            return;
        }
        
        const headers = [
            'No', 'Kode', 'Nama', 'Lot', 'JumlahSaham', 'HargaBeli',
            'TotalInvestasi', 'HargaSaatIni', 'CurrentValue', 'ProfitLoss',
            'PctChange', 'TanggalBeli', 'Catatan'
        ];
        
        const rows = portfolio.map((stock, i) => [
            i + 1,
            stock.code,
            stock.name,
            stock.lot,
            stock.quantity,
            stock.buyPrice,
            stock.totalInvestment,
            stock.currentPrice || stock.buyPrice,
            stock.currentValue || stock.totalInvestment,
            stock.profitLoss,
            stock.pctChange,
            stock.buyDate,
            `"${stock.note || ''}"`
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `portfolio-${UI.getCurrentDate()}.csv`;
        link.click();
        
        UI.showToast('Portfolio berhasil diexport ke CSV', 'success');
    },
    
    /**
     * Sync to Google Sheets
     */
    async syncToGoogleSheet() {
        if (!state.settings.appsScriptUrl) {
            UI.showToast('Silakan setup Google Sheets di tab Settings terlebih dahulu', 'warning');
            return;
        }
        
        try {
            UI.showToast('Menyinkronkan ke Google Sheets...', 'info');
            await GoogleSheets.writePortfolio(state.portfolio);
            UI.showToast('Sync ke Google Sheets berhasil!', 'success');
        } catch (error) {
            UI.showToast(`Gagal sync: ${error.message}`, 'danger');
        }
    }
};

// ========================================
// Journal Tab
// ========================================

const JournalTab = {
    /**
     * Render journal tab content
     */
    render() {
        const container = document.getElementById('tab-content-container');
        
        container.innerHTML = `
            <div class="tab-content-fade">
                <h2 class="fw-bold mb-4">
                    <i class="fas fa-book text-warning me-2"></i>Trading Journal
                    <small class="text-muted d-block fw-normal">Catat setiap keputusan trading Anda</small>
                </h2>
                
                <!-- Add Journal Form -->
                <div class="card-custom mb-4">
                    <div class="card-header-custom">
                        <h5 class="mb-0"><i class="fas fa-pen me-2"></i>Catat Trade Baru</h5>
                    </div>
                    <div class="card-body-custom">
                        <form id="journal-form" onsubmit="addJournalEntry(event)">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label-custom">Saham *</label>
                                    <input type="text" class="form-control form-control-custom" 
                                           id="journal-stock" placeholder="Contoh: BBCA" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label-custom">Tipe *</label>
                                    <select class="form-select form-select-custom" id="journal-type" required>
                                        <option value="">Pilih...</option>
                                        <option value="Buy">Buy (Beli)</option>
                                        <option value="Sell">Sell (Jual)</option>
                                        <option value="Hold">Hold (Tahan)</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label-custom">Jumlah Saham *</label>
                                    <input type="number" class="form-control form-control-custom" 
                                           id="journal-qty" placeholder="100" min="1" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label-custom">Harga *</label>
                                    <input type="number" class="form-control form-control-custom" 
                                           id="journal-price" placeholder="7295" min="0" step="0.01" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label-custom">Catatan</label>
                                    <input type="text" class="form-control form-control-custom" 
                                           id="journal-note" placeholder="Alasan trade...">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label-custom">Review / Refleksi</label>
                                    <textarea class="form-control form-control-custom" 
                                              id="journal-review" rows="2" 
                                              placeholder="Apa yang bisa diperbaiki?"></textarea>
                                </div>
                                <div class="col-12">
                                    <button type="submit" class="btn btn-primary-custom">
                                        <i class="fas fa-save me-1"></i>Simpan ke Journal
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Journal Table -->
                <div class="card-custom">
                    <div class="card-header-custom">
                        <h5 class="mb-0"><i class="fas fa-history me-2"></i>History Trade</h5>
                        <div class="btn-group-custom">
                            <button class="btn btn-outline-danger btn-sm" onclick="confirmDeleteAllJournal()">
                                <i class="fas fa-trash-alt"></i> Hapus Semua
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="exportJournalCSV()">
                                <i class="fas fa-download"></i> Export CSV
                            </button>
                            <button class="btn btn-outline-primary btn-sm" onclick="syncJournalToGoogleSheet()">
                                <i class="fas fa-sync"></i> Sync
                            </button>
                        </div>
                    </div>
                    <div class="card-body-custom p-0">
                        <div class="table-responsive">
                            <table class="table table-custom mb-0" id="journal-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Tanggal</th>
                                        <th>Saham</th>
                                        <th>Tipe</th>
                                        <th>Jumlah</th>
                                        <th>Harga</th>
                                        <th>Total</th>
                                        <th>Catatan</th>
                                        <th>Review</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody id="journal-table-body">
                                </tbody>
                            </table>
                        </div>
                        <div id="journal-empty" class="empty-state">
                            <i class="fas fa-book-open"></i>
                            <h5>Belum ada catatan trade</h5>
                            <p>Mulai catat keputusan trading Anda untuk evaluasi ke depan!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.load();
    },
    
    /**
     * Load journal
     */
    load() {
        const journal = Storage.getJournal();
        state.journal = journal;
        
        const tableBody = document.getElementById('journal-table-body');
        const emptyEl = document.getElementById('journal-empty');
        
        if (journal.length === 0) {
            tableBody.innerHTML = '';
            emptyEl.style.display = 'block';
            document.getElementById('journal-table').style.display = 'none';
            return;
        }
        
        emptyEl.style.display = 'none';
        document.getElementById('journal-table').style.display = 'table';
        
        // Sort by date descending
        const sorted = [...journal].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        tableBody.innerHTML = sorted.map((entry, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${UI.formatDate(entry.date)}</td>
                <td><span class="badge bg-info">${entry.stock}</span></td>
                <td>
                    <span class="badge ${entry.type === 'Buy' ? 'badge-success' : entry.type === 'Sell' ? 'badge-danger' : 'badge-warning'}">
                        ${entry.type}
                    </span>
                </td>
                <td>${entry.quantity}</td>
                <td>${UI.formatCurrency(entry.price)}</td>
                <td>${UI.formatCurrency(entry.total)}</td>
                <td><small class="text-muted">${entry.note || '--'}</small></td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-link text-decoration-none p-0" type="button" data-bs-toggle="dropdown">
                            <i class="fas fa-eye"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-sm">
                            <li><span class="dropdown-item-text text-muted small py-2">
                                ${entry.review || 'Tanpa review'}
                            </span></li>
                        </ul>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeJournal(${sorted.indexOf(entry)})" title="Hapus">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },
    
    /**
     * Add journal entry
     */
    async addJournal(e) {
        e.preventDefault();
        
        const stock = document.getElementById('journal-stock').value.trim().toUpperCase();
        const type = document.getElementById('journal-type').value;
        const quantity = parseInt(document.getElementById('journal-qty').value);
        const price = parseFloat(document.getElementById('journal-price').value);
        const note = document.getElementById('journal-note').value.trim();
        const review = document.getElementById('journal-review').value.trim();
        
        if (!stock || !type || !quantity || !price) {
            UI.showToast('Mohon lengkapi data yang diperlukan', 'warning');
            return;
        }
        
        const total = quantity * price;
        const today = UI.getCurrentDate();
        
        const newEntry = {
            id: Date.now(),
            date: today,
            stock: stock,
            type: type,
            quantity: quantity,
            price: price,
            total: total,
            note: note,
            review: review,
            createdAt: new Date().toISOString()
        };
        
        const journal = [...state.journal, newEntry];
        Storage.setJournal(journal);
        state.journal = journal;
        
        UI.showToast('Catatan trade berhasil disimpan!', 'success');
        
        // Clear form
        document.getElementById('journal-form').reset();
        
        this.load();
        
        // Save to Google Sheets
        if (state.settings.appsScriptUrl) {
            try {
                await GoogleSheets.writeJournal(journal);
            } catch (e) {
                console.error('Error syncing journal to Google Sheets:', e);
            }
        }
    },
    
    /**
     * Remove journal entry
     */
    removeJournal(index) {
        const journal = [...state.journal];
        journal.splice(index, 1);
        
        Storage.setJournal(journal);
        state.journal = journal;
        
        UI.showToast('Catatan trade dihapus', 'info');
        this.load();
    },
    
    /**
     * Confirm delete all journal
     */
    confirmDeleteAllJournal() {
        if (state.journal.length === 0) {
            UI.showToast('Journal sudah kosong', 'warning');
            return;
        }
        
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmModalTitle').textContent = 'Hapus Semua Journal?';
        document.getElementById('confirmModalMessage').textContent = 'Ini akan menghapus semua catatan trade Anda. Tindakan ini tidak bisa dibatalkan.';
        document.getElementById('confirmModalAction').onclick = () => {
            Storage.setJournal([]);
            state.journal = [];
            this.load();
            modal.classList.remove('show');
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
            UI.showToast('Semua journal dihapus', 'info');
        };
        new bootstrap.Modal(modal).show();
    },
    
    /**
     * Export journal to CSV
     */
    exportJournalCSV() {
        const journal = state.journal;
        
        if (journal.length === 0) {
            UI.showToast('Journal kosong, tidak ada yang diexport', 'warning');
            return;
        }
        
        const headers = ['No', 'Tanggal', 'Saham', 'Tipe', 'Jumlah', 'Harga', 'Total', 'Catatan', 'Review'];
        const sorted = [...journal].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const rows = sorted.map((entry, i) => [
            i + 1,
            entry.date,
            entry.stock,
            entry.type,
            entry.quantity,
            entry.price,
            entry.total,
            `"${entry.note || ''}"`,
            `"${entry.review || ''}"`
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `journal-${UI.getCurrentDate()}.csv`;
        link.click();
        
        UI.showToast('Journal berhasil diexport ke CSV', 'success');
    },
    
    /**
     * Sync journal to Google Sheets
     */
    async syncJournalToGoogleSheet() {
        if (!state.settings.appsScriptUrl) {
            UI.showToast('Silakan setup Google Sheets di tab Settings terlebih dahulu', 'warning');
            return;
        }
        
        try {
            UI.showToast('Menyinkronkan journal ke Google Sheets...', 'info');
            await GoogleSheets.writeJournal(state.journal);
            UI.showToast('Sync journal ke Google Sheets berhasil!', 'success');
        } catch (error) {
            UI.showToast(`Gagal sync: ${error.message}`, 'danger');
        }
    }
};

// ========================================
// Settings Tab
// ========================================

const SettingsTab = {
    /**
     * Render settings tab content
     */
    render() {
        const container = document.getElementById('tab-content-container');
        
        container.innerHTML = `
            <div class="tab-content-fade">
                <h2 class="fw-bold mb-4">
                    <i class="fas fa-cog text-warning me-2"></i>Settings
                    <small class="text-muted d-block fw-normal">Konfigurasi aplikasi</small>
                </h2>
                
                <!-- Google Sheets Integration -->
                <div class="settings-section">
                    <h5 class="section-title"><i class="fas fa-database me-2"></i>Google Sheets Integration</h5>
                    
                    <div class="alert alert-info-custom">
                        <strong>Panduan Setup:</strong>
                        <ol class="mb-0 mt-2">
                            <li>Buat Google Sheet baru dengan tab "Portfolio" dan "Journal"</li>
                            <li>Buka Extensions > Apps Script</li>
                            <li>Copy script ke Apps Script editor</li>
                            <li>Deploy sebagai Web App (Anyone access)</li>
                            <li>Masukkan URL Web App ke field di bawah</li>
                        </ol>
                    </div>
                    
                    <div class="settings-card">
                        <div class="mb-3">
                            <label class="form-label-custom">Google Apps Script Web App URL</label>
                            <input type="url" class="form-control form-control-custom" 
                                   id="settings-apps-script-url" 
                                   placeholder="https://script.google.com/macros/s/.../exec"
                                   value="${state.settings.appsScriptUrl || ''}">
                            <small class="text-muted">URL dari deploy Web App di Google Apps Script</small>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label-custom">Google Sheet ID</label>
                            <input type="text" class="form-control form-control-custom" 
                                   id="settings-sheet-id" 
                                   placeholder="ID dari URL Google Sheet (opsional)">
                            <small class="text-muted">Bisa diambil dari URL Google Sheet Anda</small>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary-custom" onclick="testGoogleSheetConnection()">
                                <i class="fas fa-link me-1"></i>Test Koneksi
                            </button>
                            <button class="btn btn-outline-custom" onclick="saveSettings()">
                                <i class="fas fa-save me-1"></i>Simpan Settings
                            </button>
                        </div>
                        <div id="settings-test-result" class="mt-3"></div>
                    </div>
                </div>
                
                <!-- Data Management -->
                <div class="settings-section">
                    <h5 class="section-title"><i class="fas fa-database me-2"></i>Data Management</h5>
                    
                    <div class="settings-card">
                        <p class="text-muted mb-3">Kelola data portfolio dan journal Anda. Data tersimpan di browser (LocalStorage).</p>
                        
                        <div class="d-flex flex-wrap gap-2">
                            <button class="btn btn-outline-primary-custom" onclick="exportPortfolioCSV()">
                                <i class="fas fa-file-export me-1"></i>Export Portfolio CSV
                            </button>
                            <button class="btn btn-outline-primary-custom" onclick="document.getElementById('import-csv').click()">
                                <i class="fas fa-file-import me-1"></i>Import dari CSV
                            </button>
                            <input type="file" id="import-csv" accept=".csv" style="display: none;" onchange="importPortfolioCSV(this)">
                            
                            <button class="btn btn-outline-primary-custom" onclick="exportJournalCSV()">
                                <i class="fas fa-file-export me-1"></i>Export Journal CSV
                            </button>
                            
                            <button class="btn btn-outline-danger-custom ms-auto" onclick="confirmClearAllData()">
                                <i class="fas fa-trash-alt me-1"></i>Hapus Semua Data
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- About -->
                <div class="settings-section">
                    <h5 class="section-title"><i class="fas fa-info-circle me-2"></i>Tentang Aplikasi</h5>
                    
                    <div class="settings-card">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <strong><i class="fas fa-code me-2"></i>Nama</strong>
                                <p class="mb-0">Stock Portfolio Tracker</p>
                            </div>
                            <div class="col-md-6">
                                <strong><i class="fas fa-code-branch me-2"></i>Versi</strong>
                                <p class="mb-0">1.0.0</p>
                            </div>
                            <div class="col-md-6">
                                <strong><i class="fas fa-database me-2"></i>Data Source</strong>
                                <p class="mb-0">Yahoo Finance API</p>
                            </div>
                            <div class="col-md-6">
                                <strong><i class="fas fa-chart-line me-2"></i>Chart Library</strong>
                                <p class="mb-0">TradingView Lightweight Charts</p>
                            </div>
                            <div class="col-md-6">
                                <strong><i class="fas fa-user me-2"></i>Dikembangkan oleh</strong>
                                <p class="mb-0">Dicky Prasetiyo</p>
                            </div>
                            <div class="col-md-6">
                                <strong><i class="fas fa-envelope me-2"></i>Website</strong>
                                <p class="mb-0">github.io/dickyprasetiyo</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Disclaimer -->
                <div class="settings-section">
                    <h5 class="section-title"><i class="fas fa-exclamation-triangle me-2"></i>Disclaimer</h5>
                    
                    <div class="alert alert-warning" style="border-radius: 10px;">
                        <h6 class="fw-bold">Penting:</h6>
                        <p class="mb-0">
                            <strong>Aplikasi ini BUKAN saran investasi.</strong> 
                            Data yang ditampilkan berasal dari Yahoo Finance yang tidak menjamin akurasi real-time.
                            Gunakan untuk tujuan edukasi dan pantauan saja. Investasi saham memiliki risiko.
                        </p>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Save settings
     */
    saveSettings() {
        const appsScriptUrl = document.getElementById('settings-apps-script-url').value.trim();
        const sheetId = document.getElementById('settings-sheet-id').value.trim();
        
        const settings = {
            appsScriptUrl: appsScriptUrl,
            sheetId: sheetId
        };
        
        Storage.setSettings(settings);
        state.settings = settings;
        
        UI.showToast('Settings berhasil disimpan!', 'success');
    },
    
    /**
     * Test Google Sheets connection
     */
    async testGoogleSheetConnection() {
        const resultEl = document.getElementById('settings-test-result');
        const url = document.getElementById('settings-apps-script-url').value.trim();
        
        if (!url) {
            resultEl.innerHTML = '<div class="alert alert-warning">Masukkan URL Google Apps Script terlebih dahulu</div>';
            return;
        }
        
        resultEl.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm text-warning"></div><small class="text-muted">Mengetes koneksi...</small></div>';
        
        // Temporarily set settings
        state.settings.appsScriptUrl = url;
        
        try {
            const result = await GoogleSheets.testConnection();
            
            if (result.success) {
                resultEl.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle me-1"></i>Koneksi berhasil! 
                        <span class="text-muted">(${result.count} data portfolio ditemukan)</span>
                    </div>
                `;
            } else {
                resultEl.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-1"></i>Gagal: ${result.message}
                    </div>
                `;
            }
        } catch (error) {
            resultEl.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-1"></i>Error: ${error.message}
                </div>
            `;
        }
        
        // Restore original settings
        state.settings.appsScriptUrl = url;
    },
    
    /**
     * Confirm clear all data
     */
    confirmClearAllData() {
        if (Storage.getPortfolio().length === 0 && Storage.getJournal().length === 0) {
            UI.showToast('Belum ada data yang bisa dihapus', 'warning');
            return;
        }
        
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmModalTitle').textContent = 'Hapus Semua Data?';
        document.getElementById('confirmModalMessage').textContent = 'Ini akan menghapus semua portfolio dan journal Anda. Tindakan ini tidak bisa dibatalkan.';
        document.getElementById('confirmModalAction').onclick = () => {
            Storage.clear();
            state.portfolio = [];
            state.journal = [];
            this.load();
            modal.classList.remove('show');
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
            UI.showToast('Semua data dihapus', 'info');
            switchTab('dashboard');
        };
        new bootstrap.Modal(modal).show();
    },
    
    /**
     * Import portfolio from CSV
     */
    importPortfolioCSV(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    UI.showToast('File CSV tidak valid', 'danger');
                    return;
                }
                
                // Parse headers
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                
                // Parse data rows
                const portfolio = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                    
                    // Find column indices
                    const getIndex = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
                    
                    const codeIdx = getIndex('Kode');
                    const lotIdx = getIndex('Lot');
                    const buyPriceIdx = getIndex('HargaBeli');
                    const nameIdx = getIndex('Nama');
                    const buyDateIdx = getIndex('TanggalBeli');
                    const noteIdx = getIndex('Catatan');
                    
                    if (codeIdx === -1 || lotIdx === -1 || buyPriceIdx === -1) {
                        console.warn('Skipping row:', lines[i]);
                        continue;
                    }
                    
                    const code = values[codeIdx];
                    const lot = parseInt(values[lotIdx]) || 0;
                    const buyPrice = parseFloat(values[buyPriceIdx]) || 0;
                    
                    if (!code || !lot || !buyPrice) continue;
                    
                    const quantity = lot * 100;
                    const totalInvestment = buyPrice * quantity;
                    
                    portfolio.push({
                        id: Date.now() + i,
                        code: code,
                        name: values[nameIdx] || YahooFinance.getStockName(code),
                        lot: lot,
                        quantity: quantity,
                        buyPrice: buyPrice,
                        totalInvestment: totalInvestment,
                        buyDate: values[buyDateIdx] || UI.getCurrentDate(),
                        note: values[noteIdx] || '',
                        currentPrice: buyPrice,
                        currentValue: totalInvestment,
                        profitLoss: 0,
                        pctChange: 0,
                        createdAt: new Date().toISOString()
                    });
                }
                
                if (portfolio.length === 0) {
                    UI.showToast('Tidak ada data valid dalam file CSV', 'warning');
                    return;
                }
                
                // Merge with existing portfolio
                const existing = Storage.getPortfolio();
                const merged = [...existing, ...portfolio];
                
                Storage.setPortfolio(merged);
                state.portfolio = merged;
                
                UI.showToast(`${portfolio.length} saham berhasil diimport!`, 'success');
                switchTab('portfolio');
                
            } catch (error) {
                console.error('Import error:', error);
                UI.showToast('Gagal import: ' + error.message, 'danger');
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        fileInput.value = '';
    }
};

// ========================================
// Main App Functions (Global Scope)
// ========================================

/**
 * Switch tab
 */
function switchTab(tabId) {
    state.currentTab = tabId;
    
    // Update button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // Show loading
    UI.showLoading();
    
    // Render tab content
    renderTabContent(tabId);
    
    // Hide loading after a short delay
    setTimeout(UI.hideLoading, 100);
}

/**
 * Render tab content
 */
function renderTabContent(tabId) {
    switch(tabId) {
        case 'dashboard':
            DashboardTab.render();
            break;
        case 'portfolio':
            PortfolioTab.render();
            break;
        case 'journal':
            JournalTab.render();
            break;
        case 'settings':
            SettingsTab.render();
            break;
        default:
            DashboardTab.render();
    }
}

/**
 * Search stock
 */
async function searchStock() {
    await DashboardTab.searchStock();
}

/**
 * Add stock to portfolio
 */
async function addStockToPortfolio(e) {
    await PortfolioTab.addStock(e);
}

/**
 * Clear portfolio form
 */
function clearPortfolioForm() {
    PortfolioTab.clearPortfolioForm();
}

/**
 * Remove stock from portfolio
 */
function removeStock(index) {
    PortfolioTab.removeStock(index);
}

/**
 * Edit stock
 */
function editStock(index) {
    PortfolioTab.editStock(index);
}

/**
 * Show stock chart
 */
function showStockChart(index) {
    PortfolioTab.showStockChart(index);
}

/**
 * Add journal entry
 */
function addJournalEntry(e) {
    JournalTab.addJournal(e);
}

/**
 * Remove journal entry
 */
function removeJournal(index) {
    JournalTab.removeJournal(index);
}

/**
 * Export portfolio CSV
 */
function exportPortfolioCSV() {
    PortfolioTab.exportPortfolioCSV();
}

/**
 * Export journal CSV
 */
function exportJournalCSV() {
    JournalTab.exportJournalCSV();
}

/**
 * Import portfolio CSV
 */
function importPortfolioCSV(fileInput) {
    SettingsTab.importPortfolioCSV(fileInput);
}

/**
 * Confirm delete all portfolio
 */
function confirmDeleteAllPortfolio() {
    PortfolioTab.confirmDeleteAllPortfolio();
}

/**
 * Confirm delete all journal
 */
function confirmDeleteAllJournal() {
    JournalTab.confirmDeleteAllJournal();
}

/**
 * Sync to Google Sheet
 */
async function syncToGoogleSheet() {
    await PortfolioTab.syncToGoogleSheet();
    await JournalTab.syncJournalToGoogleSheet();
}

/**
 * Sync journal to Google Sheet
 */
async function syncJournalToGoogleSheet() {
    JournalTab.syncJournalToGoogleSheet();
}

/**
 * Test Google Sheet connection
 */
async function testGoogleSheetConnection() {
    SettingsTab.testGoogleSheetConnection();
}

/**
 * Save settings
 */
function saveSettings() {
    SettingsTab.saveSettings();
}

/**
 * Confirm clear all data
 */
function confirmClearAllData() {
    SettingsTab.confirmClearAllData();
}

/**
 * Update IHSG chart
 */
async function updateIHSGChart(range) {
    await ChartManager.updateIHSGChart(range);
}

/**
 * Show disclaimer
 */
function showDisclaimer() {
    UI.showToast('Aplikasi ini untuk edukasi. Bukan saran investasi.', 'warning');
}

/**
 * Populate from search
 */
function populateFromSearch() {
    PortfolioTab.populateFromSearch();
}

/**
 * Add to portfolio from search
 */
function addToPortfolioFromSearch() {
    DashboardTab.addToPortfolioFromSearch();
}

// ========================================
// Initialization
// ========================================

// Load settings from storage
document.addEventListener('DOMContentLoaded', () => {
    state.settings = Storage.getSettings();
    state.portfolio = Storage.getPortfolio();
    state.journal = Storage.getJournal();
});
