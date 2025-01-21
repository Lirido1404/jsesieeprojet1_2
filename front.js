const selectYears = document.getElementById('years');
const selectDepartement = document.getElementById('departement');
const selectVille = document.getElementById('ville');
const selectRegions = document.getElementById("region");
const divDepartementInput = document.getElementById("departementInput");
const divVilleInput = document.getElementById("villeInput");

selectRegions.addEventListener('change', (e) => {
    if (e.target.value !== "") {
        divDepartementInput.classList.add('active');
        divDepartementInput.style.height = divDepartementInput.scrollHeight + 'px';
    } else {
        divDepartementInput.style.height = '0'; 
        divDepartementInput.classList.remove('active');
    }
    divVilleInput.classList.remove('active');
    divVilleInput.style.height = '0'; 
});

selectDepartement.addEventListener('change', (e) => {
    if (e.target.value !== "") {
        divVilleInput.classList.add('active');
        divVilleInput.style.height = divDepartementInput.scrollHeight + 'px';
    } else {
        divVilleInput.style.height = '0'; 
        divVilleInput.classList.remove('active');
    }
});


selectYears.addEventListener('focus', () => {
    selectYears.classList.add('touched');
});


selectDepartement.addEventListener('focus', () => {
    selectDepartement.classList.add('touched');
});


selectVille.addEventListener('focus', () => {
    selectVille.classList.add('touched');
});


let select = document.getElementById("departement");

for (let i = 1; i <= 96; i++) {
    let option = document.createElement("option");
    option.value = i;
    option.text = i;
    select.appendChild(option);
}



// Sélectionner tous les conteneurs de cercles
const cercleContainers = document.querySelectorAll('.cercle-container');

// Appliquer un effet de gris (grayscale) et un effet de mise à l'échelle (scale) sur les images quand le conteneur est cliqué
cercleContainers.forEach(container => {
    const image = container.querySelector('img'); // Sélectionner l'image à l'intérieur du conteneur
    
    // Quand le conteneur est cliqué
    container.addEventListener('click', () => {
        // Alterner la classe "clicked" pour appliquer ou retirer les effets
        container.classList.toggle('clicked');
    });
});

