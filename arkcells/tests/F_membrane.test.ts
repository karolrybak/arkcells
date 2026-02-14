import { describe, expect, it, vi } from "bun:test"
import { Config, Event, Lab, Query, State } from "../src"

describe("F. Membrane Proxy (API behavior)", () => {
	it("F1-F3. Reading aminos via api", () => {
		const dna = Lab.sequence({
			version: Config("string"),
			t: State("number = 0"),
			s: Event("string"),
			e: Query("number", "number"),
		})
		type genome = Lab.Mix<typeof dna>

		const cell = Lab.clone<genome>(
			dna,
			{
				s: () => {},
				e: async n => n,
				t: () => {},
			},
			{ version: "val", t: 1 }
		).genesis()

		expect(cell.api.version()).toBe("val")
		expect(cell.api.t()).toBe(1)
		expect(typeof cell.api.s).toBe("function")
		expect(typeof cell.api.e).toBe("function")
	})
	it("F4-F6. Setting State updates cistern, nexus and probes", () => {
		const iSpy = vi.fn()
		const pSpy = vi.fn()
		const dna = Lab.sequence({ version: Config("string"), t: State("number = 0") })
		const cell = Lab.clone(dna, { t: iSpy }, { version: "1", t: 0 }).genesis()
		cell.observe("t", pSpy)
		cell.api.t(10)
		expect(cell.api.t()).toBe(10)
		expect(iSpy).toHaveBeenCalledWith(10)
		// Probes now receive { prev, next }
		expect(pSpy).toHaveBeenCalledWith({ prev: 0, next: 10 })
	})
})
