import { describe, expect, it, vi } from "bun:test"
import { Config, Lab, State } from "../src/index"

describe("E. Lifecycle", () => {
	it("E1. genesis() enables the API membrane", () => {
		const dna = Lab.sequence({ version: Config("string") })
		const cell = Lab.clone<Lab.Mix<typeof dna>>(dna, {}, { version: "1" })
		const imago = cell.genesis()
		expect(imago.api.version()).toBe("1")
	})

	it("E2. genesis() recursively calls child genesis", () => {
		const childDna = Lab.sequence({ id: Config("string") })
		const parentDna = Lab.sequence({ id: Config("string") })
		const child = Lab.clone<Lab.Mix<typeof childDna>>(childDna, {}, { id: "child" })
		const parent = Lab.clone<Lab.Mix<typeof parentDna, { child: typeof childDna }>>(parentDna, {}, { id: "parent" })
		parent.absorb({ child }).genesis()

		expect(child.alive).toBe(true)
	})

	it("E3-E5. apoptosis() behavior", () => {
		const dna = Lab.sequence({ id: Config("string"), t: State("number = 0") })
		const cell = Lab.clone<Lab.Mix<typeof dna>>(dna, { t() {} }, { id: "1", t: 0 }).genesis()
		const probe = vi.fn()
		cell.observe("t", probe)
		cell.apoptosis()
		try {
			cell.api.t(10)
		} catch (_e) {}
		expect(probe).not.toHaveBeenCalled()
	})
})
