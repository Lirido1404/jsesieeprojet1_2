# Datavisualisation des crimes en France

Ce projet a pour but de visualiser les crimes en France à l'aide de graphiques et de cartes interactives.

## Installation
Pour installer ce projet, suivez les étapes ci-dessous :
1. Clonez le dépôt : `git clone https://github.com/Lirido1404/jsesieeprojet1_2.git`
2. Accédez au répertoire du projet : `cd jsesieeprojet1_2`
3. Se procurer les fichiers CSV nécessaires dans le dossier **data**
   [crimedata.csv](https://www.data.gouv.fr/fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/#/resources/16ec626b-1a15-4512-a8ca-774921fc969e)
   [codecommunes.csv](https://www.data.gouv.fr/fr/datasets/communes-de-france-base-des-codes-postaux/#/resources/dbe8a621-a9c4-4bc3-9cae-be1699c5ff25)
4. Lancez le script d'initialisation des données : 
    `cd data`
    `python scraping.py`

## Utilisation
Pour exécuter le projet, lancez en local un serveur web.

## Technologies
- HTML
- CSS
- JavaScript
- Leaflet
- Papaparse
- Chart.js

## Auteurs
- **Loélia COUTELLIER** - [GitHub : @widfleer](https://github.com/widfleer)
- **Maxime PRÉVOT** - [GitHub : @Lirido1404](https://github.com/Lirido1404)