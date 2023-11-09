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
const pitsOnMap: leaflet.Layer[] = [];

const mapContainer = document.querySelector<HTMLElement>("#map")!;
const map = createLeaf(mapContainer);
addLeaf(map);
const PLAYER_LOCATION = leaflet.latLng({
    lat: 36.9995,
    lng: -122.0533,
});

let playerMarker = moveMarker(null, PLAYER_LOCATION);
playerMarker = moveMarker(playerMarker, PLAYER_LOCATION);
map.setView(playerMarker.getLatLng());

generateNeighborhood(PLAYER_LOCATION);

const playerTokens: Token[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

createSensor();
createReset();

function makePit(i: number, j: number) {
    const cell = board.getCellFromCoordinates(i, j);
    const bounds = board.getCellBounds(cell);

    const pit = leaflet.rectangle(bounds) as leaflet.Layer;

    pit.bindPopup(() => {
        const tokens = board.getCellTokens({ i, j });
        const container = document.createElement("div");
        container.innerHTML = `
        <div style="width: 210px">Pit Location (${i} , ${j}). </br>Capacity: <span id="tokens"><button id="deposit">deposit</button></div>`;
        tokens.forEach((token) => {
            addTokenButton(tokens, token, container, i, j);
        });

        const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
        deposit.addEventListener("click", () => {
            if (playerTokens.length <= 0) {
                return;
            }
            const popped: Token = playerTokens.pop()!;
            //Add it to bin
            board.addTokenToCell({ i, j }, popped);
            addTokenButton(tokens, popped, container, i, j);
            container.offsetHeight;
            updatePanel();
        });
        return container;
    });
    addPitToMap(pit);
}

function addTokenButton(
    tokens: Token[],
    token: Token,
    container: HTMLDivElement,
    i: number,
    j: number
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

    //Clear the array
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
            map.setView(playerMarker.getLatLng());
            generateNeighborhood(playerMarker.getLatLng());
        });
    });
}

function addLeaf(map: leaflet.Map | leaflet.LayerGroup) {
    leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
                // eslint-disable-next-line @typescript-eslint/quotes
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
    statusPanel.innerHTML = "Collected Tokens: " + str;
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
    resetButton.addEventListener("click here", () => {
        playerMarker.setLatLng(ORIGIN);
        moveMarker(playerMarker, ORIGIN);
        map.setView(playerMarker.getLatLng());
        generateNeighborhood(playerMarker.getLatLng());
    });
}