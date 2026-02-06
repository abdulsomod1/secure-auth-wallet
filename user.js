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
let currentBalance = 0.00;
let balanceChange = 0.00;
let userBalanceSubscription = null;

// Fetch user balance from database
async function fetchUserBalance() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.email || !window.supabaseClient) {
            return 0.00;
        }

        const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('balance')
            .eq('email', currentUser.email)
            .single();

        if (error) {
            console.error('Error fetching user balance:', error);
            return 0.00;
        }

        return parseFloat(user.balance) || 0.00;
    } catch (error) {
        console.error('Error fetching user balance:', error);
        return 0.00;
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
                table: 'users',
                filter: `email=eq.${currentUser.email}`
            }, async (payload) => {
                // Update balance directly from payload for immediate update
                if (payload.new && payload.new.balance !== undefined) {
                    currentBalance = parseFloat(payload.new.balance) || 0.00;
                    updateBalance();
                }

                // Reload portfolio in background for consistency
                await loadUserPortfolio();
                await calculateTotalBalance();
                updateBalance();
                updatePortfolio();
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
    { symbol: 'USDT', name: 'Tether', amount: 0, value: 0, price: 1.00, change: 0.01, image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png' }
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

// Calculate total balance from portfolio (async with database fallback)
async function calculateTotalBalance() {
    const portfolioSum = portfolioData.reduce((sum, coin) => sum + coin.value, 0);

    // If portfolio sum is zero (old users or empty portfolio), use database balance as fallback
    if (portfolioSum === 0) {
        currentBalance = await fetchUserBalance();
    } else {
        currentBalance = portfolioSum;
    }
}

// Update balance display
function updateBalance() {
    const totalBalanceElement = document.getElementById('total-balance');
    const balanceChangeElement = document.getElementById('balance-change');

    totalBalanceElement.textContent = `$${formatNumberWithCommas(currentBalance.toFixed(2))}`;

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
        'USDT': '325'    // Tether
    };
    return coinIds[symbol] || '1';
}

// Refresh balance functionality
const refreshBtn = document.getElementById('refresh-balance');

refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('spinning');

    // Always refresh portfolio and balance from database first
    await loadUserPortfolio();
    calculateTotalBalance();
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    currentBalance = await fetchUserBalance(); // Fetch balance from database
    await loadUserPortfolio(); // Load portfolio from database
    await calculateTotalBalance(); // Calculate balance from portfolio with fallback
    updateBalance();
    setupBalanceSubscription();
    updatePortfolio();

    // Add focus listener to refresh balance and portfolio when window regains focus
    window.addEventListener('focus', async () => {
        currentBalance = await fetchUserBalance();
        await loadUserPortfolio();
        await calculateTotalBalance();
        updateBalance();
        updatePortfolio();
    });

    // Periodic refresh every 5 minutes to prevent balance from disappearing
    setInterval(async () => {
        currentBalance = await fetchUserBalance();
        await loadUserPortfolio();
        await calculateTotalBalance();
        updateBalance();
        updatePortfolio();
    }, 300000); // 5 minutes = 300000 milliseconds
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
    // Set initial address for BTC
    walletAddressDisplay.textContent = walletAddresses['BTC'];
    actionModal.classList.add('show');
});

// Buy button
buyBtn.addEventListener('click', () => {
    loadDApp('https://www.coinbase.com/buy');
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

// Send form submission
sendSubmitBtn.addEventListener('click', () => {
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

    // Check if user has sufficient balance (simplified check)
    if (parseFloat(amount) > currentBalance) {
        alert('Insufficient balance.');
        return;
    }

    // Calculate network fee (5% of withdrawal amount)
    const withdrawalAmount = parseFloat(amount);
    const networkFee = withdrawalAmount * 0.05;

    // Show deposit requirement message inside the wallet
    const sendMessage = document.getElementById('send-message');
    sendMessage.textContent = `To withdraw $${withdrawalAmount.toFixed(2)} ${currency}, you need to deposit a network fee of $${networkFee.toFixed(2)} first.`;
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
    'USDT': '0x695ef4038416D42cC267Fe767816963f7A528379'
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


