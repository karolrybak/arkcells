export class CellsInvariantError extends Error {
	constructor(message: string) {
		super(`[ArkCells] ${message}`)
	}
}

export class Inhibited extends Error {
	constructor(message: string) {
		super(`[ArkCells] [Inhibitor Activated] ${message}`)
	}
}

export function panic(message: string): never {
	throw new CellsInvariantError(message)
}
