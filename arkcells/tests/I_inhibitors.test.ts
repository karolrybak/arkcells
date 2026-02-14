import { describe, expect, it, vi } from "bun:test"
import { Config, Lab, Query, State } from "../src/index"

describe("I. Inhibitors (inhibit)", () => {
	it("I1. Inhibitor blocks State change", () => {
		const dna = Lab.sequence({ version: Config("string"), t: State("number = 0") })
		const cell = Lab.clone<Lab.Mix<typeof dna>>(dna, { t: () => {} }, { version: "1", t: 0 }).genesis()
		// State inhibitor receives {prev, next}
		cell.inhibit("t", ({ next }) => next > 5)
		cell.api.t(1)
		expect(cell.api.t()).toBe(1)
		cell.api.t(10)
		expect(cell.api.t()).toBe(1)
	})
	it("I2. Inhibitor blocks Query call", async () => {
		const iSpy = vi.fn()
		const dna = Lab.sequence({ version: Config("string"), e: Query("string", "string") })
		const cell = Lab.clone<Lab.Mix<typeof dna>>(dna, { e: iSpy }, { version: "1" }).genesis()
		cell.inhibit("e", () => true)

		try {
			await cell.api.e("data")
			expect(true).toBe(false) // Should fail if reached
		} catch (e) {
			expect(e).toBeDefined()
		}

		expect(iSpy).not.toHaveBeenCalled()
	})
})
