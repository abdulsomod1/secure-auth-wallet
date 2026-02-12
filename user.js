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
let currentBalance = parseFloat(localStorage.getItem('cachedBalance') || '0.00');
let balanceChange = 0.00;
let userBalanceSubscription = null;
let balanceVisible = true;

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
                // Check if the updated user is the current user
                if (payload.new && payload.new.email === currentUser.email && payload.new.balance !== undefined) {
                    // Update balance directly from payload for immediate update
                    currentBalance = parseFloat(payload.new.balance) || 0.00;
                    updateBalance();
                }

                // Reload portfolio in background for consistency
                await loadUserPortfolio();
                await calculateTotalBalance();
                updateBalance();
                updatePortfolio();
            })
            .subscribe((status) => {
                console.log('Balance subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to balance updates');
                } else if (status === 'CLOSED') {
                    console.log('Balance subscription closed');
                }
            })
            .subscribe();

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

// Calculate total balance from database
async function calculateTotalBalance() {
    const dbBalance = await fetchUserBalance();
    if (dbBalance !== null) {
        currentBalance = dbBalance;
        // Always cache the balance when successfully fetched
        localStorage.setItem('cachedBalance', currentBalance.toString());
        console.log('Balance updated from database:', currentBalance);
    } else {
        console.log('Failed to fetch balance from database, keeping current balance:', currentBalance);
    }
    // If fetch fails, keep the current balance to prevent it from disappearing
}

// Update balance display
function updateBalance() {
    const totalBalanceElement = document.getElementById('total-balance');
    const balanceChangeElement = document.getElementById('balance-change');

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
            <div class="coin-price">
                <span class="price">$${coin.price.toFixed(2)}</span>
                <span class="change ${coin.change >= 0 ? 'positive' : 'negative'}">${coin.change >= 0 ? '+' : ''}${coin.change.toFixed(2)}%</span>
            </div>
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
    const dbBalance = await fetchUserBalance(); // Fetch balance from database
    if (dbBalance !== null) {
        currentBalance = dbBalance;
        // Update cache with fresh database value
        localStorage.setItem('cachedBalance', currentBalance.toString());
    } // If dbBalance is null, keep the cached value from initialization
    await loadUserPortfolio(); // Load portfolio from database
    await calculateTotalBalance(); // Calculate balance from portfolio with fallback
    updateBalance();
    setupBalanceSubscription();
    updatePortfolio();
    loadUserProfilePicture();
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
                welcomeElement.textContent = `Welcome back ${user.username}!`;
                return;
            }
        } catch (error) {
            console.error('Error fetching username from Supabase:', error);
        }
    }

    // Fallback to localStorage
    if (currentUser.username) {
        welcomeElement.textContent = `Welcome back ${currentUser.username}!`;
    } else {
        welcomeElement.textContent = 'Welcome back!';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
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

    // Periodic refresh every 5 minutes to prevent balance from disappearing
    setInterval(async () => {
        await loadUserPortfolio();
        await calculateTotalBalance();
        updateBalance();
        updatePortfolio();
    }, 300000); // 5 minutes = 300000 milliseconds

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

    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.email || !window.supabaseClient) {
            alert('User not logged in or database not available.');
            return;
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.email}_${Date.now()}.${fileExt}`;
        const filePath = `profile-pictures/${fileName}`;

        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('user-uploads')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            alert('Failed to upload image. Please try again.');
            return;
        }

        // Get public URL
        const { data: urlData } = window.supabaseClient.storage
            .from('user-uploads')
            .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Update user profile in database
        const { error: updateError } = await window.supabaseClient
            .from('users')
            .update({ profile_picture: publicUrl })
            .eq('email', currentUser.email);

        if (updateError) {
            console.error('Database update error:', updateError);
            alert('Failed to save profile picture. Please try again.');
            return;
        }

        // Update UI
        updateUserAvatar(publicUrl);
        alert('Profile picture updated successfully!');

    } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert('An error occurred. Please try again.');
    }
});

// Function to update user avatar display
function updateUserAvatar(imageUrl) {
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar && imageUrl) {
        // Set the background image and keep the icon visible
        userAvatar.style.backgroundImage = `url(${imageUrl})`;
        userAvatar.style.backgroundSize = 'cover';
        userAvatar.style.backgroundPosition = 'center';
        userAvatar.style.backgroundRepeat = 'no-repeat';
        // Ensure the icon remains visible if image fails to load
        const icon = userAvatar.querySelector('i');
        if (icon) {
            icon.style.position = 'relative';
            icon.style.zIndex = '1';
        }
    }
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
        document.getElementById('send-amount').value = coin.amount.toFixed(4);
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
        sendMessage.textContent = `You will need to deposit $${depositAmount.toFixed(2)} before you can withdraw $${amount}.`;
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

// Fetch live prices (placeholder for future implementation)
async function fetchLivePrices() {
    // This would fetch from CoinGecko API in a real implementation
    return null;
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


