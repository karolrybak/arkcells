# Basics

This library provides a strict, layered runtime model for ArkType-powered components (“cells”). Each cell has:

- a **DNA** schema (ArkType module)
- a **nexus** implementation (your business logic)
- a lifecycle (`clone` → optional `absorb` → `genesis` → `apoptosis`)
- a strongly typed runtime surface (`api`) for interacting with the cell

The main design goal is **predictable composition**: you can build trees of cells (endo/children + optional host/parent) without “reach-through” access to state or behaviors across layers.

---

## Molecules (conceptual model)

Your DNA is composed of “molecules” (ArkType definitions with a `type` tag). Use whatever naming you prefer in your public docs; conceptually they map as follows:

| DNA Molecule | Role |
| --- | --- | 
| `Config` | immutable config value supplied at creation |
| `State` |  local reactive state value |
| `Event` |  local fire-and-forget event |
| `Query` |  local async request/response |
| `Listen` | a handler invoked when the host emits an event or state change (not callable directly) |

---

## Capability surfaces (strict layering)

A “surface” is what you can read/call from a given layer.

- `api`: the cell’s public membrane
- `self`: the same capabilities as `api`, used inside your nexus
- `endo`: child access from the parent (restricted)
- `host`: parent access from the child (restricted)

### Read / Call (GET)

| Molecule | `api` / `self` | `endo.child` *(parent→child)* | `host` *(child→parent)* |
| --- | --- | --- | --- |
| **Config** | `() => I` | `never` | value `I` |
| **State** |  `() => I` | `never` | `never` |
| **Event** | `(I) => void` | `never` | `(I) => void` |
| **Query** | `(I) => Promise<O>` | `(I) => Promise<O>` | `never` |
| **Listener** | `never` | `never` | `never` |

### Assign (SET)

| Molecule | `api` / `self` | `endo.child` | `host` |
| --- | --- | --- | --- |
| **Config** | never | never | never |
| **State** | `(I) => void` | never | never |
| **Event** | never | never | never |
| **Query** | never | never | never |
| **Listener** | never | never | never |

**Interpretation**
- Only local State can be mutated (`api.someState = ...`).
- Config is immutable (supplied at creation).
- No cross-layer State access.
- Parent can call child Queries (downward orchestration).
- Child can read host Config (downward-only visibility).
- Subscriptions are the only reactive host→child mechanism and are not directly callable.

---

## Lifecycle

### 1) Define DNA

DNA is an ArkType module (or object convertible to one) describing your loci.

Typical loci can include:
- Config locus (often used as an identity/name/config anchor)
- State, Event, Query, and Listener loci

### 2) Sequence DNA

Use `Lab.sequence(dnaLike)` to convert a DNA-like object/module into a typed DNA module. Basically it's just an arktype module.

### 3) Build a genome (optional endo/host)

Use `Lab.mix(nucleiDna)` to begin composing a genome:
- `nuclei`: this cell’s DNA
- `endo`: optional child DNA map
- `host`: optional parent DNA

### 4) Craft / clone

- `Lab.clone(genomeOrDna, nexus, cistern)` creates a cell instance.
- `Lab.Craft<genome>` is a type entry to help build the nexus with the correct `flora` types. Use it if you want to build nexus before cloning.

const myNexus:Lab.Craft<genome> = { /** Fully typed here */}

`cistern` supplies:
- required Config values
- optional initial State values (if your system supports defaults)

### 5) Absorb endo (optional)

If the genome has children, you can supply instantiated child organisms via `absorb(...)`.

### 6) Genesis

`genesis()` finalizes wiring:
- builds internal handler maps
- constructs the integron (the nexus’ returned implementation object)
- exposes the `api` membrane

### 7) Apoptosis

`apoptosis()` tears down listeners (probes/inhibitors) and marks the cell dead.

---

## Nexus responsibilities (implementation contract)

Your nexus is called with a `flora` object that represents the allowed, typed cross-layer surfaces.
This is exposed using ts ThisType, so in your handlers you can use:
this.nuclei.call // call other api method
this.endo.child1.call // call method from child1
this.host.call // and on host

The nexus must return an object implementing your cell’s local behavior:

- **State handlers**: `(value) => void` called when State changes
- **Event handlers**: `(value) => void` called when Event fires
- **Query handlers**: `(value) => Promise<output>` called when Query is invoked
- **Listen handlers**: `(value) => void` called when the *host* emits the subscribed source

Config has no handler: it is provided via cistern/config.

---

## Listener mapping (implicit)

Subscriptions are bound by shared key name. So child Listen must have the same key as parent Event.

This keeps wiring predictable and disallows creating handler and event with the same name, further improving isolation between layers.

---

## Practical guidance

- Put values that must be visible to children into **Config**, not State.
- Keep **State** private and local to a single cell.
- Use **Queries** for parent→child orchestration.
- Use **Listen** for host→child reactivity.
- Never use Events across layers; keep Events local and use Listen for host-driven triggers.


# Biological Runtime Model (Strict Layering)

This library implements a strict, predictable interaction model between a cell (`self`), its children (`endo`), and its parent (`host`).

The core goal is **composition without reach-through**:
- children cannot poke parent state or call parent queries
- parents cannot read child state or trigger child events
- cross-layer communication happens only through **Queries (downward)** and **Subscriptions (downward from host)**

If users intentionally create cycles (e.g. emitting events from within handlers), they can still create feedback loops. This model does not attempt to prevent deliberate misuse; it provides **clear and strict surfaces** so accidental coupling is minimized.

---

## Terminology

The system defines five molecule kinds:

| Molecule | Meaning | Directionality |
| --- | --- | --- |
| **Config** | static/immutable configuration, provided at creation | readable downward (`host.config` to child), not writable |
| **State** | local reactive state (previously `State`) | readable/writable only locally |
| **Event** | fire-and-forget Event/command | callable only locally |
| **Query** | request/response async function | callable locally and by the parent **downward** |
| **Listen** | child handler invoked when parent emits an Event or changes State | invoked only by the framework (not callable directly) |

---

## Capability Surfaces

A “surface” is what a layer can see or do.

- **Membrane (`api`)**: public surface of a cell (what user code uses at runtime)
- **Nuclei (`self`)**: same effective capabilities as `api` (used inside nexus implementation)
- **Endo (Child)**: what a cell can do with its children
- **Host (Parent)**: what a cell can do with its parent

### Table 1 — GET shapes (read/call)

| Molecule | `api` | `self` | `endo.child` (parent→child) | `host` (child→parent) |
| :--- | :--- | :--- | :--- | :--- |
| **Config** | `() => I` | `I` | `never` | `I` |
| **State** | `() => I` | `I` | `never` | `never` |
| **Event** | `(I) => void` | `(I) => void` | `never` | `never` |
| **Query** | `(I) => Promise<O>` | `(I) => Promise<O>` | `(I) => Promise<O>` | `never` |
| **Subscription** | `never` | `never` | `never` | `never` |

### Table 2 — SET shapes (assignment)

| Molecule | `api` | `self` | `endo.child` | `host` |
| :--- | :--- | :--- | :--- | :--- |
| **Config** | `never` | `never` | `never` | `never` |
| **State** | `(I) => void` | `I` | `never` | `never` |
| **Event** | `never` | `never` | `never` | `never` |
| **Query** | `never` | `never` | `never` | `never` |
| **Subscription** | `never` | `never` | `never` | `never` |

**Implications**
- Only local state is assignable (`api.stateKey = value`).
- Config is immutable (no assignment anywhere).
- No cross-layer state reads, writes, or event dispatch.
- Parent may call *only* child queries (read/call only).
- Child may read *only* parent config (read-only).

---

## Nexus / Integron Responsibilities

A cell’s logic is implemented by returning handlers from the **nexus**.

### Table 3 — Implementation signatures

| Molecule | Implement in nexus? | Signature | Trigger |
| :--- | :--- | :--- | :--- |
| **Config** | no | — | provided at creation (cistern/config) |
| **State** | yes | `(I) => void` | called when local state changes |
| **Event** | yes | `(I) => void` | called when local event is fired |
| **Query** | yes | `(I) => Promise<O>` | called when local query is invoked (by self or parent via `endo`) |
| **Subscription** | yes | `(I) => void` | called by the framework when the **parent** emits the subscribed source |

Subscriptions are not callable by any surface; they are purely **reactive endpoints**.

---

## Listen Mapping 

A Listen locus includes a reference to a parent source:
- it may subscribe to a **host Event** *or* a **host State change**
- the reference is declared in DNA, and is type-checked against the genome’s host definition

---

## Data Flow Summary

# Observe & Inhibit

This document specifies the **exact semantics** of the `observe` (probes) and `inhibit` (guards) hook systems.

These hooks are intentionally **local instrumentation and safety controls**. They do **not** add cross-layer capabilities (they don’t let you read/write host/endo state, call host events, etc.). Use **Queries** and **Subscriptions** for inter-cell coordination.

---

## Overview

### Observe (Probes)
`observe(locus, probe)` registers a callback that runs **after** a locus successfully performs an action.

Use probes for:
- logging / metrics
- UI bindings
- integration glue
- test assertions

### Inhibit (Guards)
`inhibit(locus, inhibitor)` registers a predicate that can block an action **before** it executes.

Use inhibitors for:
- feature flags
- permission checks
- runtime safety constraints
- testing (forcing paths / preventing execution)

---

## Supported loci

Hooks apply only to loci that have runtime activity:

| Locus kind | Observable? | Inhibitable? | Notes |
| --- | --- | --- | --- |
| **State** | Yes | Yes | Inhibitors see `{ prev, next }` pre-commit. Probes see `{ prev, next }` post-commit. |
| **Event** | Yes | Yes | Inhibitors see the validated payload. Probes see the validated payload after handler success. |
| **Query** | Yes | Yes | Inhibitors see the validated input. Probes see the resolved output after success. |
| **Config** | No | No | Immutable, no runtime action. |
| **Listen** | No (directly) | No (directly) | Listens are invoked via dispatch. Hook the source Event/State instead. |

If a user calls `observe`/`inhibit` with an unsupported locus kind, it should be treated as a usage error.

---

## Exact execution model (ordering)

For **State**, **Event**, and **Query**, the runtime follows this order:

1. **Input validation** (ArkType assertion)
2. **Inhibitors run** (in registration order)
3. If any inhibitor blocks → action is blocked (see below)
4. ** Trace event emit **
4. **Perform the action**
5. **Propagation**
   - e.g. host-driven Subscription dispatch (see `subscriptions.md`)
6. **Probes run** (in registration order), **only after success**

### Notes
- Input is always validated **before** inhibitors. Inhibitors see typed, validated values.
- Probes run **after** the action completes successfully.
- Probes are “after hooks”, inhibitors are “before hooks”.

---

## Inhibitor semantics (blocking)

### Return type
An inhibitor returns `boolean | undefined`:

- `true` → **block**
- `false` or `undefined` → **allow**

Only `=== true` blocks. This prevents accidental blocking from truthy non-boolean values.

### What happens when blocked?
If inhibitors block an action:

- **Nothing happens**: no state mutation, no handler call, no propagation.
- **Probes do not run**.

### Blocked return behavior
- **State assignment**: no-op (state unchanged).
- **Event call**: no-op (handler not called).
- **Query call**: short-circuited and returns a **rejected Promise** with an `Inhibited` error.

(Queries are request/response; callers must be able to distinguish “blocked” from “successful”.)

WARNING:
If your inhibitor or a probe throws, arkcells will throw panic error

---

## Payload shapes passed to hooks

### State hooks
State hooks receive both previous and next values:

- **Inhibitors**: `{ prev, next }` (pre-commit)
- **Probes**: `{ prev, next }` (post-commit)

#### State change detection
State actions (and thus hooks) occur only if the value **actually changes**, using:

- `Object.is(prev, next) === false`

If `Object.is(prev, next) === true`, the assignment is treated as a no-op:
- no inhibitors
- no handler
- no propagation
- no probes

> For object state, this is reference equality. Treat state values as immutable and assign new references to trigger updates.

### Event hooks
Event hooks receive the validated event payload `value`.

- inhibitors: `value` (pre-handler)
- probes: `value` (post-handler success)

### Query hooks
Query hooks receive:
- inhibitors: validated input `value` (pre-handler)
- probes: resolved output `result` (post-success)

If the query rejects or throws, probes do not run.

---

## Error semantics

### Input validation failures
If ArkType input validation fails:
- action fails immediately
- inhibitors do not run
- probes do not run
- type.errors is returned

### Handler failures
If the handler throws (State/Event) or the Query Promise rejects:
- error propagates
- probes do not run
- no further propagation occurs after the failure point

### Subscription dispatch failures
If subscription fanout throws an `AggregateError`:
- the host action has already completed
- probes do not run (because probes are success-after hooks)
- the error propagates to the caller

ArkCells itself only throws in panic mode upon api abuse
---

## Registration, lifetime, cleanup

- Hooks are attached to an organism instance and persist until removed (if supported) or until `apoptosis()`.
- `apoptosis()` clears all probes and inhibitors for that organism.
- If organisms are created/destroyed dynamically, always call `apoptosis()` to avoid retaining hook closures.

---

## Practical guidance

### Observe
Good for telemetry and local reactivity. Keep probes fast; queue I/O.

### Inhibit
Good for safety constraints and gating. Keep inhibitors pure and constant-time.

---

## Summary

- `inhibit` is a **before hook**: runs after validation; blocks only if it returns `true`.
- `observe` is an **after hook**: runs only after successful action and propagation.
- State hooks use `{ prev, next }` and fire only when `Object.is(prev, next) === false`.
- Query probes see resolved output; blocked queries reject with `Inhibited`.


---

# Observability & Tracing

ArkCells features a built-in "fluorescent tagging" system. It allows you to monitor every state change, event, and query execution across your entire cell hierarchy with full causal correlation.

## The Transport Event

Every significant action within a cell generates a `TransportEvent`. These events describe the "what, where, and when" of the biological runtime.

| Event Type | Triggered when... | Payload includes |
| --- | --- | --- |
| `cell:update` | A `State` locus value is changed | `prev`, `next`, `value` |
| `cell:compute:start` | `Query` begins execution | `locus` |
| `cell:compute:end` |  `Query` finishes execution | `locus`, `value` (result) |
| `cell:event` |  `Event` was triggered | `locus`, `value` |
| `cell:listen` |  `Listen` was triggered | `locus`, `value` |

All the events also include timestamp

## Observing the System

You can subscribe to an organism's activity using `subscribe`. 

```typescript
const unsubscribe = cell.subscribe((event) => {
  console.log(`[${event.actionId}] ${event.cellId} -> ${event.type} on ${event.locus}`);
});
```

### Event Bubbling
Events in ArkCells **bubble up** the hierarchy. If a child cell emits an event, it is automatically passed to its `host` (parent).
- Subscribing to a **leaf cell** shows only that cell's activity.
- Subscribing to the **root organism** (the "Imago") provides a real-time stream of the entire system's activity.

---

## Action Tracing (`.trace`)

In an asynchronous, reactive system, it’s often impossible to tell which initial call caused a specific state change deep in the tree. ArkCells solves this using **Action Correlation**.

By using `cell.trace(id)`, you get a temporary membrane where every subsequent call is tagged with a specific `actionId`.

```typescript
// All internal activity caused by this call will share the same actionId
cell.trace("user-click-42").api.incrementCount(1);
```

### Trace Propagation
The `actionId` is automatically propagated:
1. **Locally**: To all `State`, `Event`, and `Query` handlers within the cell.
2. **Downward**: To any children (`endo`) called by the nexus during that action.
3. **Across Layers**: To any listeners (`Listen`) triggered by the action.

This allows for **Distributed Tracing** within your cell tree. You can follow a single "User Intent" as it travels from the parent, triggers child queries, and settles into final state updates.

### Usage in Production
- **Debugging**: Pass a unique ID to `.trace()` to see exactly why a specific cell state changed.
- **Logging**: Pipe `TransportEvents` to an external sink (like OpenTelemetry or Jaeger) for a complete visual trace of your system's logic.
- **Audit Trails**: Capture every state transition and the `actionId` that caused it for 100% reproducible bug reports.

---

## Technical Semantics

- **Action Scoping**: `trace()` uses a Proxy-based context manager. It sets the `actionId` before the call and restores the previous context after the call (even if it's an async `Promise`).
- **Identity**: `cellId` in events refers to the organism's `name` (unique ID).
- **Silent by default**: If no `actionId` is provided via `trace`, events are tagged as `"system"`.
