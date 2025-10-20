class ListeCoursesManager {
    static init() {
        // Pas besoin d'initialisation particulière pour l'instant
    }

    static async genererListe() {
        try {
            // Récupérer toutes les recettes du planning
            const ingredientsNecessaires = await this.calculerIngredientsNecessaires();
            
            // Soustraire le stock
            const ingredientsAAcheter = await this.soustraireStock(ingredientsNecessaires);
            
            // Organiser par magasin avec les meilleurs prix
            return await this.organiserParMagasin(ingredientsAAcheter);
        } catch (error) {
            console.error('Erreur lors de la génération de la liste:', error);
            throw error;
        }
    }

    static async calculerIngredientsNecessaires() {
        const ingredients = {};
        
        try {
            // Parcourir le planning
            const allPlanning = await DatabaseManager.getAll('planning');
            
            allPlanning.forEach(item => {
                const repasDuJour = item.repas;
                
                Object.keys(repasDuJour).forEach(repas => {
                    const recetteId = repasDuJour[repas];
                    if (recetteId) {
                        // On va chercher la recette (en cache si possible)
                        this.getRecetteAvecCache(recetteId)
                            .then(recette => {
                                if (recette && recette.ingredients) {
                                    recette.ingredients.forEach(ingredient => {
                                        const cle = `${ingredient.nom.toLowerCase()}_${ingredient.unite}`;
                                        
                                        if (!ingredients[cle]) {
                                            ingredients[cle] = {
                                                nom: ingredient.nom,
                                                quantite: 0,
                                                unite: ingredient.unite
                                            };
                                        }
                                        
                                        ingredients[cle].quantite += ingredient.quantite;
                                    });
                                }
                            })
                            .catch(error => {
                                console.error('Erreur chargement recette:', error);
                            });
                    }
                });
            });
            
            // Attendre un peu pour que toutes les promesses se résolvent
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error('Erreur lors du calcul des ingrédients:', error);
        }
        
        return Object.values(ingredients);
    }

    static async getRecetteAvecCache(recetteId) {
        // Cache simple pour éviter les requêtes répétées
        if (!this.recettesCache) {
            this.recettesCache = {};
        }
        
        if (this.recettesCache[recetteId]) {
            return this.recettesCache[recetteId];
        }
        
        const recette = await DatabaseManager.get('recettes', recetteId);
        if (recette) {
            this.recettesCache[recetteId] = recette;
        }
        
        return recette;
    }

    static async soustraireStock(ingredientsNecessaires) {
        const ingredientsAAcheter = [];
        
        for (const ingredient of ingredientsNecessaires) {
            const quantiteEnStock = await StockManager.getQuantiteEnStock(ingredient.nom, ingredient.unite);
            const quantiteAAcheter = Math.max(0, ingredient.quantite - quantiteEnStock);
            
            if (quantiteAAcheter > 0) {
                ingredientsAAcheter.push({
                    ...ingredient,
                    quantiteAAcheter
                });
            }
        }
        
        return ingredientsAAcheter;
    }

    static async organiserParMagasin(ingredientsAAcheter) {
        const parMagasin = {};
        
        try {
            // Initialiser la structure pour chaque magasin
            const magasins = await DatabaseManager.getAll('magasins');
            
            magasins.forEach(magasin => {
                parMagasin[magasin.id] = {
                    magasin: magasin,
                    rayons: {},
                    total: 0
                };
            });
            
            // Ajouter un "magasin" pour les ingrédients sans prix
            parMagasin['sans-prix'] = {
                magasin: { id: 'sans-prix', nom: 'À déterminer (pas de prix enregistré)' },
                rayons: {},
                total: 0
            };
            
            // Répartir les ingrédients
            for (const ingredient of ingredientsAAcheter) {
                const meilleurPrix = await MagasinsManager.getMeilleurPrix(ingredient.nom);
                
                let magasinId, rayon, prixUnitaire;
                
                if (meilleurPrix) {
                    magasinId = meilleurPrix.magasin.id;
                    rayon = meilleurPrix.rayon;
                    prixUnitaire = meilleurPrix.prix;
                } else {
                    magasinId = 'sans-prix';
                    rayon = 'Non classé';
                    prixUnitaire = 0;
                }
                
                const prixTotal = prixUnitaire * ingredient.quantiteAAcheter;
                
                // Initialiser le rayon si nécessaire
                if (!parMagasin[magasinId].rayons[rayon]) {
                    parMagasin[magasinId].rayons[rayon] = [];
                }
                
                // Ajouter l'ingrédient
                parMagasin[magasinId].rayons[rayon].push({
                    ...ingredient,
                    prixUnitaire,
                    prixTotal
                });
                
                // Mettre à jour le total
                parMagasin[magasinId].total += prixTotal;
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'organisation par magasin:', error);
        }
        
        return parMagasin;
    }

    static async genererListeParMagasin() {
        try {
            const listeParMagasin = await this.genererListe();
            const container = document.getElementById('liste-par-magasin');
            
            if (!container) return;
            
            container.innerHTML = '';
            
            let hasData = false;
            
            Object.keys(listeParMagasin).forEach(magasinId => {
                const magasinData = listeParMagasin[magasinId];
                
                // Ne pas afficher les magasins sans ingrédients
                if (Object.keys(magasinData.rayons).length === 0) {
                    return;
                }
                
                hasData = true;
                
                const divMagasin = document.createElement('div');
                divMagasin.className = 'magasin-liste';
                
                let html = `<h3>${magasinData.magasin.nom}</h3>`;
                
                // Trier les rayons par ordre alphabétique
                Object.keys(magasinData.rayons).sort().forEach(rayon => {
                    html += `<div class="rayon-liste">`;
                    html += `<h4>${rayon}</h4>`;
                    
                    magasinData.rayons[rayon].forEach(ingredient => {
                        html += `
                            <div class="produit-liste">
                                <span>${ingredient.nom}: ${ingredient.quantiteAAcheter} ${ingredient.unite}</span>
                                <span>${ingredient.prixUnitaire > 0 ? `${ingredient.prixTotal.toFixed(2)}€` : 'Prix non renseigné'}</span>
                            </div>
                        `;
                    });
                    
                    html += `</div>`;
                });
                
                html += `<div class="total-magasin" style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #3498db; font-weight: bold;">
                    Total: ${magasinData.total.toFixed(2)}€
                </div>`;
                
                divMagasin.innerHTML = html;
                container.appendChild(divMagasin);
            });
            
            if (!hasData) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h3>Aucune course prévue</h3>
                        <p>Votre planning ne contient pas de recettes ou vous avez déjà tout en stock!</p>
                        <p>Allez dans la section "Planning" pour planifier vos repas.</p>
                    </div>
                `;
                return;
            }
            
            // Calculer et afficher le total général
            const totalGeneral = Object.values(listeParMagasin).reduce((total, magasin) => total + magasin.total, 0);
            
            const divTotal = document.createElement('div');
            divTotal.className = 'total-general';
            divTotal.style.cssText = 'margin-top: 20px; padding: 15px; background-color: #2c3e50; color: white; border-radius: 8px; font-size: 1.2em; font-weight: bold;';
            divTotal.innerHTML = `Total général: ${totalGeneral.toFixed(2)}€`;
            
            container.appendChild(divTotal);
            
        } catch (error) {
            console.error('Erreur lors de la génération de la liste:', error);
            const container = document.getElementById('liste-par-magasin');
            if (container) {
                container.innerHTML = '<p>Erreur lors de la génération de la liste de courses</p>';
            }
        }
    }

    static async exporterListe() {
        try {
            const listeParMagasin = await this.genererListe();
            let texte = 'LISTE DE COURSES\n\n';
            
            Object.keys(listeParMagasin).forEach(magasinId => {
                const magasinData = listeParMagasin[magasinId];
                
                if (Object.keys(magasinData.rayons).length === 0) return;
                
                texte += `=== ${magasinData.magasin.nom.toUpperCase()} ===\n`;
                
                Object.keys(magasinData.rayons).sort().forEach(rayon => {
                    texte += `\n${rayon}:\n`;
                    
                    magasinData.rayons[rayon].forEach(ingredient => {
                        texte += `- ${ingredient.nom}: ${ingredient.quantiteAAcheter} ${ingredient.unite}`;
                        if (ingredient.prixUnitaire > 0) {
                            texte += ` (${ingredient.prixTotal.toFixed(2)}€)`;
                        }
                        texte += '\n';
                    });
                });
                
                texte += `\nTotal ${magasinData.magasin.nom}: ${magasinData.total.toFixed(2)}€\n\n`;
            });
            
            // Créer un blob et télécharger
            const blob = new Blob([texte], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `liste-courses-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            alert('Erreur lors de l\'export de la liste');
        }
    }
}

// Initialiser le gestionnaire de liste de courses
document.addEventListener('DOMContentLoaded', () => {
    ListeCoursesManager.init();
});