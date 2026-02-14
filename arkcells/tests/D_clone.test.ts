import { describe, expect, it } from "bun:test"
import { Config, Event, Lab, Query, State } from "../src/index"

describe("D. Lab.clone and Organism construction", () => {
	it("D1. Initializes Config values from clone 3rd argument", () => {
		const ctr = {
			name: Config("string"),
		} as const
		const dna = Lab.sequence(ctr)
		type dna = typeof dna
		type genome = Lab.Mix<dna, never, never>
		const zygote = Lab.clone<genome>(dna, {}, { name: "Ark" })
		const cell = zygote.genesis()
		expect(cell.api.name()).toBe("Ark")
	})

	it("D2. State uses default value from DNA when missing in clone input", () => {
		const dna = Lab.sequence({ version: Config("string"), count: State("number = 7") })
		const cell = Lab.clone(dna, { count() {} }, { version: "1" }).genesis()
		expect(cell.api.count()).toBe(7)
	})

	it("D3. State overrides DNA default when value is passed to clone input", () => {
		const dna = Lab.sequence({ version: Config("string"), count: State("number = 7") })
		const cell = Lab.clone(dna, { count() {} }, { version: "1", count: 42 }).genesis()
		expect(cell.api.count()).toBe(42)
		cell.api.count(51)
	})

	it("D4. Config is immutable (cannot be set via API)", () => {
		const dna = Lab.sequence({ version: Config("string") })
		const cell = Lab.clone(dna, {}, { version: "1.0.0" }).genesis()
		expect(() => {
			;(cell.api as any).version = "2.0.0"
		}).toThrow()
		expect(cell.api.version()).toBe("1.0.0")
	})

	it("D7. Evolution stages: Full (Zygote -> Symbiote)", () => {
		const cDna = Lab.sequence({ version: Config("string") })
		const hDna = Lab.sequence({ version: Config("string") })
		const nDna = Lab.sequence({ version: Config("string") })

		type FullG = Lab.Mix<typeof nDna, { child: typeof cDna }, typeof hDna>
		const zygote = Lab.clone<FullG>(nDna, {}, { version: "main" })

		expect(zygote.absorb).toBeDefined()

		const child = Lab.clone(cDna, {}, { version: "child" })
		const symbiote = zygote.absorb({ child: child })

		expect(symbiote.observe).toBeDefined()
		expect(symbiote.inhibit).toBeDefined()

		// @ts-expect-error
		symbiote.absorb
	})

	it("D8. Evolution stages: No children -> Symbiote", () => {
		const hDna = Lab.sequence({ version: Config("string"), marakesz: Query("string", "string") })
		const nDna = Lab.sequence({ version: Config("string") })
		type G = Lab.Mix<typeof nDna, never, typeof hDna>

		const symbiote = Lab.clone<G>(nDna, {}, { version: "1" })
		expect(symbiote.observe).toBeDefined()
		expect(symbiote.inhibit).toBeDefined()
		// @ts-expect-error
		symbiote.absorb

		const parentDna = Lab.sequence({ version: Config("string") })
		type parentGenome = Lab.Mix<typeof parentDna, { s: typeof nDna }>
		const parent = Lab.clone<parentGenome>(parentDna, {}, { version: "p" })
		const afterAbsorption = parent.absorb({ s: symbiote })
		expect(afterAbsorption).toBeDefined()
	})

	it("D9. Evolution stages: No children & no parent -> Imago (with api)", () => {
		const nDna = Lab.sequence({ version: Config("string"), one: Event("string") })

		const imago = Lab.clone(nDna, { one: _req => {} }, { version: "0.1.2" }).genesis()

		expect(imago.api).toBeDefined()
	})
})
