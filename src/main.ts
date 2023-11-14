import "leaflet/dist/leaflet.css";
import { Board, Token } from "./elements";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";


const ORIGIN = leaflet.latLng({
    lat: 0,
    lng: 0
});

const GAMEPLAY_ZOOM = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_PROBABILITY = 0.1;
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);


const mapContainer = document.querySelector<HTMLElement>("#map")!;
const map = createLeaf(mapContainer);
const pitsOnMap: leaflet.Layer[] = [];

const MOVEMENT_AMOUNT = 0.0001;
const NORTH = leaflet.latLng(MOVEMENT_AMOUNT, 0);
const WEST = leaflet.latLng(0, -MOVEMENT_AMOUNT);
const SOUTH = leaflet.latLng(-MOVEMENT_AMOUNT, 0);
const EAST = leaflet.latLng(0, MOVEMENT_AMOUNT);

let PLAYER_LOCATION = leaflet.latLng({
    lat: 36.9995,
    lng: -122.0533,
});

let playerMarker = moveMarker(null, PLAYER_LOCATION);

let playerTokens: Token[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";
console.log(localStorage);
restoreStateFromLocalStorage();
updatePanel();
addLeaf(map);

playerMarker = moveMarker(playerMarker, PLAYER_LOCATION);
centerMap(playerMarker.getLatLng());

generateNeighborhood(PLAYER_LOCATION);

createSensor();
createReset();

addMovementDirection("north", NORTH);
addMovementDirection("south", SOUTH);
addMovementDirection("east", EAST);
addMovementDirection("west", WEST);
addSaveButton();
addClearLocalStorageButton();

function makePit(i: number, j: number) {
    const cell = { i, j };
    const bounds = board.getCellBounds(cell);
    const pit = leaflet.rectangle(bounds) as leaflet.Layer;
    pit.bindPopup(
        () => {
            const container = updatePopupContent(i, j, pit);

            return container;
        }
        //{ closeOnClick: false, autoClose: false }
    );
    addPitToMap(pit);
}

function updatePopupContent(
    i: number,
    j: number,
    pit: leaflet.Layer
): HTMLDivElement {
    const tokens = board.getCellTokens({ i, j });
    const container = document.createElement("div");
    container.innerHTML = `
        <div style="width: 210px">Pit Location (${i} , ${j}). </br>Capacity: <span id="tokens"></div>`;
    tokens.forEach((token) => {
        addTokenButton(tokens, token, container, i, j, pit);
    });

    playerTokens.forEach((token) => {
        addDepositButton(playerTokens, token, container, i, j, pit);
    });
    pit.bindPopup(container, {});
    setTimeout(() => {
        pit.openPopup();
    }, 0);

    return container;
}

function addTokenButton(
    tokens: Token[],
    token: Token,
    container: HTMLDivElement,
    i: number,
    j: number,
    pit: leaflet.Layer
) {
    const tk = container.querySelector("#tokens");
    const internal = document.createElement("div");

    internal.innerHTML = `<div>(${token.id}). <button id = "tokenGrab">Grab</button></div>`;
    tk?.append(internal);

    const btn = internal.querySelector("#tokenGrab");
    btn?.addEventListener("click", () => {
        const popped = board.popTokenFromCell({ i, j }, tokens.indexOf(token));

        internal.style.display = "none";

        playerTokens.push(popped);
        updatePanel();
        updatePopupContent(i, j, pit);
    });
}
function addDepositButton(
    tokens: Token[],
    token: Token,
    container: HTMLDivElement,
    i: number,
    j: number,
    pit: leaflet.Layer
) {
    const tk = container.querySelector("#tokens");
    const internal = document.createElement("div");

    internal.innerHTML = `<div>(${token.id}). <button id = "tokenDeposit">Deposit</button></div>`;
    tk?.append(internal);

    const btn = internal.querySelector("#tokenDeposit");
    btn?.addEventListener("click", () => {
        console.log("Deposit");
        const index = tokens.indexOf(token);
        const popped = tokens.splice(index, 1)[0];

        internal.style.display = "none";

        board.addTokenToCell({ i, j }, popped);
        updatePanel();
        updatePopupContent(i, j, pit);
    });
}
function addPitToMap(pit: leaflet.Layer) {
    pit.addTo(map);
    pitsOnMap.push(pit);
}

function removeAllPits() {
    pitsOnMap.forEach((pit) => {
        pit.removeFrom(map);
    });

    pitsOnMap.length = 0;
}
function getBoxCords(center: leaflet.LatLng) {
    const I = Math.floor((center.lat - ORIGIN.lat) / TILE_DEGREES);
    const J = Math.floor((center.lng - ORIGIN.lng) / TILE_DEGREES);
    return { i: I, j: J };
}

function createSensor() {
    const sensorButton = document.querySelector("#sensor")!;
    sensorButton.addEventListener("click", () => {
        console.log("click");
        navigator.geolocation.getCurrentPosition((position) => {
            moveMarker(
                playerMarker,
                leaflet.latLng({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                })
            );
            centerMap(playerMarker.getLatLng());
            generateNeighborhood(playerMarker.getLatLng());
        });
    });
}

function addLeaf(map: leaflet.Map | leaflet.LayerGroup) {
    leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
                '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(map);
}
function createLeaf(mapCont: string | HTMLElement) {
    const map = leaflet.map(mapCont, {
        center: ORIGIN,
        zoom: GAMEPLAY_ZOOM,
        maxZoom: GAMEPLAY_ZOOM,
        minZoom: GAMEPLAY_ZOOM,
        scrollWheelZoom: false,
        zoomControl: false,
    });
    return map;
}

function updatePanel() {
    let str = "";
    playerTokens.forEach((tkn) => {
        str += "[" + tkn.id + "] ";
    });
    statusPanel.innerHTML = "collected Tokens: " + str;
}
function moveMarker(marker: leaflet.Marker | null, location: leaflet.LatLng) {
    let MARKER = marker;
    if (MARKER == null) {
        MARKER = leaflet.marker(location);
    } else {
        MARKER.setLatLng(location);
    }
    const cL = getBoxCords(location);
    MARKER.bindTooltip("You're right here (" + cL.i + " , " + cL.j + ")");
    MARKER.addTo(map);
    return MARKER;
}

function generateNeighborhood(center: leaflet.LatLng) {
    removeAllPits();
    const { i, j } = board.getCellForPoint(center);
    for (let cellI = -NEIGHBORHOOD_SIZE; cellI < NEIGHBORHOOD_SIZE; cellI++) {
        for (let cellJ = -NEIGHBORHOOD_SIZE; cellJ < NEIGHBORHOOD_SIZE; cellJ++) {
            if (luck([i + cellI, j + cellJ].toString()) < PIT_PROBABILITY) {
                makePit(i + cellI, j + cellJ);
            }
        }
    }
}
function createReset() {
    const resetButton = document.querySelector("#reset")!;
    resetButton.addEventListener("click", () => {
        playerMarker.setLatLng(ORIGIN);
        playerMarker = moveMarker(playerMarker, ORIGIN);
        centerMap(playerMarker.getLatLng());
        generateNeighborhood(playerMarker.getLatLng());
    });
}
function addClearLocalStorageButton() {
    const button = document.querySelector<HTMLButtonElement>("#clear");
    button?.addEventListener("click", () => {
        const reset = confirm("reset?");
        if (reset) {
            localStorage.clear();
        }
    });
}
function addMovementDirection(direction: string, amount: leaflet.LatLng) {
    const dir = "#" + direction;
    const button = document.querySelector<HTMLButtonElement>(dir);

    button?.addEventListener("click", () => {
        const pLocation = playerMarker.getLatLng();
        console.log(direction);
        playerMarker = moveMarker(
            playerMarker,
            leaflet.latLng({
                lat: pLocation.lat + amount.lat,
                lng: pLocation.lng + amount.lng,
            })
        );
        generateNeighborhood(playerMarker.getLatLng());
        centerMap(playerMarker.getLatLng());
    });
}

function centerMap(point: leaflet.LatLng) {
    map.setView(point);
}
function addSaveButton() {
    const button = document.querySelector<HTMLButtonElement>("#save");
    button?.addEventListener("click", () => {
        const reset = confirm("save?");
        if (reset) {
            console.log("yes");
            storeStateToLocalStorage();
            console.log(localStorage);
        } else {
            console.log("no");
        }
    });
}

function storeStateToLocalStorage() {
    const boardMomento = JSON.stringify(board.togoMomento());
    const playerMomento = JSON.stringify(playerTokens);
    const playerPositionMomento = JSON.stringify(playerMarker.getLatLng());

    localStorage.setItem("boardMomento", boardMomento);
    localStorage.setItem("playerMomento", playerMomento);
    localStorage.setItem("playerPositionMomento", playerPositionMomento);
}

function restoreStateFromLocalStorage() {
    const boardMomento = localStorage.getItem("boardMomento");
    const playerMomento = localStorage.getItem("playerMomento");
    const playerPositionMomento = localStorage.getItem("playerPositionMomento");
    if (
        boardMomento == null ||
        playerMomento == null ||
        playerPositionMomento == null
    ) {
        return;
    }
    const bM: string[] = JSON.parse(boardMomento);
    const pT: Token[] = JSON.parse(playerMomento);
    const pP: leaflet.LatLng = JSON.parse(playerPositionMomento);
    board.fromMomento(bM);
    playerTokens = pT;
    PLAYER_LOCATION = pP;
}