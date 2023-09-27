// import { createRestAPIClient } from "masto";
import { Cron } from "croner";

// const masto = createRestAPIClient({
//     url: "",
//     accessToken: "",
// });

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
    let info: responseInformation | undefined;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const timeoutID = setTimeout(
        () => controller.abort("Request timed out...\nIs the website down?"),
        timeout,
    );

    startTime = Date.now();

    await fetch(server, { signal: controller.signal }).then(res => {
        info = {
            status: res.status,
            responseTime: Date.now() - startTime,
        };
    });

    if (!info) throw "No information about this request";
    return info;
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

    console.log(
        `#revoltchat server status:\n${statuses
            .map(
                value =>
                    `${value.instance.toUpperCase()}: ${GenerateReadableStatusCode(
                        value.status,
                    )} in ${value.responseTime}ms`,
            )
            .join("\n")}`,
    );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const checkJob = Cron("0 * * * *", GenerateMessage);

// await masto.v1.statuses.create({
//     visibility: "unlisted",
//     status:
// });
