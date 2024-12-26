const selectYears = document.getElementById('years');
const selectDepartement = document.getElementById('departement');
const selectVille = document.getElementById('ville');

selectYears.addEventListener('focus', () => {
    selectYears.classList.add('touched');
});


selectDepartement.addEventListener('focus', () => {
    selectDepartement.classList.add('touched');
});


selectVille.addEventListener('focus', () => {
    selectVille.classList.add('touched');
});

let barreC1 = document.getElementById("barreC1");
let barreC2 = document.querySelector(".barreC2");
let choixCommunes = true;
let choixDep = false;

let inputComm = document.getElementById("inputComm");
let inputDep = document.getElementById("inputDep");

if (choixCommunes) {
    barreC1.classList.add("phantomChoix");
    barreC2.classList.remove("phantomChoix");
    inputComm.classList.add("phantom2"); // Si on affiche "inputDep" quand "choixCommunes" est vrai
}

barreC1.addEventListener('click', () => {
    barreC1.classList.add("phantomChoix");
    barreC2.classList.remove("phantomChoix");

    inputComm.classList.add("phantom2"); // Toujours afficher "inputDep" quand C1 est choisi
    inputDep.classList.remove("phantom2"); // Retirer "inputComm" si "C1" est choisi
});

barreC2.addEventListener('click', () => {
    barreC2.classList.add("phantomChoix");
    barreC1.classList.remove("phantomChoix");

    inputDep.classList.add("phantom2"); // Toujours afficher "inputComm" quand C2 est choisi
    inputComm.classList.remove("phantom2"); // Retirer "inputDep" si "C2" est choisi
});

let select = document.getElementById("departement");

for (let i = 1; i <= 96; i++) {
    let option = document.createElement("option");
    option.value = i;
    option.text = i;
    select.appendChild(option);
}
