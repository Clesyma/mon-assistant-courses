class PlanningManager {
    static init() {
        this.setupEventListeners();
    }

    static setupEventListeners() {
        // Changement de période
        const periodeSelect = document.getElementById('periode-planning');
        if (periodeSelect) {
            periodeSelect.addEventListener('change', () => {
                this.afficherPlanning();
            });
        }

        // Générer la liste de courses
        const genererBtn = document.getElementById('generer-liste');
        if (genererBtn) {
            genererBtn.addEventListener('click', () => {
                this.genererListeCourses();
            });
        }
    }

    static async afficherPlanning() {
        const periode = document.getElementById('periode-planning').value;
        const container = document.getElementById('vue-planning');
        
        if (!container) return;
        
        container.innerHTML = `<h3>Planning ${periode.charAt(0).toUpperCase() + periode.slice(1)}</h3>`;
        
        try {
            switch(periode) {
                case 'jour':
                    await this.afficherPlanningJour();
                    break;
                case 'semaine':
                    await this.afficherPlanningSemaine();
                    break;
                case 'mois':
                    await this.afficherPlanningMois();
                    break;
            }
        } catch (error) {
            console.error('Erreur lors de l\'affichage du planning:', error);
            container.innerHTML += '<p>Erreur lors du chargement du planning</p>';
        }
    }

    static async afficherPlanningJour() {
        const container = document.getElementById('vue-planning');
        const aujourdhui = new Date().toISOString().split('T')[0];
        
        container.innerHTML += await this.genererHTMLJour(aujourdhui);
    }

    static async afficherPlanningSemaine() {
        const container = document.getElementById('vue-planning');
        const aujourdhui = new Date();
        const lundi = new Date(aujourdhui);
        lundi.setDate(aujourdhui.getDate() - aujourdhui.getDay() + 1);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(lundi);
            date.setDate(lundi.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            container.innerHTML += await this.genererHTMLJour(dateStr);
        }
    }

    static async afficherPlanningMois() {
        const container = document.getElementById('vue-planning');
        const aujourdhui = new Date();
        const premierJour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
        const dernierJour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 1, 0);
        
        for (let date = new Date(premierJour); date <= dernierJour; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            container.innerHTML += await this.genererHTMLJour(dateStr);
        }
    }

    static async genererHTMLJour(dateStr) {
        const date = new Date(dateStr);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateFormatee = date.toLocaleDateString('fr-FR', options);
        
        // Récupérer le planning pour cette date
        const repasDuJour = await DatabaseManager.getPlanningByDate(dateStr);
        
        // Récupérer toutes les recettes pour les select
        const recettes = await DatabaseManager.getAll('recettes');
        
        let html = `
            <div class="jour-planning">
                <h4>${dateFormatee}</h4>
                <div class="repas">
                    <label for="petit-dejeuner-${dateStr}">Petit-déjeuner:</label>
                    <select id="petit-dejeuner-${dateStr}" data-date="${dateStr}" data-repas="petit-dejeuner">
                        <option value="">-- Choisir une recette --</option>
                        ${this.genererOptionsRecettes(recettes, repasDuJour['petit-dejeuner'])}
                    </select>
                </div>
                <div class="repas">
                    <label for="dejeuner-${dateStr}">Déjeuner:</label>
                    <select id="dejeuner-${dateStr}" data-date="${dateStr}" data-repas="dejeuner">
                        <option value="">-- Choisir une recette --</option>
                        ${this.genererOptionsRecettes(recettes, repasDuJour['dejeuner'])}
                    </select>
                </div>
                <div class="repas">
                    <label for="encas-${dateStr}">Encas:</label>
                    <select id="encas-${dateStr}" data-date="${dateStr}" data-repas="encas">
                        <option value="">-- Choisir une recette --</option>
                        ${this.genererOptionsRecettes(recettes, repasDuJour['encas'])}
                    </select>
                </div>
                <div class="repas">
                    <label for="soir-${dateStr}">Dîner:</label>
                    <select id="soir-${dateStr}" data-date="${dateStr}" data-repas="soir">
                        <option value="">-- Choisir une recette --</option>
                        ${this.genererOptionsRecettes(recettes, repasDuJour['soir'])}
                    </select>
                </div>
            </div>
        `;
        
        // Ajouter les écouteurs d'événements après l'insertion
        setTimeout(() => {
            this.ajouterEcouteursSelection(dateStr);
        }, 0);
        
        return html;
    }

    static genererOptionsRecettes(recettes, recetteSelectionnee = '') {
        let options = '<option value="">-- Aucune --</option>';
        
        recettes.forEach(recette => {
            const selected = recette.id === recetteSelectionnee ? 'selected' : '';
            options += `<option value="${recette.id}" ${selected}>${recette.nom}</option>`;
        });
        
        return options;
    }

    static ajouterEcouteursSelection(dateStr) {
        const typesRepas = ['petit-dejeuner', 'dejeuner', 'encas', 'soir'];
        
        typesRepas.forEach(type => {
            const select = document.getElementById(`${type}-${dateStr}`);
            if (select) {
                select.addEventListener('change', (e) => {
                    this.mettreAJourPlanning(dateStr, type, e.target.value);
                });
            }
        });
    }

    static async mettreAJourPlanning(date, repas, recetteId) {
        try {
            // Récupérer le planning actuel pour cette date
            const planningActuel = await DatabaseManager.getPlanningByDate(date);
            
            // Mettre à jour le repas spécifique
            const nouveauPlanning = {
                ...planningActuel,
                [repas]: recetteId || null
            };
            
            // Supprimer les entrées vides
            Object.keys(nouveauPlanning).forEach(key => {
                if (!nouveauPlanning[key]) {
                    delete nouveauPlanning[key];
                }
            });
            
            // Sauvegarder
            await DatabaseManager.updatePlanning(date, nouveauPlanning);
            
            console.log(`Planning mis à jour: ${date} - ${repas} = ${recetteId}`);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du planning:', error);
            alert('Erreur lors de la mise à jour du planning');
        }
    }

    static async genererListeCourses() {
        try {
            await ListeCoursesManager.genererListeParMagasin();
            
            // Basculer vers la page liste de courses
            if (window.App && window.App.showPage) {
                window.App.showPage('liste-courses');
            }
            
            // Notification
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Liste de courses générée!', 'success');
            }
        } catch (error) {
            console.error('Erreur lors de la génération de la liste:', error);
            alert('Erreur lors de la génération de la liste de courses');
        }
    }

    static async getPlanningForPeriod(startDate, endDate) {
        try {
            // Pour une implémentation simple, on récupère tout le planning
            // et on filtre par période
            const allPlanning = await DatabaseManager.getAll('planning');
            
            const planningFiltre = {};
            allPlanning.forEach(item => {
                const itemDate = new Date(item.date);
                if (itemDate >= new Date(startDate) && itemDate <= new Date(endDate)) {
                    planningFiltre[item.date] = item.repas;
                }
            });
            
            return planningFiltre;
        } catch (error) {
            console.error('Erreur lors de la récupération du planning:', error);
            return {};
        }
    }
}

// Initialiser le gestionnaire de planning
document.addEventListener('DOMContentLoaded', () => {
    PlanningManager.init();
});