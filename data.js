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

    console.log('Data options initialized successfully.');
}

function initUI() {
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
}

// main function
async function initializeWebSite() {
    try {
        await initData();
        await initDataOptionsInInputs();
        isLoading = false;
        initUI();
    } catch (error) {
        console.error("An error occurred during initialization:", error);
    }
}

// main
initializeWebSite();