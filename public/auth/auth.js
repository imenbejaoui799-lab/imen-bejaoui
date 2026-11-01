/* agrix-frontend/public/auth/auth.js */

// Configuration
const API_URL = 'http://localhost:8000/api'; // À adapter à votre backend

// --- Utilitaires ---
function showMessage(message, type = 'error') {
    const msgElement = document.getElementById('message');
    msgElement.textContent = message;
    msgElement.className = `message ${type}`;
    msgElement.style.display = 'block';

    // Masquer après 5 secondes
    clearTimeout(window.messageTimeout);
    window.messageTimeout = setTimeout(() => {
        msgElement.style.display = 'none';
    }, 5000);
}

function setLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    if (isLoading) {
        btn.disabled = true;
        btn.textContent = btn.id === 'loginBtn' ? 'Connexion...' : 'Inscription...';
    } else {
        btn.disabled = false;
        btn.textContent = btn.id === 'loginBtn' ? 'Se connecter' : 'Créer mon compte';
    }
}

// --- Gestion du token ---
function setAuthToken(token) {
    if (token) {
        localStorage.setItem('agrix_token', token);
    } else {
        localStorage.removeItem('agrix_token');
    }
}

function getAuthToken() {
    return localStorage.getItem('agrix_token');
}

// --- Fonctions API ---
async function login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return response.json();
}

async function register(fullName, email, password) {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
    });
    return response.json();
}

async function getMe() {
    const token = getAuthToken();
    if (!token) throw new Error('Non authentifié');

    const response = await fetch(`${API_URL}/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    return response.json();
}

// --- Gestion de la connexion ---
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        showMessage('Veuillez remplir tous les champs', 'error');
        return;
    }

    setLoading('loginBtn', true);

    try {
        const data = await login(email, password);
        
        if (data.error) {
            showMessage(data.error, 'error');
            setLoading('loginBtn', false);
            return;
        }

        // Stocker le token
        setAuthToken(data.token);
        showMessage('✅ Connexion réussie !', 'success');

        // Rediriger vers le tableau de bord
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1500);
    } catch (error) {
        showMessage('Erreur de connexion au serveur', 'error');
        setLoading('loginBtn', false);
    }
}

// --- Gestion de l'inscription ---
async function handleRegister(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!fullName || !email || !password) {
        showMessage('Tous les champs sont requis', 'error');
        return;
    }

    if (password.length < 8) {
        showMessage('Le mot de passe doit faire au moins 8 caractères', 'error');
        return;
    }

    setLoading('registerBtn', true);

    try {
        const data = await register(fullName, email, password);
        
        if (data.error) {
            showMessage(data.error, 'error');
            setLoading('registerBtn', false);
            return;
        }

        if (data.errors) {
            showMessage(data.errors.join(', '), 'error');
            setLoading('registerBtn', false);
            return;
        }

        showMessage('✅ Compte créé avec succès !', 'success');

        // Rediriger vers la page de connexion
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } catch (error) {
        showMessage('Erreur de connexion au serveur', 'error');
        setLoading('registerBtn', false);
    }
}

// --- Mot de passe oublié ---
function handleForgotPassword(event) {
    event.preventDefault();
    showMessage('🔐 Un lien de réinitialisation vous sera envoyé par email.', 'success');
}

// --- Vérification de l'authentification ---
async function checkAuth() {
    const token = getAuthToken();
    if (!token) return false;

    try {
        const data = await getMe();
        return data.user ? true : false;
    } catch (error) {
        setAuthToken(null);
        return false;
    }
}

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', function() {
    // Page actuelle
    const currentPage = window.location.pathname;

    // Vérifier l'authentification
    checkAuth().then(isAuth => {
        // Si l'utilisateur est déjà connecté et qu'il est sur une page d'auth
        if (isAuth && (currentPage.includes('login.html') || currentPage.includes('register.html'))) {
            window.location.href = '/dashboard.html';
        }
    });

    // Attacher les événements
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    const forgotLink = document.getElementById('forgotPassword');
    if (forgotLink) {
        forgotLink.addEventListener('click', handleForgotPassword);
    }
});