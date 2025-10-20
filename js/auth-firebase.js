import { 
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import { 
    db,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

class FirebaseAuth {
    static currentUser = null;

    static init() {
        this.setupEventListeners();
        this.setupAuthStateListener();
    }

    static setupEventListeners() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }
    }

    static setupAuthStateListener() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                console.log('Utilisateur connecté:', user.email);
                
                if (window.location.pathname.includes('login.html')) {
                    setTimeout(() => this.redirectToApp(), 1000);
                }
            } else {
                this.currentUser = null;
                console.log('Utilisateur déconnecté');
                
                if (!window.location.pathname.includes('login.html')) {
                    this.redirectToLogin();
                }
            }
        }, (error) => {
            console.error('Erreur auth state:', error);
            this.showError('Erreur de connexion');
        });
    }

    static switchTab(tabName) {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');

        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        const activeForm = document.getElementById(`${tabName}-form`);
        if (activeForm) activeForm.classList.add('active');

        this.hideError();
    }

    static async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            this.showLoading(true, 'login');
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            this.showError(this.getErrorMessage(error));
        } finally {
            this.showLoading(false, 'login');
        }
    }

    static async register() {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (password !== confirm) {
            this.showError("Les mots de passe ne correspondent pas");
            return;
        }

        if (password.length < 6) {
            this.showError("Le mot de passe doit contenir au moins 6 caractères");
            return;
        }

        try {
            this.showLoading(true, 'register');
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                createdAt: serverTimestamp(),
                settings: {
                    theme: 'light',
                    language: 'fr'
                }
            });
            
            this.showSuccess("Compte créé avec succès !");
            
        } catch (error) {
            this.showError(this.getErrorMessage(error));
        } finally {
            this.showLoading(false, 'register');
        }
    }

    static async logout() {
        try {
            await signOut(auth);
            this.redirectToLogin();
        } catch (error) {
            console.error('Erreur déconnexion:', error);
            this.showError('Erreur lors de la déconnexion');
        }
    }

    static redirectToApp() {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }

    static redirectToLogin() {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    static showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.background = '#e74c3c';
            errorDiv.style.color = 'white';
        }
    }

    static showSuccess(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.background = '#27ae60';
            errorDiv.style.color = 'white';
        }
    }

    static hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    static showLoading(show, formType) {
        const loginBtn = document.querySelector('#loginForm button');
        const registerBtn = document.querySelector('#registerForm button');
        
        if (formType === 'login' && loginBtn) {
            loginBtn.disabled = show;
            loginBtn.textContent = show ? 'Connexion...' : 'Se connecter';
        }
        
        if (formType === 'register' && registerBtn) {
            registerBtn.disabled = show;
            registerBtn.textContent = show ? 'Création...' : 'Créer un compte';
        }
    }

    static getErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return "Email invalide";
            case 'auth/user-not-found':
                return "Aucun compte trouvé avec cet email";
            case 'auth/wrong-password':
                return "Mot de passe incorrect";
            case 'auth/email-already-in-use':
                return "Un compte existe déjà avec cet email";
            case 'auth/weak-password':
                return "Le mot de passe est trop faible";
            case 'auth/network-request-failed':
                return "Erreur de réseau. Vérifiez votre connexion internet";
            default:
                return "Une erreur est survenue. Veuillez réessayer.";
        }
    }

    static getCurrentUser() {
        return this.currentUser;
    }

    static isAuthenticated() {
        return this.currentUser !== null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    FirebaseAuth.init();
});

window.FirebaseAuth = FirebaseAuth;
window.AuthManager = FirebaseAuth;