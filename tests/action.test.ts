import { afterAll, expect, test } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const action = Bun.YAML.parse(await Bun.file(new URL("../action.yml", import.meta.url)).text()) as any;
const step = action.runs.steps.find((step: any) => step.name === "Run the suite");
const dir = await mkdtemp(join(tmpdir(), "spectest-action-"));
await writeFile(join(dir, "spectest"), '#!/bin/bash\nprintf "%s\\0" "$@"\nexit "${TEST_EXIT_CODE:-0}"\n');
await chmod(join(dir, "spectest"), 0o755);
afterAll(() => rm(dir, { recursive: true, force: true }));

async function run(input: string, extra: Record<string, string> = {}) {
  const process = Bun.spawn(["bash", "-c", step.run], {
    env: {
      ...Bun.env,
      PATH: `${dir}:${Bun.env.PATH}`,
      SPECTEST_IGNORE_PREEXISTING_FAILURES: input,
      SPECTEST_PROJECT: "",
      SPECTEST_FILTER: "",
      SPECTEST_CASE: "",
      ...extra,
    },
    stdout: "pipe", stderr: "pipe",
  });
  return { code: await process.exited, output: await new Response(process.stdout).text() };
}

test("defaults to normal failing behavior", async () => {
  const result = await run(action.inputs["ignore-preexisting-failures"].default, { TEST_EXIT_CODE: "1" });
  expect(result).toEqual({ code: 1, output: "test\0" });
});

test("forwards the opt-in and preserves spaces in other inputs", async () => {
  const result = await run("true", { SPECTEST_PROJECT: "proj_example", SPECTEST_FILTER: "checkout|user profile" });
  expect(result).toEqual({ code: 0, output: "test\0--ignore-preexisting-failures\0--project-id\0proj_example\0--filter\0checkout|user profile\0" });
});

test("still propagates new failures with the opt-in enabled", async () => {
  expect((await run("true", { TEST_EXIT_CODE: "1" })).code).toBe(1);
});

test("rejects invalid policy values before starting a run", async () => {
  for (const input of ["yes", "TRUE", "true; echo unexpected"]) {
    const result = await run(input);
    expect(result.code).toBe(1);
    expect(result.output).toContain("must be 'true' or 'false'");
    expect(result.output).not.toContain("test\0");
  }
});
