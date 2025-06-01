import { LitElement, html, css } from "https://unpkg.com/lit@2.0.0/index.js?module";
import { Grocy } from "./Grocy.js";

class GrocyStockCard extends LitElement {
  static properties = {
    hass: {},
    config: {},
    stockItems: { state: true },
    groupedItems: { state: true },
    expandedGroups: { state: true },
  };

  constructor() {
    super();
    this.stockItems = [];
    this.groupedItems = {};
    this.expandedGroups = {};
  }

  async setConfig(config) {
    console.log("Configuration du GrocyStockCard:", config);
    if (!config.grocy_api_key || !config.grocy_api_url) {
      throw new Error("grocy_api_key et grocy_api_url doivent être spécifiés dans la configuration");
    }
    this.config = config;
    this.grocy = new Grocy(config.grocy_api_key, config.grocy_api_url);
    this.grocyStock = new GrocyStock(this.grocy);
    await this.fetchStock();     

    if (this.config.filterGroup) {
      this.groupedItems = await this.fetchProductGroup();
    }
    else if (this.config.location_id) {
      this.groupedItems = await this.fetchLocation();
    }
    else {
      // Si aucun filtre n'est spécifié, on récupère format simplement la liste
      this.groupedItems = this.groupStock(this.stockItems);
    }

  }

  async fetchStock() {
    this.stockItems = await this.GetEntity("stock");

    if (this.config.location_Name == true) {
      let locations = await this.grocy.GetLocations(this.config.location_id);
      console.log("Emplacements récupérés:", locations);

      for (let item of this.stockItems) {
        const location = locations.find(loc => loc.id === item.product.location_id);
        if (location) {
          item.product.location_name = location.name; // Ajoute le nom de l'emplacement à l'article
        } else {
          item.product.location_name = "Inconnu"; // Valeur par défaut si l'emplacement n'est pas trouvé
        }
      }
    }

    console.log("Stock récupéré:", this.stockItems); 
  }

  async fetchProductGroup() {

    let product_groups = await this.grocy.GetObjects("product_groups", this.config.filterGroup);    
    //this.groupedItems = product_groups;
    console.log("Groupes d'articles récupérés:", product_groups);

    return this.groupStockByGroups(this.stockItems, product_groups);
  }

  async fetchLocation() {

    let locations = await this.grocy.GetLocations(this.config.location_id);
    console.log("Emplacements récupérés:", locations);

    return this.groupStockLocation(this.stockItems, locations);

  }

  //Formatage des articles _____________________________________________
  //Aucun groupe n'est spécifié, on fait un seul groupe pour tous le monde
  groupStock(stock) {
    const groups = { "Tous les articles": stock };
    stock.forEach(item => { 
      if (!groups["Tous les articles"]) {
        groups["Tous les articles"] = [];
      }
      groups["Tous les articles"].push(item);
    });
    return groups;
  }

  // Regroupe les articles par groupe de produits on ignore les articles sans groupe
  groupStockByGroups(stock, product_groups) {
    const groups = {};
    stock.forEach(item => {
      // Trouve le nom du groupe ou "Sans groupe"
      const group = product_groups.find(g => g.id === item.product.product_group_id);
      const groupName = group ? group.name : "Null";
      if (groupName != "Null") {
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(item);
      }

    });
    console.log("Groupes d'articles formatés:", groups);
    return groups;
  }

  //regroupe les articles par emplacement de stock	
  groupStockLocation(stock, location) {
    const groups = {};
    stock.forEach(item => {
      // Trouve le nom du groupe ou "Sans groupe"
      const group = location.find(g => g.id === item.product.location_id);
      const groupName = group ? group.name : "Null";
      if (groupName != "Null") {
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(item);
      }

    });
    console.log("Groupes d'articles formatés:", groups);
    return groups;
  }

  toggleGroup(groupName) {
    this.expandedGroups[groupName] = !this.expandedGroups[groupName];
    this.requestUpdate();
  }

  /*
  async consumeItem(productId, productName) {
    try {
      const response = await fetch(`${this.config.grocy_api_url}/api/stock/products/${productId}/consume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "GROCY-API-KEY": this.config.grocy_api_key
        },
        body: JSON.stringify({ amount: 1 })
      });

      if (response.ok) {
        alert(`Consommation réussie pour ${productName}`);
        this.fetchEntity();
      } else {
        const err = await response.json();
        alert(`Erreur lors de la consommation: ${err.error_message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      alert(`Erreur de connexion: ${error.message}`);
    }
  }*/

  render() {
    return html`
      <ha-card header="${this.config.title || 'Stock Grocy'}">
        <div>
          <button @click="${this.fetchStock}">🔄 Mettre à jour</button>
          ${Object.entries(this.groupedItems).map(([group, items]) => html`
            <table>
              <thead class="group-header" @click="${() => this.toggleGroup(group)}">
                <tr><th colspan="4">${group} (${items.length})</th></tr>
              </thead>
              ${this.expandedGroups[group] ? html`
              <tbody>
                ${items.map(item => html`
                  <tr>
                    <td>${item.product.name}</td>
                    <td>${item.product.location_name || '-'}</td>
                    <td>${item.amount}</td>
                    <td><button @click="${() => this.consumeItem(item.product_id, item.product.name)}">Consommer</button></td>
                  </tr>
                `)}
              </tbody>
              ` : ''}
            </table>
          `)}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    button {
      background-color: #d9534f;
      color: white;
      border: none;
      padding: 5px 10px;
      cursor: pointer;
    }
    button:hover {
      background-color: #c9302c;
    }
    .group-header {
      background-color: #eee;
      cursor: pointer;
    }
  `;

  getCardSize() {
    return 3;
  }
}

customElements.define("grocystock-card", GrocyStockCard);
