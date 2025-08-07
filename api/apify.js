import axios from "axios";

export default async function handler(req, res) {
  const { method } = req;
  const { route } = req.query;

  if (method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ---- ROUTE: /api/apify?route=actors ----
    if (route === "actors") {
      const { apiKey } = req.body;

      if (!apiKey) {
        return res.status(400).json({ error: "Missing apiKey" });
      }

      const response = await axios.get(`https://api.apify.com/v2/acts?token=${apiKey}`);
      const actors = response.data.data.items.map(a => ({
        actorId: a.id,
        name: a.name,
      }));
      return res.json({ actors });
    }

    // ---- ROUTE: /api/apify?route=schema ----
    if (route === "schema") {
      const { apiKey, actorId } = req.body;

      if (!apiKey || !actorId) {
        return res.status(400).json({ error: "Missing apiKey or actorId" });
      }

      const url = `https://api.apify.com/v2/acts/${actorId}/builds/default/openapi.json?token=${apiKey}`;
      const response = await axios.get(url);
      const inputSchema = response.data.components?.schemas?.inputSchema?.properties;

      if (!inputSchema) {
        return res.status(404).json({ error: "Input schema not found" });
      }

      return res.json({ inputSchema });
    }

    // ---- ROUTE: /api/apify?route=run ----
    if (route === "run") {
      const { apiKey, actorId, input } = req.body;

      if (!apiKey || !actorId || !input) {
        return res.status(400).json({ error: "Missing apiKey, actorId, or input" });
      }

      const runResponse = await axios.post(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
        input
      );

      const runId = runResponse.data.data.id;
      const consoleUrl = runResponse.data.data.consoleUrl;

      let finished = false;
      let result;
      let attempts = 0;

      while (!finished && attempts < 30) {
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
          attempts++;
        }
      }

      if (!finished) {
        return res.status(504).json({ error: "Timeout waiting for actor to finish" });
      }

      return res.json(result);
    }

    // ---- FALLBACK ----
    return res.status(404).json({ error: "Invalid route" });

  } catch (error) {
    console.error("API Error:", error.message || error);
    return res.status(500).json({ error: error.message || error.toString() });
  }
}
