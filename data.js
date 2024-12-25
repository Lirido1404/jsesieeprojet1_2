const layer = L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png", {
    attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a> contributors'
});

const initialCoordinates = { lat: 48.666160, lng: 2.842485 };
const lmap = L.map('map', {
    center: [initialCoordinates.lat, initialCoordinates.lng],
    zoom: 7,
    layers: [layer]
});




const createNbrDashboard = (data) => {

    let customDiv = L.control({ position: 'topright' });

    customDiv.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'custom-div');

        let arr = [
            data.nbrDestructions,
            data.nbrDrugs,
            data.nbrGun,
            data.nbrOther,
            data.nbrSexualharassment,
            data.nbrSteal,
            data.nbrViolence
        ];

        let crimeTypes = [
            'Destructions',
            'Drogues',
            'Armes',
            'Autres',
            'Harcelement sexuel',
            'Vols',
            'Violences'
        ];

        let maxCount = arr.reduce((acc,val)=>{
            return Math.max(acc,val);
        })

        let maxIndex = arr.indexOf(maxCount);

        let mostFrequentCrime = crimeTypes[maxIndex];

        div.innerHTML = `Nombre total de crimes : ${data.nbrTTcrimes}<br>
        Crime le plus perpétré : ${mostFrequentCrime} (${maxCount} cas)`;

        return div;
    };

    customDiv.addTo(lmap);
};











const createNbrDashboard2 = (tauxPourMilles) => {
    // Vérifie si une ancienne div avec l'ID 'dashboardCanvas' existe et la supprime
    const existingCanvas = document.getElementById('dashboardCanvas');
    if (existingCanvas) {
        existingCanvas.parentElement.remove(); // Supprime la div contenant le canvas
    }

    let customDiv = L.control({ position: 'bottomleft' });

    customDiv.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'custom-div2');

        // Ajout de la balise canvas dans le contenu HTML
        div.innerHTML = `
            <canvas id="dashboardCanvas" width="700" height="350" style="border:1px solid #000000;">
            </canvas>
        `;

        return div;
    };

    // Utilisation de lmap ici, pour s'assurer que la div est ajoutée au bon endroit
    customDiv.addTo(lmap);

    // Définir un tableau de couleurs pour chaque ville
    const couleursVilles = [
        '#A8385C85', // Rose
        '#090D3385', // Bleu
        '#ED671485'  // Orange
    ];

    // Une fois la div ajoutée, créer le graphique
    setTimeout(() => {
        const ctx = document.getElementById('dashboardCanvas').getContext('2d');

        // Préparation des données
        const labels = ['2016', '2017']; // Années
        const datasets = tauxPourMilles.map((item, index) => ({
            label: item.commune, // Nom de la commune
            data: item.taux,    // Taux pour chaque année
            backgroundColor: couleursVilles[index], // Couleur dynamique par ville
            borderColor: couleursVilles[index],   // Bordure de la couleur
            borderWidth: 1
        }));

        // Création du graphique
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels, // Années sur l'axe X
                datasets: datasets // Les barres par commune
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top', // Légende en haut
                    },
                    tooltip: {
                        enabled: true // Activer les infobulles
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Taux pour mille"
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Années"
                        }
                    }
                }
            }
        });
    }, 100); // Attendre un moment pour que le canvas soit disponible
};










const createListCommunesCRUD = (data) => {
    // Supprimer la div si elle existe déjà
    const existingCanvas = document.querySelector('.custom-div3');
    if (existingCanvas) {
        existingCanvas.remove(); // Supprime la div contenant le canvas
    }

    // Créer une liste des noms de communes
    let listOfCommunes = data.map((el) => el.commune).join('<br>');  // Joindre les noms de communes avec des sauts de ligne

    // Créer un contrôle personnalisé
    let customDiv = L.control({ position: 'bottomright' });

    customDiv.onAdd = function (map) {
        // Créer la div contenant la liste des communes
        let div = L.DomUtil.create('div', 'custom-div3');

        // Insérer la liste des communes dans la div avec un bouton pour chaque commune
        div.innerHTML = `<strong>Communes:</strong><br>`;
        data.forEach((communeData) => {
            const communeButton = document.createElement('button');
            communeButton.textContent = communeData.commune;
            communeButton.onclick = () => {
                // Suppression de la ville du tableau arrNomsCommunes
                arrNomsCommunes = arrNomsCommunes.filter(commune => commune !== communeData.commune);
                console.log("Ville supprimée:", communeData.commune);
                console.log("ArrNomsCommunes mis à jour:", arrNomsCommunes);
                
                // Après suppression, resoumettre le graphique
                buttonSubmit2.click(); // Déclenche le clique sur buttonSubmit2 pour re-créer le graphique
            };
            div.appendChild(communeButton);
        });

        return div;
    };

    customDiv.addTo(lmap);  // Ajouter le contrôle à la carte
};













const markersGroup = L.layerGroup().addTo(lmap);

let dep = "";
let nomVille = "";
let annee = "";
let nomCommune = "";

const selectDep = document.getElementById("dep");
const villeInput = document.getElementById('ville');
const communesInput = document.getElementById('communes');
const communesOptions = document.getElementById('communes-options');
const villeOptions = document.getElementById('ville-options');
const yearInput = document.getElementById("years");
const submitButton = document.getElementById("buttonsubmit");

selectDep.addEventListener('change', (e) => {
    nomVille = "";
    villeInput.value = "";
    dep = e.target.value;
    villeInput.disabled = Boolean(dep);
});

villeInput.addEventListener('input', async (e) => {
    nomVille = e.target.value;
    dep = "";
    selectDep.value = "";
    selectDep.disabled = Boolean(nomVille);

    if (nomVille.length > 2) {
        const communes = await fetchCommunes();
        const filteredVilles = filterCommunesByName(communes, nomVille);
        updateVilleOptions(filteredVilles);
    } else {
        villeOptions.innerHTML = '';
    }
});

communesInput.addEventListener('input', async (e) => {
    nomCommune = e.target.value;

    if (nomCommune.length > 2) {
        const communes = await fetchCommunes();
        const filteredCommunes = filterCommunesByName(communes, nomCommune);
        updateCommuneOptions(filteredCommunes);
    } else {
        communesOptions.innerHTML = '';
    }
});

yearInput.addEventListener('input', (e) => {
    annee = e.target.value;
});

const fetchCSV = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erreur lors de la récupération des données");
        const text = await response.text();
        return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
    } catch (error) {
        console.error(`Erreur lors du chargement de ${url}:`, error);
        return [];
    }
};

const fetchCommunes = () => fetchCSV("codecommunes.csv");

const fetchCrimes = () => fetchCSV("crimedata.csv");

const filterCommunesByName = (communes, name) => {
    const upperName = name.toUpperCase();
    return communes
        .filter(commune => commune.nom_commune_postal.includes(upperName))
        .filter((value, index, self) => 
            index === self.findIndex(t => t.nom_commune_postal === value.nom_commune_postal)
        );
};

const updateVilleOptions = (villes) => {
    villeOptions.innerHTML = '';
    villes.forEach(city => {
        const option = document.createElement('option');
        option.value = city.nom_commune_postal;
        villeOptions.appendChild(option);
    });
};

const updateCommuneOptions = (communes) => {
    communesOptions.innerHTML = ''; // Efface les anciennes options

    communes.forEach(commune => {
        const option = document.createElement('option');
        option.value = commune.nom_commune_postal; // Vous pouvez aussi choisir un autre champ de la commune si nécessaire
        communesOptions.appendChild(option);
    });
};

const addMarkers = (data, coordinates) => {
    const iconPaths = {
        violence: './images/pnglegendes/violence.png',
        steal: './images/pnglegendes/steal.png',
        drugs: './images/pnglegendes/drugs.png',
        destruction: './images/pnglegendes/destruction.png',
        gun: './images/pnglegendes/gun.png',
        other: './images/pnglegendes/other.png'
    };

    const iconMapping = {
        'Coups et blessures volontaires': 'violence',
        'Coups et blessures volontaires intrafamiliaux': 'violence',
        'Autres coups et blessures volontaires': 'violence',
        'Violences sexuelles': 'violence',
        'Vols de véhicules': 'steal',
        'Vols dans les véhicules': 'steal',
        'Vols d\'accessoires sur véhicules': 'steal',
        'Cambriolages de logement': 'steal',
        'Vols avec armes': 'gun',
        'Vols violents sans arme': 'steal',
        'Vols sans violence contre des personnes': 'steal',
        'Trafic de stupéfiants': 'drugs',
        'Usage de stupéfiants': 'drugs',
        'Destructions et dégradations volontaires': 'destruction',
    };

    data.forEach(crime => {
        const randomLat = coordinates.lat + (Math.random() - 0.5) * 0.4;
        const randomLng = coordinates.lng + (Math.random() - 0.5) * 0.4;

        const iconType = iconMapping[crime.classe] || 'other';
        const customIcon = L.icon({
            iconUrl: iconPaths[iconType],
            iconSize: [42, 42],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        const marker = L.marker([randomLat, randomLng], { icon: customIcon });

        const tooltipContent = `<p class="test2">${crime.classe}</p>`;
        marker.bindTooltip(tooltipContent);
        marker.addTo(markersGroup);
    });
};

submitButton.addEventListener('click', async () => {
    markersGroup.clearLayers();

    const communes = await fetchCommunes();
    const crimes = await fetchCrimes();

    let coordinates = initialCoordinates;
    let filteredCrimes;

    if (nomVille) {
        const selectedCommune = communes.find(c => c.nom_commune_postal === nomVille.toUpperCase());
        if (selectedCommune) {
            coordinates = { lat: parseFloat(selectedCommune.latitude), lng: parseFloat(selectedCommune.longitude) };
            filteredCrimes = crimes.filter(c => 
                parseInt(c.CODGEO_2024) === parseInt(selectedCommune.code_commune_INSEE) &&
                (!annee || parseInt(c.annee) === parseInt(annee))
            );
        }
    } else if (dep) {
        if (annee) {
            filteredCrimes = crimes.filter(c => c.CODGEO_2024.startsWith(dep) && (parseInt(annee) === parseInt(c.annee)));
        } else {
            filteredCrimes = crimes.filter(c => c.CODGEO_2024.startsWith(dep));
        }
    }

    lmap.setView([coordinates.lat, coordinates.lng], 9);

    addMarkers(filteredCrimes || [], coordinates);
    let nbrSexualharassment = 0;
    let nbrDrugs = 0;
    let nbrGun = 0;
    let nbrOther = 0;
    let nbrDestructions = 0;
    let nbrSteal = 0;
    let nbrViolence = 0;

    filteredCrimes.forEach((crime) => {
        let classe = crime.classe;
        switch (classe) {
            case 'Coups et blessures volontaires':
            case 'Coups et blessures volontaires intrafamiliaux':
            case 'Autres coups et blessures volontaires':
            case 'Violences sexuelles':
                nbrViolence++;
                break;
            case 'Vols de véhicules':
            case 'Vols dans les véhicules':
            case 'Vols d\'accessoires sur véhicules':
            case 'Cambriolages de logement':
            case 'Vols avec armes':
            case 'Vols violents sans arme':
            case 'Vols sans violence contre des personnes':
                nbrSteal++;
                break;
            case 'Trafic de stupéfiants':
            case 'Usage de stupéfiants':
                nbrDrugs++;
                break;
            case 'Destructions et dégradations volontaires':
                nbrDestructions++;
                break;
            case 'Vols avec armes':
                nbrGun++;
                break;
            default:
                nbrOther++;
                break;
        }
    });


    nbrTTcrimes = nbrDestructions + nbrDrugs + nbrGun + nbrOther + nbrSexualharassment + nbrSteal + nbrViolence;

    const data = {
        nbrTTcrimes : nbrTTcrimes,
        nbrDestructions : nbrDestructions,
        nbrDrugs : nbrDrugs,
        nbrGun : nbrGun,
        nbrOther: nbrOther,
        nbrSexualharassment: nbrSexualharassment,
        nbrSteal : nbrSteal,
        nbrViolence : nbrViolence

    }


    createNbrDashboard(data);
    



});









let buttonSubmit2 = document.getElementById('buttonsubmit2');

let arrNomsCommunes = [];
buttonSubmit2.addEventListener('click', async () => {

    arrNomsCommunes.push(nomCommune);
    console.log(arrNomsCommunes);
    let annees = [16, 17];

    const communes = await fetchCommunes();
    const crimes = await fetchCrimes();

    let tauxPourMilles = [];

    if (nomCommune) {
        arrNomsCommunes.forEach((el2) => { // Utilise 'el2' pour représenter chaque commune
            console.log(el2);
        
            let tauxPourMilleCommune = [];
        
            annees.forEach((uneannee) => {
                const selectedCommune = communes.find(c => c.nom_commune_postal === el2.toUpperCase()); // Utilise 'el2' au lieu de 'nomCommune'
        
                const filteredCrimes = crimes.filter(c => 
                    parseInt(c.CODGEO_2024) === parseInt(selectedCommune.code_commune_INSEE) && parseInt(c.annee) === uneannee
                );
        
                let nbrCrimes = filteredCrimes.length;
                let nbrPOP = filteredCrimes.length > 0 ? filteredCrimes[0].POP : 0;
        
                if (nbrPOP > 0) {
                    let tauxPourMille = (nbrCrimes / nbrPOP) * 1000;
                    tauxPourMilleCommune.push(tauxPourMille);
                } else {
                    tauxPourMilleCommune.push(0); // Si pas de données de population ou de crimes
                }
            });
        
            tauxPourMilles.push({
                commune: el2, // Utilise 'el2' ici pour conserver le bon nom de commune
                taux: tauxPourMilleCommune
            });
        });
    }
    createNbrDashboard2(tauxPourMilles);
    createListCommunesCRUD(tauxPourMilles);

    console.log(tauxPourMilles);

});
