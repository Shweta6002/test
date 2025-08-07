// pages/api/apify.js

import axios from "axios";

export default async function handler(req, res) {
  const { method, query: { route } } = req;

  if (method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (route === "actors") {
      const { apiKey } = req.body;

      if (!apiKey) return res.status(400).json({ error: "Missing API key" });

      const response = await axios.get(`https://api.apify.com/v2/acts?token=${apiKey}`);
      const actors = response.data.data.items.map(a => ({
        actorId: a.id,
        name: a.name,
      }));
      return res.json({ actors });
    }

    if (route === "schema") {
      const { apiKey, actorId } = req.body;

      const url = `https://api.apify.com/v2/acts/${actorId}/builds/latest/openapi.json?token=${apiKey}`;
      const response = await axios.get(url);
      const inputSchema = response.data.components?.schemas?.input?.properties;

      if (!inputSchema) {
        return res.status(404).json({ error: "Input schema not found" });
      }

      return res.json({ inputSchema });
    }

    if (route === "run") {
      const { apiKey, actorId, input } = req.body;

      const runResponse = await axios.post(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
        input
      );

      const runId = runResponse.data.data.id;
      const consoleUrl = runResponse.data.data.consoleUrl;

      let result;
      let finished = false;

      while (!finished) {
        const statusRes = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
        const data = statusRes.data.data;

        if (data.status === "SUCCEEDED") {
          finished = true;
          result = data;
        } else if (data.status === "FAILED") {
          finished = true;
          result = {
            error: "Actor failed",
            statusMessage: data.statusMessage,
            consoleUrl,
          };
        } else {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      return res.json(result);
    }

    return res.status(404).json({ error: "Invalid route" });

  } catch (error) {
    console.error("API Route Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
