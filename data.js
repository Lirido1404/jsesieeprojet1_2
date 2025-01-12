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
            console.log(point);
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

// main
initializeWebSite();