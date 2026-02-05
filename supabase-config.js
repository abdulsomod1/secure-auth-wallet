// Supabase configuration
const SUPABASE_URL = 'https://ypvbymwnlpuhfuczsqza.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdmJ5bXdubHB1aGZ1Y3pzcXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTQ2OTcsImV4cCI6MjA4NTg3MDY5N30.83Fc4XdbDKNlvkds8xJrLkGWtjFkX9IxUqwPB5q1YG8';

// Initialize Supabase client immediately
let supabase = null;

function initializeSupabase() {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.supabaseClient = supabase;
            console.log('✅ Supabase client initialized successfully');
            return true;
        } else {
            console.warn('⚠️ Supabase library not loaded');
            return false;
        }
    } catch (error) {
        console.error('❌ Supabase initialization error:', error);
        return false;
    }
}

// Initialize immediately
initializeSupabase();

// Set up a retry mechanism if initialization fails
if (!window.supabaseClient) {
    let retryCount = 0;
    const maxRetries = 10;

    const retryInterval = setInterval(() => {
        retryCount++;
        console.log(`🔄 Retrying Supabase initialization (attempt ${retryCount}/${maxRetries})`);

        if (initializeSupabase()) {
            clearInterval(retryInterval);
            console.log('✅ Supabase client initialized on retry');
        } else if (retryCount >= maxRetries) {
            clearInterval(retryInterval);
            console.error('❌ Failed to initialize Supabase client after', maxRetries, 'attempts');
            window.supabaseClient = null;
        }
    }, 1000);
}
