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

// Simulated balance data
let currentBalance = 1250.75;
let balanceChange = 2.34;

// Portfolio data
const portfolioData = [
    { symbol: 'BTC', name: 'Bitcoin', amount: 0.0234, value: 1250.75, price: 53450.00, change: 1.23 },
    { symbol: 'BNB', name: 'Binance Coin', amount: 0, value: 0, price: 245.67, change: -0.45 },
    { symbol: 'ETH', name: 'Ethereum', amount: 0, value: 0, price: 2345.89, change: 3.21 },
    { symbol: 'USDT', name: 'Tether', amount: 0, value: 0, price: 1.00, change: 0.01 }
];

// Update balance display
function updateBalance() {
    const totalBalanceElement = document.getElementById('total-balance');
    const balanceChangeElement = document.getElementById('balance-change');

    totalBalanceElement.textContent = `$${currentBalance.toFixed(2)}`;

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
                    <img src="https://assets.coingecko.com/coins/images/${getCoinId(coin.symbol)}/large/${coin.symbol.toLowerCase()}.png" alt="${coin.symbol}" onerror="this.src='https://via.placeholder.com/55x55/f8fafc/4a5568?text=${coin.symbol}'">
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
        'BTC': '1',
        'BNB': '825',
        'ETH': '279',
        'USDT': '325'
    };
    return coinIds[symbol] || '1';
}

// Refresh balance functionality
const refreshBtn = document.getElementById('refresh-balance');

refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');

    // Simulate API call
    setTimeout(() => {
        // Simulate balance change
        const change = (Math.random() - 0.5) * 10;
        currentBalance += change;
        balanceChange = (change / (currentBalance - change)) * 100;

        updateBalance();
        updatePortfolio();

        refreshBtn.classList.remove('spinning');
    }, 1500);
});

// Auto-update portfolio prices every 30 seconds
setInterval(() => {
    portfolioData.forEach(coin => {
        // Simulate price changes
        const changePercent = (Math.random() - 0.5) * 2; // -1% to +1%
        coin.price *= (1 + changePercent / 100);
        coin.change = changePercent;
        coin.value = coin.amount * coin.price;
    });

    // Update total balance
    currentBalance = portfolioData.reduce((sum, coin) => sum + coin.value, 0);
    balanceChange = (Math.random() - 0.5) * 4; // -2% to +2%

    updateBalance();
    updatePortfolio();
}, 30000);

// ===== ACTION BUTTONS FUNCTIONALITY =====

const actionModal = document.getElementById('action-modal');
const actionModalTitle = document.getElementById('action-modal-title');
const actionModalClose = document.getElementById('action-modal-close');

const sendForm = document.getElementById('send-form');
const receiveForm = document.getElementById('receive-form');
const sendSubmit = document.getElementById('send-submit');
const copyAddress = document.getElementById('copy-address');

// Action buttons
document.querySelector('.send-btn').addEventListener('click', () => showActionModal('Send', 'send'));
document.querySelector('.receive-btn').addEventListener('click', () => showActionModal('Receive', 'receive'));
document.querySelector('.buy-btn').addEventListener('click', () => showActionModal('Buy', 'buy'));
document.querySelector('.swap-btn').addEventListener('click', () => showActionModal('Swap', 'swap'));

function showActionModal(title, type) {
    actionModalTitle.textContent = title;
    actionModal.style.display = 'flex';

    // Hide all forms
    sendForm.style.display = 'none';
    receiveForm.style.display = 'none';

    // Show relevant form
    if (type === 'send') {
        sendForm.style.display = 'flex';
    } else if (type === 'receive') {
        receiveForm.style.display = 'flex';
    } else {
        // For buy and swap, show a placeholder message
        actionModalTitle.textContent = `${title} - Coming Soon`;
    }

    setTimeout(() => actionModal.classList.add('show'), 10);
}

actionModalClose.addEventListener('click', () => {
    actionModal.classList.remove('show');
    setTimeout(() => actionModal.style.display = 'none', 300);
});

// Close modal when clicking outside
actionModal.addEventListener('click', (e) => {
    if (e.target === actionModal) {
        actionModal.classList.remove('show');
        setTimeout(() => actionModal.style.display = 'none', 300);
    }
});

// Send form submission
sendSubmit.addEventListener('click', () => {
    const address = document.getElementById('send-address').value;
    const amount = document.getElementById('send-amount').value;
    const currency = document.getElementById('send-currency').value;

    if (!address || !amount) {
        alert('Please fill in all fields');
        return;
    }

    alert(`Sending ${amount} ${currency} to ${address}`);
    actionModal.classList.remove('show');
    setTimeout(() => actionModal.style.display = 'none', 300);
});

// Copy address functionality
copyAddress.addEventListener('click', async () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'; // Mock address

    try {
        await navigator.clipboard.writeText(address);
        copyAddress.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            copyAddress.innerHTML = '<i class="fas fa-copy"></i> Copy Address';
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = address;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        copyAddress.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            copyAddress.innerHTML = '<i class="fas fa-copy"></i> Copy Address';
        }, 2000);
    }
});

// ===== DAPP BROWSER FUNCTIONALITY =====

const dappUrlInput = document.getElementById('dapp-url');
const loadDappBtn = document.getElementById('load-dapp');
const dappIframe = document.getElementById('dapp-iframe');
const dappItems = document.querySelectorAll('.dapp-item');

// Load DApp from URL input
function loadDApp(url) {
    if (!url) {
        alert('Please enter a URL');
        return;
    }

    // Ensure HTTPS
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    // Basic URL validation
    try {
        const urlObj = new URL(url);
        if (urlObj.protocol !== 'https:') {
            alert('Only HTTPS URLs are allowed for security reasons');
            return;
        }

        dappIframe.src = url;
        dappUrlInput.value = url;
    } catch (error) {
        alert('Please enter a valid URL');
    }
}

// Load DApp button
loadDappBtn.addEventListener('click', () => {
    loadDApp(dappUrlInput.value);
});

// Enter key support for URL input
dappUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loadDApp(dappUrlInput.value);
    }
});

// Popular DApps quick access
dappItems.forEach(item => {
    item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        loadDApp(url);
    });
});

// ===== NFT GALLERY FUNCTIONALITY =====

// Sample NFT data
const nftData = [
    {
        id: 1,
        name: 'Crypto Punk #1234',
        description: 'A unique Crypto Punk collectible',
        price: 2.5,
        usdPrice: 4250.00,
        image: 'https://via.placeholder.com/300x300/4facfe/ffffff?text=NFT+1',
        category: 'collectibles'
    },
    {
        id: 2,
        name: 'Bored Ape #5678',
        description: 'Exclusive Bored Ape Yacht Club member',
        price: 15.8,
        usdPrice: 26860.00,
        image: 'https://via.placeholder.com/300x300/00f2fe/ffffff?text=NFT+2',
        category: 'collectibles'
    },
    {
        id: 3,
        name: 'Digital Art #999',
        description: 'Beautiful digital artwork',
        price: 0.8,
        usdPrice: 1360.00,
        image: 'https://via.placeholder.com/300x300/764ba2/ffffff?text=NFT+3',
        category: 'art'
    },
    {
        id: 4,
        name: 'Gaming Asset #777',
        description: 'Rare gaming collectible',
        price: 5.2,
        usdPrice: 8840.00,
        image: 'https://via.placeholder.com/300x300/f093fb/ffffff?text=NFT+4',
        category: 'gaming'
    },
    {
        id: 5,
        name: 'Abstract Art #456',
        description: 'Modern abstract digital art',
        price: 1.2,
        usdPrice: 2040.00,
        image: 'https://via.placeholder.com/300x300/667eea/ffffff?text=NFT+5',
        category: 'art'
    },
    {
        id: 6,
        name: 'Collectible Card #321',
        description: 'Limited edition trading card',
        price: 3.7,
        usdPrice: 6290.00,
        image: 'https://via.placeholder.com/300x300/764ba2/ffffff?text=NFT+6',
        category: 'collectibles'
    }
];

const nftFilter = document.getElementById('nft-filter');
const nftGrid = document.getElementById('nft-grid');

// Render NFT grid
function renderNFTs(filter = 'all') {
    nftGrid.innerHTML = '';

    const filteredNFTs = filter === 'all' ? nftData : nftData.filter(nft => nft.category === filter);

    filteredNFTs.forEach(nft => {
        const nftCard = document.createElement('div');
        nftCard.className = 'nft-card';
        nftCard.setAttribute('data-id', nft.id);

        nftCard.innerHTML = `
            <div class="nft-image">
                <img src="${nft.image}" alt="${nft.name}">
            </div>
            <div class="nft-info">
                <h3>${nft.name}</h3>
                <p class="nft-description">${nft.description}</p>
                <div class="nft-price">
                    <span class="price">${nft.price} ETH</span>
                    <span class="usd-price">$${nft.usdPrice.toFixed(2)}</span>
                </div>
            </div>
        `;

        // Add click event for NFT modal
        nftCard.addEventListener('click', () => showNFTModal(nft));

        nftGrid.appendChild(nftCard);
    });
}

// NFT filter functionality
nftFilter.addEventListener('change', (e) => {
    renderNFTs(e.target.value);
});

// NFT modal functionality
function showNFTModal(nft) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${nft.name}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="nft-modal-image">
                    <img src="${nft.image}" alt="${nft.name}">
                </div>
                <div class="nft-modal-details">
                    <p class="nft-description">${nft.description}</p>
                    <div class="nft-modal-price">
                        <div class="price-info">
                            <span class="price">${nft.price} ETH</span>
                            <span class="usd-price">$${nft.usdPrice.toFixed(2)}</span>
                        </div>
                        <div class="nft-actions">
                            <button class="nft-action-btn buy-btn">Buy Now</button>
                            <button class="nft-action-btn offer-btn">Make Offer</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 10);

    // Close modal functionality
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        }
    });

    // NFT action buttons
    const buyBtn = modal.querySelector('.buy-btn');
    const offerBtn = modal.querySelector('.offer-btn');

    buyBtn.addEventListener('click', () => {
        alert(`Purchasing ${nft.name} for ${nft.price} ETH`);
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
    });

    offerBtn.addEventListener('click', () => {
        const offer = prompt(`Make an offer for ${nft.name} (in ETH):`);
        if (offer && !isNaN(offer)) {
            alert(`Offer of ${offer} ETH submitted for ${nft.name}`);
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        }
    });
}

// ===== SETTINGS FUNCTIONALITY =====

// Settings buttons
const backupPhraseBtn = document.getElementById('backup-phrase');
const exportKeyBtn = document.getElementById('export-key');
const setPinBtn = document.getElementById('set-pin');
const addTokenBtn = document.getElementById('add-token');
const networkSettingsBtn = document.getElementById('network-settings');
const biometricToggle = document.getElementById('biometric-toggle');

// Backup recovery phrase
backupPhraseBtn.addEventListener('click', () => {
    const phrase = generateRecoveryPhrase();
    showSettingsModal('Backup Recovery Phrase', `
        <div class="backup-modal">
            <p class="warning-text">⚠️ Never share your recovery phrase with anyone. Store it securely offline.</p>
            <div class="phrase-display">
                <div class="phrase-words">
                    ${phrase.split(' ').map((word, index) => `<span class="phrase-word">${index + 1}. ${word}</span>`).join('')}
                </div>
            </div>
            <div class="modal-actions">
                <button class="copy-phrase-btn">Copy Phrase</button>
                <button class="download-phrase-btn">Download as File</button>
            </div>
        </div>
    `, (modal) => {
        const copyBtn = modal.querySelector('.copy-phrase-btn');
        const downloadBtn = modal.querySelector('.download-phrase-btn');

        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(phrase);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy Phrase', 2000);
            } catch (err) {
                alert('Failed to copy phrase');
            }
        });

        downloadBtn.addEventListener('click', () => {
            const blob = new Blob([phrase], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'recovery-phrase.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });
});

// Export private key
exportKeyBtn.addEventListener('click', () => {
    showSettingsModal('Export Private Key', `
        <div class="export-modal">
            <p class="warning-text">⚠️ Exporting your private key is dangerous. Make sure you're on a secure device.</p>
            <div class="form-group">
                <label for="export-password">Enter Password to Confirm</label>
                <input type="password" id="export-password" placeholder="Enter your password">
            </div>
            <button class="export-confirm-btn">Export Private Key</button>
        </div>
    `, (modal) => {
        const confirmBtn = modal.querySelector('.export-confirm-btn');
        const passwordInput = modal.querySelector('#export-password');

        confirmBtn.addEventListener('click', () => {
            if (!passwordInput.value) {
                alert('Please enter your password');
                return;
            }

            // Mock private key export
            const privateKey = '0x' + Math.random().toString(16).substr(2, 64);
            showSettingsModal('Private Key Exported', `
                <div class="key-display">
                    <p>Your private key:</p>
                    <div class="key-text">${privateKey}</div>
                    <button class="copy-key-btn">Copy Key</button>
                </div>
            `, (keyModal) => {
                const copyKeyBtn = keyModal.querySelector('.copy-key-btn');
                copyKeyBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(privateKey);
                        copyKeyBtn.textContent = 'Copied!';
                        setTimeout(() => copyKeyBtn.textContent = 'Copy Key', 2000);
                    } catch (err) {
                        alert('Failed to copy key');
                    }
                });
            });

            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        });
    });
});

// Set PIN code
setPinBtn.addEventListener('click', () => {
    showSettingsModal('Set PIN Code', `
        <div class="pin-modal">
            <div class="form-group">
                <label for="new-pin">New PIN (4-6 digits)</label>
                <input type="password" id="new-pin" placeholder="Enter new PIN" maxlength="6" pattern="[0-9]*">
            </div>
            <div class="form-group">
                <label for="confirm-pin">Confirm PIN</label>
                <input type="password" id="confirm-pin" placeholder="Confirm new PIN" maxlength="6" pattern="[0-9]*">
            </div>
            <button class="set-pin-confirm-btn">Set PIN</button>
        </div>
    `, async (modal) => {
        const confirmBtn = modal.querySelector('.set-pin-confirm-btn');
        const newPinInput = modal.querySelector('#new-pin');
        const confirmPinInput = modal.querySelector('#confirm-pin');

        confirmBtn.addEventListener('click', async () => {
            const newPin = newPinInput.value;
            const confirmPin = confirmPinInput.value;

            if (!newPin || newPin.length < 4 || newPin.length > 6) {
                alert('PIN must be 4-6 digits');
                return;
            }

            if (newPin !== confirmPin) {
                alert('PINs do not match');
                return;
            }

            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                if (currentUser.email) {
                    await window.supabaseClient
                        .from('user_settings')
                        .upsert({ email: currentUser.email, wallet_pin: newPin });
                }
                localStorage.setItem('walletPin', newPin);
                alert('PIN set successfully!');
            } catch (err) {
                console.error('Error saving PIN:', err);
                localStorage.setItem('walletPin', newPin);
                alert('PIN set locally (Supabase unavailable)');
            }
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        });
    });
});

// Add custom token
addTokenBtn.addEventListener('click', () => {
    showSettingsModal('Add Custom Token', `
        <div class="token-modal">
            <div class="form-group">
                <label for="token-address">Token Contract Address</label>
                <input type="text" id="token-address" placeholder="0x...">
            </div>
            <div class="form-group">
                <label for="token-symbol">Token Symbol</label>
                <input type="text" id="token-symbol" placeholder="e.g., UNI" maxlength="10">
            </div>
            <div class="form-group">
                <label for="token-decimals">Decimals</label>
                <input type="number" id="token-decimals" placeholder="18" min="0" max="18">
            </div>
            <button class="add-token-confirm-btn">Add Token</button>
        </div>
    `, (modal) => {
        const confirmBtn = modal.querySelector('.add-token-confirm-btn');
        const addressInput = modal.querySelector('#token-address');
        const symbolInput = modal.querySelector('#token-symbol');
        const decimalsInput = modal.querySelector('#token-decimals');

        confirmBtn.addEventListener('click', () => {
            const address = addressInput.value;
            const symbol = symbolInput.value;
            const decimals = decimalsInput.value;

            if (!address || !symbol || !decimals) {
                alert('Please fill in all fields');
                return;
            }

            if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
                alert('Invalid contract address');
                return;
            }

            // Mock token addition
            alert(`Token ${symbol} added successfully!`);
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        });
    });
});

// Network settings
networkSettingsBtn.addEventListener('click', () => {
    const networks = [
        { name: 'Ethereum Mainnet', rpc: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID', chainId: 1 },
        { name: 'Binance Smart Chain', rpc: 'https://bsc-dataseed.binance.org/', chainId: 56 },
        { name: 'Polygon', rpc: 'https://polygon-rpc.com/', chainId: 137 },
        { name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', chainId: 42161 }
    ];

    showSettingsModal('Network Settings', `
        <div class="network-modal">
            <p>Select a network to connect to:</p>
            <div class="network-list">
                ${networks.map(network => `
                    <div class="network-item" data-chain-id="${network.chainId}">
                        <div class="network-info">
                            <h4>${network.name}</h4>
                            <span class="chain-id">Chain ID: ${network.chainId}</span>
                        </div>
                        <button class="connect-network-btn">Connect</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `, (modal) => {
        const connectButtons = modal.querySelectorAll('.connect-network-btn');

        connectButtons.forEach(button => {
            button.addEventListener('click', () => {
                const networkItem = button.closest('.network-item');
                const networkName = networkItem.querySelector('h4').textContent;

                alert(`Connected to ${networkName}`);
                modal.classList.remove('show');
                setTimeout(() => document.body.removeChild(modal), 300);
            });
        });
    });
});

// Biometric toggle
biometricToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser.email) {
            await window.supabaseClient
                .from('user_settings')
                .upsert({ email: currentUser.email, biometric_enabled: enabled });
        }
        localStorage.setItem('biometricEnabled', enabled);
        if (enabled) {
            alert('Biometric authentication enabled');
        } else {
            alert('Biometric authentication disabled');
        }
    } catch (err) {
        console.error('Error saving biometric setting:', err);
        localStorage.setItem('biometricEnabled', enabled);
        if (enabled) {
            alert('Biometric authentication enabled locally (Supabase unavailable)');
        } else {
            alert('Biometric authentication disabled locally (Supabase unavailable)');
        }
    }
});

// Load biometric setting on page load
document.addEventListener('DOMContentLoaded', () => {
    const biometricEnabled = localStorage.getItem('biometricEnabled') === 'true';
    biometricToggle.checked = biometricEnabled;
});

// ===== UTILITY FUNCTIONS =====

// Generate mock recovery phrase
function generateRecoveryPhrase() {
    const words = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
        'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
        'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
        'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'agent', 'agree'
    ];

    const phrase = [];
    for (let i = 0; i < 12; i++) {
        phrase.push(words[Math.floor(Math.random() * words.length)]);
    }

    return phrase.join(' ');
}

// Generic settings modal function
function showSettingsModal(title, content, callback = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 10);

    // Close modal functionality
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        }
    });

    // Call callback if provided
    if (callback) {
        callback(modal);
    }
}

// ===== INITIALIZATION =====

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    // Set default active section
    document.getElementById('home-section').classList.add('active');

    // Initialize balance and portfolio
    updateBalance();
    updatePortfolio();

    // Initialize NFT gallery
    renderNFTs();

    // Load saved settings from Supabase
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.email && window.supabaseClient) {
        try {
            const { data: settings, error } = await window.supabaseClient
                .from('user_settings')
                .select('*')
                .eq('email', currentUser.email)
                .single();

            if (!error && settings) {
                localStorage.setItem('biometricEnabled', settings.biometric_enabled || false);
                localStorage.setItem('walletPin', settings.wallet_pin || '');
                console.log('Settings loaded from Supabase');
            } else {
                console.log('No settings found in Supabase, using localStorage');
            }
        } catch (err) {
            console.error('Error loading settings from Supabase:', err);
        }
    }

    // Load saved settings (fallback to localStorage)
    const biometricEnabled = localStorage.getItem('biometricEnabled') === 'true';
    if (biometricToggle) {
        biometricToggle.checked = biometricEnabled;
    }
});
