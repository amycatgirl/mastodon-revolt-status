import { createRestAPIClient } from "masto";
import { getReasonPhrase } from "http-status-codes";

const env: NodeJS.ProcessEnv & {
    ACCESS_TOKEN?: string;
    MASTODON_URL?: string;
    DISABLE_MASTO?: boolean;
    FAIL_EVERYTHING?: boolean;
} = process.env;

const validInstances = [
    { name: "Voice (Vortex)", url: "https://vortex.revolt.chat" },
    { name: "API", url: "https://api.revolt.chat" },
    { name: "CDN (Autumn)", url: "https://autumn.revolt.chat" },
    { name: "Image proxy (January)", url: "https://jan.revolt.chat" },
    { name: "Static resources (including Mutant Emoji)", url: "https://static.revolt.chat/emoji/mutant/1f97a.svg?rev=3" },
    { name: "Client", url: "https://app.revolt.chat" },
    { name: "Landing page", url: "https://revolt.chat" },
];

type instance = (typeof validInstances)[number];

interface responseInformation {
    status: number;
    responseTime: number;
    error?: string;
}

if ((!env.ACCESS_TOKEN || !env.MASTODON_URL) && !env.DISABLE_MASTO)
    throw "You haven't specified a MASTODON_URL or an ACCESS_TOKEN. Check your .env file and try again.";

const masto = createRestAPIClient({
    url: env.MASTODON_URL || "",
    accessToken: env.ACCESS_TOKEN || "",
});

async function PingServerWithResponseTime(
    server: string,
    timeout = 10000,
): Promise<responseInformation> {
    const controller: AbortController = new AbortController();
    let startTime = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const timeoutID = setTimeout(
        () => controller.abort("Request timed out...\nIs the website down?"),
        timeout,
    );

    startTime = Date.now();

    if (env.FAIL_EVERYTHING) throw ":3";

    return await fetch(server, { signal: controller.signal }).then(res => {
        clearTimeout(timeoutID);

        console.log("dev: Got response from", server);

        return {
            status: res.status,
            responseTime: Date.now() - startTime,
        };
    });
}

async function checkServerStatus(serverToCheck: instance): Promise<responseInformation> {
    try {
        return await PingServerWithResponseTime(serverToCheck.url);
    } catch (e) {
        return {
            status: 504,
            responseTime: 10000,
            error: "Timeout",
        };
    }
}
async function generateMessage() {
    console.log("dev: Checking servers...");

    const statuses = await Promise.all(
        validInstances.map(async instance => {
            const res = await checkServerStatus(instance);

            return {
                instance: instance.name,
                ...res,
            };
        }),
    );

    const unresponsiveServers = statuses.filter(v => v.status !== 200);

    const statusPerServer = statuses
        .map(value => {
            if (!value.error)
                return `${value.instance}: ${getReasonPhrase(value.status)} (response time: ${
                    value.responseTime
                }ms)`;

            return `${value.instance.toUpperCase()}: ${
                value.error
            } (Could not get a response after ${value.responseTime / 1000} seconds)`;
        })
        .join("\n");

    const msg =
        unresponsiveServers.length >= validInstances.length - 1
            ? `⚠️ revolt.chat is suffering a full outage ⚠️`
            : unresponsiveServers.length > 2
            ? `revolt.chat is probably suffering a partial outage (${
                  statuses.length - unresponsiveServers.length
              } out of ${statuses.length} services operational)`
            : "All services are operational.";

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
        .then(status => {
            console.log("Posted:", status);
        })
        .catch(() => {
            console.error("Failed to send status :C");
        });
});
