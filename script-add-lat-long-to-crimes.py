import pandas as pd

# Ajouter les colonnes latitude et longitude dans crime_data
def get_coordinates(codgeo):
    """Retourne la latitude et longitude pour un CODGEO_2024 donné."""
    if codgeo in communes_dict:
        return communes_dict[codgeo]['latitude'], communes_dict[codgeo]['longitude']
    return None, None  # Si aucune correspondance

# Charger les fichiers CSV
codes_communes = pd.read_csv('codecommunes.csv')  # Vérifie bien le nom exact de ton fichier
crime_data = pd.read_csv('crimedata.csv', dtype={'CODGEO_2024': str}, low_memory=False)

# Assurer que les colonnes pour les correspondances sont des chaînes
codes_communes['code_commune_INSEE'] = codes_communes['code_commune_INSEE'].astype(str)
crime_data['CODGEO_2024'] = crime_data['CODGEO_2024'].astype(str)

# Supprimer les doublons dans codes_communes en gardant la première occurrence de chaque code_commune_INSEE
codes_communes = codes_communes.drop_duplicates(subset='code_commune_INSEE')

# Convertir codes_communes en dictionnaire pour un accès rapide
communes_dict = codes_communes.set_index('code_commune_INSEE')[['latitude', 'longitude']].to_dict('index')

# Appliquer la fonction ligne par ligne
crime_data['latitude'], crime_data['longitude'] = zip(*crime_data['CODGEO_2024'].apply(get_coordinates))

# Sauvegarder le fichier résultant
crime_data.to_csv('crimedata_with_coords.csv', index=False)

print("Traitement terminé. Le fichier 'crimedata_with_coords.csv' a été créé.")
