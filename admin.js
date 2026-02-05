// ===== ADMIN PANEL FUNCTIONALITY =====

// Admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Global variables
let allUsers = [];
let currentEditingUser = null;

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

// Fetch all users from Supabase
async function fetchUsers() {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase client not available');
        }

        // Fetch users from auth.users (this might require RLS policies)
        // For demo purposes, we'll simulate user data
        // In production, you'd fetch from a custom users table
        const { data: authUsers, error: authError } = await window.supabaseClient.auth.admin.listUsers();

        if (authError) {
            console.warn('Auth users fetch failed, using simulated data:', authError);
            // Simulate user data for demo
            allUsers = [
                { id: 1, email: 'user1@example.com', balance: 1250.75, status: 'active', created_at: '2024-01-15' },
                { id: 2, email: 'user2@example.com', balance: 500.00, status: 'active', created_at: '2024-01-20' },
                { id: 3, email: 'user3@example.com', balance: 0.00, status: 'inactive', created_at: '2024-01-25' },
                { id: 4, email: 'user4@example.com', balance: 2500.50, status: 'active', created_at: '2024-02-01' },
                { id: 5, email: 'user5@example.com', balance: 750.25, status: 'active', created_at: '2024-02-05' }
            ];
        } else {
            // Convert auth users to our format
            allUsers = authUsers.users.map(user => ({
                id: user.id,
                email: user.email,
                balance: 0.00, // Default balance, would be fetched from separate table
                status: user.email_confirmed_at ? 'active' : 'pending',
                created_at: user.created_at
            }));
        }

        displayUsers(allUsers);
        updateOverviewStats();

    } catch (error) {
        console.error('Error fetching users:', error);
        showMessage('Error loading users. Please try again.', 'error');
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
            <td class="user-balance">$${user.balance.toFixed(2)}</td>
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

const editBalanceModal = document.getElementById('edit-balance-modal');
const editBalanceClose = document.getElementById('edit-balance-close');
const cancelEdit = document.getElementById('cancel-edit');
const saveBalance = document.getElementById('save-balance');

// Open edit balance modal
function openEditBalanceModal(user) {
    currentEditingUser = user;

    document.getElementById('edit-user-email').textContent = user.email;
    document.getElementById('edit-current-balance').textContent = user.balance.toFixed(2);
    document.getElementById('new-balance').value = user.balance;
    document.getElementById('edit-reason').value = '';

    editBalanceModal.style.display = 'flex';
    setTimeout(() => editBalanceModal.classList.add('show'), 10);
}

// Close edit balance modal
function closeEditBalanceModal() {
    editBalanceModal.classList.remove('show');
    setTimeout(() => editBalanceModal.style.display = 'none', 300);
    currentEditingUser = null;
}

// Event listeners for modal
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
    const newBalance = parseFloat(document.getElementById('new-balance').value);
    const reason = document.getElementById('edit-reason').value.trim();

    if (isNaN(newBalance) || newBalance < 0) {
        showMessage('Please enter a valid balance amount.', 'error');
        return;
    }

    try {
        // In production, update balance in database
        // For demo, we'll just update the local array
        const userIndex = allUsers.findIndex(user => user.id === currentEditingUser.id);
        if (userIndex !== -1) {
            allUsers[userIndex].balance = newBalance;

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 500));

            displayUsers(allUsers);
            updateOverviewStats();
            showMessage('Balance updated successfully!', 'success');
            closeEditBalanceModal();
        }
    } catch (error) {
        console.error('Error updating balance:', error);
        showMessage('Error updating balance. Please try again.', 'error');
    }
});

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
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        // Fallback to redirect
        window.location.href = 'login.html';
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

// ===== INITIALIZATION =====

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', () => {
    // Set default active section
    document.getElementById('users-section').classList.add('active');

    // Fetch users on load
    fetchUsers();
});
