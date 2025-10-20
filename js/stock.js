class StockManager {
    static init() {
        this.setupEventListeners();
    }

    static setupEventListeners() {
        // Formulaire d'ajout au stock
        const stockForm = document.getElementById('stock-form');
        if (stockForm) {
            stockForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.ajouterAuStock();
            });
        }
    }

    static async ajouterAuStock() {
        try {
            const nom = document.getElementById('nom-ingredient-stock').value.trim();
            const quantite = parseFloat(document.getElementById('quantite-stock').value);
            const unite = document.getElementById('unite-stock').value;
            
            if (!nom || isNaN(quantite) || quantite <= 0) {
                alert('Veuillez remplir tous les champs correctement');
                return;
            }
            
            // Vérifier si l'ingrédient existe déjà
            const stockActuel = await DatabaseManager.getAll('stock');
            const index = stockActuel.findIndex(item => 
                item.nom.toLowerCase() === nom.toLowerCase() && item.unite === unite
            );
            
            if (index !== -1) {
                // Mettre à jour la quantité
                const item = stockActuel[index];
                item.quantite += quantite;
                item.dateMAJ = new Date().toISOString();
                
                await DatabaseManager.update('stock', item);
            } else {
                // Ajouter un nouvel élément
                await DatabaseManager.add('stock', {
                    nom,
                    quantite,
                    unite,
                    dateMAJ: new Date().toISOString()
                });
            }
            
            await this.afficherStock();
            document.getElementById('stock-form').reset();
            
            // Notification
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Stock mis à jour avec succès!', 'success');
            } else {
                alert('Stock mis à jour avec succès!');
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout au stock:', error);
            alert('Erreur lors de la mise à jour du stock: ' + error.message);
        }
    }

    static async afficherStock() {
        try {
            const container = document.getElementById('liste-stock');
            if (!container) return;
            
            const stock = await DatabaseManager.getAll('stock');
            
            if (stock.length === 0) {
                container.innerHTML = '<p>Aucun ingrédient en stock</p>';
                return;
            }
            
            container.innerHTML = '<h3>Stock Actuel</h3>';
            
            stock.forEach(item => {
                const div = document.createElement('div');
                div.className = 'stock-item';
                
                const dateMAJ = new Date(item.dateMAJ).toLocaleDateString('fr-FR');
                
                div.innerHTML = `
                    <div>
                        <strong>${item.nom}</strong>: ${item.quantite} ${item.unite}
                        <br><small>MAJ: ${dateMAJ}</small>
                    </div>
                    <div class="stock-actions">
                        <button class="modifier-stock" data-id="${item.id}">Modifier</button>
                        <button class="supprimer-stock" data-id="${item.id}">Supprimer</button>
                    </div>
                `;
                
                container.appendChild(div);
            });
            
            // Ajouter les écouteurs d'événements
            container.querySelectorAll('.modifier-stock').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const itemId = e.target.getAttribute('data-id');
                    await this.modifierStock(itemId);
                });
            });
            
            container.querySelectorAll('.supprimer-stock').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const itemId = e.target.getAttribute('data-id');
                    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément du stock ?')) {
                        await this.supprimerDuStock(itemId);
                    }
                });
            });
        } catch (error) {
            console.error('Erreur lors du chargement du stock:', error);
            const container = document.getElementById('liste-stock');
            if (container) {
                container.innerHTML = '<p>Erreur lors du chargement du stock</p>';
            }
        }
    }

    static async modifierStock(id) {
        try {
            const item = await DatabaseManager.get('stock', id);
            if (!item) return;
            
            const nouvelleQuantite = prompt(`Nouvelle quantité pour ${item.nom} (${item.unite}):`, item.quantite);
            
            if (nouvelleQuantite !== null) {
                const quantite = parseFloat(nouvelleQuantite);
                if (!isNaN(quantite)) {
                    item.quantite = quantite;
                    item.dateMAJ = new Date().toISOString();
                    
                    await DatabaseManager.update('stock', item);
                    await this.afficherStock();
                    
                    if (window.App && window.App.showNotification) {
                        window.App.showNotification('Stock modifié avec succès!', 'success');
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la modification du stock:', error);
            alert('Erreur lors de la modification du stock');
        }
    }

    static async supprimerDuStock(id) {
        try {
            await DatabaseManager.delete('stock', id);
            await this.afficherStock();
            
            if (window.App && window.App.showNotification) {
                window.App.showNotification('Élément supprimé du stock!', 'success');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du stock:', error);
            alert('Erreur lors de la suppression du stock');
        }
    }

    static async getQuantiteEnStock(nom, unite) {
        try {
            const stock = await DatabaseManager.getAll('stock');
            const item = stock.find(i => 
                i.nom.toLowerCase() === nom.toLowerCase() && i.unite === unite
            );
            
            return item ? item.quantite : 0;
        } catch (error) {
            console.error('Erreur lors de la récupération du stock:', error);
            return 0;
        }
    }

    static async getAllStock() {
        return await DatabaseManager.getAll('stock');
    }

    static async viderStock() {
        if (confirm('Êtes-vous sûr de vouloir vider tout le stock ?')) {
            try {
                const stock = await DatabaseManager.getAll('stock');
                
                for (const item of stock) {
                    await DatabaseManager.delete('stock', item.id);
                }
                
                await this.afficherStock();
                
                if (window.App && window.App.showNotification) {
                    window.App.showNotification('Stock vidé avec succès!', 'success');
                }
            } catch (error) {
                console.error('Erreur lors du vidage du stock:', error);
                alert('Erreur lors du vidage du stock');
            }
        }
    }
}

// Initialiser le gestionnaire de stock
document.addEventListener('DOMContentLoaded', () => {
    StockManager.init();
});