import { describe, expect, it } from "bun:test"
import { Config, Event, Lab, Query } from "../src/index"

describe("J. Host / Endo / Flora Wiring", () => {
	it("J1-J2. Parent can access and call endo (child) Queries via flora.endo", async () => {
		const childDna = Lab.sequence({
			version: Config("string"),
			compute: Query("number", "number"),
		})
		const parentDna = Lab.sequence({
			version: Config("string"),
			exec: Query("number", "unknown.any"),
		})
		type childGenome = Lab.Mix<typeof childDna, never, typeof parentDna>
		type parentGenome = Lab.Mix<typeof parentDna, { c: typeof childDna }>

		const child = Lab.clone<childGenome>(
			childDna,
			{
				async compute(n) {
					return n * 10
				},
			},
			{ version: "c" }
		)

		let capturedResult: number = 0
		const parent = Lab.clone<parentGenome>(
			parentDna,
			{
				async exec(n) {
					capturedResult = await this.endo.c.compute(n)
				},
			},
			{ version: "p" }
		)

		const parentImago = parent.absorb({ c: child }).genesis()

		await parentImago.api.exec(5)
		expect(capturedResult).toBe(50)
	})

	it("J3. Child cannot trigger host Query (Restricted Surface)", async () => {
		const hostDna = Lab.sequence({
			version: Config("string"),
			onFeedback: Event("string"),
			calc: Query("number", "number"),
		})
		const childDna = Lab.sequence({
			version: Config("string"),
			trigger: Event("unknown.any"),
		})

		type hostGenome = Lab.Mix<typeof hostDna, { c: typeof childDna }>

		const host = Lab.clone<hostGenome>(
			hostDna,
			{
				onFeedback: () => {},
				calc: async req => {
					return req + 1
				},
			},
			{ version: "host-v1" }
		)

		type childGenome = Lab.Mix<typeof childDna>
		const child = Lab.clone<childGenome>(
			childDna,
			{
				async trigger() {
					if (this.host) {
						// @ts-expect-error: host events are not callable from child
						expect(this.host.calc).toBeUndefined()
					}
				},
			},
			{ version: "child-v1" }
		)

		host.absorb({ c: child }).genesis()

		//@ts-expect-error
		await child.api.trigger()
	})

	it("J4. Child can read host Config", () => {
		const hostDna = Lab.sequence({ version: Config("string") })
		const childDna = Lab.sequence({ version: Config("string"), check: Query("undefined", "string") })
		type childGenome = Lab.Mix<typeof childDna, never, typeof hostDna>
		type hostGenome = Lab.Mix<typeof hostDna, { c: typeof childDna }, never>

		let seenVersion = ""
		const child = Lab.clone<childGenome>(
			childDna,
			{
				async check() {
					seenVersion = this.host.version
					return seenVersion
				},
			},
			{ version: "c" }
		)
		const host = Lab.clone<hostGenome>(hostDna, () => ({}), { version: "HOST_VAL" })

		host.absorb({ c: child }).genesis()
		//@ts-expect-error hack
		child.api.check()
		expect(seenVersion).toBe("HOST_VAL")
	})
})
