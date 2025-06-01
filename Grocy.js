// Classe Grocy : stocke la clé API et l'URL ainsi que les méthode poour consommé l'api
export class Grocy {
    constructor(apiKey, apiUrl) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    async GetStock() {
        try {
            const response = await fetch(`${this.apiUrl}/api/stock`, {
                headers: {
                'GROCY-API-KEY': this.apiKey
                }
            });
            const items = await response.json();
            return items;
        } catch (err) {
            console.error(`Erreur lors de la récupération du stock:`, err);
            return [];
        }
    }

    async ConsumeStock(productId, qty) {
        try {
            const response = await fetch(`${this.apiUrl}/api/stock/products/${productId}/consume`, {
                method: "POST",
                headers: {
                'GROCY-API-KEY': this.apiKey,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({ "amount": qty, "transaction_type": "consume","spoiled": false })
            });
            return response;
        } catch (err) {
            console.error(`Erreur lors de la récupération du stock:`, err);
            return [];
        }
    }

    async AddStock(productId, qty) {
        try {
            const response = await fetch(`${this.apiUrl}/api/stock/products/${productId}/add`, {
                method: "POST",
                headers: {
                'GROCY-API-KEY': this.apiKey,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({ "amount": qty, "transaction_type": "purchase","price": "0", "best_before_date":"2099-01-01" })
            });
            return response;
        } catch (err) {
            console.error(`Erreur lors de la récupération du stock:`, err);
            return [];
        }
    }

   async GetLocations(location_ID = []){
        try {
            const response = await fetch(`${this.apiUrl}/api/objects/locations`, {
                headers: {
                'GROCY-API-KEY': this.apiKey
                }
            });
            const items = await response.json();
            if (location_ID.length > 0) {
                // Filtrer les items en fonction de filter_GroupID
                return items.filter(item => location_ID.includes(item.id));
            }else{
                // Si aucun filtre, retourner tous les items
                return items;
            }
        } catch (err) {
            console.error("Erreur lors de la récupération des locations (emplacements):", err);
            return [];
        }
   }

    async GetObjects(entity, filter_GroupID = []) {
        try {
            const response = await fetch(`${this.apiUrl}/api/objects/${entity}`, {
                headers: {
                'GROCY-API-KEY': this.apiKey
                }
            });
            const items = await response.json();
            if (filter_GroupID.length > 0) {
                // Filtrer les items en fonction de filter_GroupID
                return items.filter(item => filter_GroupID.includes(item.id));
            }else{
                // Si aucun filtre, retourner tous les items
                return items;
            }
        } catch (err) {
            console.error("Erreur lors de la récupération des entity (emplacements):", err);
            return [];
        }
    }

    /*
   //'https://URL/api/objects/userfields/1'
   async GetUserFields(id){
        try {
            const response = await fetch(`${this.apiUrl}/api/objects/userfields/${id}`, {
                headers: {
                'GROCY-API-KEY': this.apiKey
                }
            });
            const item = await response.json();

            //On formate la liste pour mettre chaque nom dans un object
            const formattedItems = item.config.split('\n');
            
            return formattedItems;
        } catch (err) {
            console.error("Erreur lors de la récupération des userfields (chanp personalisé):", err);
            return [];
        }
    }*/

    /*curl -X 'GET' \
    'https://url/api/userfields/products/1' \
    -H 'accept: application/json' \
    -H 'GROCY-API-KEY: toto'
    async GetObjectUserFields(type, id){
        
        try {
            console.log("GetObjectUserFields:", this.apiUrl,type, id);
            const response = await fetch(`${this.apiUrl}/api/userfields/${type}/${id}`, {
                headers: {
                'GROCY-API-KEY': this.apiKey
                }
            });
            const items = await response.json();
            return items;
        } catch (err) {
            console.error("Erreur lors de la récupération des userfields (chanp personalisé):", err);
            return [];
        }
    }*/

}
