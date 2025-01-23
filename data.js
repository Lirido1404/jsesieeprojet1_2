// Function to load and parse a CSV
async function loadCSV(filePath) {
  const response = await fetch(filePath);
  const csvData = await response.text();
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  return parsed.data;
}

// Function to get the region name from department code
function getRegionNameFromDepartement(departmentCode) {
  // Trouve le code de la région correspondant au département
  const regionCode = data.codeCommunes.find(
    (row) => row.code_departement === departmentCode
  )?.code_region;

  if (regionCode) {
    // Si un code de région est trouvé, retourne le nom de la région
    return data.names.regionNames[regionCode] || "Région inconnue";
  } else {
    // Si aucun code de région n'est trouvé, retourne un message d'erreur
    return "Région non trouvée pour ce département";
  }
}

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
let isLoading = true;
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
// Variables pour stocker les couches GeoJSON
let regionsLayer = null; // Pour les régions
let departementsLayer = null; // Pour les départements

// Load CSV data into `data`
async function initData() {
  try {
    showLoader();
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
  } finally {
    await delay(500);
    hideLoader();
  }
}

function updateDepartementOptions(selectedRegionCode) {
  const departementSelect = document.getElementById("departement");
  const villeOptions = document.getElementById("ville-options");
  const villeInput = document.getElementById("ville");

  // Reset the fields
  departementSelect.innerHTML =
    '<option value="">Choisissez un département</option>';
  villeOptions.innerHTML = "";
  villeInput.value = "";
  villeInput.disabled = true;

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
      departementSelect.appendChild(option);
    });

    // Enable the department select
    departementSelect.disabled = false;
  } else {
    // Disable the department select if no region is selected
    departementSelect.disabled = true;
  }
}

function updateCityOptions(departmentCode) {
  const villeInput = document.getElementById("ville");
  const villeOptions = document.getElementById("ville-options");

  // Réinitialiser les options de villes
  villeOptions.innerHTML = "";
  villeInput.value = "";
  villeInput.disabled = true;

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

      villeInput.disabled = false; // Activer l'entrée de la ville
    }
  }
}

// Initialize data options in input fields
async function initDataOptionsInInputs() {
  const regionSelect = document.getElementById("region");
  const departementSelect = document.getElementById("departement");
  const villeInput = document.getElementById("ville");
  const villeOptions = document.getElementById("ville-options");
  const yearSelect = document.getElementById("years");

  // regions
  const regions = Object.keys(data.hierarchy).map((code) => ({
    code,
    name: data.names.regionNames[code],
  }));
  regions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region.code;
    option.textContent = region.name;
    regionSelect.appendChild(option);
  });

  regionSelect.addEventListener("change", () => {
    resetMapMarkers();

    const selectedRegionCode = regionSelect.value;
    console.log("Région sélectionnée:", selectedRegionCode);
    updateDepartementOptions(selectedRegionCode); // Appel de la fonction pour mettre à jour les départements

    if (departementsLayer) {
      map.removeLayer(departementsLayer);
      departementsLayer = null;
      console.log("Départements supprimés.");
    }
    if (regionsLayer) {
      map.removeLayer(regionsLayer);
      regionsLayer = null;
    }

    if (selectedRegionCode === "") {
      // Si "Choisissez une région" est sélectionné, afficher toutes les régions
      fetchGeoJSON("regions.geojson").then((geojsonData) => {
        if (geojsonData) {
          regionsLayer = L.geoJSON(geojsonData, {
            style: getPolygonStyle,
            onEachFeature: onEachFeatureReg,
          }).addTo(map);
        }
      });
    } else {
      // Charger et afficher les départements de la région sélectionnée
      fetchGeoJSON("dep.geojson").then((geojsonData) => {
        if (geojsonData) {
          const filteredFeatures = geojsonData.features.filter(
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
            ...geojsonData,
            features: filteredFeatures,
          };

          departementsLayer = L.geoJSON(filteredGeoJSON, {
            style: getPolygonStyle,
            onEachFeature: onEachFeatureDep,
          }).addTo(map);
        }
      });
    }
  });

  // onChange departement
  departementSelect.addEventListener("change", () => {
    resetMapMarkers();

    const selectedRegionCode = regionSelect.value;
    const selectedDepartmentCode = departementSelect.value;

    if (departementsLayer) {
      map.removeLayer(departementsLayer);
      departementsLayer = null; // Réinitialiser la référence
    }

    // reset city field
    villeOptions.innerHTML = "";
    villeInput.value = "";

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
      villeInput.disabled = false;
    } else {
      villeInput.disabled = true;
    }

    if (selectedDepartmentCode === "") {
      // Si "Choisissez un département" est sélectionné, afficher tous les départements de la région sélectionnée
      fetchGeoJSON("dep.geojson").then((geojsonData) => {
        if (geojsonData) {
          const filteredFeatures = geojsonData.features.filter(
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
            ...geojsonData,
            features: filteredFeatures,
          };

          departementsLayer = L.geoJSON(filteredGeoJSON, {
            style: getPolygonStyle,
            onEachFeature: onEachFeatureDep,
          }).addTo(map);
        }
      });
    }
  });

  // onChange ville
  villeInput.addEventListener("input", () => {
    resetMapMarkers();
  });

  // years
  Array.from(data.years)
    .sort()
    .forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });

  // onChange year
  yearSelect.addEventListener("change", () => {
    resetMapMarkers();
  });

  document.querySelectorAll(".cerclerow").forEach((container) => {
    container.addEventListener("click", () => {
      const checkboxId = container.getAttribute("data-checkbox-id");
      const checkbox = document.getElementById(checkboxId);
  
      // Vérifie que la checkbox du groupe principal existe
      if (!checkbox) {
        console.error(`Checkbox avec ID "${checkboxId}" introuvable.`);
        return;
      }
  
      // Basculer immédiatement l'état du groupe principal
      const isChecked = !checkbox.checked;
      checkbox.checked = isChecked;
  
      // Mettre à jour la classe "selected" pour le groupe principal
      container.classList.toggle("selected", isChecked);
  
      // Trouver les sous-éléments associés
      const infoplus = container.nextElementSibling; // Conteneur des sous-éléments
      if (infoplus && infoplus.classList.contains("infoplus")) {
        // Met à jour immédiatement l'état de tous les sous-éléments
        infoplus.querySelectorAll(".sous-element").forEach((subElement) => {
          const subCheckboxId = subElement.getAttribute("data-checkbox-id");
          const subCheckbox = document.getElementById(subCheckboxId);
  
          if (!subCheckbox) {
            console.error(
              `Sous-checkbox avec ID "${subCheckboxId}" introuvable.`
            );
            return;
          }
  
          // Synchronise l'état des sous-checkboxes avec celui du groupe principal
          subCheckbox.checked = isChecked;
  
          // Mettre à jour immédiatement l'apparence visuelle des sous-éléments
          subElement.classList.toggle("selected", isChecked);
        });
      }
  
      // Appeler handleSubmit si nécessaire
      handleSubmit();
    });
  });
  
  // Gestion indépendante des sous-éléments
  document.querySelectorAll(".sous-element").forEach((subElement) => {
    subElement.addEventListener("click", (event) => {
      const checkboxId = subElement.getAttribute("data-checkbox-id");
      const checkbox = document.getElementById(checkboxId);
  
      // Vérifie que la sous-checkbox existe
      if (!checkbox) {
        console.error(`Checkbox avec ID "${checkboxId}" introuvable.`);
        return;
      }
  
      // Basculer immédiatement l'état de la sous-checkbox
      checkbox.checked = !checkbox.checked;
  
      // Mettre à jour immédiatement l'apparence visuelle du sous-élément
      subElement.classList.toggle("selected", checkbox.checked);
  
      // Empêcher la propagation pour éviter d'activer le groupe parent
      event.stopPropagation();
  
      // Appeler handleSubmit si nécessaire
      handleSubmit();
    });
  });
  
  


  // onSubmit
  const submitButton = document.getElementById("buttonsubmit");
  submitButton.addEventListener("click", (e) => {
    e.preventDefault();
    if (isLoading) return;
    handleSubmit();
  });

  console.log("Data options initialized successfully.");
}

// Handle form submission for fetching and displaying data filtered by user input
function handleSubmit() {
  const regionSelect = document.getElementById("region");
  const departementSelect = document.getElementById("departement");
  const villeInput = document.getElementById("ville");
  const yearSelect = document.getElementById("years");

  const selectedRegionCode = regionSelect.value;
  const selectedDepartmentCode = departementSelect.value;
  const selectedCityName = villeInput.value;
  const selectedYear = yearSelect.value;

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

// Reset map markers
function resetMapMarkers() {
  markers.clearLayers();
}

// Display data on the map
function displayMap(response, map, markers) {
  let latItem1 = response.crimes[0].latitude;
  let longItem1 = response.crimes[0].longitude;
  map.setView([latItem1, longItem1], 11);

  console.log(response);

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

// main function
async function initializeWebSite() {
  try {
    showLoader(); // Affiche le loader au début
    await initData();
    await initDataOptionsInInputs();
    isLoading = false;
  } catch (error) {
    console.error("An error occurred during initialization:", error);
  } finally {
    hideLoader(); // Cache le loader une fois terminé
  }
}

// Dashboard
let validationComparaisonCommunesDashboard = document.getElementById(
  "validationComparaisonCommunesDashboard"
);
let tabCommunes = [];

function handleSubmitCompare() {
  const villeList = document.getElementById("villeList");
  const inputCommune = document.getElementById("communes"); // L'élément input
  const nomCommune = inputCommune.value.trim(); // Récupérer la valeur de l'input

  // Vérifier si la commune existe
  const communeExists = data.codeCommunes.some(
    (row) => row.nom_commune.toLowerCase() === nomCommune.toLowerCase()
  );
  console.log("Commune saisie:", nomCommune);
  console.log("Commune existe:", communeExists);

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

validationComparaisonCommunesDashboard.addEventListener(
  "click",
  handleSubmitCompare
);


const getSelectedCrimeTypes = () => {
  const checkboxes = document.querySelectorAll('.crimeTypeCheckbox:checked');
  return Array.from(checkboxes).map(checkbox => checkbox.value);
};


const createRecapOnLeaflet = (crimes) => {
  const selectyears = document.getElementById("years");
  const selectedYear = selectyears.value;
  
  let checkboxeschecked = getSelectedCrimeTypes();

  let filteredCrimesbis = crimes.filter(crime => {
    return (
      (checkboxeschecked.length > 0 ? checkboxeschecked.includes(crime.classe) : true)
    );
  });

  console.log(filteredCrimesbis);




  console.log(crimes);

  let annees = listeAnneeCrimes(crimes);
  console.log(annees);

  let filteredCrimes = selectedYear ? crimes.filter(crime => crime.annee == selectedYear) : crimes;

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

// Exemple d'utilisation :
addCenteredTitleToLeaflet(map, "Les crimes en France");

const createDashboardsComparaisonVille = (
  tauxPourMilles,
  prepArrAnneeDashboard
) => {
  prepArrAnneeDashboard = prepArrAnneeDashboard.map((item) => item.toString());
  console.log(tauxPourMilles);

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
  const villeList = document.getElementById("villeList"); // Liste des villes

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
        nombreCrimes === 0 ? 0 : (nombrePopVille / nombreCrimes) * 1000;

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

// Fonction pour styliser les polygones
const getPolygonStyle = () => {
  return {
    color: "#dd1818", // Couleur des contours
    weight: 2, // Poids des contours
    fillColor: "#fc0101",
    fillOpacity: 0,
  };
};

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
      console.log("Région sélectionnée:", regionCode);

      if (regionCode !== "") {
        let villeReg = data.codeCommunes.find(
          (row) => row.code_region === regionCode
        );
        console.log(villeReg);

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

      const regionSelect = document.getElementById("region");
      regionSelect.value = regionCode;
      updateDepartementOptions(regionCode);
      regionSelect.dispatchEvent(new Event("change"));
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
      console.log(villeDep);

      let lat = villeDep.latitude;
      let long = villeDep.longitude;

      map.setView([lat, long], 10);

      console.log("Département sélectionné:", departmentCode);

      const departementSelect = document.getElementById("departement");
      departementSelect.value = departmentCode;

      updateCityOptions(departmentCode);

      departementSelect.dispatchEvent(new Event("change"));

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

// Charger les régions initialement
fetchGeoJSON("regions.geojson").then((geojsonData) => {
  if (geojsonData) {
    regionsLayer = L.geoJSON(geojsonData, {
      style: getPolygonStyle, // Appliquer le style initial
      onEachFeature: onEachFeatureReg, // Configurer les interactions
    }).addTo(map); // Ajouter la couche des régions à la carte
  }
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

// Lancer la pluie dès que la page est chargée
document.addEventListener("DOMContentLoaded", createRain);

// main
initializeWebSite();
