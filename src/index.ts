// import { createRestAPIClient } from "masto";
// import { Cron } from "croner";

// const masto = createRestAPIClient({
//     url: "",
//     accessToken: "",
// });

const validInstances = ["vortex", "delta", "autumn", "january", "static", "client", "landing"];

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
            return "deez";
    }
}

async function CheckServerStatus(serverToCheck: instance) {
    switch (serverToCheck) {
        case "autumn":
            return await PingServerWithResponseTime("https://autumn.revolt.chat/");
        case "january":
            return await PingServerWithResponseTime("https://jan.revolt.chat/");
        case "delta":
            return await PingServerWithResponseTime("https://api.revolt.chat/");
        case "vortex":
            return await PingServerWithResponseTime("https://vortex.revolt.chat/");
        case "landing":
            return await PingServerWithResponseTime("https://revolt.chat/");
        case "client":
            return await PingServerWithResponseTime("https://app.revolt.chat/");
        case "static":
            return await PingServerWithResponseTime(
                "https://static.revolt.chat/emoji/mutant/1f97a.svg?rev=3",
            );
        default:
            throw "Invalid Instance";
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const checkJob = Cron("0 * * * *", async () => {
//     console.log("Checking servers...");
//     const statuses: (responseInformation & { instance: string })[] | undefined = [];
//     for await (const instance of validInstances) {
//         await CheckServerStatus(instance).then(res => {
//             console.log(instance, res);
//             statuses.push({ instance, responseTime: res.responseTime, status: res.status });
//         });
//     }

//     console.log("Status array", statuses);
// });

console.log("Checking servers...");
const statuses: (responseInformation & { instance: string })[] | undefined = [];
for await (const instance of validInstances) {
    await CheckServerStatus(instance).then(res => {
        console.log(instance, res);
        statuses.push({ instance, responseTime: res.responseTime, status: res.status });
    });
}

console.log("Status array", statuses);

console.log(
    `#revoltchat server status:\n${statuses
        .map(
            v =>
                `${v.instance.toLocaleUpperCase()}: ${GenerateReadableStatusCode(v.status)} in ${
                    v.responseTime
                }ms`,
        )
        .join("\n")}`,
);
// await masto.v1.statuses.create({
//     visibility: "unlisted",
//     status:
// });
