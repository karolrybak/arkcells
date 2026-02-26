import { describe, expect, it } from "bun:test"
import { Config, Event, Lab, Listen, Query } from "../src/index"

describe("N. Tuple arguments spreading", () => {
	it("N1. Query with multiple arguments", async () => {
		const dna = Lab.sequence({
			version: Config("string"),
			calc: Query(["number", "number"], "number"),
		})
		const cell = Lab.clone<Lab.Mix<typeof dna>>(
			dna,
			{
				async calc(a, b) {
					return a + b
				},
			},
			{ version: "1" }
		).genesis()

		const res = await cell.api.calc(10, 20)
		expect(res).toBe(30)
	})

	it("N2. Event with multiple arguments and Array fallback", () => {
		const dna = Lab.sequence({
			version: Config("string"),
			log: Event(["string", "number"]),
			logArr: Event("string[]"),
		})

		let receivedLog: any[] = []
		let receivedArr: any[] = []

		const cell = Lab.clone<Lab.Mix<typeof dna>>(
			dna,
			{
				log(msg, code) {
					receivedLog = [msg, code]
				},
				logArr(...args) {
					receivedArr = args
				},
			},
			{ version: "1" }
		).genesis()

		cell.api.log("error", 500)
		expect(receivedLog).toEqual(["error", 500])

		cell.api.logArr("a", "b", "c")
		expect(receivedArr).toEqual(["a", "b", "c"])
	})

	it("N3. Tuple arguments propagate to Listeners", () => {
		const parentDna = Lab.sequence({ ping: Event(["string", "boolean"]) })
		const childDna = Lab.sequence({ ping: Listen(["string", "boolean"]) })

		let childHeard: any[] = []

		const child = Lab.clone<Lab.Mix<typeof childDna>>(
			childDna,
			{
				ping(msg, flag) {
					childHeard = [msg, flag]
				},
			},
			{},
			"child"
		)

		const parent = Lab.clone<Lab.Mix<typeof parentDna, { child: typeof childDna }>>(
			parentDna,
			{
				ping(msg, flag) {},
			},
			{},
			"parent"
		)

		const system = parent.absorb({ child }).genesis()
		system.api.ping("test", true)

		expect(childHeard).toEqual(["test", true])
	})

	it("N4. Fallback for single argument schema", () => {
		const dna = Lab.sequence({
			version: Config("string"),
			single: Event("string"),
		})

		let val = ""

		const cell = Lab.clone<Lab.Mix<typeof dna>>(
			dna,
			{
				single(msg) {
					val = msg
				},
			},
			{ version: "1" }
		).genesis()

		cell.api.single("hello")
		expect(val).toBe("hello")
	})

	it("N5. Probes receive the correct reconstructed req array", async () => {
		const dna = Lab.sequence({
			version: Config("string"),
			calc: Query(["number", "number"], "number"),
		})
		const cell = Lab.clone<Lab.Mix<typeof dna>>(
			dna,
			{
				async calc(a, b) {
					return a + b
				},
			},
			{ version: "1" }
		).genesis()

		let probedReq: any = null
		cell.observe("calc", ({ req }) => {
			probedReq = req
		})

		await cell.api.calc(5, 7)
		expect(probedReq).toEqual([5, 7])
	})
})
