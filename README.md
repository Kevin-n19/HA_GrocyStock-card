# HA_GrocyStock-card
A custom grocy stock card for Home Assistant to display stock since grocy api.

## Installation

### Manual Installation

1. Download the `GrocyStock-card.js` file from the [latest release](https://github.com/Kevin-n19/HA_temperature-card.git).
2. Place the file in your `config/www` folder.

## Use card in dashboard

### Add ressources

#### In YAML
```yaml
resources:
  - url: /local/GrocyStock-card.js
    type: module
```

## Add card in dashboard

Add a custom button-card to your dashboard.


```yaml
type: custom:temperature-card
  title: "Cave à vin" 
  grocy_api_key: "apiKey"
  grocy_api_url: "https://en.demo.grocy.info/"
  filterGroup: [1,2,3,4,5]
  #location_Name: true
```
