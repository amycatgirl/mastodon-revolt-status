import { createRestAPIClient } from "masto";
import { Cron } from "croner";
import * as process from "process";

const env: NodeJS.ProcessEnv & {
    ACCESS_TOKEN?: string;
    MASTODON_URL?: string;
    DISABLE_MASTO?: boolean;
} = process.env;

const validInstances = [
    { name: "vortex", url: "https://vortex.revolt.chat" },
    { name: "delta", url: "https://api.revolt.chat" },
    { name: "autumn", url: "https://autumn.revolt.chat" },
    { name: "january", url: "https://jan.revolt.chat" },
    { name: "static", url: "https://static.revolt.chat/emoji/mutant/1f97a.svg?rev=3" },
    { name: "client", url: "https://app.revolt.chat" },
    { name: "landing", url: "https://revolt.chat" },
];

type instance = (typeof validInstances)[number];

interface responseInformation {
    status: number;
    responseTime: number;
}

if (!env.ACCESS_TOKEN || !env.MASTODON_URL)
    throw "Either MASTODON_URL or/and ACCESS_TOKEN are missing. Check your env file and try again.";

const masto = createRestAPIClient({
    url: env.MASTODON_URL,
    accessToken: env.ACCESS_TOKEN,
});

async function PingServerWithResponseTime(
    server: string,
    timeout = 5000,
): Promise<responseInformation> {
    const controller: AbortController = new AbortController();
    let startTime = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const timeoutID = setTimeout(
        () => controller.abort("Request timed out...\nIs the website down?"),
        timeout,
    );

    startTime = Date.now();

    return await fetch(server, { signal: controller.signal }).then(res => {
        clearTimeout(timeoutID);

        return {
            status: res.status,
            responseTime: Date.now() - startTime,
        };
    });
}

function generateReadableStatusCode(code: number) {
    switch (code) {
        case 200:
            return "Ok";
        case 500:
            return "Internal Server Error";
        case 502:
            return "Bad Gateway";
        case 504:
            return "Gateway Timeout";
        case 418:
            return "Teapot :)";
        case 410:
            return "Gone :)";
        case 404:
            return "Not found >:(";
        default:
            throw "Idk, figure out";
    }
}

async function checkServerStatus(serverToCheck: instance): Promise<responseInformation> {
    try {
        return await PingServerWithResponseTime(serverToCheck.url);
    } catch (e) {
        throw `Could not get a response from ${serverToCheck.name}`;
    }
}
async function generateMessage() {
    console.log("Checking servers...");

    const statuses = await Promise.all(
        validInstances.map(async instance => {
            const res = await checkServerStatus(instance);
            console.log(instance.name, res);

            return {
                instance: instance.name,
                responseTime: res.responseTime,
                status: res.status,
            };
        }),
    );

    console.log("Status array", statuses);

    const unresponsiveServers = statuses.filter(v => v.status !== 200);
    const statusPerServer = statuses
        .map(
            value =>
                `${value.instance.toUpperCase()}: ${generateReadableStatusCode(
                    value.status,
                )} (responded after ${value.responseTime}ms)`,
        )
        .join("\n");

    console.log("debug:", unresponsiveServers);

    const msg =
        unresponsiveServers.length > 0
            ? `revolt.chat is probably suffering a partial outage (${
                  statuses.length - unresponsiveServers.length
              } out of ${statuses.length} servers operational)`
            : "All services are operational";

    return `${msg}\n${statusPerServer}\n#revoltchat #rvltstatus`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const checkJob = Cron("@hourly", {
    catch: (e, job) => {
        console.error(
            `[jobs/${job.name}] Oops! Something wrong happened and the status couldn't be sent.`,
            e,
        );
    },
    name: "Ping and send",
});

console.log("Registered job:", checkJob);

checkJob.schedule(async () => {
    try {
        const message = await generateMessage();
        if (!message) throw "Message was not generated";

        console.log("Generated Message:\n", message);

        if (env.DISABLE_MASTO) return;

        const status = await masto.v1.statuses.create({
            visibility: "unlisted",
            status: message,
        });

        console.log("Posted:", status);
    } catch (error) {
        console.error("Error while scheduling checkJob:", error);
    }
});

if (env.DISABLE_MASTO) await checkJob.trigger();
