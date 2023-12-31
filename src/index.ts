import { createRestAPIClient } from "masto";
import { generateMessageAndSend } from "./messages.js";

if (!process.env.DISABLE_MASTO && (!process.env.ACCESS_TOKEN || !process.env.MASTODON_URL))
  throw "You haven't specified a MASTODON_URL or an ACCESS_TOKEN. Check your .env file and try again.";

const masto = createRestAPIClient({
  url: process.env.MASTODON_URL || "",
  accessToken: process.env.ACCESS_TOKEN || "",
});


generateMessageAndSend(masto.v1);
