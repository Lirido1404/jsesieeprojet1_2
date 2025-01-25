/*********************
 * Variables globales
 *********************/
// Variables des selecteurs
const selectYears = document.getElementById("years");
const selectDepartement = document.getElementById("departement");
const selectVille = document.getElementById("ville");
const villeOptions = document.getElementById("ville-options");
const selectRegions = document.getElementById("region");
const divDepartementInput = document.getElementById("departementInput");
const divVilleInput = document.getElementById("villeInput");
const villeList = document.getElementById("villeList");

// Data initialization
const data = {
  hierarchy: {}, // Stores the hierarchy of regions, departments, and cities as well as crimes
  codeCommunes: [], // Stores the codecommunes file
  names: {
    // Stores the names of regions, departments, and cities
    regionNames: {},
    departmentNames: {},
    cityNames: {},
  },
  years: new Set(), // Stores the years of crimes
};

// Variables pour stocker les données GeoJSON
let geoJSONDataRegions = null;
let geoJSONDataDepartements = null;

// loading
let isLoading = true;

// Map
const layer = L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}@2x.png",
  {
    attribution:
      '&copy; <a href="https://carto.com/attributions">CartoDB</a> contributors',
  }
);
const initialCoordinates = { lat: 48.66616, lng: 2.842485 };
const map = L.map("map", {
  center: [initialCoordinates.lat, initialCoordinates.lng],
  zoom: 7,
  layers: [layer],
});
L.control.zoom({ position: "bottomright" }).addTo(map);
map.zoomControl.remove();
const markers = L.markerClusterGroup().addTo(map);

// Variables pour stocker les couches GeoJSON
let regionsLayer = null; // Pour les régions
let departementsLayer = null; // Pour les départements

// Icones pour les types de crimes
const iconPaths = {
  violence: "./images/legendes2/harassment2.png",
  violencefamily: "./images/legendes2/familyviolences.png",
  otherviolences: "./images/legendes2/otherinjury.png",
  sexualViolence: "./images/legendes2/sexualviolences2.png",
  steal: "./images/legendes2/steal2.png",
  stealincar: "./images/legendes2/stealincar.png",
  stealcaraccessories: "./images/legendes2/steelcaraccessories2.png",
  stealhouses: "./images/legendes2/stealhouse.png",
  stealgun: "./images/legendes2/gun2.png",
  stealwithoutgun: "./images/legendes2/stealwithoutgun.png",
  stealwithoutviolence: "./images/legendes2/stealwithoutviolence.png",
  drugs: "./images/legendes2/drugs2.png",
  drugsusages: "./images/legendes2/drugsusages.png",
  destruction: "./images/legendes2/hammer2.png",
};
const iconMapping = {
  "Coups et blessures volontaires": "violence",
  "Coups et blessures volontaires intrafamiliaux": "violencefamily",
  "Autres coups et blessures volontaires": "otherviolences",
  "Violences sexuelles": "sexualViolence",
  "Vols de véhicules": "steal",
  "Vols dans les véhicules": "stealincar",
  "Vols d'accessoires sur véhicules": "stealcaraccessories",
  "Cambriolages de logement": "stealhouses",
  "Vols avec armes": "stealgun",
  "Vols violents sans arme": "stealwithoutgun",
  "Vols sans violence contre des personnes": "stealwithoutviolence",
  "Trafic de stupéfiants": "drugs",
  "Usage de stupéfiants": "drugsusages",
  "Destructions et dégradations volontaires": "destruction",
};

// Dashboard
let validationComparaisonCommunesDashboard = document.getElementById(
  "validationComparaisonCommunesDashboard"
);
let tabCommunes = [];



/*****************************
 * Listeners (événements DOM)
 *****************************/
selectRegions.addEventListener("change", (e) => {
  if (e.target.value !== "") {
    divDepartementInput.classList.add("active");
    divDepartementInput.style.height = divDepartementInput.scrollHeight + "px";
  } else {
    divDepartementInput.style.height = "0";
    divDepartementInput.classList.remove("active");
  }
  divVilleInput.classList.remove("active");
  divVilleInput.style.height = "0";
});

selectDepartement.addEventListener("change", (e) => {
  if (e.target.value !== "") {
    divVilleInput.classList.add("active");
    divVilleInput.style.height = divDepartementInput.scrollHeight + "px";
  } else {
    divVilleInput.style.height = "0";
    divVilleInput.classList.remove("active");
  }
});

selectYears.addEventListener("focus", () => {
  selectYears.classList.add("touched");
});

selectDepartement.addEventListener("focus", () => {
  selectDepartement.classList.add("touched");
});

selectVille.addEventListener("focus", () => {
  selectVille.classList.add("touched");
});

// Lancer la pluie dès que la page est chargée
document.addEventListener("DOMContentLoaded", createRain);

// onSubmit Rechercher
document.getElementById("buttonsubmit").addEventListener("click", (e) => {
  e.preventDefault();
  if (isLoading) return;
  handleSubmit();
});

// onChange region
selectRegions.addEventListener("change", () => {
  resetMapMarkers();

  const selectedRegionCode = selectRegions.value;
  updateDepartementOptions(selectedRegionCode); // Appel de la fonction pour mettre à jour les départements

  if (departementsLayer) {
    map.removeLayer(departementsLayer);
    departementsLayer = null;
  }
  if (regionsLayer) {
    map.removeLayer(regionsLayer);
    regionsLayer = null;
  }

  if (selectedRegionCode === "") {
    // Si "Choisissez une région" est sélectionné, afficher toutes les régions
    displayRegionsGeoJSON();
  } else {
    // Charger et afficher les départements de la région sélectionnée
    displaySelectedDepartementGeoJSON();
  }
}
);

// onChange departement
selectDepartement.addEventListener("change", () => {
  resetMapMarkers();

  const selectedRegionCode = selectRegions.value;
  const selectedDepartmentCode = selectDepartement.value;

  if (departementsLayer) {
    map.removeLayer(departementsLayer);
    departementsLayer = null;
  }

  // reset city field
  villeOptions.innerHTML = "";
  selectVille.value = "";

  if (selectedDepartmentCode) {
    const cities = Object.keys(
      data.hierarchy[selectedRegionCode][selectedDepartmentCode]
    ).map((code) => ({
      code,
      name: data.names.cityNames[code],
    }));
    cities.forEach((city) => {
      const option = document.createElement("option");
      option.value = city.name;
      villeOptions.appendChild(option);
    });
    selectVille.disabled = false;
  } else {
    selectVille.disabled = true;
  }

  if (selectedDepartmentCode === "") {
    // Si "Choisissez un département" est sélectionné, afficher tous les départements de la région sélectionnée
    displaySelectedDepartementGeoJSON();
  }
});

// onChange ville
selectVille.addEventListener("input", () => {
  resetMapMarkers();
});

// onChange year
selectYears.addEventListener("change", () => {
  resetMapMarkers();
});

// Click on the "Comparer" button
validationComparaisonCommunesDashboard.addEventListener(
  "click",
  handleSubmitCompare
);



/****************************
 * Fonctions de front-end
 ****************************/
// Ajoute un titre sur la map
const addCenteredTitleToLeaflet = (map, title) => {
  // Vérifier si un titre existe déjà et le supprimer
  let existingTitleControl = map._controlCorners["topleft"]?.querySelector(
    ".leaflet-centered-title"
  );
  if (existingTitleControl) {
    existingTitleControl.remove();
  }

  // Créer un contrôle Leaflet personnalisé pour le titre
  let titleControl = L.control({ position: "topleft" }); // Utiliser "topleft"

  titleControl.onAdd = function () {
    let container = L.DomUtil.create("div", "leaflet-centered-title");
    container.innerHTML = title;
    return container;
  };

  titleControl.addTo(map);
};

function showLoader() {
  document.getElementById("loader").classList.remove("hidden");
  updateProgressBar(0);
}

function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
}

function updateOpacity(percentage) {
  const loaderBackground = document.getElementById("loader");
  const opacity = 1 - percentage / 100; // L'opacité diminue en fonction du pourcentage
  loaderBackground.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`; // Modifie l'opacité
}

function updateProgressBar(percentage) {
  const progressBar = document.getElementById("progress-bar");
  progressBar.style.width = percentage + "%"; // Met à jour la largeur de la barre

  updateOpacity(percentage); // Met à jour l'opacité en fonction du pourcentage
}

// Sélectionner toutes les catégories de crimes avec des sous types
document.querySelectorAll("[class^='plus']").forEach((plusElement) => {
  plusElement.addEventListener("click", function (event) {
    event.stopPropagation();

    // classes "plus1", "plus2", "plus4"
    const classSuffix = this.className.match(/plus\d+/)[0];
    const infoplus = this.closest(".cercle-container").querySelector(
      `.${classSuffix.replace("plus", "infoplus")}`
    );

    if (infoplus.style.height === "0px" || !infoplus.style.height) {
      infoplus.style.height = infoplus.scrollHeight + "px"; // Définir la hauteur actuelle
    } else {
      infoplus.style.height = "0px"; // Réduire à zéro
    }
  });
});

document.querySelectorAll('.cerclerow').forEach(cerclerow => {
  cerclerow.addEventListener('click', () => {
    // Basculer la classe "clicked" sur le cerclerow
    cerclerow.classList.toggle('clicked');

    // Trouver l'élément .infoplus associé (frère suivant)
    const infoplus = cerclerow.nextElementSibling; // Recherche du frère suivant
    if (infoplus && infoplus.classList.contains('infoplus')) {
      // Vérifier si le cerclerow a la classe "clicked"
      const isClicked = cerclerow.classList.contains('clicked');

      // Basculer l'état des checkboxes des sous-éléments
      infoplus.querySelectorAll('.sous-element').forEach(sousElement => {
        const checkbox = sousElement.querySelector('input[type="checkbox"]');
        if (checkbox) {
          sousElement.classList.toggle('clicked', isClicked);
          checkbox.checked = !isClicked;
        }
      });
      handleSubmit();
    }
  });
});

document.querySelectorAll('.sous-element').forEach(sousElement => {
  sousElement.addEventListener('click', event => {
    event.stopPropagation(); // Empêcher la propagation du clic vers .cerclerow
    sousElement.classList.toggle('clicked');

    // Basculer la case à cocher associée
    const checkbox = sousElement.querySelector('input[type="checkbox"]');
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
    }
    handleSubmit();
  });
});

function createRain() {
  const rainContainer = document.querySelector(".rain-container");

  setInterval(() => {
    const raindrop = document.createElement("div");
    raindrop.classList.add("raindrop");

    // Position horizontale aléatoire
    raindrop.style.left = Math.random() * 100 + "vw";

    // Vitesse de chute aléatoire
    const fallDuration = Math.random() * 2 + 2; // Entre 2 et 4 secondes
    raindrop.style.animationDuration = fallDuration + "s";

    // Ajouter la goutte à l'écran
    rainContainer.appendChild(raindrop);

    // Supprimer la goutte une fois qu'elle est tombée
    setTimeout(() => {
      raindrop.remove();
    }, fallDuration * 1000);
  }, 100); // Nouvelle goutte toutes les 100ms
}



/****************************
 * Fonctions utiles
 ****************************/
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Update the department options based on the selected region
function updateDepartementOptions(selectedRegionCode) {
  // Reset the fields
  selectDepartement.innerHTML =
    '<option value="">Choisissez un département</option>';
  villeOptions.innerHTML = "";
  selectVille.value = "";
  selectVille.disabled = true;

  // If a region is selected, populate the department options
  if (selectedRegionCode) {
    const departments = Object.keys(data.hierarchy[selectedRegionCode]).map(
      (code) => ({
        code,
        name: data.names.departmentNames[code],
      })
    );

    // Add department options
    departments.forEach((department) => {
      const option = document.createElement("option");
      option.value = department.code;
      option.textContent = department.name;
      selectDepartement.appendChild(option);
    });

    // Enable the department select
    selectDepartement.disabled = false;
  } else {
    // Disable the department select if no region is selected
    selectDepartement.disabled = true;
  }
}

// Update the city options based on the selected department
function updateCityOptions(departmentCode) {
  // Réinitialiser les options de villes
  villeOptions.innerHTML = "";
  selectVille.value = "";
  selectVille.disabled = true;

  if (departmentCode) {
    // Obtenir la région associée pour parcourir la hiérarchie
    const regionCode = data.codeCommunes.find(
      (row) => row.code_departement === departmentCode
    )?.code_region;

    if (
      regionCode &&
      data.hierarchy[regionCode] &&
      data.hierarchy[regionCode][departmentCode]
    ) {
      const cities = Object.keys(
        data.hierarchy[regionCode][departmentCode]
      ).map((code) => ({
        code,
        name: data.names.cityNames[code],
      }));

      // Ajouter les options des villes
      cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city.code; // Utilisez le code de la ville pour la valeur
        option.textContent = city.name;
        villeOptions.appendChild(option);
      });

      selectVille.disabled = false; // Activer l'entrée de la ville
    }
  }
}

// Reset map markers
function resetMapMarkers() {
  markers.clearLayers();
}

// Gets all selected crime types
const getSelectedCrimeTypes = () => {
  const checkboxes = document.querySelectorAll('.crimeTypeCheckbox:checked');
  return Array.from(checkboxes).map(checkbox => checkbox.value);
};

const listeAnneeCrimes = (dataCrimesVille) => {
  let anneestab = [];
  let uniqueAnneesTab = [];
  let uniqueCount = 0;

  dataCrimesVille.forEach((crime) => {
    let annee = crime.annee;
    anneestab.push(annee);
  });

  for (let i = 0; i < anneestab.length; i++) {
    let isUnique = true;
    for (let j = 0; j < uniqueCount; j++) {
      if (anneestab[i] === uniqueAnneesTab[j]) {
        isUnique = false;
        break;
      }
    }
    if (isUnique) {
      uniqueAnneesTab.push(anneestab[i]);
      uniqueCount++;
    }
  }
  return uniqueAnneesTab;
};

// Fonction pour styliser les polygones
const getPolygonStyle = () => {
  return {
    color: "#dd1818", // Couleur des contours
    weight: 2, // Poids des contours
    fillColor: "#fc0101",
    fillOpacity: 0,
  };
};



/****************************
 * Fonctions sur les données
 ****************************/
// Function to load and parse a CSV
async function loadCSV(filePath) {
  const response = await fetch(filePath);
  const csvData = await response.text();
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  return parsed.data;
}

// Fonction pour charger les données GeoJSON
const fetchGeoJSON = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Erreur lors du chargement de ${url}:`, error);
    return null;
  }
};

function displayRegionsGeoJSON() {
  if (geoJSONDataRegions) {
    regionsLayer = L.geoJSON(geoJSONDataRegions, {
      style: getPolygonStyle, // Appliquer le style initial
      onEachFeature: onEachFeatureReg, // Configurer les interactions
    }).addTo(map); // Ajouter la couche des régions à la carte
  } else {
    console.error("Aucune donnée GeoJSON des régions n'est disponible.");
  }
}

function displaySelectedDepartementGeoJSON() {
  if (geoJSONDataDepartements) {
    const selectedRegionCode = selectRegions.value;
    const filteredFeatures = geoJSONDataDepartements.features.filter(
      (departmentFeature) => {
        let departmentCode = departmentFeature.properties.code;
        if (departmentCode.slice(0, 1) === "0") {
          departmentCode = departmentCode.slice(1);
        }
        return data.codeCommunes.some(
          (row) =>
            row.code_departement === departmentCode &&
            row.code_region === selectedRegionCode
        );
      }
    );

    const filteredGeoJSON = {
      ...geoJSONDataDepartements,
      features: filteredFeatures,
    };

    departementsLayer = L.geoJSON(filteredGeoJSON, {
      style: getPolygonStyle,
      onEachFeature: onEachFeatureDep,
    }).addTo(map);
  }
}

// Load CSV data into `data`
async function initData() {
  try {
    const codeCommunesRows = await loadCSV("./data/codecommunes.csv");
    data.codeCommunes = codeCommunesRows;
    updateProgressBar(25); // Mise à jour après le premier chargement

    // Separate dictionaries for names
    const regionNames = {};
    const departmentNames = {};
    const cityNames = {};

    // Hierarchical structure
    const hierarchy = {};

    for (const row of codeCommunesRows) {
      const {
        code_region,
        nom_region,
        code_departement,
        nom_departement,
        code_commune_INSEE,
        nom_commune,
      } = row;
      if (nom_region === "") continue;

      regionNames[code_region] = nom_region;
      departmentNames[code_departement] = nom_departement;
      cityNames[code_commune_INSEE] = nom_commune;

      // Build the hierarchy
      if (!hierarchy[code_region]) {
        hierarchy[code_region] = {};
      }
      if (!hierarchy[code_region][code_departement]) {
        hierarchy[code_region][code_departement] = {};
      }
      hierarchy[code_region][code_departement][code_commune_INSEE] = []; // Initialize a list for crimes
    }

    const regionFiles = new Set(codeCommunesRows.map((row) => row.code_region));
    const regionPromises = Array.from(regionFiles).map(async (codeRegion) => {
      if (!codeRegion || isNaN(codeRegion)) return;
      const regionData = await loadCSV(
        `./data/regions/region_${codeRegion}.csv`
      );
      updateProgressBar(50); // Mise à jour à 50% pendant le chargement des régions

      // Add crimes to the corresponding cities
      regionData.forEach((row) => {
        const { CODGEO_2024, annee, ...rest } = row;
        const crimeData = { CODGEO_2024, annee: `20${annee}`, ...rest };
        if (hierarchy[codeRegion]) {
          for (const departmentCode in hierarchy[codeRegion]) {
            if (hierarchy[codeRegion][departmentCode][CODGEO_2024]) {
              hierarchy[codeRegion][departmentCode][CODGEO_2024].push(
                crimeData
              );
              if (annee) {
                data.years.add(`20${annee}`);
              }
            }
          }
        }
      });
    });

    // Wait for all regional files to be loaded
    await Promise.all(regionPromises);
    updateProgressBar(75); // Mise à jour à 75% une fois que toutes les régions sont traitées

    data.hierarchy = hierarchy;
    data.names = { regionNames, departmentNames, cityNames };
    updateProgressBar(100);

    console.log("Data loaded successfully.");
  } catch (error) {
    console.error("Error loading CSV data:", error);
  }
}

// Initialize permanent data options in input fields
async function initPermanentDataOptionsInInputs() {
  // regions
  const regions = Object.keys(data.hierarchy).map((code) => ({
    code,
    name: data.names.regionNames[code],
  }));
  regions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region.code;
    option.textContent = region.name;
    selectRegions.appendChild(option);
  });

  // years
  Array.from(data.years)
    .sort()
    .forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      selectYears.appendChild(option);
    });

  console.log("Data options initialized successfully.");
}



/****************************
 * Fonctions sur les stats de map
 ****************************/
const createRecapOnLeaflet = (crimes) => {
  const selectedYear = selectYears.value;

  let filteredCrimes = selectedYear ? crimes.filter(crime => crime.annee == selectedYear) : crimes;

  const selectedCrimeTypes = getSelectedCrimeTypes();
  if (selectedCrimeTypes.length > 0) {
    filteredCrimes = filteredCrimes.filter((crime) =>
      selectedCrimeTypes.includes(iconMapping[crime.classe])
    );
  }

  let crimeTotals = {
    "Coups et blessures volontaires": 0,
    "Coups et blessures volontaires intrafamiliaux": 0,
    "Autres coups et blessures volontaires": 0,
    "Violences sexuelles": 0,
    "Vols avec armes": 0,
    "Vols violents sans arme": 0,
    "Vols sans violence contre des personnes": 0,
    "Cambriolages de logement": 0,
    "Vols de véhicules": 0,
    "Vols dans les véhicules": 0,
    "Vols d'accessoires sur véhicules": 0,
    "Destructions et dégradations volontaires": 0,
    "Trafic de stupéfiants": 0,
    "Usage de stupéfiants": 0,
  };

  // Filtrer les crimes par année et calculer les totaux par type de crime
  filteredCrimes.forEach((typecrime) => {
    if (crimeTotals.hasOwnProperty(typecrime.classe)) {
      crimeTotals[typecrime.classe] += parseInt(typecrime.faits);
    }
  });

  // Calcul du crime le plus fréquent (parmi les totaux)
  let maxCrime = Math.max(...Object.values(crimeTotals));
  let mostFrequentCrime = Object.keys(crimeTotals).find(
    (key) => crimeTotals[key] === maxCrime
  );

  // Vérifier si un récapitulatif existe déjà et le supprimer
  let existingRecapControl = map._controlCorners["topright"].querySelector(
    ".divRecapHautDroiteLeaflet"
  );
  if (existingRecapControl) {
    existingRecapControl.remove();
  }

  // Ajouter le nouveau récapitulatif
  let customDiv = L.control({ position: "topright" });

  customDiv.onAdd = function (map) {
    let div = L.DomUtil.create("div", "divRecapHautDroiteLeaflet");

    let totalCrimes = Object.values(crimeTotals).reduce(
      (acc, val) => acc + val,
      0
    );

    let yearText = selectedYear ? `en ${selectedYear}` : ''; // Si une année est sélectionnée, on l'affiche


    div.innerHTML =
      `Nombre total de crimes ${yearText} : ${totalCrimes} <i> (Des types de crimes peuvent avoir plusieurs réitérations) </i><br>
        Crime le plus perpétré : ${mostFrequentCrime} (${maxCrime} cas)
      `;
    return div;
  };

  customDiv.addTo(map);
};

const createDashboardsComparaisonVille = (
  tauxPourMilles,
  prepArrAnneeDashboard
) => {
  prepArrAnneeDashboard = prepArrAnneeDashboard.map((item) => item.toString());

  const existingDashboard = document.querySelector(
    ".dashboardBasGaucheLeaflet"
  );
  if (existingDashboard) {
    existingDashboard.remove();
  }

  let customDiv = L.control({ position: "bottomleft" });

  if (tabCommunes.length <= 0) {
    return 0;
  }

  customDiv.onAdd = function (map) {
    let div = L.DomUtil.create("div", "dashboardBasGaucheLeaflet");

    // Ajouter le carré rouge en haut à droite
    div.innerHTML = `
      <div style="position: relative;">
        <div id="redSquare" style="position: absolute; border-radius:100%; top: -30px; right: -30px; width: 55px; height: 55px; background-color: #c01b1b; display: flex; justify-content:center; align-items:center; cursor: pointer"> <img src="./images/croix.svg" style="width : 35px; height : 35px;">  </div>
        <canvas id="dashboardCanvas" width="700" height="350" style="border:1px solid #000000;">
        </canvas>
      </div>
    `;

    return div;
  };

  customDiv.addTo(map);

  // Ajouter un écouteur d'événement sur le carré rouge
  const redSquare = document.getElementById("redSquare");
  const divContainer = redSquare
    ? redSquare.closest(".dashboardBasGaucheLeaflet")
    : null;

  if (redSquare && divContainer) {
    redSquare.addEventListener("click", () => {
      tabCommunes = []; // Réinitialise la liste des communes

      // Supprime l'élément contenant le dashboard
      if (divContainer) {
        divContainer.remove(); // Supprime complètement le conteneur du DOM
      }

      // Réinitialise l'affichage de la liste des villes
      if (villeList) {
        villeList.innerHTML = ""; // Vide la liste des villes
      }

      console.log("Dashboard fermé, liste des villes réinitialisée.");
    });
  }

  const couleursVilles = ["#c01b1b85", "#090D3385", "#ED671485", "#16161685"];

  setTimeout(() => {
    const ctx = document.getElementById("dashboardCanvas").getContext("2d");

    const labels = prepArrAnneeDashboard;
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

function updateDashboardGraph() {
  if (tabCommunes.length === 0) return;

  let maxAnneeParVille = [];
  let tauxPourMilles = [];

  tabCommunes.forEach((commune) => {
    let villeData = data.codeCommunes.find(
      (row) => row.nom_commune === commune
    );
    let codeRegion = villeData.code_region;
    let codeDepartement = villeData.code_departement;
    let codeCommune = villeData.code_commune_INSEE;
    let dataCrimesVille =
      data.hierarchy[codeRegion][codeDepartement][codeCommune];
    let annees = listeAnneeCrimes(dataCrimesVille);

    maxAnneeParVille.push(annees.length);

    let tauxVille = {
      commune: commune,
      taux: [],
    };

    annees.forEach((annee) => {
      let filteredByYear = dataCrimesVille.filter(
        (crime) => crime.annee == annee
      );
      let nombrePopVille = parseInt(filteredByYear[0].POP);

      let nombreCrimes = 0;
      filteredByYear.forEach((typeCrime) => {
        nombreCrimes += parseInt(typeCrime.faits);
      });

      let tauxPourMille =
        nombreCrimes === 0 ? 0 : (nombreCrimes / nombrePopVille) * 1000;

      tauxVille.taux.push(tauxPourMille);
    });

    tauxPourMilles.push(tauxVille);
  });

  let max = Math.max(...maxAnneeParVille);

  let prepArrAnneeDashboard = [];
  for (let cpt = 0; cpt < max; cpt++) {
    prepArrAnneeDashboard.push(2016 + cpt);
  }

  createDashboardsComparaisonVille(tauxPourMilles, prepArrAnneeDashboard);
}

// Fonction pour configurer les interactions (hover et click)
const onEachFeatureReg = (feature, layer) => {
  layer.on({
    mouseover: (e) => {
      const target = e.target;
      target.setStyle({
        fillOpacity: 0.15,
      });
      target.bringToFront();
    },
    mouseout: (e) => {
      e.target.setStyle(getPolygonStyle());
    },
    click: () => {
      let regionCode = feature.properties.code;
      if (regionCode.slice(0, 1) === "0") {
        regionCode = regionCode.slice(1);
      }

      if (regionCode !== "") {
        let villeReg = data.codeCommunes.find(
          (row) => row.code_region === regionCode
        );

        let lat = villeReg.latitude;
        let long = villeReg.longitude;

        map.setView([lat, long], 8);
      }

      // Supprimer les couches existantes
      if (departementsLayer) {
        map.removeLayer(departementsLayer);
        departementsLayer = null;
      }
      if (regionsLayer) {
        map.removeLayer(regionsLayer);
        regionsLayer = null;
      }

      selectRegions.value = regionCode;
      updateDepartementOptions(regionCode);
      selectRegions.dispatchEvent(new Event("change"));
    },
  });

  if (feature.properties && feature.properties.nom) {
    layer.bindTooltip(feature.properties.nom, {
      permanent: false,
      direction: "center",
    });
  }
};

const onEachFeatureDep = (feature, layer) => {
  layer.on({
    mouseover: (e) => {
      const target = e.target;
      target.setStyle({
        fillOpacity: 0.15,
      });
      target.bringToFront(); // Amène l'élément en avant
    },
    mouseout: (e) => {
      e.target.setStyle(getPolygonStyle()); // Réinitialise le style
    },
    click: () => {
      let departmentCode = feature.properties.code;
      if (departmentCode.slice(0, 1) === "0") {
        departmentCode = departmentCode.slice(1);
      }

      let villeDep = data.codeCommunes.find(
        (row) => row.code_departement === departmentCode
      );

      let lat = villeDep.latitude;
      let long = villeDep.longitude;

      map.setView([lat, long], 10);

      selectDepartement.value = departmentCode;

      updateCityOptions(departmentCode);

      selectDepartement.dispatchEvent(new Event("change"));

      handleSubmit();
    },
  });
  // Ajouter un tooltip avec le nom de la région ou département
  if (feature.properties && feature.properties.nom) {
    layer.bindTooltip(feature.properties.nom, {
      permanent: false,
      direction: "center",
    });
  }
};



/****************************
 * Fonctions
 ****************************/
// Fetch data based on user input
function fetchData(
  selectedYear,
  selectedRegionCode,
  selectedDepartmentCode,
  selectedCityName
) {
  if (!selectedRegionCode) {
    alert("Veuillez sélectionner une région.");
    return;
  }

  let selectedCrimes = [];
  let crimes = [];

  if (selectedCityName !== "") {
    const selectedCityCode = data.codeCommunes.find(
      (row) =>
        row.nom_commune === selectedCityName &&
        row.code_departement === selectedDepartmentCode
    )?.code_commune_INSEE;
    if (selectedCityCode) {
      crimes =
        data.hierarchy[selectedRegionCode][selectedDepartmentCode][
        selectedCityCode
        ] || [];
      createRecapOnLeaflet(crimes);
    }
  } else if (selectedDepartmentCode !== "") {
    crimes = Object.values(
      data.hierarchy[selectedRegionCode][selectedDepartmentCode] || {}
    ).flat();
  } else {
    crimes = Object.values(
      Object.values(data.hierarchy[selectedRegionCode] || {}).flat()
    ).flat();
  }
  selectedCrimes =
    selectedYear !== ""
      ? crimes.filter((crime) => crime.annee === selectedYear)
      : crimes;

  const selectedCrimeTypes = Array.from(
    document.querySelectorAll(".crimeTypeCheckbox:checked")
  ).map((cb) => cb.value);
  if (selectedCrimeTypes.length > 0) {
    selectedCrimes = selectedCrimes.filter((crime) =>
      selectedCrimeTypes.includes(iconMapping[crime.classe])
    );
  }

  return {
    region: data.names.regionNames[selectedRegionCode],
    department: data.names.departmentNames[selectedDepartmentCode] || "",
    city: selectedCityName,
    year: selectedYear,
    crimes: selectedCrimes,
  };
}

// Display data on the map
function displayMap(response, map, markers) {
  let latItem1 = response.crimes[0].latitude;
  let longItem1 = response.crimes[0].longitude;
  map.setView([latItem1, longItem1], 11);

  markers.clearLayers();
  response.crimes.forEach((point) => {
    let popupContent = "";
    if (point.CODGEO_2024) {
      popupContent += "<b>" + point.classe + "</b><br>";
      popupContent += "Nombre de faits: <u>" + point.faits + "</u><br><br>";
      const city = data.names.cityNames[point.CODGEO_2024];
      popupContent += "Ville: " + city + "<br>";
      const department =
        point.CODGEO_2024.length === 4
          ? data.names.departmentNames[point.CODGEO_2024.slice(0, 1)]
          : data.names.departmentNames[point.CODGEO_2024.slice(0, 2)];
      popupContent += "Département: " + department + "<br>";
      popupContent += "Région: " + response.region + "<br>";
      popupContent += "Année: " + point.annee + "<br>";
    }

    const iconType = iconMapping[point.classe] || "other";
    const customIcon = L.icon({
      iconUrl: iconPaths[iconType],
      iconSize: [42, 42],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    const marker = L.marker([point.latitude, point.longitude], {
      icon: customIcon,
    }).bindPopup(popupContent);
    markers.addLayer(marker);
  });
  map.addLayer(markers);
}

// Handle search form submission : fetch and display data filtered by user input
function handleSubmit() {
  const selectedRegionCode = selectRegions.value;
  const selectedDepartmentCode = selectDepartement.value;
  const selectedCityName = selectVille.value;
  const selectedYear = selectYears.value;

  markers.clearLayers();

  if (selectedDepartmentCode === "") {
    alert("Veuillez sélectionner un département.");
    return;
  }

  const dataFetched = fetchData(
    selectedYear,
    selectedRegionCode,
    selectedDepartmentCode,
    selectedCityName
  );
  displayMap(dataFetched, map, markers);
}

// gère le click sur le bouton comparer
function handleSubmitCompare() {
  const inputCommune = document.getElementById("communes"); // L'élément input
  const nomCommune = inputCommune.value.trim(); // Récupérer la valeur de l'input

  // Vérifier si la commune existe
  const communeExists = data.codeCommunes.some(
    (row) => row.nom_commune.toLowerCase() === nomCommune.toLowerCase()
  );

  if (!communeExists) {
    alert(
      "La commune que vous avez saisie n'existe pas. Veuillez vérifier l'orthographe."
    );
    inputCommune.value = ""; // Réinitialiser l'input
    return; // Ne pas ajouter la commune
  }

  if (tabCommunes.length < 4) {
    if (!tabCommunes.includes(nomCommune) && nomCommune !== "") {
      tabCommunes.push(nomCommune);

      // Créer un élément de liste pour la ville
      const listItem = document.createElement("li");
      listItem.className = "villeListItem";
      listItem.textContent = nomCommune;

      // Ajouter une icône poubelle pour supprimer la ville
      const deleteIcon = document.createElement("span");
      deleteIcon.className = "deleteIcon";
      deleteIcon.innerHTML = "🗑️";
      deleteIcon.addEventListener("click", () => {
        // Supprimer cette ville spécifique du tableau et de la liste
        tabCommunes = tabCommunes.filter((commune) => commune !== nomCommune);
        villeList.removeChild(listItem);

        // Cas 1 : Plus de villes dans le comparateur
        if (tabCommunes.length === 0) {
          const redSquare = document.getElementById("redSquare");
          const divContainer = redSquare
            ? redSquare.closest(".dashboardBasGaucheLeaflet")
            : null;

          // Simule un clic sur la croix rouge
          if (divContainer) {
            divContainer.remove(); // Supprime le dashboard
          }
        } else {
          // Cas 2 : Mettre à jour le graphique avec les villes restantes
          updateDashboardGraph();
        }
      });

      listItem.appendChild(deleteIcon);
      villeList.appendChild(listItem);
    }
  } else {
    alert("Vous pouvez sélectionner au maximum 4 communes");
  }

  // Réinitialiser l'input
  inputCommune.value = "";

  // Initialisation ou mise à jour du dashboard
  updateDashboardGraph();
}



/********************************
 * Fonction principale (init)
 ********************************/
async function initializeWebSite() {
  try {
    addCenteredTitleToLeaflet(map, "Les crimes en France");
    showLoader(); // Affiche le loader au début
    await initData();
    await initPermanentDataOptionsInInputs();
    geoJSONDataRegions = await fetchGeoJSON("./data/regions.geojson");
    geoJSONDataDepartements = await fetchGeoJSON("./data/dep.geojson");
    displayRegionsGeoJSON();
    isLoading = false;
  } catch (error) {
    console.error("An error occurred during initialization:", error);
  } finally {
    await delay(500);
    hideLoader(); // Cache le loader une fois terminé
  }
}



// Exécution principale
initializeWebSite();
