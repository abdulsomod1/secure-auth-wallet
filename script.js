// DOM Elements
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const modal = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalClose = document.getElementById('modal-close');
const modalOkBtn = document.getElementById('modal-ok-btn');
const secretPhraseContainer = document.getElementById('secret-phrase-container');
const secretPhraseDiv = document.getElementById('secret-phrase');

// Tab switching functionality
loginBtn.addEventListener('click', () => {
    loginBtn.classList.add('active');
    signupBtn.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
});

signupBtn.addEventListener('click', () => {
    signupBtn.classList.add('active');
    loginBtn.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
});

// Modal functionality
function showModal(title, message, isSuccess = false, showSecretPhrase = false, secretPhrase = '') {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.toggle('error-modal', !isSuccess);

    if (showSecretPhrase) {
        secretPhraseContainer.style.display = 'block';
        secretPhraseDiv.textContent = secretPhrase;
    } else {
        secretPhraseContainer.style.display = 'none';
    }

    modal.style.display = 'flex';
}

modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
});

modalOkBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Generate random secret phrase for signup
function generateSecretPhrase() {
    const words = [
        'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew',
        'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'peach', 'quince', 'raspberry',
        'strawberry', 'tangerine', 'ugli', 'vanilla', 'watermelon', 'xigua', 'yam', 'zucchini'
    ];
    const phrase = [];
    for (let i = 0; i < 12; i++) {
        phrase.push(words[Math.floor(Math.random() * words.length)]);
    }
    return phrase.join(' ');
}

// Form validation and submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailOrUsername = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!emailOrUsername || !password) {
        showModal('Login Failed', 'Please fill in all fields.', false);
        return;
    }

    // Check if Supabase client is available
    if (!window.supabaseClient) {
        console.error('Supabase client not available');
        showModal('Login Failed', 'Database connection unavailable. Please try again later.', false);
        return;
    }

    try {
        // Check if this is admin login
        if (emailOrUsername === 'admin@example.com' && password === 'admin123') {
            // Admin login - redirect to admin panel
            localStorage.setItem('currentUser', JSON.stringify({
                email: emailOrUsername,
                secretPhrase: 'admin recovery phrase for secure wallet system'
            }));

            showModal('Admin Login Successful', 'Welcome to the Admin Panel!', true);
            modalOkBtn.onclick = () => {
                modal.style.display = 'none';
                window.location.href = 'admin.html';
            };
            return;
        }

        // Determine if input is email or username
        const isEmail = emailOrUsername.includes('@');
        let user = null;
        let searchError = null;

        if (isEmail) {
            // Query by email - check if user exists with this email
            const { data: usersByEmail, error: emailError } = await window.supabaseClient
                .from('users')
                .select('*')
                .eq('email', emailOrUsername)
                .single();
            
            if (emailError) {
                searchError = emailError;
            }

            if (usersByEmail) {
                // User exists with this email, now check password
                if (usersByEmail.password === password) {
                    user = usersByEmail;
                } else {
                    // Email exists but wrong password
                    showModal('Login Failed', 'email or password is incorrect.', false);
                    return;
                }
            } else {
                // No user found with this email
                showModal('Login Failed', 'email or password is incorrect.', false);
                return;
            }
        } else {
            // Query by username - check if user exists with this username
            const { data: usersByUsername, error: usernameError } = await window.supabaseClient
                .from('users')
                .select('*')
                .eq('username', emailOrUsername)
                .single();
            
            if (usernameError) {
                searchError = usernameError;
            }

            if (usersByUsername) {
                // User exists with this username, now check password
                if (usersByUsername.password === password) {
                    user = usersByUsername;
                } else {
                    // Username exists but wrong password
                    showModal('Login Failed', 'username or password is incorrect.', false);
                    return;
                }
            } else {
                // No user found with this username
                showModal('Login Failed', 'username or password is incorrect.', false);
                return;
            }
        }

        if (searchError) {
            console.error('Supabase error:', searchError);
            showModal('Login Failed', 'Database error. Please try again.', false);
            return;
        }

        if (!user) {
            showModal('Login Failed', 'Invalid email/username or password.', false);
            return;
        }

        // Set current user session
        localStorage.setItem('currentUser', JSON.stringify({
            email: user.email,
            username: user.username,
            secretPhrase: user.secretPhrase
        }));

        // Show success and redirect
        showModal('Login Successful', 'Welcome back! You have successfully logged in.', true);

        // Override modal OK button to redirect to dashboard
        modalOkBtn.onclick = () => {
            modal.style.display = 'none';
            window.location.href = 'user.html';
        };
    } catch (err) {
        console.error('Login error:', err);
        showModal('Login Failed', 'An error occurred. Please try again.', false);
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const termsAgreed = document.getElementById('terms-agree').checked;

    if (!username || !email || !password || !confirmPassword) {
        showModal('Signup Failed', 'Please fill in all fields.', false);
        return;
    }

    if (password !== confirmPassword) {
        showModal('Signup Failed', 'Passwords do not match.', false);
        return;
    }

    if (!termsAgreed) {
        showModal('Signup Failed', 'Please agree to the Terms of Service and Privacy Policy.', false);
        return;
    }

    try {
        // Check if Supabase client is available
        if (!window.supabaseClient) {
            console.warn('Supabase client not available, falling back to localStorage');
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const existingUser = users.find(u => u.email === email || u.username === username);

            if (existingUser) {
                showModal('Signup Failed', 'An account with this email or username already exists.', false);
                return;
            }

            // Generate secret phrase and create user account
            const secretPhrase = generateSecretPhrase();
            const newUser = {
                username: username,
                email: email,
                password: password,
                secretPhrase: secretPhrase,
                createdAt: new Date().toISOString()
            };

            // Save to localStorage
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            // Set current user session
            localStorage.setItem('currentUser', JSON.stringify({
                username: username,
                email: email,
                secretPhrase: secretPhrase
            }));

            // Show success modal with secret phrase
            showModal(
                'Account Created Successfully',
                'Your account has been created! Please save your secret recovery phrase securely.',
                true,
                true,
                secretPhrase
            );

            // Override modal OK button to redirect to dashboard
            modalOkBtn.onclick = () => {
                modal.style.display = 'none';
                window.location.href = 'user.html';
            };
            return;
        }

        // Check if user already exists in Supabase
        const { data: existingUsers, error: checkError } = await window.supabaseClient
            .from('users')
            .select('email')
            .eq('email', email);

        if (checkError) {
            console.error('Supabase check error:', checkError);
            showModal('Signup Failed', `Database error: ${checkError.message}. Please try again.`, false);
            return;
        }

        if (existingUsers && existingUsers.length > 0) {
            showModal('Signup Failed', 'An account with this email already exists.', false);
            return;
        }

        // Generate secret phrase and create user account
        const secretPhrase = generateSecretPhrase();
        const newUser = {
            username: username,
            email: email,
            password: password // In a real app, this would be hashed
        };

        // Save user data to Supabase (without secretPhrase to avoid cache issues)
        const { data, error: insertError } = await window.supabaseClient
            .from('users')
            .insert([newUser]);

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            showModal('Signup Failed', `Failed to create account: ${insertError.message}. Please try again.`, false);
            return;
        }

        console.log('User created successfully in Supabase:', data);

        // Update the secretPhrase separately to avoid schema cache issues
        if (data && data[0] && data[0].id) {
            const { error: updateError } = await window.supabaseClient
                .from('users')
                .update({ secretPhrase: secretPhrase })
                .eq('id', data[0].id);

            if (updateError) {
                console.warn('Failed to update secretPhrase, but user was created:', updateError);
                // Continue anyway since user account exists
            }
        }

        // Set current user session
        localStorage.setItem('currentUser', JSON.stringify({
            username: username,
            email: email,
            secretPhrase: secretPhrase
        }));

        // Show success modal with secret phrase
        showModal(
            'Account Created Successfully',
            'Your account has been created! Please save your secret recovery phrase securely.',
            true,
            true,
            secretPhrase
        );

        // Override modal OK button to redirect to dashboard
        modalOkBtn.onclick = () => {
            modal.style.display = 'none';
            // Redirect to dashboard
            window.location.href = 'user.html';
        };
    } catch (err) {
        console.error('Signup error:', err);
        showModal('Signup Failed', `Signup failed: ${err.message}. Please check your Supabase configuration.`, false);
    }
});
