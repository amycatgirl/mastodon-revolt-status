import { mastodon } from "masto";
import { env } from "process";
import { ServicePingResponse, checkServerStatus, validInstances } from "./instances.js";
import { friendlyCode } from "./codes.js";

/**
 * Name of the website/project
 */
const websiteName = "revolt.chat";

/**
 * Message to include with the ammount of services that are up and running
 */
const partialOutage = "is suffering a partial outage";

/**
 * Message to show when all services are down
 */
const fullOutage = "is completely down";

/**
 * Hashtags to include with the toot
 */
const hashtags = ["rvltstatus", "revoltchat"];

/**
 * @param {number} [valid] Number of services that were pinged
 * @param {number} [down] Number of services that returned a status code higher than 200
 * @returns {string} Return the current status of all servers
 * Generate the outage message
 */
function composeStatusMessage(valid: number, down: number): string {
	if (down >= valid) {
		return `${websiteName} ${fullOutage}`
	} else if (down >= 1) {
		return `${websiteName} ${partialOutage} (${valid - down}/${valid})`;
	} else {
		return "All services operational."
	}
}


function composeResponseMessage(service: ServicePingResponse): string {
	if (service.didTimeout) {
		return `${service.name}: Response timed out.`
	} else {
		return `${service.name}: ${friendlyCode(service.statusCode!)} (took ${service.responseTime}ms)`
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
	const tags = hashtags.map(ht => `#${ht}`).join(" ");
	
  return `${msg}\n${statusPerServer}\n${tags}`;
}


async function generateMessageAndSend(client: mastodon.rest.Client["v1"], attempts: number = 1) {
	try {
		const message = await generateMessage()

		console.log("I've generated this message:\n\n", message);

		if (!message || env.DISABLE_MASTO) {
			process.exit(1);
		}

		client.statuses.create({
			visibility: "unlisted",
			status: message
		})
	} catch (error) {
		console.error("An error has occurred:\n\n", error);
		if (attempts >= 5) {
			console.error("Aborting...")
			process.exit(1);
		}

		console.error("Retrying...");

		generateMessageAndSend(client, attempts);
	}
}


export { composeStatusMessage, composeResponseMessage, generateMessageAndSend };
export type { ServicePingResponse };
