import { afterAll, expect, test } from "bun:test";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const action = Bun.YAML.parse(await Bun.file(new URL("../action.yml", import.meta.url)).text()) as any;
const step = action.runs.steps.find((step: any) => step.name === "Install the spectest CLI");
const dirs: string[] = [];
afterAll(() => Promise.all(dirs.map(dir => rm(dir, { recursive: true, force: true }))));

async function install(response: string, version = "latest", curlExit = 0) {
  const dir = await mkdtemp(join(tmpdir(), "spectest-install-"));
  dirs.push(dir);
  await writeFile(join(dir, "response.json"), response);
  await writeFile(join(dir, "spectest"), "#!/bin/sh\nexit 0\n");
  const archive = Bun.spawn(["tar", "-czf", join(dir, "cli.tar.gz"), "-C", dir, "spectest"]);
  expect(await archive.exited).toBe(0);
  await writeFile(join(dir, "curl"), `#!/bin/bash
set -eu
for url in "$@"; do :; done
echo "$url" >> "$RUNNER_TEMP/requests"
case "$url" in
  */releases/latest)
    cat "$RUNNER_TEMP/response.json" || exit 23
    exit "$TEST_CURL_EXIT" ;;
  */releases/download/*) cat "$RUNNER_TEMP/cli.tar.gz" ;;
  *) exit 1 ;;
esac
`);
  await chmod(join(dir, "curl"), 0o755);
  const process = Bun.spawn(["bash", "-c", step.run], {
    env: {
      ...Bun.env,
      PATH: `${dir}:${Bun.env.PATH}`,
      RUNNER_TEMP: dir,
      GITHUB_PATH: join(dir, "github-path"),
      SPECTEST_VERSION: version,
      TEST_CURL_EXIT: String(curlExit),
    },
    stdout: "pipe", stderr: "pipe",
  });
  const [code, output] = await Promise.all([
    process.exited, new Response(process.stdout).text(), new Response(process.stderr).text(),
  ]);
  return { code, output, requests: await readFile(join(dir, "requests"), "utf8") };
}

test("latest lookup drains a response larger than the pipe buffer", async () => {
  const result = await install(JSON.stringify({ tag_name: "v0.2.164", body: "x".repeat(1024 * 1024) }, null, 2));
  expect(result.code).toBe(0);
  expect(result.requests).toContain("/releases/download/v0.2.164/spectest-0.2.164-");
});

test("latest lookup parses compact JSON independently of field order", async () => {
  const result = await install(JSON.stringify({ name: "Release", tag_name: "v0.2.164" }));
  expect(result.code).toBe(0);
  expect(result.requests).toContain("/releases/download/v0.2.164/spectest-0.2.164-");
});

test("invalid releases fail before downloading a binary", async () => {
  for (const response of ["invalid JSON", "{}", '{"tag_name":null}', '{"tag_name":""}', '{"tag_name":123}']) {
    const result = await install(response);
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("could not resolve the latest spectest release");
    expect(result.requests).not.toContain("/releases/download/");
  }
});

test("curl failure is preserved even when it produced a valid tag", async () => {
  const result = await install('{"tag_name":"v0.2.164"}', "latest", 23);
  expect(result.code).not.toBe(0);
  expect(result.requests).not.toContain("/releases/download/");
});

test("pinned versions bypass the latest lookup", async () => {
  const result = await install("invalid JSON", "v0.2.160", 23);
  expect(result.code).toBe(0);
  expect(result.requests).not.toContain("/releases/latest");
  expect(result.requests).toContain("/releases/download/v0.2.160/spectest-0.2.160-");
});
