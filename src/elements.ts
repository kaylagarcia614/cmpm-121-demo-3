import leaflet from "leaflet";
import luck from "./luck";
interface Cell {
    readonly j: number;
    readonly i: number;
}
interface Momento {
    readonly key: string;
    readonly ts: Token[];
}
export class Token {
    readonly id: string;
    constructor(i: number, j: number, serial: number) {
        this.id = i + ":" + j + "#" + serial;
    }
}
interface CellCoordinate {
    readonly i: number;
    readonly j: number;
}
export class Board {
    readonly tileWidth: number;
    readonly tileVisibilityRadius: number;
    private readonly knownCellTokens: Map<string, Token[]>;
    private getCanonicalTokens(cellCord: CellCoordinate): Token[] {
        const { i, j } = cellCord;
        const key = [i, j].toString();
        if (!this.knownCellTokens.has(key)) {
            const value: number = this.generateRandomSeededValue(i, j);
            const tokens: Token[] = [];
            for (let index = 0; index < value; index++) {
                tokens.push(new Token(i, j, index));
            }
            this.knownCellTokens.set(key, tokens);
        }
        return this.knownCellTokens.get(key)!;
    }

    addTokenToCell(cellCord: CellCoordinate, token: Token) {
        const tokens = this.getCanonicalTokens(cellCord);
        tokens.push(token);
    }
    popTokenFromCell(cellCord: CellCoordinate, index: number): Token {
        const tokens = this.getCanonicalTokens(cellCord);
        return tokens.splice(index, 1)[0];
    }
    getCellTokens(cellCord: CellCoordinate): Token[] {
        return this.getCanonicalTokens(cellCord);
    }
    cellExists(cellCord: CellCoordinate): boolean {
        const { i, j } = cellCord;
        const key = [i, j].toString();
        return this.knownCellTokens.has(key);
    }
    generateRandomSeededValue(i: number, j: number): number {
        return Math.floor(luck([i, j, "initialValue"].toString()) * 3 + 1);
    }

    constructor(tileWidth: number, tileVisibilityRadius: number) {
        this.tileWidth = tileWidth;
        this.tileVisibilityRadius = tileVisibilityRadius;
        this.knownCellTokens = new Map();
        const obj = localStorage.getItem("map");
        if (obj == null) {
            this.knownCellTokens = new Map();
        } else {
            this.knownCellTokens = JSON.parse(obj);
        }
    }
    getCellsNearPoint(point: leaflet.LatLng): Cell[] {
        const resultCells: Cell[] = [];
        const originCell = this.getCellForPoint(point);
        resultCells.push(originCell);
        return resultCells;
    }
    getCellForPoint(point: leaflet.LatLng): Cell {
        const I = Math.floor(point.lat / this.tileWidth);
        const J = Math.floor(point.lng / this.tileWidth);
        return { i: I, j: J };
    }
    getCellBounds(cell: Cell): leaflet.LatLngBounds {
        return leaflet.latLngBounds([
            [cell.i * this.tileWidth, cell.j * this.tileWidth],
            [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
        ]);
    }
    togoMomento(): string[] {
        const momentos: string[] = [];
        for (const [key, ts] of this.knownCellTokens) {
            const m: Momento = { key, ts };
            momentos.push(JSON.stringify(m));
        }
        return momentos;
    }

    fromMomento(momentos: string[]) {
        this.knownCellTokens.clear();
        for (const m of momentos) {
            const momento: Momento = JSON.parse(m);
            this.knownCellTokens.set(momento.key, momento.ts);
        }
    }
}