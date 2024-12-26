const selectElement = document.getElementById('years');
const selectElement2 = document.getElementById('dep');
const selectElement3 = document.getElementById('ville');

selectElement.addEventListener('focus', () => {
    selectElement.classList.add('touched');
});


selectElement2.addEventListener('focus', () => {
    selectElement2.classList.add('touched');
});


selectElement3.addEventListener('focus', () => {
    selectElement3.classList.add('touched');
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

let select = document.getElementById("dep");

for (let i = 1; i <= 96; i++) {
    let option = document.createElement("option");
    option.value = i;
    option.text = i;
    select.appendChild(option);
}
