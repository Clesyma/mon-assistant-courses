class RecettesManager {
    static init() {
        this.setupEventListeners();
    }

    static setupEventListeners() {
        // Bouton pour ajouter une recette
        const ajouterBtn = document.getElementById('ajouter-recette');
        if (ajouterBtn) {
            ajouterBtn.addEventListener('click', () => {
                this.afficherFormulaire();
            });
        }

        // Bouton pour modifier une recette
        const modifierBtn = document.getElementById('modifier-recette');
        if (modifierBtn) {
            modifierBtn.addEventListener('click', () => {
                this.afficherFormulaireModification();
            });
        }

        // Bouton pour ajouter un ingrédient
        const ajouterIngredientBtn = document.getElementById('ajouter-ingredient');
        if (ajouterIngredientBtn) {
            ajouterIngredientBtn.addEventListener('click', () => {
                this.ajouterChampIngredient();
            });
        }

        // Formulaire de recette
        const recetteForm = document.getElementById('recette-form');
        if (recetteForm) {
            recetteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.enregistrerRecette();
            });
        }

        // Annuler l'ajout/modification
        const annulerBtn = document.getElementById('annuler-recette');
        if (annulerBtn) {
            annulerBtn.addEventListener('click', () => {
                this.cacherFormulaire();
            });
        }
    }

    static afficherFormulaire(recette = null) {
        const formulaire = document.getElementById('formulaire-recette');
        if (!formulaire) return;
        
        const titre = formulaire.querySelector('h3');
        
        if (recette) {
            titre.textContent = 'Modifier la Recette';
            document.getElementById('recette-id').value = recette.id;
            document.getElementById('nom-recette').value = recette.nom;
            document.getElementById('type-recette').value = recette.type;
            
            // Vider les ingrédients existants
            const container = document.getElementById('ingredients-container');
            const ingredientsDivs = container.querySelectorAll('.ingredient');
            ingredientsDivs.forEach((div, index) => {
                if (index > 0) div.remove();
            });
            
            // Remplir les ingrédients
            const premierIngredient = container.querySelector('.ingredient');
            if (premierIngredient && recette.ingredients && recette.ingredients[0]) {
                premierIngredient.querySelector('.nom-ingredient').value = recette.ingredients[0].nom || '';
                premierIngredient.querySelector('.quantite-ingredient').value = recette.ingredients[0].quantite || '';
                premierIngredient.querySelector('.unite-ingredient').value = recette.ingredients[0].unite || 'g';
            }
            
            // Ajouter les autres ingrédients
            if (recette.ingredients) {
                recette.ingredients.slice(1).forEach(ingredient => {
                    this.ajouterChampIngredient(ingredient);
                });
            }
        } else {
            titre.textContent = 'Nouvelle Recette';
            this.reinitialiserFormulaire();
        }
        
        formulaire.style.display = 'block';
    }

    static async afficherFormulaireModification() {
        try {
            const recettes = await DatabaseManager.getAll('recettes');
            
            if (recettes.length === 0) {
                alert('Aucune recette à modifier');
                return;
            }
            
            let selectHTML = '<option value="">Choisir une recette</option>';
            recettes.forEach(recette => {
                selectHTML += `<option value="${recette.id}">${recette.nom}</option>`;
            });
            
            const recetteId = prompt('Choisir une recette à modifier:', selectHTML);
            if (recetteId) {
                const recette = await DatabaseManager.get('recettes', recetteId);
                if (recette) {
                    this.afficherFormulaire(recette);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la modification:', error);
            alert('Erreur lors du chargement des recettes');
        }
    }

    static reinitialiserFormulaire() {
        const form = document.getElementById('recette-form');
        if (form) {
            form.reset();
        }
        
        document.getElementById('recette-id').value = '';
        
        // Réinitialiser les ingrédients (garder seulement le premier)
        const container = document.getElementById('ingredients-container');
        if (!container) return;
        
        const ingredientsDivs = container.querySelectorAll('.ingredient');
        ingredientsDivs.forEach((div, index) => {
            if (index > 0) div.remove();
        });
        
        const premierIngredient = container.querySelector('.ingredient');
        if (premierIngredient) {
            premierIngredient.querySelector('.nom-ingredient').value = '';
            premierIngredient.querySelector('.quantite-ingredient').value = '';
            premierIngredient.querySelector('.unite-ingredient').value = 'g';
        }
    }

    static ajouterChampIngredient(ingredient = null) {
        const container = document.getElementById('ingredients-container');
        if (!container) return;
        
        const nouveauIngredient = document.createElement('div');
        nouveauIngredient.className = 'ingredient';
        
        nouveauIngredient.innerHTML = `
            <input type="text" placeholder="Nom de l'ingrédient" class="nom-ingredient" value="${ingredient?.nom || ''}">
            <input type="number" placeholder="Quantité" class="quantite-ingredient" min="0" step="0.01" value="${ingredient?.quantite || ''}">
            <select class="unite-ingredient">
                <option value="g" ${(ingredient?.unite || 'g') === 'g' ? 'selected' : ''}>g</option>
                <option value="kg" ${(ingredient?.unite || 'g') === 'kg' ? 'selected' : ''}>kg</option>
                <option value="ml" ${(ingredient?.unite || 'g') === 'ml' ? 'selected' : ''}>ml</option>
                <option value="L" ${(ingredient?.unite || 'g') === 'L' ? 'selected' : ''}>L</option>
                <option value="unite" ${(ingredient?.unite || 'g') === 'unite' ? 'selected' : ''}>unité(s)</option>
                <option value="cac" ${(ingredient?.unite || 'g') === 'cac' ? 'selected' : ''}>c.à.c</option>
                <option value="cas" ${(ingredient?.unite || 'g') === 'cas' ? 'selected' : ''}>c.à.s</option>
            </select>
            <button type="button" class="supprimer-ingredient">-</button>
        `;
        
        container.appendChild(nouveauIngredient);
        
        // Ajouter l'écouteur d'événement pour le bouton de suppression
        nouveauIngredient.querySelector('.supprimer-ingredient').addEventListener('click', () => {
            nouveauIngredient.remove();
        });
    }

    static async enregistrerRecette() {
        try {
            const id = document.getElementById('recette-id').value;
            const nom = document.getElementById('nom-recette').value;
            const type = document.getElementById('type-recette').value;
            
            if (!nom || !type) {
                alert('Veuillez remplir le nom et le type de recette');
                return;
            }
            
            // Récupérer les ingrédients
            const ingredients = [];
            document.querySelectorAll('.ingredient').forEach(div => {
                const nomIngredient = div.querySelector('.nom-ingredient').value;
                const quantite = parseFloat(div.querySelector('.quantite-ingredient').value);
                const unite = div.querySelector('.unite-ingredient').value;
                
                if (nomIngredient && !isNaN(quantite) && quantite > 0) {
                    ingredients.push({ nom: nomIngredient, quantite, unite });
                }
            });
            
            if (ingredients.length === 0) {
                alert('Veuillez ajouter au moins un ingrédient valide');
                return;
            }
            
            const recetteData = { 
                nom, 
                type, 
                ingredients,
                dateMAJ: new Date().toISOString()
            };
            
            if (id) {
                // Modification
                recetteData.id = id;
                await DatabaseManager.update('recettes', recetteData);
            } else {
                // Nouvelle recette
                await DatabaseManager.add('recettes', recetteData);
            }
            
            await this.afficherRecettes();
            this.cacherFormulaire();
            
            // Notification de succès
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Recette enregistrée avec succès!', 'success');
            } else {
                alert('Recette enregistrée avec succès!');
            }
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            alert('Erreur lors de l\'enregistrement de la recette: ' + error.message);
        }
    }

    static cacherFormulaire() {
        const formulaire = document.getElementById('formulaire-recette');
        if (formulaire) {
            formulaire.style.display = 'none';
        }
    }

    static async afficherRecettes() {
        try {
            const container = document.getElementById('liste-recettes');
            if (!container) return;
            
            const recettes = await DatabaseManager.getAll('recettes');
            
            if (recettes.length === 0) {
                container.innerHTML = '<p>Aucune recette enregistrée</p>';
                return;
            }
            
            container.innerHTML = '<h3>Liste des Recettes</h3>';
            
            recettes.forEach(recette => {
                const div = document.createElement('div');
                div.className = 'recette-item';
                
                let ingredientsHTML = '';
                if (recette.ingredients && recette.ingredients.length > 0) {
                    ingredientsHTML = recette.ingredients.map(ing => 
                        `${ing.nom}: ${ing.quantite} ${ing.unite}`
                    ).join(', ');
                }
                
                div.innerHTML = `
                    <div>
                        <strong>${recette.nom}</strong> (${recette.type})<br>
                        <small>${ingredientsHTML}</small>
                    </div>
                    <div class="recette-actions">
                        <button class="modifier" data-id="${recette.id}">Modifier</button>
                        <button class="supprimer" data-id="${recette.id}">Supprimer</button>
                    </div>
                `;
                
                container.appendChild(div);
            });
            
            // Ajouter les écouteurs d'événements pour les boutons
            container.querySelectorAll('.modifier').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const recetteId = e.target.getAttribute('data-id');
                    try {
                        const recette = await DatabaseManager.get('recettes', recetteId);
                        if (recette) {
                            this.afficherFormulaire(recette);
                        }
                    } catch (error) {
                        console.error('Erreur lors du chargement de la recette:', error);
                        alert('Erreur lors du chargement de la recette');
                    }
                });
            });
            
            container.querySelectorAll('.supprimer').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const recetteId = e.target.getAttribute('data-id');
                    if (confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) {
                        await this.supprimerRecette(recetteId);
                    }
                });
            });
        } catch (error) {
            console.error('Erreur lors du chargement des recettes:', error);
            const container = document.getElementById('liste-recettes');
            if (container) {
                container.innerHTML = '<p>Erreur lors du chargement des recettes</p>';
            }
        }
    }

    static async supprimerRecette(id) {
        try {
            await DatabaseManager.delete('recettes', id);
            await this.afficherRecettes();
            
            // Notification de succès
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Recette supprimée avec succès!', 'success');
            } else {
                alert('Recette supprimée avec succès!');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('Erreur lors de la suppression de la recette: ' + error.message);
        }
    }

    static async getRecette(id) {
        return await DatabaseManager.get('recettes', id);
    }

    static async getAllRecettes() {
        return await DatabaseManager.getAll('recettes');
    }

    static async getRecettesByType(type) {
        try {
            const allRecettes = await DatabaseManager.getAll('recettes');
            return allRecettes.filter(recette => recette.type === type);
        } catch (error) {
            console.error('Erreur lors de la récupération des recettes par type:', error);
            return [];
        }
    }
}

// Initialiser le gestionnaire de recettes
document.addEventListener('DOMContentLoaded', () => {
    RecettesManager.init();
});