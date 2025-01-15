// Function to load and parse a CSV
async function loadCSV(filePath) {
    const response = await fetch(filePath);
    const csvData = await response.text();
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    return parsed.data;
}

// Data initialization
const data = {
    hierarchy: {},  // Stores the hierarchy of regions, departments, and cities as well as crimes
    codeCommunes: [],  // Stores the codecommunes file
    names: {  // Stores the names of regions, departments, and cities
        regionNames: {},
        departmentNames: {},
        cityNames: {}
    },
    years: new Set()  // Stores the years of crimes
};
let isLoading = true;
const layer = L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png",
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
const markers = L.markerClusterGroup().addTo(map);
const iconPaths = {
    violence: "./images/pnglegendes/violence.png",
    steal: "./images/pnglegendes/steal.png",
    drugs: "./images/pnglegendes/drugs.png",
    destruction: "./images/pnglegendes/destruction.png",
    stealGun: "./images/pnglegendes/gun.png",
    sexualViolence: "./images/pnglegendes/other.png",
};
const iconMapping = {
    "Coups et blessures volontaires": "violence",
    "Coups et blessures volontaires intrafamiliaux": "violence",
    "Autres coups et blessures volontaires": "violence",
    "Violences sexuelles": "sexualViolence",
    "Vols de véhicules": "steal",
    "Vols dans les véhicules": "steal",
    "Vols d'accessoires sur véhicules": "steal",
    "Cambriolages de logement": "steal",
    "Vols avec armes": "stealGun",
    "Vols violents sans arme": "steal",
    "Vols sans violence contre des personnes": "steal",
    "Trafic de stupéfiants": "drugs",
    "Usage de stupéfiants": "drugs",
    "Destructions et dégradations volontaires": "destruction",
};

// Load CSV data into `data`
async function initData() {
    try {
        const codeCommunesRows = await loadCSV('./data/codecommunes.csv');
        data.codeCommunes = codeCommunesRows;

        // Separate dictionaries for names
        const regionNames = {};
        const departmentNames = {};
        const cityNames = {};

        // Hierarchical structure
        const hierarchy = {};

        for (const row of codeCommunesRows) {
            const { code_region, nom_region, code_departement, nom_departement, code_commune_INSEE, nom_commune } = row;

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

        const regionFiles = new Set(codeCommunesRows.map(row => row.code_region));
        const regionPromises = Array.from(regionFiles).map(async codeRegion => {
            if (!codeRegion || isNaN(codeRegion)) return;
            const regionData = await loadCSV(`./data/regions/region_${codeRegion}.csv`);

            // Add crimes to the corresponding cities
            regionData.forEach(row => {
                const { CODGEO_2024, annee, ...rest } = row;
                const crimeData = { CODGEO_2024, annee: `20${annee}`, ...rest };
                if (hierarchy[codeRegion]) {
                    for (const departmentCode in hierarchy[codeRegion]) {
                        if (hierarchy[codeRegion][departmentCode][CODGEO_2024]) {
                            hierarchy[codeRegion][departmentCode][CODGEO_2024].push(crimeData);
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

        data.hierarchy = hierarchy;
        data.names = { regionNames, departmentNames, cityNames };
        console.log(data);

        console.log('Data loaded successfully.');
    } catch (error) {
        console.error('Error loading CSV data:', error);
    }
}

// Initialize data options in input fields
async function initDataOptionsInInputs() {
    const regionSelect = document.getElementById('region');
    const departementSelect = document.getElementById('departement');
    const villeInput = document.getElementById('ville');
    const villeOptions = document.getElementById('ville-options');
    const yearSelect = document.getElementById('years');

    // regions
    const regions = Object.keys(data.hierarchy).map(code => ({
        code,
        name: data.names.regionNames[code]
    }));
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region.code;
        option.textContent = region.name;
        regionSelect.appendChild(option);
    });

    // onChange region
    regionSelect.addEventListener('change', () => {
        const selectedRegionCode = regionSelect.value;

        // reset other fields
        departementSelect.innerHTML = '<option value="">Choisissez un département</option>';
        villeOptions.innerHTML = '';
        villeInput.value = '';
        villeInput.disabled = true;

        if (selectedRegionCode) {
            const departments = Object.keys(data.hierarchy[selectedRegionCode]).map(code => ({
                code,
                name: data.names.departmentNames[code]
            }));
            departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department.code;
                option.textContent = department.name;
                departementSelect.appendChild(option);
            });
            departementSelect.disabled = false;
        } else {
            departementSelect.disabled = true;
        }
    });

    // onChange departement
    departementSelect.addEventListener('change', () => {
        const selectedRegionCode = regionSelect.value;
        const selectedDepartmentCode = departementSelect.value;

        // reset city field
        villeOptions.innerHTML = '';
        villeInput.value = '';

        if (selectedDepartmentCode) {
            const cities = Object.keys(data.hierarchy[selectedRegionCode][selectedDepartmentCode]).map(code => ({
                code,
                name: data.names.cityNames[code]
            }));
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city.name;
                villeOptions.appendChild(option);
            });
            villeInput.disabled = false;
        } else {
            villeInput.disabled = true;
        }
    });

    // years
    Array.from(data.years).sort().forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    // checkboxes for crime types
    document.querySelectorAll('.cercle-container').forEach(container => {
        container.addEventListener('click', () => {
            const checkboxId = container.getAttribute('data-checkbox-id');
            const checkbox = document.getElementById(checkboxId);
            checkbox.checked = !checkbox.checked;
    
            container.classList.toggle('selected');
        });
    });
    
    // onSubmit
    const submitButton = document.getElementById('buttonsubmit');
    submitButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (isLoading) return;
        handleSubmit();
    });

    console.log('Data options initialized successfully.');
}

// Handle form submission for fetching and displaying data filtered by user input
function handleSubmit() {
    const regionSelect = document.getElementById('region');
    const departementSelect = document.getElementById('departement');
    const villeInput = document.getElementById('ville');
    const yearSelect = document.getElementById('years');

    const selectedRegionCode = regionSelect.value;
    const selectedDepartmentCode = departementSelect.value;
    const selectedCityName = villeInput.value;
    const selectedYear = yearSelect.value;

    const dataFetched = fetchData(selectedYear, selectedRegionCode, selectedDepartmentCode, selectedCityName);
    displayMap(dataFetched, map, markers);
}

// Fetch data based on user input
function fetchData(selectedYear, selectedRegionCode, selectedDepartmentCode, selectedCityName) {
    if (!selectedRegionCode) {
        alert('Veuillez sélectionner une région.');
        return;
    }

    let selectedCrimes = [];
    let crimes = [];

    if (selectedCityName !== "") {
        console.log("fetching for city:", selectedCityName);
        const selectedCityCode = data.codeCommunes.find(row => row.nom_commune === selectedCityName && row.code_departement === selectedDepartmentCode)?.code_commune_INSEE;
        if (selectedCityCode) {
            crimes = data.hierarchy[selectedRegionCode][selectedDepartmentCode][selectedCityCode] || [];
            createRecapOnLeaflet(crimes);
        }
    } else if (selectedDepartmentCode !== "") {
        console.log("fetching for dep:", selectedDepartmentCode);
        crimes = Object.values(data.hierarchy[selectedRegionCode][selectedDepartmentCode] || {}).flat();
    } else {
        console.log("fetching for region:", selectedRegionCode);
        crimes = Object.values(Object.values(data.hierarchy[selectedRegionCode] || {}).flat()).flat();
    }
    selectedCrimes = (selectedYear !== "") ? crimes.filter(crime => crime.annee === selectedYear) : crimes;

    const selectedCrimeTypes = Array.from(document.querySelectorAll('.crimeTypeCheckbox:checked')).map(cb => cb.value);
    if (selectedCrimeTypes.length > 0) {
        selectedCrimes = selectedCrimes.filter(crime => selectedCrimeTypes.includes(iconMapping[crime.classe]));
    }
    
    return {
        region: data.names.regionNames[selectedRegionCode],
        department: data.names.departmentNames[selectedDepartmentCode] || "",
        city: selectedCityName,
        year: selectedYear,
        crimes: selectedCrimes
    };
}

// Display data on the map
function displayMap(response, map, markers) {
    markers.clearLayers();
    response.crimes.forEach(point => {
        let popupContent = "";
        if (point.CODGEO_2024) {
            popupContent += "<b>" + point.classe + "</b><br>";
            popupContent += "Nombre de faits: <u>" + point.faits + "</u><br><br>";
            const city = data.names.cityNames[point.CODGEO_2024];
            popupContent += "Ville: " + city + "<br>";
            const department = point.CODGEO_2024.length === 4
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

        const marker = L.marker([point.latitude, point.longitude], { icon: customIcon }).bindPopup(popupContent);
        markers.addLayer(marker);
    });
    map.addLayer(markers);
}

// main function
async function initializeWebSite() {
    try {
        await initData();
        await initDataOptionsInInputs();
        isLoading = false;
    } catch (error) {
        console.error("An error occurred during initialization:", error);
    }
}














//Partie Maxime Dashboards

let nomCommune = "";
const communesInput = document.getElementById("communes");
communesInput.addEventListener("input", (e) => {
    nomCommune = e.target.value;
  });






  let validationComparaisonCommunesDashboard = document.getElementById("validationComparaisonCommunesDashboard");
  let tabCommunes = [];
  
  function handleClick() {
      console.log(tabCommunes);
      tabCommunes.push(nomCommune);
  
      let maxAnneeParVille = [];
      let tauxPourMilles = [];
  
      tabCommunes.forEach((commune) => {
          let villeData = data.codeCommunes.find(row => row.nom_commune === commune);
          let codeRegion = villeData.code_region;
          let codeDepartement = villeData.code_departement;
          let codeCommune = villeData.code_commune_INSEE;
          let dataCrimesVille = data.hierarchy[codeRegion][codeDepartement][codeCommune];
          let annees = listeAnneeCrimes(dataCrimesVille);
  
          maxAnneeParVille.push(annees.length);
          console.log(maxAnneeParVille);
  
          let tauxVille = {
              commune: commune,
              taux: [] 
          };
  
          annees.forEach((anneee) => {
              let filteredByYear = dataCrimesVille.filter((crime) => crime.annee == anneee);
              let nombrePopVille = parseInt(filteredByYear[0].POP);
  
              let nombreCrimes = 0;
              filteredByYear.forEach((typeCrime) => {
                  nombreCrimes += parseInt(typeCrime.faits);
              });
  
              let tauxPourMille = nombreCrimes === 0 ? 0 : (nombrePopVille / nombreCrimes) * 1000;
              console.log(`Ville : ${commune}, année : ${anneee}, nombre de crimes : ${nombreCrimes}, tauxPourMille : ${tauxPourMille}`);
  
              tauxVille.taux.push(tauxPourMille); 
          });
  
          tauxPourMilles.push(tauxVille); 
      });
  
      console.log(tauxPourMilles);
  
      let max = 0;
      for (let y = 0; y < maxAnneeParVille.length; y++) {
          if (maxAnneeParVille[y] > max) {
              max = maxAnneeParVille[y];
          }
      }
  
      let prepArrAnneeDashboard = [];
      for (let cpt = 0; cpt < max; cpt++) {
          prepArrAnneeDashboard.push(2016 + cpt);
      }
  
      console.log(prepArrAnneeDashboard);
  
      createDashboardsComparaisonVille(tauxPourMilles, prepArrAnneeDashboard);
      createListCommunesCRUD(tauxPourMilles, prepArrAnneeDashboard);
  }
  
  validationComparaisonCommunesDashboard.addEventListener("click", handleClick);
  






  const createListCommunesCRUD = (tauxPourMilles,prepArrAnneeDashboard) => {
    const canvasExistant = document.getElementById("dashboardCanvas");

    const CRUDexistant = document.querySelector(".listeVillesBasDroiteLeaflet");
    if (CRUDexistant) {
      CRUDexistant.remove();
    }
  
    let customDiv = L.control({ position: "bottomright" });
  
    customDiv.onAdd = function (map) {
      let div = L.DomUtil.create("div", "listeVillesBasDroiteLeaflet");
      
  
      let villeElement = document.createElement('div');
      villeElement.textContent = 'Réinitialiser';
      villeElement.style.cursor = 'pointer';

      villeElement.addEventListener('click',()=>{
        tabCommunes = [];
        if (canvasExistant) {
          canvasExistant.parentElement.remove(); 
        }
        villeElement.parentElement.remove()
      })

      div.appendChild(villeElement);

  
      return div;
    };
  
    customDiv.addTo(map); 
  };

























  



  const createRecapOnLeaflet = (crimes) => {
    console.log(crimes);
  
    let annees = listeAnneeCrimes(crimes);
    console.log(annees);
  
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
  
    annees.forEach((anneee) => {
      let filteredByYear = crimes.filter((crime) => crime.annee == anneee);
  
      filteredByYear.forEach((typecrime) => {
        if (crimeTotals.hasOwnProperty(typecrime.classe)) {
          crimeTotals[typecrime.classe] += parseInt(typecrime.faits);
        }
      });
    });
  
    // Calcul du crime le plus fréquent (parmi les totaux)
    let maxCrime = Math.max(...Object.values(crimeTotals));
    let mostFrequentCrime = Object.keys(crimeTotals).find(
      (key) => crimeTotals[key] === maxCrime
    );
  
    // Vérifier si un récapitulatif existe déjà et le supprimer
    let existingRecapControl = map._controlCorners["topright"].querySelector(".divRecapHautDroiteLeaflet");
    if (existingRecapControl) {
      existingRecapControl.remove();
    }
  
    // Ajouter le nouveau récapitulatif
    let customDiv = L.control({ position: "topright" });
  
    customDiv.onAdd = function (map) {
      let div = L.DomUtil.create("div", "divRecapHautDroiteLeaflet");
  
      let totalCrimes = Object.values(crimeTotals).reduce((acc, val) => acc + val, 0);
  
      div.innerHTML = `
        Nombre total de crimes : ${totalCrimes}<br>
        Crime le plus perpétré : ${mostFrequentCrime} (${maxCrime} cas)
      `;
      return div;
    };
  
    customDiv.addTo(map);
  };
  


  



// Création du dashboard où l'on compare les taux de criminalités par ville et par années ( div en bas a gauche de la map leaflet )
  const createDashboardsComparaisonVille = (tauxPourMilles,prepArrAnneeDashboard) => {

    prepArrAnneeDashboard = prepArrAnneeDashboard.map(item => item.toString());


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
  
    customDiv.addTo(map);
  
    const couleursVilles = [
      "#A8385C85",
      "#090D3385",
      "#ED671485",
    ];
  
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
  


  const listeAnneeCrimes = (dataCrimesVille) =>{
    let anneestab = [];
    let uniqueAnneesTab = [];
    let uniqueCount = 0; 

    dataCrimesVille.forEach((crime) => {
      let annee = crime.annee;
      anneestab.push(annee);
    });

    for (let i=0; i < anneestab.length; i++) {
      let isUnique = true;
      for (let j=0; j < uniqueCount; j++) { 
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
  }
































  const fetchGeoJSON = async (url) => {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Données GeoJSON chargées:", data);

        return data;
    } catch (error) {
        console.error(`Erreur lors du chargement de ${url}:`, error);
        return null;
    }
};

// Fonction pour styliser les polygones
const getPolygonStyle = () => {
    return {
        color: "#3388ff", // Couleur des contours
        weight: 2,       // Poids initial des contours
        fillColor: "#6baed6",
        fillOpacity: 0.6
    };
};

// Fonction pour configurer les interactions (hover)
const onEachFeature = (feature, layer) => {
    layer.on({
        mouseover: (e) => {
            const target = e.target;
            target.setStyle({
                weight: 5, // Augmente le poids au survol
                color: "#ff7800", // Change la couleur des contours
                fillOpacity: 0.7
            });
            target.bringToFront(); // Amène l'élément en avant
        },
        mouseout: (e) => {
            const target = e.target;
            target.setStyle(getPolygonStyle()); // Réinitialise le style
        },
        click: () => {  // Ajout de l'événement click
          if (feature.properties && feature.properties.nom) {
              alert(feature.properties.nom);  // Affiche le nom de la propriété
          }
      }
    });

    if (feature.properties && feature.properties.nom) {
        layer.bindTooltip(feature.properties.nom, {
            permanent: false,
            direction: "center"
        });
    }
};

// Charger et ajouter les données GeoJSON
fetchGeoJSON("dep.geojson").then((geojsonData) => {
    if (geojsonData) {
        L.geoJSON(geojsonData, {
            style: getPolygonStyle, // Appliquer le style initial
            onEachFeature: onEachFeature // Configurer les interactions
        }).addTo(map);
    }
});






















// main
initializeWebSite();