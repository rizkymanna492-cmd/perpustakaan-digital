(function () {
    const config = window.SUPABASE_CONFIG || {};
    const supabaseUrl = (config.url || '').trim();
    const supabaseAnonKey = (config.anonKey || '').trim();
    const isConfigured = Boolean(
        supabaseUrl &&
        supabaseAnonKey &&
        supabaseUrl !== 'https://YOUR_PROJECT_REF.supabase.co' &&
        supabaseAnonKey !== 'YOUR_ANON_KEY'
    );

    function getLocalValue(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function setLocalValue(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    async function requestSupabase(tableName, options = {}) {
        if (!isConfigured) {
            throw new Error('Supabase belum dikonfigurasi');
        }

        const headers = {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
        };

        const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*`, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Supabase request gagal');
        }

        return response.status === 204 ? null : response.json();
    }

    async function loadCollection(name, fallback = []) {
        const localValue = getLocalValue(name, fallback);
        if (!isConfigured) {
            return localValue;
        }

        try {
            const data = await requestSupabase(name);
            if (Array.isArray(data)) {
                setLocalValue(name, data);
                return data;
            }
        } catch (error) {
            console.warn(`Gagal memuat ${name} dari Supabase, memakai data lokal`, error);
        }

        return localValue;
    }

    async function saveCollection(name, value) {
        setLocalValue(name, value);
        if (!isConfigured) {
            return value;
        }

        try {
            await requestSupabase(name, {
                method: 'DELETE',
                headers: {
                    Prefer: 'return=minimal'
                }
            });

            const payload = Array.isArray(value) ? value : [];
            if (payload.length > 0) {
                await requestSupabase(name, {
                    method: 'POST',
                    headers: {
                        Prefer: 'return=minimal'
                    },
                    body: JSON.stringify(payload)
                });
            }
            return value;
        } catch (error) {
            console.warn(`Gagal menyimpan ${name} ke Supabase, memakai penyimpanan lokal`, error);
            return value;
        }
    }

    function setAuth(role, username) {
        localStorage.setItem('role', role);
        localStorage.setItem('username', username);
    }

    function getAuth() {
        return {
            role: localStorage.getItem('role'),
            username: localStorage.getItem('username')
        };
    }

    function clearAuth() {
        localStorage.removeItem('role');
        localStorage.removeItem('username');
    }

    window.storage = {
        loadCollection,
        saveCollection,
        loadBooks: () => loadCollection('books', []),
        saveBooks: (books) => saveCollection('books', books),
        loadUsers: () => loadCollection('users', []),
        saveUsers: (users) => saveCollection('users', users),
        loadTransactions: () => loadCollection('transactions', []),
        saveTransactions: (transactions) => saveCollection('transactions', transactions),
        setAuth,
        getAuth,
        clearAuth
    };
})();
