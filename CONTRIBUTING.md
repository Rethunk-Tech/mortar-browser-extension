# Contributing

This is the workflow for maintainers and agents working on the extension; the rules the code keeps are in [`AGENTS.md`](AGENTS.md), and every command is in [`HUMANS.md`](HUMANS.md).

## Before review

Run `bun run gate` and `bun run webext`; the gate also runs as the lefthook pre-push hook. Nothing is merged on a red gate, and no hook is bypassed.

## Commits

- Conventional Commits: `type(scope): subject`, one logical change each.
- Stage explicit paths only.
- The body, when there is one, says why; the diff already says what.
