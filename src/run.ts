import * as path from "path";
import * as util from "util";
import * as fs from "fs";
import * as os from "os";

import * as toolCache from "@actions/tool-cache";
import * as core from "@actions/core";

const TOOL_NAME = "dmtrctl";
const STABLE_VERSION = "v1.0.0-alpha.0";

export async function run() {
  let version = core.getInput("version", { required: true });

  if (version.toLocaleLowerCase() === "stable") {
    version = STABLE_VERSION;
  }

  const cachedPath = await downloadTool(version);

  core.addPath(path.dirname(cachedPath));

  core.debug(
    `${TOOL_NAME} tool version: '${version}' has been cached at ${cachedPath}`
  );

  core.setOutput(`${TOOL_NAME}-path`, cachedPath);
}

export function getRunnerVariant(): string {
  const platform = os.type();
  let arch = os.arch();

  if (arch === "x64") {
    arch = "x86_64";
  }

  return `${platform}-${arch}`;
}

export function getExecutableExtension(): string {
  if (os.type().match(/^Win/)) {
    return ".exe";
  }
  return "";
}

function getDownloadUrl(version: string, variant: string): string {
  if (version == "latest") {
    return `https://github.com/demeter-run/cli/releases/latest/download/dmtrctl-${variant}.tar.gz`;
  } else {
    return `https://github.com/demeter-run/cli/releases/download/${version}/dmtrctl-${variant}.tar.gz`;
  }
}

export async function downloadTool(version: string): Promise<string> {
  let cachedToolpath = toolCache.find(TOOL_NAME, version);

  let downloadPath = "";

  if (!cachedToolpath) {
    const variant = getRunnerVariant();
    const downloadUrl = getDownloadUrl(version, variant);

    console.log(`downloading ${TOOL_NAME} from ${downloadUrl}`);

    try {
      downloadPath = await toolCache.downloadTool(downloadUrl);
    } catch (exception) {
      if (
        exception instanceof toolCache.HTTPError &&
        exception.httpStatusCode === 404
      ) {
        throw new Error(
          `${TOOL_NAME} '${version}' for '${variant}' variant not found.`
        );
      } else {
        throw new Error("DownloadFailed");
      }
    }

    console.log(`downloaded ${TOOL_NAME} for ${variant} to ${downloadPath}`);

    const unpackedPath = await toolCache.extractTar(downloadPath);

    console.log(`unpacked tool to ${unpackedPath}`);

    cachedToolpath = await toolCache.cacheDir(unpackedPath, TOOL_NAME, version);

    console.log(`cached tool to ${cachedToolpath}`);
  }

  const finalPath = path.join(
    cachedToolpath,
    TOOL_NAME + getExecutableExtension()
  );

  fs.chmodSync(finalPath, "775");

  return finalPath;
}

run().catch(core.setFailed);
