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

function GenerateReadableStatusCode(code: number) {
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
        default:
            throw "Idk, figure out";
    }
}

async function CheckServerStatus(serverToCheck: instance): Promise<responseInformation> {
    const responseFromServer = await PingServerWithResponseTime(serverToCheck.url);

    if (!responseFromServer) throw `Could not get a response from ${serverToCheck.name}`;

    return responseFromServer;
}

async function GenerateMessage() {
    console.log("Checking servers...");
    const statuses: (responseInformation & { instance: string })[] | undefined = [];
    for await (const instance of validInstances) {
        await CheckServerStatus(instance).then(res => {
            console.log(instance.name, res);
            statuses.push({
                instance: instance.name,
                responseTime: res.responseTime,
                status: res.status,
            });
        });
    }

    console.log("Status array", statuses);

    const statusPerServer = statuses
        .map(
            value =>
                `${value.instance.toUpperCase()}: ${GenerateReadableStatusCode(value.status)} in ${
                    value.responseTime
                }ms`,
        )
        .join("\n");

    return `#revoltchat server status:\n${statusPerServer}`;
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
    const message = await GenerateMessage();
    if (!message) throw "Message was not generated";

    console.log("About to send message:\n", message);

    if (!env.DISABLE_MASTO) {
        if (!env.ACCESS_TOKEN || !env.MASTODON_URL)
            throw "Either MASTODON_URL or/and ACCESS_TOKEN are missing. Check your env file and try again.";
        const masto = createRestAPIClient({
            url: env.MASTODON_URL,
            accessToken: env.ACCESS_TOKEN,
        });
        await masto.v1.statuses.create({
            visibility: "unlisted",
            status: message,
        });
    }
});
