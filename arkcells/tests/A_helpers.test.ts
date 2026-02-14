import { describe, expect, it } from "bun:test"
import { Config, Event, Listen, Query, State } from "../src/index"

describe("A. Helper Constructors", () => {
	it("A1. Config produces correct structure", () => {
		const res = Config("string")
		expect(res).toEqual({ type: "'config'", req: "string" })
	})
	it("A1. State produces correct structure", () => {
		const res = State("number")
		expect(res).toEqual({ type: "'state'", req: "number", def: "unknown.any" })
	})
	it("A1. Event produces correct structure", () => {
		const res = Event("string")
		expect(res).toEqual({ type: "'event'", req: "string" })
	})
	it("A1. Listener produces correct structure with source", () => {
		const res = Listen("string")
		expect(res).toEqual({ type: "'listen'", req: "string" })
	})
	it("A2. Query includes output", () => {
		const res = Query("string", "number")
		expect(res).toEqual({ type: "'query'", req: "string", res: "number" })
	})
	it("A3. Event, State, Config, Listener do not include output", () => {
		expect(Config("unknown.any")).not.toHaveProperty("res")
		expect(State("unknown.any")).not.toHaveProperty("res")
		expect(Event("unknown.any")).not.toHaveProperty("res")
		expect(Listen("unknown.any")).not.toHaveProperty("res")
	})
})
