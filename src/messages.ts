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
 * @param {number} [valid] Number of services that were pinged
 * @param {number} [down] Number of services that returned a status code higher than 200
 * @returns {string} Return the current status of all servers
 * Generate the outage message
 */
function composeStatusMessage(valid: number, down: number): string {
	if (down >= valid) {
		return `${websiteName} ${fullOutage}`
	} else if (down > 2) {
		return `${websiteName} ${partialOutage} (${valid - down}/${valid})`;
	} else {
		return "All services operational."
	}
}

/**
 * Information recieved with the ping
 */
type ServicePingResponse = {
	/** Name of the service */
	name: string,
	/** Recieved status code */
	statusCode?: number,
	/** Time taken to respond */
	responseTime?: number,
	/** Whether the response timed out */
	didTimeout: Boolean
}

function composeResponseMessage(service: ServicePingResponse): string {
	if (service.didTimeout) {
		return `${service.name}: Response timed out.`
	} else {
		return `${service.name}: ${service.statusCode} (took ${service.responseTime}ms)`
	}
}


export { composeStatusMessage, composeResponseMessage };
export type { ServicePingResponse };
