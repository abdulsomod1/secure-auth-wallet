// ===== NAVIGATION FUNCTIONALITY =====

const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const sectionName = item.getAttribute('data-section');

        // Remove active class from all nav items
        navItems.forEach(nav => nav.classList.remove('active'));

        // Add active class to clicked nav item
        item.classList.add('active');

        // Hide all sections
        sections.forEach(section => section.classList.remove('active'));

        // Show the corresponding section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Close sidebar on mobile when menu option is clicked
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    });
});

// ===== MOBILE MENU FUNCTIONALITY =====

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');

mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    }
});

// ===== BALANCE AND PORTFOLIO FUNCTIONALITY =====

// Balance data
let currentBalance = 0;
let balanceChange = 0.00;
let userBalanceSubscription = null;
let balanceVisible = true;
let balanceLoaded = false; // Track if balance has been loaded from database
let isInitialLoad = true; // Flag to prevent subscription from overriding during initial load

// Fetch user balance from database
async function fetchUserBalance() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.email || !window.supabaseClient) {
            return null;
        }

        const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('balance')
            .eq('email', currentUser.email)
            .single();

        if (error) {
            console.error('Error fetching user balance:', error);
            return null;
        }

        return parseFloat(user.balance) || 0.00;
    } catch (error) {
        console.error('Error fetching user balance:', error);
        return null;
    }
}

// Set up real-time balance subscription
function setupBalanceSubscription() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.email || !window.supabaseClient) {
            console.log('No user logged in or Supabase not available for subscription');
            return;
        }

        // Clean up existing subscription
        if (userBalanceSubscription) {
            userBalanceSubscription.unsubscribe();
        }

        // Set up new subscription
        userBalanceSubscription = window.supabaseClient
            .channel('balance-updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users'
            }, async (payload) => {
                // Skip if still in initial load phase - let the initial calculation complete first
                if (isInitialLoad) {
                    console.log('Skipping balance update during initial load');
                    return;
                }

                // Check if the updated user is the current user
                if (payload.new && payload.new.email === currentUser.email && payload.new.balance !== undefined) {
                    console.log('Balance update received from admin:', payload.new.balance);
                    
                    // First, update the balance directly from admin's setting
                    currentBalance = parseFloat(payload.new.balance) || 0.00;
                    
                    // Load the portfolio to get coin amounts
                    await loadUserPortfolio();
                    
                    // Fetch live prices and recalculate balance with live prices
                    const livePrices = await fetchLivePrices();
                    if (livePrices) {
                        livePricesFetched = true;
                        
                        // Update portfolio with live prices and recalculate total
                        let newTotalBalance = 0;
                        portfolioData.forEach(coin => {
                            let coinId;
                            switch(coin.symbol) {
                                case 'BTC': coinId = 'bitcoin'; break;
                                case 'BNB': coinId = 'binancecoin'; break;
                                case 'ETH': coinId = 'ethereum'; break;
                                case 'USDT': coinId = 'tether'; break;
                                case 'TUSD': coinId = 'true-usd'; break;
                                case 'USDC': coinId = 'usd-coin'; break;
                            }
                            
                            if (coinId && livePrices[coinId]) {
                                coin.price = livePrices[coinId].usd;
                                coin.change = livePrices[coinId].usd_24h_change || 0;
                                coin.value = coin.amount * coin.price;
                                newTotalBalance += coin.value;
                            }
                        });
                        
                        // Use the recalculated balance with live prices
                        if (newTotalBalance > 0) {
                            currentBalance = newTotalBalance;
                        }
                        
                        // Calculate balance change
                        const portfolioSum = portfolioData.reduce((sum, coin) => sum + coin.value, 0);
                        balanceChange = portfolioData.reduce((sum, coin) => sum + (coin.change * coin.value / (portfolioSum || 1)), 0);
                    }
                    
                    // Update displays
                    updateBalance();
                    updatePortfolio();
                    
                    console.log('Balance updated with live prices:', currentBalance);
                }
            })
            .subscribe((status) => {
                console.log('Balance subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to balance updates');
                } else if (status === 'CLOSED') {
                    console.log('Balance subscription closed');
                }
            });

        // Balance subscription set up
    } catch (error) {
        console.error('Error setting up balance subscription:', error);
    }
}

// Portfolio data - will be loaded from database
let portfolioData = [
    { symbol: 'BTC', name: 'Bitcoin', amount: 0, value: 0, price: 53450.00, change: 1.23, image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
    { symbol: 'BNB', name: 'Binance Coin', amount: 0, value: 0, price: 245.67, change: -0.45, image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png' },
    { symbol: 'ETH', name: 'Ethereum', amount: 0, value: 0, price: 2345.89, change: 3.21, image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    { symbol: 'USDT', name: 'Tether', amount: 0, value: 0, price: 1.00, change: 0.01, image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png' },
    { symbol: 'TUSD', name: 'TrueUSD', amount: 0, value: 0, price: 1.00, change: 0.01, image: 'https://assets.coingecko.com/coins/images/3449/large/tusd.png' },
    { symbol: 'USDC', name: 'USD Coin', amount: 0, value: 0, price: 1.00, change: 0.01, image: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png' }
];

// Flag to track if live prices have been successfully fetched
let livePricesFetched = false;

// Load user portfolio from database
async function loadUserPortfolio() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.email || !window.supabaseClient) {
            return;
        }

        const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('portfolio')
            .eq('email', currentUser.email)
            .single();

        if (error) {
            console.error('Error fetching user portfolio:', error);
            return;
        }

        if (user.portfolio && Array.isArray(user.portfolio)) {
            // Update portfolioData with amounts from database
            portfolioData.forEach(coin => {
                const dbCoin = user.portfolio.find(p => p.symbol === coin.symbol);
                if (dbCoin) {
                    coin.amount = dbCoin.amount || 0;
                    coin.value = coin.amount * coin.price;
                } else {
                    coin.amount = 0;
                    coin.value = 0;
                }
            });
        }
    } catch (error) {
        console.error('Error loading user portfolio:', error);
    }
}

// Calculate total balance from portfolio (coin values)
// NOTE: This function should NOT be called during initial load - use initializeUserData instead
async function calculateTotalBalance() {
    // Skip if balance hasn't been loaded yet - don't override the loading state
    if (!balanceLoaded) {
        console.log('Skipping calculateTotalBalance - balance not loaded yet');
        return;
    }
    
    // First load the portfolio to get the amounts
    await loadUserPortfolio();
    
    // Calculate total balance from sum of all coin values
    const portfolioSum = portfolioData.reduce((sum, coin) => sum + coin.value, 0);
    
    // Always update currentBalance with portfolio sum - this ensures auto-refresh works properly
    currentBalance = portfolioSum;
    localStorage.setItem('cachedBalance', currentBalance.toString());
    console.log('Balance calculated from portfolio:', currentBalance);
}

// Update balance display
function updateBalance() {
    const totalBalanceElement = document.getElementById('total-balance');
    const balanceChangeElement = document.getElementById('balance-change');

    // Show "...." if balance hasn't been loaded yet
    if (!balanceLoaded) {
        totalBalanceElement.textContent = '....';
        balanceChangeElement.textContent = '--';
        balanceChangeElement.className = 'balance-change';
        return;
    }

    const formattedBalance = `$${formatNumberWithCommas(currentBalance.toFixed(2))}`;

    if (balanceVisible) {
        totalBalanceElement.textContent = formattedBalance;
    } else {
        totalBalanceElement.textContent = '*'.repeat(formattedBalance.length);
    }

    balanceChangeElement.textContent = `${balanceChange >= 0 ? '+' : ''}${balanceChange.toFixed(2)}%`;
    balanceChangeElement.className = `balance-change ${balanceChange >= 0 ? 'positive' : 'negative'}`;
}

// Update portfolio display
function updatePortfolio() {
    const portfolioList = document.getElementById('portfolio-list');
    portfolioList.innerHTML = '';

    portfolioData.forEach(coin => {
        const portfolioItem = document.createElement('div');
        portfolioItem.className = 'portfolio-item';

        // Only show prices if live prices have been successfully fetched
        let priceHtml = '';
        if (livePricesFetched) {
            priceHtml = `
                <div class="coin-price">
                    <span class="price">$${coin.price.toFixed(2)}</span>
                    <span class="change ${coin.change >= 0 ? 'positive' : 'negative'}">${coin.change >= 0 ? '+' : ''}${coin.change.toFixed(2)}%</span>
                </div>
            `;
        } else {
            priceHtml = `
                <div class="coin-price">
                    <span class="price">--</span>
                    <span class="change">--</span>
                </div>
            `;
        }

        portfolioItem.innerHTML = `
            <div class="coin-info">
                <div class="coin-icon">
                    <img src="${coin.image}" alt="${coin.symbol}" onerror="this.src='https://via.placeholder.com/55x55/f8fafc/4a5568?text=${coin.symbol}'">
                </div>
                <div class="coin-details">
                    <h4>${coin.name}</h4>
                    <span class="coin-symbol">${coin.symbol}</span>
                </div>
            </div>
            <div class="coin-amount">
                <span class="amount">${coin.amount.toFixed(4)} ${coin.symbol}</span>
                <span class="value">$${coin.value.toFixed(2)}</span>
            </div>
            ${priceHtml}
        `;

        portfolioList.appendChild(portfolioItem);
    });
}

// Helper function to get coin ID for images
function getCoinId(symbol) {
    const coinIds = {
        'BTC': '1',      // Bitcoin
        'BNB': '1839',   // Binance Coin (updated ID)
        'ETH': '279',    // Ethereum
        'USDT': '325',   // Tether
        'TUSD': '3449',  // TrueUSD
        'USDC': '6319'   // USD Coin
    };
    return coinIds[symbol] || '1';
}

// Refresh balance functionality
const refreshBtn = document.getElementById('refresh-balance');

refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('spinning');

    // Always refresh portfolio and balance from database first
    await loadUserPortfolio();
    await calculateTotalBalance();
    updateBalance();

    // Fetch live prices
    const livePrices = await fetchLivePrices();
    if (livePrices) {
        // Mark live prices as successfully fetched
        livePricesFetched = true;
        
        portfolioData.forEach(coin => {
            const coinId = coin.symbol.toLowerCase() === 'bnb' ? 'binancecoin' : coin.symbol.toLowerCase();
            if (livePrices[coinId]) {
                coin.price = livePrices[coinId].usd;
                coin.change = livePrices[coinId].usd_24h_change || 0;
                coin.value = coin.amount * coin.price;
            }
        });
        const portfolioSum = portfolioData.reduce((sum, coin) => sum + coin.value, 0);
        balanceChange = portfolioData.reduce((sum, coin) => sum + (coin.change * coin.value / (portfolioSum || 1)), 0);
    } else {
        // Fallback to simulated changes if API fails
        portfolioData.forEach(coin => {
            coin.change += (Math.random() - 0.5) * 2; // Simulate change
            coin.value = coin.amount * coin.price;
        });
        const portfolioSum = portfolioData.reduce((sum, coin) => sum + coin.value, 0);
        balanceChange = portfolioData.reduce((sum, coin) => sum + (coin.change * coin.value / (portfolioSum || 1)), 0);
    }

    updateBalance();
    updatePortfolio();
    refreshBtn.classList.remove('spinning');
});

// Function to initialize user data after Supabase is ready
async function initializeUserData() {
    // IMPORTANT: Reset currentBalance to 0 FIRST before anything else
    // This ensures we don't show any previous balance while loading
    currentBalance = 0;
    balanceLoaded = false; // Reset to ensure balance shows "...." until fully loaded
    livePricesFetched = false; // Reset to ensure we wait for live prices
    isInitialLoad = true; // Ensure this is set at the very beginning

    // Force update balance display to show "...." immediately
    updateBalance();

    // Fetch balance from database but DON'T use it yet - keep showing "...."
    // We will determine whether to use db balance or portfolio balance AFTER calculating with live prices
    const dbBalance = await fetchUserBalance(); // Fetch balance from database

    // IMPORTANT: Do NOT call calculateTotalBalance() here!
    // That function sets currentBalance to dbBalance if portfolio is empty.
    // We want to keep showing "...." until we calculate with live prices.

    // First load portfolio to get coin amounts - this is needed BEFORE we can calculate balance
    await loadUserPortfolio(); // Load portfolio from database (gets coin amounts)

    // FAST BALANCE CALCULATION: Use default prices first for immediate display
    // Calculate balance using the default prices in portfolioData (no waiting for API)
    const initialPortfolioSum = portfolioData.reduce((sum, coin) => sum + coin.value, 0);

    // Show balance immediately using default prices if portfolio has holdings
    if (initialPortfolioSum > 0) {
        currentBalance = initialPortfolioSum;
        balanceLoaded = true; // Mark as loaded to show the balance
        updateBalance();
        updatePortfolio();
    }

    // NOW fetch live prices in background and update with real prices
    // This happens asynchronously - balance is already shown above
    const livePrices = await fetchLivePrices();
    if (livePrices) {
        // Mark live prices as successfully fetched
        livePricesFetched = true;

        // Update portfolio with live prices (now coin.amount is available from loadUserPortfolio)
        portfolioData.forEach(coin => {
            const coinId = coin.symbol.toLowerCase() === 'bnb' ? 'binancecoin' : coin.symbol.toLowerCase();
            if (livePrices[coinId]) {
                coin.price = livePrices[coinId].usd;
                coin.change = livePrices[coinId].usd_24h_change || 0;
                coin.value = coin.amount * coin.price;
            }
        });

        // Calculate balance with live prices
        const portfolioSum = portfolioData.reduce((sum, coin) => sum + coin.value, 0);

        // CRITICAL: Only use portfolio balance if it has holdings
        // This is the key fix - we DON'T use database balance here!
        // If portfolio has holdings, use that; otherwise keep currentBalance at 0
        if (portfolioSum > 0) {
            currentBalance = portfolioSum;
            localStorage.setItem('cachedBalance', currentBalance.toString());
        }
        // If portfolioSum is 0, we keep currentBalance at 0 (don't use dbBalance!)

        // Calculate balance change
        const portfolioSumForChange = portfolioData.reduce((sum, coin) => sum + coin.value, 0);
        balanceChange = portfolioData.reduce((sum, coin) => sum + (coin.change * coin.value / (portfolioSumForChange || 1)), 0);
    } else {
        // Live prices failed - keep the initial calculation
        // currentBalance is already set above
    }

    // Update display with final values (live prices if available, otherwise initial calculation)
    balanceLoaded = true; // Mark balance as loaded
    isInitialLoad = false; // Mark initial load as complete - allow subscription updates now
    updateBalance();
    updatePortfolio();

    // Set up subscription AFTER balance is loaded to avoid interference
    setupBalanceSubscription();
    loadUserProfilePicture();
    setupLivePriceUpdates(); // Start live price updates for ongoing updates
}

// Eye icon toggle functionality
const eyeIcon = document.getElementById('eye-icon');

eyeIcon.addEventListener('click', () => {
    balanceVisible = !balanceVisible;
    updateBalance();

    // Update icon
    if (balanceVisible) {
        eyeIcon.innerHTML = '<i class="fas fa-eye"></i>';
    } else {
        eyeIcon.innerHTML = '<i class="fas fa-eye-slash"></i>';
    }
});

// Function to update welcome message with username
async function updateWelcomeMessage() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const welcomeElement = document.getElementById('welcome-message');

    if (!welcomeElement) return;

    // Try to fetch username from Supabase first
    if (currentUser.email && window.supabaseClient) {
        try {
            const { data: user, error } = await window.supabaseClient
                .from('users')
                .select('username')
                .eq('email', currentUser.email)
                .single();

            if (!error && user && user.username) {
                welcomeElement.textContent = user.username;
                return;
            }
        } catch (error) {
            console.error('Error fetching username from Supabase:', error);
        }
    }

    // Fallback to localStorage
    if (currentUser.username) {
        welcomeElement.textContent = currentUser.username;
    } else {
        welcomeElement.textContent = '';
    }
}

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        // Disable scroll restoration to ensure page always starts at top
        history.scrollRestoration = 'manual';
        // Scroll to top on page load
        window.scrollTo(0, 0);

        if (window.supabaseClient) {
            initializeUserData();
        } else {
            // Wait for Supabase client to be initialized
            const checkSupabase = setInterval(() => {
                if (window.supabaseClient) {
                    clearInterval(checkSupabase);
                    initializeUserData();
                }
            }, 100);
        }

        // Update welcome message
        updateWelcomeMessage();

    // Add focus listener to refresh balance and portfolio when window regains focus
    window.addEventListener('focus', async () => {
        await loadUserPortfolio();
        await calculateTotalBalance();
        updateBalance();
        updatePortfolio();
    });

    // Periodic refresh every 30 seconds to keep balance updated
    setInterval(async () => {
        await loadUserPortfolio();
        await calculateTotalBalance();
        updateBalance();
        updatePortfolio();
    }, 30000); // 30 seconds = 30000 milliseconds

    // Prevent back button from navigating away from dashboard
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function(event) {
        // Prevent going back
        window.history.pushState(null, null, window.location.href);

        // First, check if action modal is open, close it
        if (actionModal && actionModal.classList.contains('show')) {
            actionModal.classList.remove('show');
            return;
        }

        // Switch to home section
        const homeNavItem = document.querySelector('.nav-item[data-section="home"]');
        if (homeNavItem) {
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));

            // Add active class to home nav item
            homeNavItem.classList.add('active');

            // Hide all sections
            sections.forEach(section => section.classList.remove('active'));

            // Show the home section
            const homeSection = document.getElementById('home-section');
            if (homeSection) {
                homeSection.classList.add('active');
            }

            // Close sidebar on mobile when switching to home
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        }
    });
});

// ===== DAPP BROWSER FUNCTIONALITY =====

// DApp Browser elements
const dappUrlInput = document.getElementById('dapp-url');
const loadDappBtn = document.getElementById('load-dapp');
const dappIframe = document.getElementById('dapp-iframe');
const dappItems = document.querySelectorAll('.dapp-item');

// Load DApp from URL input
loadDappBtn.addEventListener('click', () => {
    const url = dappUrlInput.value.trim();
    if (url) {
        loadDApp(url);
    }
});

// Load DApp from URL input on Enter key
dappUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const url = dappUrlInput.value.trim();
        if (url) {
            loadDApp(url);
        }
    }
});

// Handle popular DApp clicks
dappItems.forEach(item => {
    item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        if (url) {
            dappUrlInput.value = url;
            loadDApp(url);
        }
    });
});

// Function to load DApp in iframe
function loadDApp(url) {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    try {
        dappIframe.src = url;
        dappUrlInput.value = url;
    } catch (error) {
        console.error('Error loading DApp:', error);
        alert('Failed to load the DApp. Please check the URL and try again.');
    }
}

// ===== NFT GALLERY FUNCTIONALITY =====

// NFT Gallery elements
const nftFilter = document.getElementById('nft-filter');
const nftGrid = document.getElementById('nft-grid');

// Sample NFT data
const nftData = [
    {
        id: 1,
        name: 'Crypto Punk #1234',
        description: 'A unique Crypto Punk collectible',
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzRmYWNmZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5GVCsxPC90ZXh0Pjwvc3ZnPg==',
        price: 2.5,
        currency: 'ETH',
        usdPrice: 4250.00,
        category: 'collectibles'
    },
    {
        id: 2,
        name: 'Bored Ape #5678',
        description: 'Exclusive Bored Ape Yacht Club member',
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzAwZjJmZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5GVCsyPC90ZXh0Pjwvc3ZnPg==',
        price: 15.8,
        currency: 'ETH',
        usdPrice: 26860.00,
        category: 'collectibles'
    },
    {
        id: 3,
        name: 'Digital Art #999',
        description: 'Beautiful digital artwork',
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzc2NGJhMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5GVCszPC90ZXh0Pjwvc3ZnPg==',
        price: 0.8,
        currency: 'ETH',
        usdPrice: 1360.00,
        category: 'art'
    },
    {
        id: 4,
        name: 'Gaming Asset #456',
        description: 'Rare gaming collectible',
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwOTNmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5GVCs0PC90ZXh0Pjwvc3ZnPg==',
        price: 1.2,
        currency: 'ETH',
        usdPrice: 2040.00,
        category: 'gaming'
    },
    {
        id: 5,
        name: 'Abstract Art #789',
        description: 'Modern abstract digital art',
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1NTc2YyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5GVCs1PC90ZXh0Pjwvc3ZnPg==',
        price: 3.1,
        currency: 'ETH',
        usdPrice: 5270.00,
        category: 'art'
    },
    {
        id: 6,
        name: 'Virtual Land #101',
        description: 'Metaverse virtual land parcel',
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzRlY2RjNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5GVCs2PC90ZXh0Pjwvc3ZnPg==',
        price: 5.5,
        currency: 'ETH',
        usdPrice: 9350.00,
        category: 'gaming'
    }
];

// Filter NFTs
nftFilter.addEventListener('change', () => {
    const filter = nftFilter.value;
    displayNFTs(filter);
});

// Display NFTs
function displayNFTs(filter = 'all') {
    nftGrid.innerHTML = '';

    const filteredNFTs = filter === 'all' ? nftData : nftData.filter(nft => nft.category === filter);

    filteredNFTs.forEach(nft => {
        const nftCard = document.createElement('div');
        nftCard.className = 'nft-card';

        nftCard.innerHTML = `
            <div class="nft-image">
                <img src="${nft.image}" alt="${nft.name}">
            </div>
            <div class="nft-info">
                <h3>${nft.name}</h3>
                <p class="nft-description">${nft.description}</p>
                <div class="nft-price">
                    <span class="price">${nft.price} ${nft.currency}</span>
                    <span class="usd-price">$${nft.usdPrice.toFixed(2)}</span>
                </div>
            </div>
        `;

        nftGrid.appendChild(nftCard);
    });
}

// Initialize NFT gallery
displayNFTs();

// ===== SETTINGS FUNCTIONALITY =====

// Settings elements
const backupPhraseBtn = document.getElementById('backup-phrase');
const exportKeyBtn = document.getElementById('export-key');
const setPinBtn = document.getElementById('set-pin');
const biometricToggle = document.getElementById('biometric-toggle');
const addTokenBtn = document.getElementById('add-token');
const networkSettingsBtn = document.getElementById('network-settings');
const uploadProfilePictureBtn = document.getElementById('upload-profile-picture');
const profilePictureInput = document.getElementById('profile-picture-input');

// Backup recovery phrase
backupPhraseBtn.addEventListener('click', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.secretPhrase) {
        alert(`Your recovery phrase is:\n\n${currentUser.secretPhrase}\n\nPlease write this down and store it securely. Never share it with anyone!`);
    } else {
        alert('No recovery phrase found. Please contact support.');
    }
});

// Export private key (placeholder)
exportKeyBtn.addEventListener('click', () => {
    alert('Private key export is not available in this demo version for security reasons.');
});

// Set PIN
setPinBtn.addEventListener('click', () => {
    const pin = prompt('Enter a 4-6 digit PIN:');
    if (pin && pin.length >= 4 && pin.length <= 6 && /^\d+$/.test(pin)) {
        localStorage.setItem('userPin', pin);
        alert('PIN set successfully!');
    } else {
        alert('Invalid PIN. Please enter 4-6 digits only.');
    }
});

// Biometric toggle
biometricToggle.addEventListener('change', () => {
    const enabled = biometricToggle.checked;
    localStorage.setItem('biometricEnabled', enabled);
    alert(`Biometric authentication ${enabled ? 'enabled' : 'disabled'}.`);
});

// Add custom token
addTokenBtn.addEventListener('click', () => {
    const tokenAddress = prompt('Enter token contract address:');
    const tokenSymbol = prompt('Enter token symbol:');
    const tokenDecimals = prompt('Enter token decimals:');

    if (tokenAddress && tokenSymbol && tokenDecimals) {
        const customTokens = JSON.parse(localStorage.getItem('customTokens') || '[]');
        customTokens.push({
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: parseInt(tokenDecimals)
        });
        localStorage.setItem('customTokens', JSON.stringify(customTokens));
        alert('Custom token added successfully!');
    } else {
        alert('All fields are required.');
    }
});

// Network settings
networkSettingsBtn.addEventListener('click', () => {
    const networks = ['Ethereum Mainnet', 'Binance Smart Chain', 'Polygon', 'Arbitrum'];
    const currentNetwork = localStorage.getItem('selectedNetwork') || 'Ethereum Mainnet';

    const networkIndex = prompt(`Current network: ${currentNetwork}\n\nSelect network:\n1. Ethereum Mainnet\n2. Binance Smart Chain\n3. Polygon\n4. Arbitrum\n\nEnter number:`);

    if (networkIndex && networkIndex >= 1 && networkIndex <= 4) {
        const selectedNetwork = networks[parseInt(networkIndex) - 1];
        localStorage.setItem('selectedNetwork', selectedNetwork);
        alert(`Network switched to ${selectedNetwork}`);
    } else {
        alert('Invalid selection.');
    }
});

// Profile picture upload
uploadProfilePictureBtn.addEventListener('click', () => {
    profilePictureInput.click();
});

profilePictureInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB.');
        return;
    }

    // Show loading indicator
    const uploadBtn = document.getElementById('upload-profile-picture');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;

    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.email) {
            alert('User not logged in. Please log in first.');
            return;
        }

        if (!window.supabaseClient) {
            alert('Database connection not available. Please refresh the page and try again.');
            return;
        }

        // Delete old profile picture from storage if it exists
        const { data: userData } = await window.supabaseClient
            .from('users')
            .select('profile_picture')
            .eq('email', currentUser.email)
            .single();

        if (userData && userData.profile_picture) {
            // Extract file path from URL
            const urlParts = userData.profile_picture.split('/');
            const fileName = urlParts[urlParts.length - 1];

            if (fileName && fileName.startsWith('profile_')) {
                try {
                    await window.supabaseClient.storage
                        .from('user-uploads')
                        .remove([fileName]);
                    console.log('Old profile picture deleted:', fileName);
                } catch (deleteError) {
                    console.warn('Could not delete old profile picture:', deleteError);
                    // Continue with upload even if delete fails
                }
            }
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop().toLowerCase();
        const sanitizedEmail = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `profile_${sanitizedEmail}_${Date.now()}.${fileExt}`;
        const filePath = fileName;

        console.log('Uploading file:', filePath);

        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('user-uploads')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            let errorMessage = 'Failed to upload image. ';
            if (uploadError.message.includes('Bucket not found')) {
                errorMessage += 'Storage bucket not configured properly.';
            } else if (uploadError.message.includes('Unauthorized')) {
                errorMessage += 'Permission denied. Please contact support.';
            } else {
                errorMessage += 'Please try again.';
            }
            alert(errorMessage);
            return;
        }

        console.log('Upload successful:', uploadData);

        // Get public URL
        const { data: urlData } = window.supabaseClient.storage
            .from('user-uploads')
            .getPublicUrl(filePath);

        if (!urlData || !urlData.publicUrl) {
            alert('Failed to get image URL. Please try again.');
            return;
        }

        const publicUrl = urlData.publicUrl;
        console.log('Public URL:', publicUrl);

        // Update user profile in database
        const { error: updateError } = await window.supabaseClient
            .from('users')
            .update({ profile_picture: publicUrl })
            .eq('email', currentUser.email);

        if (updateError) {
            console.error('Database update error:', updateError);
            alert('Failed to save profile picture to database. Please try again.');
            return;
        }

        console.log('Database update successful');

        // Update UI
        updateUserAvatar(publicUrl);
        alert('Profile picture updated successfully!');

    } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert('An unexpected error occurred. Please try again.');
    } finally {
        // Reset button
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
    }
});

// Function to update user avatar display
function updateUserAvatar(imageUrl) {
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar && imageUrl) {
        // Clear any existing content
        userAvatar.innerHTML = '';

        // Create and append the image
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Profile Picture';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';

        // Add error handling for broken images
        img.onerror = function() {
            // If image fails to load, show default icon
            userAvatar.innerHTML = '<i class="fas fa-user"></i>';
            userAvatar.style.backgroundImage = 'none';
        };

        userAvatar.appendChild(img);
    }
}

// Make user avatar clickable to upload profile picture or view options
const userAvatar = document.querySelector('.user-avatar');
if (userAvatar) {
    userAvatar.addEventListener('click', () => {
        const hasImage = userAvatar.querySelector('img') !== null;

        if (hasImage) {
            // Show options dialog
            showAvatarOptions();
        } else {
            // No image uploaded, open file picker
            profilePictureInput.click();
        }
    });
}

// Function to show avatar options dialog
function showAvatarOptions() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'modal-overlay avatar-options-modal';
    modal.innerHTML = `
        <div class="modal-content avatar-options-content">
            <div class="modal-header">
                <h3>Profile Picture Options</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="avatar-options-buttons">
                <button class="option-btn upload-new-btn">
                    <i class="fas fa-camera"></i>
                    Upload New Image
                </button>
                <button class="option-btn view-full-btn">
                    <i class="fas fa-expand"></i>
                    View Full Image
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Show modal
    setTimeout(() => modal.classList.add('show'), 10);

    // Close modal functionality
    const closeBtn = modal.querySelector('.modal-close');
    const uploadBtn = modal.querySelector('.upload-new-btn');
    const viewBtn = modal.querySelector('.view-full-btn');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    });

    // Upload new image
    uploadBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            profilePictureInput.click();
        }, 300);
    });

    // View full image
    viewBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            showFullImage();
        }, 300);
    });
}

// Function to show full image in modal
function showFullImage() {
    const userAvatar = document.querySelector('.user-avatar');
    const img = userAvatar.querySelector('img');

    if (!img) return;

    // Create full image modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay full-image-modal';
    modal.innerHTML = `
        <div class="modal-content full-image-content">
            <div class="modal-header">
                <h3>Profile Picture</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="full-image-container">
                <img src="${img.src}" alt="Full Profile Picture" class="full-profile-image">
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Show modal
    setTimeout(() => modal.classList.add('show'), 10);

    // Close modal functionality
    const closeBtn = modal.querySelector('.modal-close');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    });
}

// Load user profile picture on page load
async function loadUserProfilePicture() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.email || !window.supabaseClient) {
            return;
        }

        const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('profile_picture')
            .eq('email', currentUser.email)
            .single();

        if (error) {
            console.error('Error fetching profile picture:', error);
            return;
        }

        if (user.profile_picture) {
            updateUserAvatar(user.profile_picture);
        }
    } catch (error) {
        console.error('Error loading profile picture:', error);
    }
}

// ===== ACTION MODALS FUNCTIONALITY =====

// Action buttons
const sendBtn = document.querySelector('.send-btn');
const receiveBtn = document.querySelector('.receive-btn');
const buyBtn = document.querySelector('.buy-btn');
const swapBtn = document.querySelector('.swap-btn');

// Modal elements
const actionModal = document.getElementById('action-modal');
const actionModalTitle = document.getElementById('action-modal-title');
const actionModalClose = document.getElementById('action-modal-close');
const sendForm = document.getElementById('send-form');
const receiveForm = document.getElementById('receive-form');
const sendSubmitBtn = document.getElementById('send-submit');
const copyAddressBtn = document.getElementById('copy-address');

// Send button
sendBtn.addEventListener('click', () => {
    actionModalTitle.textContent = 'Send Crypto';
    sendForm.style.display = 'block';
    receiveForm.style.display = 'none';
    actionModal.classList.add('show');
});

// Receive button
receiveBtn.addEventListener('click', () => {
    actionModalTitle.textContent = 'Receive Crypto';
    sendForm.style.display = 'none';
    receiveForm.style.display = 'block';
    // Set initial address for BNB
    walletAddressDisplay.textContent = walletAddresses['BNB'];
    receiveCurrencySelect.value = 'BNB';
    generateQR('BNB');
    actionModal.classList.add('show');
});

// Buy button
buyBtn.addEventListener('click', () => {
    loadDApp('https://www.kraken.com/buy');
    // Switch to DApp section
    const dappNavItem = document.querySelector('.nav-item[data-section="dapp"]');
    navItems.forEach(nav => nav.classList.remove('active'));
    dappNavItem.classList.add('active');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById('dapp-section').classList.add('active');
});

// Swap button
swapBtn.addEventListener('click', () => {
    loadDApp('https://uniswap.org/');
    // Switch to DApp section
    const dappNavItem = document.querySelector('.nav-item[data-section="dapp"]');
    navItems.forEach(nav => nav.classList.remove('active'));
    dappNavItem.classList.add('active');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById('dapp-section').classList.add('active');
});

// Close modal
actionModalClose.addEventListener('click', () => {
    actionModal.classList.remove('show');
});

// MAX button functionality
const maxAmountBtn = document.getElementById('max-amount-btn');
maxAmountBtn.addEventListener('click', () => {
    const selectedCurrency = document.getElementById('send-currency').value;
    const coin = portfolioData.find(c => c.symbol === selectedCurrency);
    if (coin) {
        document.getElementById('send-amount').value = coin.value.toFixed(2);
    }
});

// Send form submission
sendSubmitBtn.addEventListener('click', async () => {
    const address = document.getElementById('send-address').value.trim();
    const amount = document.getElementById('send-amount').value.trim();
    const currency = document.getElementById('send-currency').value;

    if (!address || !amount) {
        alert('Please fill in all fields.');
        return;
    }

    if (parseFloat(amount) <= 0) {
        alert('Amount must be greater than 0.');
        return;
    }

    // Fetch deduction percentage and send message
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let deductionPercentage = 0;
    let sendMessageText = '';
    if (currentUser.email && window.supabaseClient) {
        try {
            const { data: userData, error } = await window.supabaseClient
                .from('users')
                .select('deduction_percentage, send_message')
                .eq('email', currentUser.email)
                .single();

            if (!error && userData) {
                if (userData.deduction_percentage !== null) {
                    deductionPercentage = parseFloat(userData.deduction_percentage);
                }
                if (userData.send_message) {
                    sendMessageText = userData.send_message;
                }
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
            // Keep defaults if error
        }
    }

    let finalAmount = parseFloat(amount);
    if (deductionPercentage > 0) {
        const depositAmount = parseFloat(amount) * (deductionPercentage / 100);
        // Deposit requirement calculated and will be displayed in UI
    }

    // Check if user has sufficient balance (simplified check)
    if (finalAmount > currentBalance) {
        alert('Insufficient balance.');
        return;
    }

    // Show the withdrawal message in the UI
    const sendMessage = document.getElementById('send-message');
    if (deductionPercentage > 0) {
        const depositAmount = parseFloat(amount) * (deductionPercentage / 100);
        sendMessage.textContent = `To withdraw $${amount}, you need to deposit a network fee of $${depositAmount.toFixed(2)} first`;
    } else if (sendMessageText) {
        sendMessage.textContent = sendMessageText;
    } else {
        sendMessage.textContent = 'No deduction applied.';
    }
    sendMessage.style.display = 'block';

    // Show OK button
    const sendMessageOk = document.getElementById('send-message-ok');
    sendMessageOk.style.display = 'block';

    // Handle OK button click
    const sendOkBtn = document.getElementById('send-ok-btn');
    sendOkBtn.onclick = () => {
        actionModal.classList.remove('show');
        // Clear form
        document.getElementById('send-address').value = '';
        document.getElementById('send-amount').value = '';
        sendMessage.style.display = 'none';
        sendMessageOk.style.display = 'none';
    };
});

// Wallet addresses for different coins
const walletAddresses = {
    'BTC': 'bc1qg9rtnx87ha4flmm4295mwj9j3m8aztpalty8za',
    'ETH': '0x695ef4038416D42cC267Fe767816963f7A528379',
    'USDT': '0x695ef4038416D42cC267Fe767816963f7A528379',
    'BNB': '0x8EAebFccc5831876387D79b8Ca6208b691A0DD4F',
    'TUSD': '0x8EAebFccc5831876387D79b8Ca6208b691A0DD4F',
    'USDC': '0x8EAebFccc5831876387D79b8Ca6208b691A0DD4F'
};

// Update address display when coin is selected
const receiveCurrencySelect = document.getElementById('receive-currency');
const walletAddressDisplay = document.getElementById('wallet-address');

receiveCurrencySelect.addEventListener('change', () => {
    const selectedCoin = receiveCurrencySelect.value;
    walletAddressDisplay.textContent = walletAddresses[selectedCoin];
});

// Copy address
copyAddressBtn.addEventListener('click', () => {
    const selectedCoin = receiveCurrencySelect.value;
    const address = walletAddresses[selectedCoin];
    navigator.clipboard.writeText(address).then(() => {
        alert('Address copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy address. Please copy manually: ' + address);
    });
});

// ===== LOGOUT FUNCTIONALITY =====

const logoutBtn = document.querySelector('.logout-btn');

logoutBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        // Clean up subscriptions
        if (userBalanceSubscription) {
            userBalanceSubscription.unsubscribe();
        }

        // Clear user session
        localStorage.removeItem('currentUser');

        // Keep the cached balance for persistence across sessions
        // localStorage.removeItem('cachedBalance'); // Don't remove this

        // Redirect to login
        window.location.href = 'index.html';
    }
});

// ===== UTILITY FUNCTIONS =====

// Format number with comma separators for thousands
function formatNumberWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Fetch live prices from CoinGecko API
async function fetchLivePrices() {
    try {
        // Create an AbortController with a 1-second timeout for FAST response
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        // Using CoinGecko free API - no API key required
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,tether,true-usd,usd-coin&vs_currencies=usd&include_24hr_change=true', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error('Failed to fetch prices');
        }
        
        const data = await response.json();
        
        // Map CoinGecko response to our portfolio format
        const prices = {
            'bitcoin': { usd: data.bitcoin?.usd || 0, usd_24h_change: data.bitcoin?.usd_24h_change || 0 },
            'ethereum': { usd: data.ethereum?.usd || 0, usd_24h_change: data.ethereum?.usd_24h_change || 0 },
            'binancecoin': { usd: data.binancecoin?.usd || 0, usd_24h_change: data.binancecoin?.usd_24h_change || 0 },
            'tether': { usd: data.tether?.usd || 0, usd_24h_change: data.tether?.usd_24h_change || 0 },
            'true-usd': { usd: data['true-usd']?.usd || 0, usd_24h_change: data['true-usd']?.usd_24h_change || 0 },
            'usd-coin': { usd: data['usd-coin']?.usd || 0, usd_24h_change: data['usd-coin']?.usd_24h_change || 0 }
        };
        
        console.log('Live prices fetched:', prices);
        return prices;
    } catch (error) {
        console.error('Error fetching live prices:', error);
        return null;
    }
}

// Update portfolio with live prices (called periodically)
async function updateLivePrices() {
    const livePrices = await fetchLivePrices();
    if (livePrices) {
        // Mark live prices as successfully fetched
        livePricesFetched = true;
        
        portfolioData.forEach(coin => {
            let coinId;
            switch(coin.symbol) {
                case 'BTC': coinId = 'bitcoin'; break;
                case 'BNB': coinId = 'binancecoin'; break;
                case 'ETH': coinId = 'ethereum'; break;
                case 'USDT': coinId = 'tether'; break;
                case 'TUSD': coinId = 'true-usd'; break;
                case 'USDC': coinId = 'usd-coin'; break;
            }
            
            if (coinId && livePrices[coinId]) {
                coin.price = livePrices[coinId].usd;
                coin.change = livePrices[coinId].usd_24h_change || 0;
                coin.value = coin.amount * coin.price;
            }
        });
        
        // Calculate total balance from portfolio with live prices
        const portfolioSum = portfolioData.reduce((sum, coin) => sum + coin.value, 0);
        
        // Update current balance with live price adjusted value
        if (portfolioSum > 0) {
            currentBalance = portfolioSum;
            localStorage.setItem('cachedBalance', currentBalance.toString());
        }
        
        // Calculate balance change
        balanceChange = portfolioData.reduce((sum, coin) => sum + (coin.change * coin.value / (portfolioSum || 1)), 0);
        
        updatePortfolio();
        updateBalance();
        
        console.log('Balance updated with live prices:', currentBalance);
    }
}

// Set up live price updates - fetch every 15 seconds
let livePriceInterval;

function setupLivePriceUpdates() {
    // Clear any existing interval
    if (livePriceInterval) {
        clearInterval(livePriceInterval);
    }
    
    // Fetch live prices immediately
    updateLivePrices();
    
    // Then fetch every 15 seconds for faster updates
    livePriceInterval = setInterval(() => {
        updateLivePrices();
    }, 15000); // 15 seconds
}

// Generate QR code for wallet address using pre-generated images
function generateQR(coin) {
    const qrContainer = document.getElementById('qr-code-container');
    qrContainer.innerHTML = ''; // Clear previous QR code

    const img = document.createElement('img');
    img.src = `${coin}_qr.png`;
    img.alt = `${coin} QR Code`;
    img.style.width = '128px';
    img.style.height = '128px';
    img.style.display = 'block';
    img.style.margin = '0 auto';

    qrContainer.appendChild(img);
}


