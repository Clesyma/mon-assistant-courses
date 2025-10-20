class MagasinsManager {
    static init() {
        this.setupEventListeners();
        this.mettreAJourSelectMagasins();
    }

    static setupEventListeners() {
        // Formulaire d'ajout de magasin
        const magasinForm = document.getElementById('magasin-form');
        if (magasinForm) {
            magasinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.ajouterMagasin();
            });
        }

        // Formulaire d'ajout de prix
        const prixForm = document.getElementById('prix-form');
        if (prixForm) {
            prixForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.ajouterPrix();
            });
        }
    }

    static async ajouterMagasin() {
        try {
            const nom = document.getElementById('nom-magasin').value.trim();
            
            if (!nom) {
                alert('Veuillez entrer un nom de magasin');
                return;
            }
            
            // Vérifier si le magasin existe déjà
            const magasins = await DatabaseManager.getAll('magasins');
            if (magasins.some(m => m.nom.toLowerCase() === nom.toLowerCase())) {
                alert('Ce magasin existe déjà');
                return;
            }
            
            await DatabaseManager.add('magasins', { 
                nom,
                dateCreation: new Date().toISOString()
            });
            
            await this.afficherMagasins();
            this.mettreAJourSelectMagasins();
            document.getElementById('magasin-form').reset();
            
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Magasin ajouté avec succès!', 'success');
            } else {
                alert('Magasin ajouté avec succès!');
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout du magasin:', error);
            alert('Erreur lors de l\'ajout du magasin: ' + error.message);
        }
    }

    static async afficherMagasins() {
        try {
            const container = document.getElementById('liste-magasins');
            if (!container) return;
            
            const magasins = await DatabaseManager.getAll('magasins');
            
            if (magasins.length === 0) {
                container.innerHTML = '<p>Aucun magasin enregistré</p>';
                return;
            }
            
            container.innerHTML = '<h3>Liste des Magasins</h3>';
            
            magasins.forEach(magasin => {
                const div = document.createElement('div');
                div.className = 'magasin-item';
                
                const dateCreation = new Date(magasin.dateCreation).toLocaleDateString('fr-FR');
                
                div.innerHTML = `
                    <div>
                        <strong>${magasin.nom}</strong>
                        <br><small>Créé le: ${dateCreation}</small>
                    </div>
                    <div class="magasin-actions">
                        <button class="supprimer-magasin" data-id="${magasin.id}">Supprimer</button>
                    </div>
                `;
                
                container.appendChild(div);
            });
            
            // Ajouter les écouteurs d'événements
            container.querySelectorAll('.supprimer-magasin').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const magasinId = e.target.getAttribute('data-id');
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce magasin ?')) {
                        await this.supprimerMagasin(magasinId);
                    }
                });
            });
        } catch (error) {
            console.error('Erreur lors du chargement des magasins:', error);
        }
    }

    static async supprimerMagasin(id) {
        try {
            // Supprimer le magasin
            await DatabaseManager.delete('magasins', id);
            
            // Supprimer les prix associés à ce magasin
            const tousLesPrix = await DatabaseManager.getAll('prix');
            const prixASupprimer = tousLesPrix.filter(prix => prix.magasinId === id);
            
            for (const prix of prixASupprimer) {
                await DatabaseManager.delete('prix', [prix.ingredient, prix.magasinId]);
            }
            
            await this.afficherMagasins();
            await this.afficherPrix();
            this.mettreAJourSelectMagasins();
            
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Magasin supprimé avec succès!', 'success');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('Erreur lors de la suppression du magasin');
        }
    }

    static async mettreAJourSelectMagasins() {
        try {
            const select = document.getElementById('magasin-prix');
            if (!select) return;
            
            const magasins = await DatabaseManager.getAll('magasins');
            
            select.innerHTML = '<option value="">Choisir un magasin</option>';
            
            magasins.forEach(magasin => {
                select.innerHTML += `<option value="${magasin.id}">${magasin.nom}</option>`;
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour des magasins:', error);
        }
    }

    static async ajouterPrix() {
        try {
            const magasinId = document.getElementById('magasin-prix').value;
            const ingredient = document.getElementById('ingredient-prix').value.trim();
            const prix = parseFloat(document.getElementById('prix').value);
            const rayon = document.getElementById('rayon-prix').value.trim();
            
            if (!magasinId || !ingredient || isNaN(prix) || prix <= 0 || !rayon) {
                alert('Veuillez remplir tous les champs correctement');
                return;
            }
            
            const prixData = {
                ingredient,
                magasinId,
                prix,
                rayon,
                dateMAJ: new Date().toISOString()
            };
            
            await DatabaseManager.updatePrix(prixData);
            
            await this.afficherPrix();
            document.getElementById('prix-form').reset();
            
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Prix enregistré avec succès!', 'success');
            } else {
                alert('Prix enregistré avec succès!');
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout du prix:', error);
            alert('Erreur lors de l\'enregistrement du prix: ' + error.message);
        }
    }

    static async afficherPrix() {
        try {
            const container = document.getElementById('liste-prix');
            if (!container) return;
            
            const tousLesPrix = await DatabaseManager.getAll('prix');
            const magasins = await DatabaseManager.getAll('magasins');
            
            if (tousLesPrix.length === 0) {
                container.innerHTML = '<p>Aucun prix enregistré</p>';
                return;
            }
            
            // Grouper les prix par ingrédient
            const prixParIngredient = {};
            tousLesPrix.forEach(prix => {
                if (!prixParIngredient[prix.ingredient]) {
                    prixParIngredient[prix.ingredient] = [];
                }
                prixParIngredient[prix.ingredient].push(prix);
            });
            
            container.innerHTML = '<h3>Prix des Ingrédients</h3>';
            
            Object.keys(prixParIngredient).sort().forEach(ingredient => {
                const div = document.createElement('div');
                div.className = 'prix-item';
                
                let prixHTML = '';
                prixParIngredient[ingredient]
                    .sort((a, b) => a.prix - b.prix)
                    .forEach(prix => {
                        const magasin = magasins.find(m => m.id == prix.magasinId);
                        if (magasin) {
                            const dateMAJ = new Date(prix.dateMAJ).toLocaleDateString('fr-FR');
                            prixHTML += `
                                <div class="prix-detail">
                                    <span class="magasin-nom">${magasin.nom}</span>: 
                                    <span class="prix-valeur">${prix.prix.toFixed(2)}€</span>
                                    <span class="rayon">(${prix.rayon})</span>
                                    <small class="date-maj">MAJ: ${dateMAJ}</small>
                                    <button class="supprimer-prix" data-ingredient="${prix.ingredient}" data-magasin="${prix.magasinId}">×</button>
                                </div>
                            `;
                        }
                    });
                
                div.innerHTML = `
                    <div class="ingredient-prix">
                        <strong>${ingredient}</strong>
                        <div class="prix-list">${prixHTML}</div>
                    </div>
                `;
                
                container.appendChild(div);
            });
            
            // Ajouter les écouteurs d'événements pour la suppression des prix
            container.querySelectorAll('.supprimer-prix').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const ingredient = e.target.getAttribute('data-ingredient');
                    const magasinId = e.target.getAttribute('data-magasin');
                    
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce prix ?')) {
                        await this.supprimerPrix(ingredient, magasinId);
                    }
                });
            });
        } catch (error) {
            console.error('Erreur lors du chargement des prix:', error);
        }
    }

    static async supprimerPrix(ingredient, magasinId) {
        try {
            await DatabaseManager.delete('prix', [ingredient, magasinId]);
            await this.afficherPrix();
            
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Prix supprimé avec succès!', 'success');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du prix:', error);
            alert('Erreur lors de la suppression du prix');
        }
    }

    static async getPrixParMagasin(ingredient) {
        try {
            const prix = await DatabaseManager.getPrixByIngredient(ingredient);
            const result = {};
            
            prix.forEach(p => {
                result[p.magasinId] = {
                    prix: p.prix,
                    rayon: p.rayon
                };
            });
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la récupération des prix:', error);
            return {};
        }
    }

    static async getMeilleurPrix(ingredient) {
        try {
            const prix = await DatabaseManager.getPrixByIngredient(ingredient);
            const magasins = await DatabaseManager.getAll('magasins');
            
            if (prix.length === 0) {
                return null;
            }
            
            let meilleurPrix = null;
            
            prix.forEach(p => {
                const magasin = magasins.find(m => m.id == p.magasinId);
                if (magasin && (!meilleurPrix || p.prix < meilleurPrix.prix)) {
                    meilleurPrix = {
                        magasin: magasin,
                        prix: p.prix,
                        rayon: p.rayon
                    };
                }
            });
            
            return meilleurPrix;
        } catch (error) {
            console.error('Erreur lors de la recherche du meilleur prix:', error);
            return null;
        }
    }

    static async getAllMagasins() {
        return await DatabaseManager.getAll('magasins');
    }
}

// Initialiser le gestionnaire de magasins
document.addEventListener('DOMContentLoaded', () => {
    MagasinsManager.init();
});