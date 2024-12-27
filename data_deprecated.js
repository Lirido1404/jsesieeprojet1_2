const villeInput = document.getElementById("ville");
const communesInput = document.getElementById("communes");
const communesOptions = document.getElementById("communes-options");
const villeOptions = document.getElementById("ville-options");

let nomVille = "";
let nomCommune = "";



const fetchCSV = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des données");
      const text = await response.text();
      return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
    } catch (error) {
      console.error(`Erreur lors du chargement de ${url}:`, error);
      return [];
    }
  };
  // fonction qui permettra de fetch les découpages de régions, il faudra juste faire ça dynamiquement avec les régions


  const fetchCommunes = () => fetchCSV("codecommunes.csv"); // utile pour les datalists
  const fetchCrimes = () => fetchCSV("crimedata.csv"); // utile pour les datalists

// initialisation map leaflet
const layer = L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png",
  {
    attribution:
      '&copy; <a href="https://carto.com/attributions">CartoDB</a> contributors',
  }
);

const coordonéesInitiales = { lat: 48.66616, lng: 2.842485 };
const lmap = L.map("map", {
  center: [coordonéesInitiales.lat, coordonéesInitiales.lng],
  zoom: 7,
  layers: [layer],
});

const groupesMarqueursMapLeaflet = L.layerGroup().addTo(lmap); // utile lorsque l'on voudra réinitialiser la map leaflet après un 2nd submit











// Partie qui permet de préparer les datalists pour le 1er input concernant le filtre par ville, et le 2nd input nécéssaire pour la comparaison entre villes.
villeInput.addEventListener("input", async (e) => {
  nomVille = e.target.value;
  if (nomVille.length > 2) {
    const communes = await fetchCommunes(); // récupères tous les noms de villes
    const VilleFiltrees = filtrageParNomVille(communes, nomVille); // les filtre à partir de la saisie de l'utilisateur
    majVilleDatalist(VilleFiltrees); // met le datalist à jour
  } else {
    villeOptions.innerHTML = "";
  }
});
communesInput.addEventListener("input", async (e) => {
  nomCommune = e.target.value;
  if (nomCommune.length > 2) {
    const communes = await fetchCommunes();
    const filteredCommunes = filtrageParNomVille(communes, nomCommune);
    majCommuneDatalist(filteredCommunes);
  } else {
    communesOptions.innerHTML = "";
  }
});


const filtrageParNomVille = (communes, nomCommune) => {
  const nomVilleMaj = nomCommune.toUpperCase();
  return communes
    .filter((commune) => commune.nom_commune_postal.includes(nomVilleMaj))
    .filter(
      (value, index, self) =>
        index ===
        self.findIndex((t) => t.nom_commune_postal === value.nom_commune_postal)
    ); // Dur à comprendre mais ça permet juste de supprimer les doublons, comme ça le datalist est + propre
};
const majVilleDatalist = (villes) => {
  villeOptions.innerHTML = "";
  villes.forEach((city) => {
    const option = document.createElement("option");
    option.value = city.nom_commune_postal;
    villeOptions.appendChild(option);
  });
};
const majCommuneDatalist = (communes) => {
  communesOptions.innerHTML = ""; 
  communes.forEach((commune) => {
    const option = document.createElement("option");
    option.value = commune.nom_commune_postal;
    communesOptions.appendChild(option);
  });
};











// Partie qui permet d'ajouter des markers personnalisés en fonction du type de crimes rencontrés
// PS : Génération de points aléatoires de crimes (pour chaque crimes) parceque dans le fichier crimedata, aucun crime n'est affilié à une latitude et longitude.
// prérequis : une variable contenant les données de filtrage, et les coordonnées de la ville ( reprise lors du filtrage juste avant )
const addMarkers = (data, coordinates) => {
  const iconPaths = {
    violence: "./images/pnglegendes/violence.png",
    steal: "./images/pnglegendes/steal.png",
    drugs: "./images/pnglegendes/drugs.png",
    destruction: "./images/pnglegendes/destruction.png",
    gun: "./images/pnglegendes/gun.png",
    other: "./images/pnglegendes/other.png",
  };

  const iconMapping = {
    "Coups et blessures volontaires": "violence",
    "Coups et blessures volontaires intrafamiliaux": "violence",
    "Autres coups et blessures volontaires": "violence",
    "Violences sexuelles": "violence",
    "Vols de véhicules": "steal",
    "Vols dans les véhicules": "steal",
    "Vols d'accessoires sur véhicules": "steal",
    "Cambriolages de logement": "steal",
    "Vols avec armes": "gun",
    "Vols violents sans arme": "steal",
    "Vols sans violence contre des personnes": "steal",
    "Trafic de stupéfiants": "drugs",
    "Usage de stupéfiants": "drugs",
    "Destructions et dégradations volontaires": "destruction",
  };

  data.forEach((crime) => {
    const randomLat = coordinates.lat + (Math.random() - 0.5) * 0.4; // Il faudra changer l'apparition des marqueurs , c'est pas assez aléatoire.
    const randomLng = coordinates.lng + (Math.random() - 0.5) * 0.4;
    const iconType = iconMapping[crime.classe] || "other";
    const customIcon = L.icon({
      iconUrl: iconPaths[iconType],
      iconSize: [42, 42],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
    const marker = L.marker([randomLat, randomLng], { icon: customIcon });
    const tooltipContent = `<p class="test2">${crime.classe}</p>`;
    marker.bindTooltip(tooltipContent);
    marker.addTo(groupesMarqueursMapLeaflet);
  });
};








// Cette partie me permet de récupérer des infos pour faire un mini recap en haut a droite de la map leaflet.
// Dans ce mini recap on peut afficher : - Le nombre de crimes total qu'il y a eu dans la REGION, le DEP, ou la VILLE.
//                                       - le crime le plus itéré et son nombre d'itération

// Partie s'effectuant après un submit lors de la validation du 1er submit
// Après le submit, ne pas oublier le groupesMarqueursMapLeaflet.clearLayers(); pour réinitialiser la map leaflet après un second submit


/* 
  let nbrHarcelementSexuel = 0;
  let nbrDrogues = 0;
  let nbrArmes = 0;
  let nbrAutres = 0;
  let nbrDestructions = 0;
  let nbrVols = 0;
  let nbrViolence = 0;

  filteredCrimes.forEach((crime) => {
    let classe = crime.classe;
    switch (classe) {
      case "Coups et blessures volontaires":
      case "Coups et blessures volontaires intrafamiliaux":
      case "Autres coups et blessures volontaires":
      case "Violences sexuelles":
        nbrViolence++;
        break;
      case "Vols de véhicules":
      case "Vols dans les véhicules":
      case "Vols d'accessoires sur véhicules":
      case "Cambriolages de logement":
      case "Vols avec armes":
      case "Vols violents sans arme":
      case "Vols sans violence contre des personnes":
        nbrVols++;
        break;
      case "Trafic de stupéfiants":
      case "Usage de stupéfiants":
        nbrDrogues++;
        break;
      case "Destructions et dégradations volontaires":
        nbrDestructions++;
        break;
      case "Vols avec armes":
        nbrArmes++;
        break;
      default:
        nbrAutres++;
        break;
    }
  });

  nbrTTcrimes =
    nbrDestructions +
    nbrDrogues +
    nbrArmes +
    nbrAutres +
    nbrHarcelementSexuel +
    nbrVols +
    nbrViolence;

  const data = {
    nbrTTcrimes: nbrTTcrimes,
    nbrDestructions: nbrDestructions,
    nbrDrogues: nbrDrogues,
    nbrArmes: nbrArmes,
    nbrAutres: nbrAutres,
    nbrHarcelementSexuel: nbrHarcelementSexuel,
    nbrVols: nbrVols,
    nbrViolence: nbrViolence,
  };

  createRecapOnLeaflet(data);
*/









// Ici, pour chaque année je fais une recherche des crimes fait pour chaque ville qu'il y a dans mon tableau de ville
let validationComparaisonCommunesDashboard = document.getElementById("validationComparaisonCommunesDashboard");
let tableauNomsCommunesComparaison = [];
validationComparaisonCommunesDashboard.addEventListener("click", async () => {

  tableauNomsCommunesComparaison.push(nomCommune);
  let annees = [16, 17];
  const communes = await fetchCommunes();
  const crimes = await fetchCrimes();
  let tauxPourMilles = [];

  if (nomCommune) {
    tableauNomsCommunesComparaison.forEach((el2) => {
        console.log(el2);
      let tauxPourMilleCommune = [];
      annees.forEach((uneannee) => {
        const communeTrouvée = communes.find(
          (c) => c.nom_commune_postal === el2.toUpperCase()
        ); 
        // Partie me permettant de trouver les crimes d'une ville à l'année X : passage de codecommunes.csv à crimedata.csv
        const filteredCrimes = crimes.filter(
          (c) =>
            parseInt(c.CODGEO_2024) ===
              parseInt(communeTrouvée.code_commune_INSEE) &&
            parseInt(c.annee) === uneannee
        );

        // Calcul du taux de criminalité de la ville à l'année X
        let nbrCrimes = filteredCrimes.length;
        let nbrPopulation = filteredCrimes.length > 0 ? filteredCrimes[0].POP : 0;
        if (nbrPopulation > 0) {
          let tauxPourMille = (nbrCrimes / nbrPopulation) * 1000;
          tauxPourMilleCommune.push(tauxPourMille);
        } else {
          tauxPourMilleCommune.push(0); 
        }
      });

      // Objet servant de tableaux pour récupérer les taux de chaque ville à chaque année pour préparer le dashboard de comparaison
      tauxPourMilles.push({
        commune: el2,
        taux: tauxPourMilleCommune,
      });
    });
  }
  createDashboardsComparaisonVille(tauxPourMilles);
  createListCommunesCRUD(tauxPourMilles);

});



// créer le recap avec indication du nombre TT de crimes, + crime le plus itéré ( Recap = div en haut à droite de la map leaflet)
const createRecapOnLeaflet = (data) => {
    let customDiv = L.control({ position: "topright" });
  
    customDiv.onAdd = function (map) {
      let div = L.DomUtil.create("div", "divRecapHautDroiteLeaflet");
      let arr = [
        data.nbrDestructions,
        data.nbrDrogues,
        data.nbrArmes,
        data.nbrAutres,
        data.nbrHarcelementSexuel,
        data.nbrVols,
        data.nbrViolence,
      ];
      let crimeTypes = [
        "Destructions",
        "Drogues",
        "Armes",
        "Autres",
        "Harcelement sexuel",
        "Vols",
        "Violences",
      ];
      let iterationsMax = arr.reduce((acc, val) => {
        return Math.max(acc, val);
      });
      let indexIterationsMax = arr.indexOf(iterationsMax);
      let crimePlusFrequent = crimeTypes[indexIterationsMax];
      // Récupération du crime le plus itéré à partir de l'indice du tableau.


      div.innerHTML = `Nombre total de crimes : ${data.nbrTTcrimes}<br>
          Crime le plus perpétré : ${crimePlusFrequent} (${iterationsMax} cas)`;
      return div;
    };
  
    customDiv.addTo(lmap);
  };
  



// Création du dashboard où l'on compare les taux de criminalités par ville et par années ( div en bas a gauche de la map leaflet )
  const createDashboardsComparaisonVille = (tauxPourMilles) => {
    const canvasExistant = document.getElementById("dashboardCanvas");
    if (canvasExistant) {
      canvasExistant.parentElement.remove(); 
    }
    let customDiv = L.control({ position: "bottomleft" });
  
    customDiv.onAdd = function (map) {
      let div = L.DomUtil.create("div", "dashboardBasGaucheLeaflet");
      div.innerHTML = `
              <canvas id="dashboardCanvas" width="700" height="350" style="border:1px solid #000000;">
              </canvas>
          `;
      return div;
    };
  
    customDiv.addTo(lmap);
  
    const couleursVilles = [
      "#A8385C85",
      "#090D3385",
      "#ED671485",
    ];
  
    setTimeout(() => {
      const ctx = document.getElementById("dashboardCanvas").getContext("2d");
  
      const labels = ["2016", "2017"]; 
      const datasets = tauxPourMilles.map((item, index) => ({
        label: item.commune, 
        data: item.taux, 
        backgroundColor: couleursVilles[index], 
        borderColor: couleursVilles[index], 
        borderWidth: 1,
      }));
  
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels, 
          datasets: datasets, 
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top", 
            },
            tooltip: {
              enabled: true,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Taux pour mille",
              },
            },
            x: {
              title: {
                display: true,
                text: "Années",
              },
            },
          },
        },
      });
    }, 100);
  };
  
  // tableaux des villes que l'utilisateur veut afficher dans le dashboard. Ce tableau est la div en bas a droite de la map leaflet
  // C'est à partir de cette div qu'il pourra décider quelles villes il voudra comparer en les supprimant

  //PS: Cette fonction n'est pas encore bonne à 100%
  const createListCommunesCRUD = (data) => {
    const canvasExistant = document.querySelector(".listeVillesBasDroiteLeaflet");
    if (canvasExistant) {
      canvasExistant.remove(); 
    }
  
  
    let customDiv = L.control({ position: "bottomright" });
  
    customDiv.onAdd = function (map) {
      let div = L.DomUtil.create("div", "listeVillesBasDroiteLeaflet");
  
      div.innerHTML = `<strong>Communes:</strong><br>`;
      data.forEach((communeData) => {
        const communeButton = document.createElement("button");
        communeButton.textContent = communeData.commune;
        communeButton.onclick = () => {
          tableauNomsCommunesComparaison = tableauNomsCommunesComparaison.filter(
            (commune) => commune !== communeData.commune
          );
          buttonSubmit2.click(); 
        };
        div.appendChild(communeButton);
      });
  
      return div;
    };
  
    customDiv.addTo(lmap); 
  };
  