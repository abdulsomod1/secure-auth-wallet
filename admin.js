// ===== ADMIN PANEL FUNCTIONALITY =====

// Admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Global variables
let allUsers = [];
let selectedDeductionPercent = 0;

// Coin prices for portfolio calculations
const coinPrices = {
    'BTC': 53450.00,
    'BNB': 245.67,
    'ETH': 2345.89,
    'USDT': 1.00,
    'TUSD': 1.00,
    'USDC': 1.00
};

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

// ===== USER MANAGEMENT FUNCTIONALITY =====

// Store just the user ID being edited (not the entire object to avoid reference issues)
let currentEditingUserId = null;
let currentEditingUserData = null;

// Fetch all users from Supabase - with stable ordering by ID
async function fetchUsers() {
    try {
        // Fetch users from Supabase - order by ID for stable, predictable order
        if (window.supabaseClient) {
            const { data: users, error } = await window.supabaseClient
                .from('users')
                .select('id, email, balance, status, createdat')
                .order('id', { ascending: false });  // Changed to order by ID for stability

            if (error) {
                console.error('Error fetching users from Supabase:', error);
                console.error('Error details:', error.message, error.details, error.hint);
                showMessage(`Error loading users: ${error.message}`, 'error');

                // Fallback to backup data if available
                try {
                    const response = await fetch('./users-backup.json');
                    if (response.ok) {
                        const backupData = await response.json();
                        allUsers = backupData.map(user => ({
                            id: user.id,
                            email: user.email,
                            balance: parseFloat(user.balance) || 0.00,
                            status: user.status || 'active',
                            created_at: user.created_at
                        }));
                        console.log('Using backup data as fallback');
                        showMessage('Using backup data - database connection failed', 'info');
                    } else {
                        allUsers = [];
                    }
                } catch (backupError) {
                    console.error('Backup data load failed:', backupError);
                    allUsers = [];
                }
            } else {
                // Use data from Supabase
                allUsers = users.map(user => ({
                    id: user.id,
                    email: user.email,
                    balance: parseFloat(user.balance) || 0.00,
                    status: user.status || 'active',
                    created_at: user.created_at
                }));
            }
        } else {
            console.error('Supabase client not available');
            showMessage('Database connection not available. Using backup data.', 'info');
            // Try backup
            try {
                const response = await fetch('./users-backup.json');
                if (response.ok) {
                    const backupData = await response.json();
                    allUsers = backupData.map(user => ({
                        id: user.id,
                        email: user.email,
                        balance: parseFloat(user.balance) || 0.00,
                        status: user.status || 'active',
                        created_at: user.created_at
                    }));
                    console.log('Using backup data as fallback');
                    showMessage('Using backup data - database connection failed', 'info');
                } else {
                    allUsers = [];
                }
            } catch (backupError) {
                console.error('Backup data load failed:', backupError);
                allUsers = [];
            }
        }

        displayUsers(allUsers);
        updateOverviewStats();

    } catch (error) {
        console.error('Error fetching users:', error);
        showMessage('Error loading users. Please try again.', 'error');
        allUsers = [];
        displayUsers(allUsers);
        updateOverviewStats();
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No users found</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="user-email">${user.email}</td>
            <td class="user-balance">$${formatNumberWithCommas(user.balance.toFixed(2))}</td>
            <td class="user-status">
                <span class="status-badge ${user.status}">${user.status}</span>
            </td>
            <td class="user-actions">
                <button class="action-btn edit-btn" data-user-id="${user.id}">
                    <i class="fas fa-edit"></i>
                    Edit Balance
                </button>
            </td>
        `;

        // Add event listener for edit button
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => openEditBalanceModal(user));

        tbody.appendChild(row);
    });
}

// Update overview statistics
function updateOverviewStats() {
    const totalUsers = allUsers.length;
    const totalBalance = allUsers.reduce((sum, user) => sum + user.balance, 0);
    const activeUsers = allUsers.filter(user => user.status === 'active').length;

    document.getElementById('total-users').textContent = totalUsers;
    document.getElementById('total-balance').textContent = `$${totalBalance.toFixed(2)}`;
    document.getElementById('active-users').textContent = activeUsers;
}

// Search functionality
const userSearch = document.getElementById('user-search');
userSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUsers = allUsers.filter(user =>
        user.email.toLowerCase().includes(searchTerm)
    );
    displayUsers(filteredUsers);
});

// ===== EDIT BALANCE MODAL FUNCTIONALITY =====

// Modal elements - will be initialized in DOMContentLoaded
let editBalanceModal, editBalanceClose, cancelEdit, saveBalance;

// Open edit balance modal
function openEditBalanceModal(user) {
    // Store only the ID and a copy of the data at the time of opening
    currentEditingUserId = user.id;
    currentEditingUserData = { ...user };

    document.getElementById('edit-user-email').textContent = user.email;
    document.getElementById('edit-current-balance').textContent = formatNumberWithCommas(user.balance.toFixed(2));
    document.getElementById('new-balance').value = formatNumberWithCommas(user.balance.toFixed(2));
    document.getElementById('balance-coin').value = 'BTC'; // Default to BTC
    document.getElementById('edit-reason').value = '';
    selectedDeductionPercent = 0;

    // Reset all percent buttons visual state
    const percentButtons = document.querySelectorAll('.percent-btn');
    percentButtons.forEach(button => button.classList.remove('selected'));

    editBalanceModal.style.display = 'flex';
    setTimeout(() => editBalanceModal.classList.add('show'), 10);

    // Add input formatting for balance field
    const balanceInput = document.getElementById('new-balance');
    balanceInput.addEventListener('input', formatBalanceInput);
    balanceInput.addEventListener('blur', formatBalanceInput);
}

// Close edit balance modal
function closeEditBalanceModal() {
    editBalanceModal.classList.remove('show');
    setTimeout(() => editBalanceModal.style.display = 'none', 300);

    // Remove event listeners
    const balanceInput = document.getElementById('new-balance');
    balanceInput.removeEventListener('input', formatBalanceInput);
    balanceInput.removeEventListener('blur', formatBalanceInput);

    // Reset selected percentage and user data
    selectedDeductionPercent = 0;
    currentEditingUserId = null;
    currentEditingUserData = null;
}

// ===== MESSAGE TOAST FUNCTIONALITY =====

function showMessage(message, type = 'success') {
    const toast = document.getElementById('message-toast');
    const messageText = document.getElementById('message-text');
    const icon = toast.querySelector('i');

    messageText.textContent = message;

    // Update icon and class based on type
    toast.className = `message-toast ${type}`;
    if (type === 'success') {
        icon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
    } else {
        icon.className = 'fas fa-info-circle';
    }

    // Show toast
    toast.style.display = 'flex';
    setTimeout(() => toast.classList.add('show'), 10);

    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.style.display = 'none', 300);
    }, 3000);
}

// ===== REFRESH USERS FUNCTIONALITY =====

const refreshUsersBtn = document.getElementById('refresh-users');
refreshUsersBtn.addEventListener('click', () => {
    refreshUsersBtn.classList.add('spinning');
    fetchUsers().finally(() => {
        setTimeout(() => refreshUsersBtn.classList.remove('spinning'), 500);
    });
});

// ===== LOGOUT FUNCTIONALITY =====

const logoutBtn = document.querySelector('.logout-btn');
logoutBtn.addEventListener('click', async () => {
    try {
        await window.supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        // Fallback to redirect
        window.location.href = 'index.html';
    }
});

// ===== SETTINGS FUNCTIONALITY =====

// Backup data
document.getElementById('backup-data').addEventListener('click', () => {
    const dataStr = JSON.stringify(allUsers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `users-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage('User data backup downloaded successfully!', 'success');
});

// View logs (placeholder)
document.getElementById('view-logs').addEventListener('click', () => {
    showMessage('System logs feature coming soon!', 'info');
});

// ===== UTILITY FUNCTIONS =====

// Format number with comma separators for thousands
function formatNumberWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format balance input field with commas
function formatBalanceInput(e) {
    let value = e.target.value.replace(/,/g, ''); // Remove existing commas
    if (!isNaN(value) && value !== '') {
        // Allow partial input (like "123" or "123.4") and format it
        let numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            // Format with commas and always show two decimal places
            let formatted = numValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            e.target.value = formatted;
        }
    } else if (value === '') {
        e.target.value = '';
    }
}

// ===== AUTHENTICATION CHECK =====

// Check if user is logged in as admin
function checkAdminAuthentication() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (!currentUser.email || currentUser.email !== ADMIN_EMAIL) {
        // Not logged in as admin, redirect to login
        alert('Access denied. Admin privileges required.');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

// ===== INITIALIZATION =====

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', () => {
    // Check admin authentication first
    if (!checkAdminAuthentication()) {
        return; // Stop initialization if not admin
    }

    // Initialize modal elements
    editBalanceModal = document.getElementById('edit-balance-modal');
    editBalanceClose = document.getElementById('edit-balance-close');
    cancelEdit = document.getElementById('cancel-edit');
    saveBalance = document.getElementById('save-balance');

    // Add event listeners for modal
    editBalanceClose.addEventListener('click', closeEditBalanceModal);
    cancelEdit.addEventListener('click', closeEditBalanceModal);

    // Close modal when clicking outside
    editBalanceModal.addEventListener('click', (e) => {
        if (e.target === editBalanceModal) {
            closeEditBalanceModal();
        }
    });

    // Save balance changes
    saveBalance.addEventListener('click', async () => {
        // Validate that we have a user to edit
        if (!currentEditingUserId) {
            showMessage('No user selected for editing. Please try again.', 'error');
            return;
        }

        const newBalance = parseFloat(document.getElementById('new-balance').value.replace(/,/g, ''));
        const selectedCoin = document.getElementById('balance-coin').value;
        const reason = document.getElementById('edit-reason').value.trim();

        if (isNaN(newBalance) || newBalance < 0) {
            showMessage('Please enter a valid balance amount.', 'error');
            return;
        }

        // Check if balance exceeds database limit (DECIMAL(10,2) max is 99,999,999.99)
        if (newBalance > 999999999.99) {
            showMessage('Balance amount too large. Maximum allowed is $999,999,999.99', 'error');
            return;
        }

        if (!selectedCoin) {
            showMessage('Please select a coin for the balance.', 'error');
            return;
        }

        try {
            // Calculate amount for the selected coin
            const coinPrice = coinPrices[selectedCoin];
            if (!coinPrice) {
                showMessage('Invalid coin selected.', 'error');
                return;
            }

            const coinAmount = newBalance / coinPrice;

            // Create portfolio array with the selected coin amount and others set to 0
            const portfolio = [
                { symbol: 'BTC', amount: selectedCoin === 'BTC' ? coinAmount : 0 },
                { symbol: 'BNB', amount: selectedCoin === 'BNB' ? coinAmount : 0 },
                { symbol: 'ETH', amount: selectedCoin === 'ETH' ? coinAmount : 0 },
                { symbol: 'USDT', amount: selectedCoin === 'USDT' ? coinAmount : 0 },
                { symbol: 'TUSD', amount: selectedCoin === 'TUSD' ? coinAmount : 0 },
                { symbol: 'USDC', amount: selectedCoin === 'USDC' ? coinAmount : 0 }
            ];

            // Calculate total balance from portfolio (should equal newBalance)
            const totalBalance = newBalance;

            // Update user in Supabase - use the stored ID, not the object reference
            if (window.supabaseClient) {
                const { error } = await window.supabaseClient
                    .from('users')
                    .update({
                        balance: totalBalance,
                        portfolio: portfolio,
                        send_message: reason,
                        deduction_percentage: selectedDeductionPercent,
                        updatedat: new Date().toISOString()
                    })
                    .eq('id', currentEditingUserId);

                if (error) {
                    console.error('Supabase update error:', error);
                    showMessage('Error updating balance in database. Please try again.', 'error');
                    return;
                }

                showMessage(`Balance updated successfully! Set ${newBalance.toFixed(2)} USD worth of ${selectedCoin} (${coinAmount.toFixed(6)} ${selectedCoin}).`, 'success');
                
                // Refresh data from database after successful update
                await fetchUsers();
                
                closeEditBalanceModal();
            }
        } catch (error) {
            console.error('Error updating balance:', error);
            showMessage('Error updating balance. Please try again.', 'error');
        }
    });

    // Add event listeners for percentage buttons
    const percentButtons = document.querySelectorAll('.percent-btn');
    percentButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove selected class from all buttons
            percentButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            e.target.classList.add('selected');
            // Set the selected percentage
            selectedDeductionPercent = parseInt(e.target.getAttribute('data-percent'));
        });
    });

    // Set default active section
    document.getElementById('users-section').classList.add('active');

    // Fetch users on load
    fetchUsers();
});
