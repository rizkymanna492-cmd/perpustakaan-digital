async function getUsers() {
    if (window.storage?.loadUsers) {
        return await window.storage.loadUsers();
    }

    try {
        return JSON.parse(localStorage.getItem('users')) || [];
    } catch (error) {
        return [];
    }
}

async function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
    if (window.storage?.saveUsers) {
        await window.storage.saveUsers(users);
    }
}

function saveAuth(user) {
    if (window.storage?.setAuth) {
        window.storage.setAuth(user.role || 'client', user.username);
    } else {
        localStorage.setItem('role', user.role || 'client');
        localStorage.setItem('username', user.username);
    }
    window.location.href = 'dashboard.html';
}

async function register() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    if (username === '' || password === '') {
        alert('Isi semua data');
        return;
    }

    const users = await getUsers();
    const userExists = users.find(user => user.username === username);

    if (userExists) {
        alert('Username sudah digunakan');
        return;
    }

    users.push({
        username,
        password,
        role: 'client'
    });

    await saveUsers(users);

    saveAuth({
        username,
        role: 'client'
    });
}

function showRegister() {
    document.getElementById('registerBox').classList.toggle('hidden');
}

async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('error');

    if (username === '' || password === '') {
        errorEl.innerText = 'Isi username dan password';
        return;
    }

    if (username.toLowerCase() === 'admin' && password === 'admin123') {
        saveAuth({ username: 'admin', role: 'admin' });
        return;
    }

    if (username.toLowerCase() === 'user' && password === 'user123') {
        saveAuth({ username: 'user', role: 'client' });
        return;
    }

    const users = await getUsers();
    const matchedUser = users.find(user => user.username === username && user.password === password);

    if (matchedUser) {
        saveAuth(matchedUser);
        return;
    }

    errorEl.innerText = 'Username atau password salah';
}