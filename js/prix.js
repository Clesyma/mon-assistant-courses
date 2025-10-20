class GestionPrix {
    constructor() {
        this.listePrix = document.getElementById('liste-prix');
        this.recherchePrix = document.getElementById('recherche-prix');
        this.triPrix = document.getElementById('tri-prix');
        
        if (this.listePrix && this.recherchePrix && this.triPrix) {
            this.initialiserEvenements();
            this.afficherPrix();
        }
    }

    initialiserEvenements() {
        this.recherchePrix.addEventListener('input', () => {
            this.afficherPrix();
        });

        this.triPrix.addEventListener('change', () => {
            this.afficherPrix();
        });

        if (this.listePrix) {
            this.listePrix.addEventListener('click', (e) => {
                if (e.target.classList.contains('bouton-editer')) {
                    const alimentId = e.target.dataset.id;
                    this.ouvrirModalEdition(alimentId);
                } else if (e.target.classList.contains('bouton-supprimer')) {
                    const prixId = e.target.dataset.prixId;
                    const alimentId = e.target.dataset.alimentId;
                    this.supprimerPrix(prixId, alimentId);
                }
            });
        }
    }

    collecterPrixDesRecettes() {
        if (typeof db === 'undefined') return {};

        const recettes = db.getRecettes();
        const alimentsAvecPrix = {};

        recettes.forEach(recette => {
            if (recette.ingredients && Array.isArray(recette.ingredients)) {
                recette.ingredients.forEach(ingredient => {
                    if (ingredient.prixTotal && ingredient.quantiteAchetee) {
                        const alimentId = ingredient.nom.toLowerCase();
                        
                        if (!alimentsAvecPrix[alimentId]) {
                            alimentsAvecPrix[alimentId] = {
                                nom: ingredient.nom,
                                prix: []
                            };
                        }

                        const prixExiste = alimentsAvecPrix[alimentId].prix.some(p => 
                            p.prixTotal === ingredient.prixTotal && 
                            p.quantiteAchetee === ingredient.quantiteAchetee &&
                            p.uniteAchetee === ingredient.uniteAchetee
                        );

                        if (!prixExiste) {
                            alimentsAvecPrix[alimentId].prix.push({
                                id: Date.now().toString() + Math.random(),
                                prixTotal: ingredient.prixTotal,
                                quantiteAchetee: ingredient.quantiteAchetee,
                                uniteAchetee: ingredient.uniteAchetee,
                                date: new Date().toISOString().split('T')[0],
                                magasin: '',
                                recetteOrigine: recette.nom
                            });
                        }
                    }
                });
            }
        });

        return alimentsAvecPrix;
    }

    calculerStatsPrix(aliment) {
        if (!aliment.prix || aliment.prix.length === 0) return null;

        const prixUnitaire = aliment.prix.map(p => {
            let quantiteStandard = p.quantiteAchetee;
            if (p.uniteAchetee === 'kg') quantiteStandard *= 1000;
            if (p.uniteAchetee === 'L') quantiteStandard *= 1000;
            return (p.prixTotal / quantiteStandard) * 1000;
        });

        const prixMoyen = prixUnitaire.reduce((a, b) => a + b, 0) / prixUnitaire.length;
        const prixMin = Math.min(...prixUnitaire);
        const prixMax = Math.max(...prixUnitaire);
        const dernierPrix = prixUnitaire[prixUnitaire.length - 1];

        return {
            moyenne: prixMoyen,
            min: prixMin,
            max: prixMax,
            dernier: dernierPrix,
            nombre: aliment.prix.length
        };
    }

    afficherPrix() {
        const alimentsAvecPrix = this.collecterPrixDesRecettes();
        const termeRecherche = this.recherchePrix.value.toLowerCase();
        const tri = this.triPrix.value;

        let alimentsFiltres = Object.values(alimentsAvecPrix);

        if (termeRecherche) {
            alimentsFiltres = alimentsFiltres.filter(aliment => 
                aliment.nom.toLowerCase().includes(termeRecherche)
            );
        }

        alimentsFiltres.sort((a, b) => {
            switch (tri) {
                case 'prix-recent':
                    const dateA = new Date(a.prix[a.prix.length - 1]?.date || 0);
                    const dateB = new Date(b.prix[b.prix.length - 1]?.date || 0);
                    return dateB - dateA;
                
                case 'prix-moyen':
                    const statsA = this.calculerStatsPrix(a);
                    const statsB = this.calculerStatsPrix(b);
                    return (statsB?.moyenne || 0) - (statsA?.moyenne || 0);
                
                case 'nom':
                default:
                    return a.nom.localeCompare(b.nom);
            }
        });

        if (!this.listePrix) return;

        this.listePrix.innerHTML = '';

        if (alimentsFiltres.length === 0) {
            this.listePrix.innerHTML = `
                <div class="aucun-prix">
                    <h3>Aucun prix enregistré</h3>
                    <p>Les prix apparaîtront ici lorsque vous ajouterez des ingrédients avec leurs prix dans vos recettes.</p>
                </div>
            `;
            return;
        }

        alimentsFiltres.forEach(aliment => {
            const stats = this.calculerStatsPrix(aliment);
            const divAliment = document.createElement('div');
            divAliment.className = 'aliment-prix';

            let html = `
                <div class="en-tete-aliment">
                    <h4>${aliment.nom}</h4>
                    <div class="stats-prix">
                        ${stats ? `
                            <span class="stat">Moyenne: ${stats.moyenne.toFixed(2)}€/kg</span>
                            <span class="stat">Min: ${stats.min.toFixed(2)}€/kg</span>
                            <span class="stat">Max: ${stats.max.toFixed(2)}€/kg</span>
                            <span class="stat">${stats.nombre} prix</span>
                        ` : ''}
                    </div>
                </div>
                <div class="historique-prix">
            `;

            const prixTries = [...aliment.prix].sort((a, b) => new Date(b.date) - new Date(a.date));

            prixTries.forEach(prix => {
                const prixUnitaire = (prix.prixTotal / prix.quantiteAchetee).toFixed(2);
                const prixAuKilo = prix.uniteAchetee === 'g' ? 
                    (prix.prixTotal / prix.quantiteAchetee * 1000).toFixed(2) :
                    (prix.prixTotal / prix.quantiteAchetee).toFixed(2);

                html += `
                    <div class="entree-prix">
                        <div class="infos-prix">
                            <div class="prix-montant">${prix.prixTotal}€</div>
                            <div class="details-prix">
                                <span>${prix.quantiteAchetee} ${prix.uniteAchetee}</span>
                                <span>${prixUnitaire}€/${prix.uniteAchetee}</span>
                                <span>${prixAuKilo}€/kg</span>
                                ${prix.magasin ? `<span>${prix.magasin}</span>` : ''}
                                ${prix.recetteOrigine ? `<span>Recette: ${prix.recetteOrigine}</span>` : ''}
                                <span>${prix.date}</span>
                            </div>
                        </div>
                        <div class="actions-prix">
                            <button class="bouton-editer" data-id="${aliment.nom}">✏️</button>
                            <button class="bouton-supprimer" data-prix-id="${prix.id}" data-aliment-id="${aliment.nom}">🗑️</button>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
            divAliment.innerHTML = html;
            this.listePrix.appendChild(divAliment);
        });
    }

    ouvrirModalEdition(alimentNom) {
        const modal = document.getElementById('modal-prix');
        if (!modal) return;

        const form = document.getElementById('form-prix');
        const alimentsAvecPrix = this.collecterPrixDesRecettes();
        const aliment = alimentsAvecPrix[alimentNom.toLowerCase()];

        if (!aliment) return;

        const nomAlimentModal = document.getElementById('nom-aliment-modal');
        if (nomAlimentModal) {
            nomAlimentModal.textContent = aliment.nom;
        }

        document.getElementById('aliment-id').value = aliment.nom;

        const dernierPrix = aliment.prix[aliment.prix.length - 1];
        if (dernierPrix) {
            document.getElementById('nouveau-prix').value = dernierPrix.prixTotal;
            document.getElementById('quantite-achetee-prix').value = dernierPrix.quantiteAchetee;
            document.getElementById('unite-achetee-prix').value = dernierPrix.uniteAchetee;
            document.getElementById('magasin-prix').value = dernierPrix.magasin || '';
            document.getElementById('date-achat').value = dernierPrix.date;
        } else {
            document.getElementById('nouveau-prix').value = '';
            document.getElementById('quantite-achetee-prix').value = '';
            document.getElementById('unite-achetee-prix').value = 'unite';
            document.getElementById('magasin-prix').value = '';
            document.getElementById('date-achat').value = new Date().toISOString().split('T')[0];
        }

        modal.style.display = 'block';

        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }

        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };

        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.enregistrerPrix(aliment.nom);
                modal.style.display = 'none';
                this.afficherPrix();
            };
        }

        const supprimerBtn = document.getElementById('supprimer-prix');
        if (supprimerBtn) {
            supprimerBtn.onclick = () => {
                if (confirm(`Supprimer tous les prix pour ${aliment.nom} ?`)) {
                    this.supprimerTousLesPrix(aliment.nom);
                    modal.style.display = 'none';
                    this.afficherPrix();
                }
            };
        }
    }

    enregistrerPrix(alimentNom) {
        const nouveauPrix = parseFloat(document.getElementById('nouveau-prix').value);
        const quantiteAchetee = parseFloat(document.getElementById('quantite-achetee-prix').value);
        const uniteAchetee = document.getElementById('unite-achetee-prix').value;
        const magasin = document.getElementById('magasin-prix').value;
        const dateAchat = document.getElementById('date-achat').value;

        console.log('Nouveau prix enregistré:', {
            aliment: alimentNom,
            prix: nouveauPrix,
            quantite: quantiteAchetee,
            unite: uniteAchetee,
            magasin: magasin,
            date: dateAchat
        });
    

        const prixData = {
        id: Date.now().toString(),
        aliment: alimentNom,
        prixTotal: nouveauPrix,
        quantiteAchetee: quantiteAchetee,
        uniteAchetee: uniteAchetee,
        magasin: magasin,
        date: dateAchat
    };

    // Sauvegarder dans une nouvelle collection de prix
    let prixExistant = JSON.parse(localStorage.getItem('historiquePrix') || '[]');
    prixExistant.push(prixData);
    localStorage.setItem('historiquePrix', JSON.stringify(prixExistant));

    this.afficherPrix();
}

    supprimerPrix(prixId, alimentId) {
        if (confirm('Supprimer ce prix ?')) {
            console.log('Prix supprimé:', prixId, 'pour', alimentId);
            this.afficherPrix();
        }
    }

    supprimerTousLesPrix(alimentNom) {
        console.log('Tous les prix supprimés pour:', alimentNom);
    }
}

if (document.getElementById('prix')) {
    document.addEventListener('DOMContentLoaded', () => {
        new GestionPrix();
    });
}