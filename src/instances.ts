
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

/** Services with names and urls*/
type Instance = (typeof validInstances)[number];


const validInstances = [
    { name: "Client", url: "https://app.revolt.chat" },
    { name: "API", url: "https://api.revolt.chat" },
    { name: "CDN (Autumn)", url: "https://autumn.revolt.chat" },
    { name: "Voice (Vortex)", url: "https://vortex.revolt.chat" },
    { name: "Image proxy (January)", url: "https://jan.revolt.chat" },
    { name: "Static resources (including Mutant Emoji)", url: "https://static.revolt.chat/emoji/mutant/1f97a.svg?rev=3" },
    { name: "Landing page", url: "https://revolt.chat" },
    { name: "Help desk (Zammad)", url: "https://help.revolt.chat" },
    { name: "Weblate", url: "https://translate.revolt.chat" },
];

/**
 * @param [service]
 * @param [timeout=10000] Time to wait until giving up
 */
async function PingServiceWithResponseTime(
  service: Instance,
  timeout = 10000,
): Promise<ServicePingResponse> {
  const controller: AbortController = new AbortController();
  const startTime = Date.now();

  const timeoutID = setTimeout(
    () => controller.abort("Request timed out...\nIs the website down?"),
    timeout,
  );

  if (process.env.FAIL_EVERYTHING) throw ":3";

  return await fetch(service.url, { signal: controller.signal }).then(res => {
    clearTimeout(timeoutID);

    console.log("dev: Got response from", service);

    return {
			name: service.name,
      statusCode: res.status,
      responseTime: Date.now() - startTime,
			didTimeout: false
    };
  });
}

/**
 * Check's a service's status by pinging it
 * @param {Instance} [service] Service to ping
 * @returns {Promise<ServicePingResponse>}
 */
async function checkServerStatus(service: Instance): Promise<ServicePingResponse> {
  try {
    const responseFromService = await PingServiceWithResponseTime(service);
    return responseFromService
  } catch (e) {
    return {
      name: service.name,
      didTimeout: true
    };
  }
}

export { validInstances, checkServerStatus }
export type { ServicePingResponse }
