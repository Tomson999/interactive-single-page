// Versie 1 — basisversie met diverse JavaScript-fouten

var characters = [];
var favorites = [];
var page = 1;

// BUG 1: script staat in <head> zonder defer → DOM nog niet beschikbaar
// BUG 2: var-gebruik → functie-scope, kan onverwacht overschreven worden
window.onload = function() {
    loadCharacters();
}

// BUG 3: geen async/await, geen echte foutafhandeling
function loadCharacters() {
    fetch('https://rickandmortyapi.com/api/character?page=' + page)
    .then(function(response) {
        // BUG 4: geen response.ok controle — HTTP-fouten worden niet herkend
        return response.json();
    })
    .then(function(data) {
        // BUG 5: += op array werkt niet, characters raakt overschreven bij loadMore
        characters = characters + data.results;
        renderCards(data.results);
    });
    // BUG 6: geen .catch() → netwerk- of parse-fouten worden volledig genegeerd
}

function renderCards(list) {
    var container = document.getElementById('characters');
    // BUG 7: innerHTML wordt opgebouwd met ongesanitiseerde API-data (XSS-risico)
    for (var i = 0; i < list.length; i++) {
        var char = list[i];
        container.innerHTML += '<div class="card">' +
            '<img src="' + char.image + '">' +
            '<h3>' + char.name + '</h3>' +
            '<p>' + char.status + ' - ' + char.species + '</p>' +
            '<p>Episodes: ' + char.episode.length + '</p>' +
            '<button class="fav-btn" onclick="toggleFav(' + char.id + ')">♥</button>' +
            '</div>';
        // BUG 8: elke iteratie hertekent de volledige innerHTML → alle vorige
        //         event listeners gaan verloren en de browser herrendert alles
    }
}

function toggleFav(id) {
    // BUG 9: == gebruikt type coercion (id is number, opgeslagen als string in sommige gevallen)
    if (favorites.indexOf(id) == -1) {
        favorites.push(id);
    } else {
        favorites.splice(favorites.indexOf(id), 1);
    }
    // BUG 10: favorieten worden niet opgeslagen in localStorage →
    //          ze verdwijnen bij elke pagina-herlaad
    console.log('Favorieten:', favorites);
}

function search() {
    var query = document.getElementById('searchInput').value;
    // BUG 11: geen trim() → zoeken op spaties geeft lege resultaten
    // BUG 12: characters is [] als loadCharacters nog niet klaar is (race condition)
    var results = [];
    for (var i = 0; i < characters.length; i++) {
        if (characters[i].name.indexOf(query) != -1) {
            results.push(characters[i]);
        }
    }
    document.getElementById('characters').innerHTML = '';
    renderCards(results);
}

function filterStatus() {
    var status = document.getElementById('statusFilter').value;
    var results = [];
    for (var i = 0; i < characters.length; i++) {
        // BUG 13: als status leeg is ('') wordt er niet correct op 'alle' gefilterd
        if (characters[i].status == status) {
            results.push(characters[i]);
        }
    }
    document.getElementById('characters').innerHTML = '';
    renderCards(results);
}

function loadMore() {
    page = page + 1;
    loadCharacters();
}

function exportCSV() {
    // BUG 14: als er geen favorieten zijn crasht dit met een lege CSV zonder melding
    var csv = 'ID,Naam,Status\n';
    for (var i = 0; i < favorites.length; i++) {
        // BUG 15: favorites bevat alleen id's, niet de volledige objecten →
        //          name en status zijn undefined
        csv += favorites[i] + ',' + favorites[i].name + ',' + favorites[i].status + '\n';
    }
    var link = document.createElement('a');
    link.href = 'data:text/csv,' + csv;
    link.download = 'export.csv';
    link.click();
}
