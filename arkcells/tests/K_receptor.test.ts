import { describe, expect, it, vi } from "bun:test"
import { Config, Event, Lab, Listen } from "../src/index"

describe("K. Listen behavior (event listener)", () => {
	it("K1. Listen does NOT appear in membrane", () => {
		const dna = Lab.sequence({ version: Config("string"), r: Listen("string") })
		const cell = Lab.clone<Lab.Mix<typeof dna>>(dna, { r() {} }, { version: "1" }).genesis()
		expect(cell.api).not.toHaveProperty("r")
	})
	it("K2. Parent Event triggers child Listen via Implicit Map", () => {
		const rSpy = vi.fn()
		const parentDna = Lab.sequence({ version: Config("string"), msg: Event("string") })
		// Implicit mapping Listen to host.event.msg
		const childDna = Lab.sequence({ version: Config("string"), msg: Listen("string") })
		type childGenome = Lab.Mix<typeof childDna>
		const child = Lab.clone<childGenome>(childDna, { msg: rSpy }, { version: "c" })
		const parent = Lab.clone<Lab.Mix<typeof parentDna, { child: typeof childDna }>>(parentDna, { msg() {} }, { version: "p" })
			.absorb({ child })
			.genesis()

		parent.api.msg("test")
		expect(rSpy).toHaveBeenCalledWith("test")
	})
})
