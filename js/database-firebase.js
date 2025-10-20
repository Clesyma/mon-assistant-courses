import { 
    db,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    setDoc,
    onSnapshot,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import { auth } from './firebase-config.js';

class FirebaseDB {
    static currentUser = null;
    static listeners = {};

    static async init(user = null) {
        this.currentUser = user;
        return Promise.resolve();
    }

    static async add(storeName, data) {
        if (!this.currentUser) throw new Error('Utilisateur non connecté');
        
        const docRef = await addDoc(collection(db, 'users', this.currentUser.uid, storeName), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        return docRef.id;
    }

    static async get(storeName, id) {
        if (!this.currentUser) throw new Error('Utilisateur non connecté');
        
        const docSnap = await getDoc(doc(db, 'users', this.currentUser.uid, storeName, id));
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    }

    static async getAll(storeName) {
        if (!this.currentUser) throw new Error('Utilisateur non connecté');
        
        const querySnapshot = await getDocs(collection(db, 'users', this.currentUser.uid, storeName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    static async update(storeName, data) {
        if (!this.currentUser) throw new Error('Utilisateur non connecté');
        
        const { id, ...updateData } = data;
        await updateDoc(doc(db, 'users', this.currentUser.uid, storeName, id), {
            ...updateData,
            updatedAt: serverTimestamp()
        });
    }

    static async delete(storeName, id) {
        if (!this.currentUser) throw new Error('Utilisateur non connecté');
        
        await deleteDoc(doc(db, 'users', this.currentUser.uid, storeName, id));
    }

    static async getPlanningByDate(date) {
        if (!this.currentUser) return {};
        
        try {
            const planning = await this.get('planning', date);
            return planning ? planning.repas : {};
        } catch (error) {
            return {};
        }
    }

    static async updatePlanning(date, repas) {
        if (!this.currentUser) throw new Error('Utilisateur non connecté');
        
        await setDoc(doc(db, 'users', this.currentUser.uid, 'planning', date), {
            date: date,
            repas: repas,
            updatedAt: serverTimestamp()
        });
    }

    static async updatePrix(prixData) {
        if (!this.currentUser) throw new Error('Utilisateur non connecté');
        
        const { ingredient, magasinId } = prixData;
        const docId = `${ingredient}_${magasinId}`;
        
        await setDoc(doc(db, 'users', this.currentUser.uid, 'prix', docId), {
            ...prixData,
            updatedAt: serverTimestamp()
        });
    }

    static async getPrixByIngredient(ingredient) {
        if (!this.currentUser) return [];
        
        try {
            const q = query(
                collection(db, 'users', this.currentUser.uid, 'prix'),
                where('ingredient', '==', ingredient)
            );
            
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erreur getPrixByIngredient:', error);
            return [];
        }
    }

    static onRecettesChange(callback) {
        if (!this.currentUser) return;
        
        this.listeners.recettes = onSnapshot(
            collection(db, 'users', this.currentUser.uid, 'recettes'),
            (snapshot) => {
                const recettes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(recettes);
            }
        );
    }

    static onPlanningChange(callback) {
        if (!this.currentUser) return;
        
        this.listeners.planning = onSnapshot(
            collection(db, 'users', this.currentUser.uid, 'planning'),
            (snapshot) => {
                const planning = {};
                snapshot.docs.forEach(doc => {
                    planning[doc.id] = doc.data().repas;
                });
                callback(planning);
            }
        );
    }

    static cleanup() {
        Object.values(this.listeners).forEach(unsubscribe => {
            if (unsubscribe) unsubscribe();
        });
        this.listeners = {};
    }

    static getStatus() {
        return {
            mode: 'cloud',
            user: this.currentUser ? this.currentUser.email : 'non connecté'
        };
    }
}

window.FirebaseDB = FirebaseDB;
window.DatabaseManager = FirebaseDB;