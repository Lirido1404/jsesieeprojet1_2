import csv
import os

def clean_trim_crimedata(crimedata_input_file, crimedata_output_file, codecommunes_file, output_dir):
    """
    Cette fonction nettoie et la latitude et longitude `crimedata_input_file`.
    Elle génère également des fichiers régionaux distincts pour chaque région.
    Fonctionnalités principales :
    1. Chargement des codes communaux et leurs régions à partir d'un fichier CSV.
    2. Nettoyage des données de criminalité en ajoutant les coordonnées géographiques.
    3. Création de fichiers régionaux contenant les données de criminalité pour chaque région.
    4. Affichage des codes communaux qui n'ont pas pu être associés à une région.
    Variables :
    - `crimedata_input_file` : Chemin du fichier d'entrée contenant les données de criminalité.
    - `crimedata_output_file` : Chemin du fichier de sortie pour les données nettoyées.
    - `codecommunes_file` : Chemin du fichier contenant les codes communaux et leurs régions.
    - `output_dir` : Répertoire de sortie pour les fichiers régionaux.
    """

    # Créer le répertoire de sortie s'il n'existe pas
    os.makedirs(output_dir, exist_ok=True)

    # Charger les codes communaux et leurs régions dans un dictionnaire
    codecommunes = {}
    with open(codecommunes_file, 'r', encoding='utf-8-sig') as communes_file:
        reader = csv.DictReader(communes_file, delimiter=';')
        for row in reader:
            # Utiliser le code commune INSEE comme clé et le code région comme valeur
            code_insee = row['code_commune_INSEE']
            codecommunes[code_insee] = {
                'code_region': row['code_region'],
                'latitude': row.get('latitude', None),
                'longitude': row.get('longitude', None)
            }

    # Préparer pour le traitement de crimedata
    removed_codgeo = set()
    region_files = {}

    with open(crimedata_input_file, 'r', encoding='utf-8') as infile, open(crimedata_output_file, 'w', encoding='utf-8', newline='') as outfile:
        reader = csv.reader(infile, delimiter=';')
        writer = csv.writer(outfile, delimiter=';')

        # Écrire l'en-tête dans le fichier nettoyé
        header = next(reader)
        header.extend(['latitude', 'longitude'])  # Ajouter les colonnes latitude et longitude
        writer.writerow(header)

        for row in reader:
            codgeo = row[0].strip('"').lstrip('0')  # Nettoyer le CODGEO
            if codgeo in codecommunes:
                # Ajouter les coordonnées dans la ligne
                row.extend([codecommunes[codgeo]['latitude'], codecommunes[codgeo]['longitude']])

                # Écrire la ligne dans le fichier nettoyé
                row[0] = row[0].replace('"', '').lstrip('0') # Remplacer le CODGEO nettoyé
                writer.writerow(row)

                # Obtenir le code de région correspondant
                code_region = codecommunes[codgeo]['code_region']

                # Préparer un fichier par région si nécessaire
                if code_region not in region_files:
                    region_files[code_region] = open(f'{output_dir}region_{code_region}.csv', 'w', encoding='utf-8', newline='')
                    region_writer = csv.writer(region_files[code_region], delimiter=';')
                    region_writer.writerow(header)  # Écrire l'en-tête dans chaque fichier régional

                # Écrire la ligne dans le fichier de la région correspondante
                region_writer = csv.writer(region_files[code_region], delimiter=';')
                region_writer.writerow(row)
            else:
                # Ajouter à la liste des CODGEO retirés
                removed_codgeo.add(codgeo)

    # Fermer les fichiers régionaux
    for file in region_files.values():
        file.close()

    # Afficher les CODGEO retirés
    if removed_codgeo:
        print("CODGEO retirés :", ", ".join(removed_codgeo))
    else:
        print("Aucun CODGEO retiré.")


if __name__ == '__main__':
    crimedata_input_file = './crimedata.csv'
    crimedata_output_file = './crimedata_cleaned.csv'
    codecommunes_file = './codecommunes.csv'
    output_dir = './regions/'
    clean_trim_crimedata(crimedata_input_file, crimedata_output_file, codecommunes_file, output_dir)
    print(f"Les fichiers régionaux sont enregistrés dans le répertoire : {output_dir}")
    print(f"Les données nettoyées sont enregistrées dans : {crimedata_output_file}")