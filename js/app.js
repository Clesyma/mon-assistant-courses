// Gestionnaire principal de l'application
class App {
    constructor() {
        this.isInitialized = false;
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Afficher le loader
            this.showLoader();
            
            // Vérifier l'authentification
            await this.checkAuth();
            
            // Initialiser la base de données
            await DatabaseManager.init(AuthManager.currentUser);
            
            // Initialiser l'interface
            this.setupNavigation();
            this.setupGlobalEventListeners();
            
            // Configurer la synchronisation
            this.setupSync();
            
            // Afficher l'interface principale
            this.showMainInterface();
            
            // Cacher le loader
            this.hideLoader();
            
            this.isInitialized = true;
            console.log('Application initialisée avec succès', DatabaseManager.getStatus());
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            this.handleInitializationError(error);
        }
    }

    async checkAuth() {
        return new Promise((resolve, reject) => {
            // Vérifier si on est sur la page de login
            if (window.location.pathname.includes('login.html')) {
                resolve();
                return;
            }

            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                if (user) {
                    AuthManager.currentUser = user;
                    resolve(user);
                } else {
                    this.redirectToLogin();
                    reject(new Error('Utilisateur non authentifié'));
                }
            }, (error) => {
                unsubscribe();
                console.warn('Erreur auth, mode local activé:', error);
                AuthManager.currentUser = null;
                resolve(); // Continuer en mode local
            });
        });
    }

    setupNavigation() {
        // Navigation principale
        const navLinks = document.querySelectorAll('nav a[data-page]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.getAttribute('data-page');
                this.showPage(pageId);
            });
        });

        // Bouton de déconnexion
        this.addLogoutButton();
        
        // Indicateur de statut
        this.addStatusIndicator();
    }

    addLogoutButton() {
        const nav = document.querySelector('nav ul');
        if (!nav) return;
        
        // Vérifier si le bouton existe déjà
        if (document.getElementById('logout-btn')) return;
        
        const logoutItem = document.createElement('li');
        logoutItem.innerHTML = '<a href="#" id="logout-btn">Déconnexion</a>';
        nav.appendChild(logoutItem);

        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }

    addStatusIndicator() {
        const header = document.querySelector('header');
        if (!header) return;
        
        const statusDiv = document.createElement('div');
        statusDiv.id = 'status-indicator';
        statusDiv.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            background: #7f8c8d;
            color: white;
        `;
        
        header.style.position = 'relative';
        header.appendChild(statusDiv);
        
        this.updateStatusIndicator();
    }

    updateStatusIndicator() {
        const statusDiv = document.getElementById('status-indicator');
        if (!statusDiv) return;
        
        const status = DatabaseManager.getStatus();
        
        if (status.mode === 'cloud') {
            statusDiv.textContent = '☁️ En ligne';
            statusDiv.style.background = '#27ae60';
        } else {
            statusDiv.textContent = '💾 Local';
            statusDiv.style.background = '#e67e22';
        }
    }

    setupGlobalEventListeners() {
        // Impression
        const imprimerBtn = document.getElementById('imprimer-liste');
        if (imprimerBtn) {
            imprimerBtn.addEventListener('click', () => {
                window.print();
            });
        }

        // Gestion de la connexion/réseau
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });

        // Synchronisation manuelle
        this.addSyncButton();
    }

    addSyncButton() {
        const controls = document.querySelector('.controls');
        if (!controls) return;
        
        const syncBtn = document.createElement('button');
        syncBtn.id = 'sync-btn';
        syncBtn.innerHTML = '🔄 Synchroniser';
        syncBtn.addEventListener('click', () => {
            this.manualSync();
        });
        
        controls.appendChild(syncBtn);
    }

    async manualSync() {
        if (!DatabaseManager.useCloud) {
            alert('Mode local - Pas de synchronisation disponible');
            return;
        }
        
        try {
            this.showNotification('Synchronisation en cours...', 'info');
            await DatabaseManager.syncLocalToCloud();
            this.showNotification('Synchronisation terminée!', 'success');
            this.updateStatusIndicator();
        } catch (error) {
            console.error('Erreur synchronisation manuelle:', error);
            this.showNotification('Erreur de synchronisation', 'error');
        }
    }

    setupSync() {
        if (!DatabaseManager.useCloud) return;
        
        // Synchronisation automatique au démarrage
        setTimeout(() => {
            DatabaseManager.syncLocalToCloud();
        }, 2000);
        
        // Écouteurs temps réel
        DatabaseManager.onRecettesChange((recettes) => {
            console.log('Recettes mises à jour en temps réel:', recettes.length);
            if (document.getElementById('recettes')?.classList.contains('active')) {
                RecettesManager.afficherRecettes();
            }
        });
        
        DatabaseManager.onPlanningChange((planning) => {
            console.log('Planning mis à jour en temps réel');
            if (document.getElementById('planning')?.classList.contains('active')) {
                PlanningManager.afficherPlanning();
            }
        });
    }

    showPage(pageId) {
        // Masquer toutes les pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Afficher la page sélectionnée
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.updatePageData(pageId);
        } else {
            console.error('Page non trouvée:', pageId);
        }
    }

    async updatePageData(pageId) {
        try {
            switch(pageId) {
                case 'recettes':
                    await RecettesManager.afficherRecettes();
                    break;
                case 'planning':
                    await PlanningManager.afficherPlanning();
                    break;
                case 'stock':
                    await StockManager.afficherStock();
                    break;
                case 'magasins':
                    await MagasinsManager.afficherMagasins();
                    await MagasinsManager.afficherPrix();
                    break;
                case 'liste-courses':
                    await ListeCoursesManager.genererListeParMagasin();
                    break;
            }
        } catch (error) {
            console.error(`Erreur lors du chargement de la page ${pageId}:`, error);
            this.showError(`Erreur de chargement: ${error.message}`);
        }
    }

    showMainInterface() {
        // Cacher le loader de démarrage
        const startupLoader = document.getElementById('startup-loader');
        if (startupLoader) {
            startupLoader.style.display = 'none';
        }
        
        // Afficher l'interface principale
        const mainInterface = document.querySelector('header, main');
        if (mainInterface) {
            mainInterface.style.display = 'block';
        }
        
        // Afficher la première page
        this.showActivePage();
    }

    showActivePage() {
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            this.updatePageData(activePage.id);
        } else {
            // Afficher la première page par défaut
            this.showPage('recettes');
        }
    }

    async logout() {
        try {
            if (AuthManager.currentUser) {
                await auth.signOut();
            }
            this.redirectToLogin();
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    handleOnline() {
        console.log('Connexion rétablie');
        this.showNotification('Connexion rétablie', 'success');
        
        if (AuthManager.currentUser && !DatabaseManager.useCloud) {
            // Rebasculer en mode cloud si un utilisateur est connecté
            DatabaseManager.init(AuthManager.currentUser)
                .then(() => {
                    this.updateStatusIndicator();
                    this.showNotification('Mode cloud activé', 'success');
                })
                .catch(error => {
                    console.error('Erreur rebasculement cloud:', error);
                });
        }
    }

    handleOffline() {
        console.log('Connexion perdue');
        this.showNotification('Mode hors-ligne activé', 'warning');
        this.updateStatusIndicator();
    }

    handleInitializationError(error) {
        this.hideLoader();
        
        if (window.location.pathname.includes('login.html')) {
            return; // Sur la page login, on laisse gérer auth.js
        }
        
        // Afficher une interface de secours
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h1>😕 Erreur de chargement</h1>
                <p>L'application n'a pas pu démarrer correctement.</p>
                <p><small>${error.message}</small></p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin: 10px;">Réessayer</button>
                <button onclick="window.location.href='login.html'" style="padding: 10px 20px; margin: 10px;">Page de connexion</button>
            </div>
        `;
    }

    showLoader() {
        // Créer le loader s'il n'existe pas
        if (!document.getElementById('startup-loader')) {
            const loader = document.createElement('div');
            loader.id = 'startup-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #2c3e50;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: white;
                z-index: 9999;
                font-family: Arial, sans-serif;
            `;
            loader.innerHTML = `
                <div style="text-align: center;">
                    <h1 style="margin-bottom: 20px;">Mon Assistant Courses</h1>
                    <div style="width: 50px; height: 50px; border: 5px solid #3498db; border-top: 5px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 20px;">Chargement...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loader);
        }
        
        // Cacher l'interface principale pendant le chargement
        const mainElements = document.querySelector('header, main');
        if (mainElements) {
            mainElements.style.display = 'none';
        }
    }

    hideLoader() {
        const loader = document.getElementById('startup-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Créer la notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;
        
        // Couleur selon le type
        const colors = {
            info: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-suppression après 5 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        // Style d'animation
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Service Worker pour PWA (optionnel)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW enregistré:', registration);
            })
            .catch(error => {
                console.log('Échec enregistrement SW:', error);
            });
    });
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si on est sur la page login
    if (window.location.pathname.includes('login.html')) {
        // Laisser auth.js gérer l'initialisation
        console.log('Page de login - Initialisation par auth.js');
    } else {
        // Initialiser l'application principale
        new App();
    }
});

// Exposer l'application globalement pour le débogage
window.App = App;
window.DatabaseManager = DatabaseManager;
