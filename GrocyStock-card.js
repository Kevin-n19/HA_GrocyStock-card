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
    this.amount = {};
    this.lastFetch = null; // Ajout pour la date/heure de dernière récupération
  }

  setConfig(config) {
    if (!config.grocy_api_key || !config.grocy_api_url) {
      throw new Error("grocy_api_key et grocy_api_url doivent être spécifiés dans la configuration");
    }
    this.config = config;
    this.grocy = new Grocy(config.grocy_api_key, config.grocy_api_url);
    this.fetchStock();     
  }

  //Récupérations des données de stock, et quantité + formatages
  //Récupération des emplacements si l'option est activée
  //Récupération des groupes de produits si l'option est activée
  async fetchStock() {

    this.stockItems = await this.grocy.GetStock();
    this.amount = await this.grocy.GetObjects("quantity_units");

    this.stockItems = this.formatAmount(this.stockItems, this.amount);

    if (this.config.location_Name == true) {
      let locations = await this.grocy.GetLocations(this.config.location_id);
      this.postLogConsole("Emplacements récupérés:", locations);

      for (let item of this.stockItems) {
        const location = locations.find(loc => loc.id === item.product.location_id);
        if (location) {
          item.product.location_name = location.name; // Ajoute le nom de l'emplacement à l'article
        } else {
          item.product.location_name = "Inconnu"; // Valeur par défaut si l'emplacement n'est pas trouvé
        }
      }
    }

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

    this.postLogConsole("Stock récupéré:", this.stockItems); 
    this.lastFetch = new Date(); // Met à jour la date/heure de dernière récupération
  }

  async fetchProductGroup() {

    let product_groups = await this.grocy.GetObjects("product_groups", this.config.filterGroup);    
    //this.groupedItems = product_groups;
    this.postLogConsole("Groupes d'articles récupérés:", product_groups);

    return this.groupStockByGroups(this.stockItems, product_groups);
  }

  async fetchLocation() {

    let locations = await this.grocy.GetLocations(this.config.location_id);
    this.postLogConsole("Emplacements récupérés:", locations);

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
    this.postLogConsole("Groupes d'articles formatés:", groups);
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
    this.postLogConsole("Groupes d'articles formatés:", groups);
    return groups;
  }

  //permets d'ajouter le nom de l'unités dans le stock
  formatAmount(stock, amounts) {
    const amountMap = Object.fromEntries(amounts.map(a => [a.id, a]));

    stock.forEach(item => {
      const unitId = item.product?.qu_id_stock;
      const unitObj = amountMap[unitId];
      const qty = item.amount ?? 0;

      // Choix entre singulier/pluriel
      const unitName = qty < 1.1 ? unitObj?.name : unitObj?.name_plural ;//|| unitObj?.name || "unités";

      item.formattedAmount = `${qty} ${unitName}`;
    });

    return stock;
  }

  toggleGroup(groupName) {
    this.expandedGroups[groupName] = !this.expandedGroups[groupName];
    this.requestUpdate();
  }

  
  async consumeItem(product, productid) {
    try {
      const response = await this.grocy.ConsumeStock(productid, 1);

      if (response.ok) {
        //alert(`Consommation réussie pour ${product.name}`);
        await this.fetchStock(); // Rafraîchit le stock après consommation
      } else {
        const err = await response.json();
        alert(`Erreur lors de la consommation: ${err.error_message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      alert(`Erreur de connexion: ${error.message}`);
    }
  }

  async addStockItem(product, productid) {
    try {
      const response = await this.grocy.AddStock(productid, 1);
      if (response.ok) {
        await this.fetchStock(); // Rafraîchit le stock après ajout
      } else {
        const err = await response.json();
        alert(`Erreur lors de l'ajout: ${err.error_message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      alert(`Erreur de connexion: ${error.message}`);
    }
  }

  render() {
    return html`
      <ha-card header="${this.config.title || ''}" icon="mdi:bottle-wine">
        <div style="display: flex; align-items: center; gap: 1em; margin-bottom: 0.5em;">
          <button @click="${this.fetchStock}">🔄 Mettre à jour</button>
          <span style="font-size: 0.9em; color: #666;">
            Dernière mise à jour :
            ${this.lastFetch ? this.lastFetch.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Jamais'}
          </span>
        </div>
        ${Object.entries(this.groupedItems).map(([group, items]) => html`
          <table>
            <thead class="group-header" @click="${() => this.toggleGroup(group)}">
              <tr><th colspan="5">${group} (${items.length})</th></tr>
            </thead>
            ${this.expandedGroups[group] ? html`
            <tbody>
              ${items.map(item => html`
                <tr class="item">
                  <td>${item.product.name}</td>
                  <td>${item.product.location_name || '-'}</td>
                  <td>${item.formattedAmount}</td>
                  <td><button class="remove" @click="${() => this.consumeItem(item, item.product.id)}">Consommer</button></td>
                  <td><button class="add" @click="${() => this.addStockItem(item, item.product.id)}">Ajouter</button></td>
                </tr>
              `)}
            </tbody>
            ` : ''}
          </table>
        `)}
      </ha-card>
    `;
  }

  static styles = css`
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .group-header {
      background-color: darkgrey; /*var(--card-background-color, white);*/
      filter: grayscale(1)
      cursor: pointer;
      color: var(--primary-text-color, black);
    }

    .item{
      background-color: #cfcccc;  
     /*opacity: 0.60; */   
    }

    th, td {
      border: 1px solid var(--paper-item-icon-color, #44739e);
      box-shadow: 0px 3px var(--paper-item-icon-color, #44739e) ;
      border-left: none;
      border-right: none;
      padding: 5px;
      text-align: left;
      
    }

    button {
      background-color: var(--paper-item-icon-color, #44739e);
      color: var(--primary-text-color, black);
      border: solid 2px darkgrey;
      border-radius: 4px;
      box-shadow: 2px 2px #cfcccc;
      padding: 5px 10px;
      cursor: pointer;
    }
    .add{
      background-color: rgb(20, 189, 20);
      border :1px solid rgb(39, 119, 39);
      box-shadow: 2px 2px rgb(39, 119, 39);
    }  
    .remove{
      background-color: rgb(189, 20, 20);
      border:1px solid rgb(110, 28, 28);
      box-shadow: 2px 2px rgb(110, 28, 28);
    } 
    button:hover {
      background-color:rgb(143, 148, 148);
    }

  `;

  getCardSize() {
    return 3;
  }

  postLogConsole(message = "", object = null) {
    if (this.config.debug != null && this.config.debug) {
      console.log( message, object);
    }
  }
}

customElements.define("grocystock-card", GrocyStockCard);
