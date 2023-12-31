import { createRestAPIClient } from "masto";
import { getReasonPhrase } from "http-status-codes";
import { validInstances } from "./instances.js";
import { ServicePingResponse, composeResponseMessage, composeStatusMessage } from "./messages.js";

const env: NodeJS.ProcessEnv & {
  ACCESS_TOKEN?: string;
  MASTODON_URL?: string;
  DISABLE_MASTO?: boolean;
  FAIL_EVERYTHING?: boolean;
} = process.env;

type instance = (typeof validInstances)[number];

if (!env.DISABLE_MASTO && (!env.ACCESS_TOKEN || !env.MASTODON_URL))
  throw "You haven't specified a MASTODON_URL or an ACCESS_TOKEN. Check your .env file and try again.";

const masto = createRestAPIClient({
  url: env.MASTODON_URL || "",
  accessToken: env.ACCESS_TOKEN || "",
});

async function PingServerWithResponseTime(
  server: string,
  timeout = 10000,
): Promise<Pick<ServicePingResponse, "statusCode" | "responseTime">> {
  const controller: AbortController = new AbortController();
  let startTime = Date.now();

  const timeoutID = setTimeout(
    () => controller.abort("Request timed out...\nIs the website down?"),
    timeout,
  );

  if (env.FAIL_EVERYTHING) throw ":3";

  return await fetch(server, { signal: controller.signal }).then(res => {
    clearTimeout(timeoutID);

    console.log("dev: Got response from", server);

    return {
      statusCode: res.status,
      responseTime: Date.now() - startTime,
    };
  });
}

async function checkServerStatus(serverToCheck: instance): Promise<ServicePingResponse> {
  try {
    const responseFromService = await PingServerWithResponseTime(serverToCheck.url);
    return {
      name: serverToCheck.name,
      didTimeout: false,
      ...responseFromService
    }
  } catch (e) {
    return {
      name: serverToCheck.name,
      didTimeout: true
    };
  }
}
async function generateMessage() {
  console.log("dev: Checking servers...");

  const statuses = await Promise.all(
    validInstances.map(async instance => await checkServerStatus(instance)),
  );

  const unresponsiveServers = statuses.filter(v => v.statusCode !== 200);

  const statusPerServer = statuses
    .map(composeResponseMessage)
    .join("\n");

  const msg = composeStatusMessage(validInstances.length, unresponsiveServers.length);

  return `${msg}\n${statusPerServer}\n#revoltchat #rvltstatus`;
}

generateMessage().then(message => {
  if (!message) throw "Message was not generated";

  console.log(`dev: Generated Message:\n${message}`);

  if (env.DISABLE_MASTO) {
    process.exit(1);
  }

  masto.v1.statuses
    .create({
      visibility: "unlisted",
      status: message,
    })
    .then(() => {
      console.log("Succesfully sent the toot!");
    })
    .catch(() => {
      console.error("Failed to send toot, aborting...");
    });
});
