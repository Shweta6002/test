// /api/apify.js
import axios from "axios";

export default async function handler(req, res) {
  const { method } = req;
  const { route } = req.query;

  if (method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey, actorId, input } = req.body;

  try {
    if (route === "actors") {
      const response = await axios.get("https://api.apify.com/v2/acts", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const actors = response.data.data.items.map((act) => ({
        name: act.name,
        actorId: act.id,
      }));

      return res.status(200).json({ actors });
    }

    if (route === "schema") {
      const { apiKey, actorId } = req.body;
      
      // Build URL for OpenAPI schema
      const url = `https://api.apify.com/v2/acts/${actorId}/builds/default/openapi.json?token=${apiKey}`;

      const response = await axios.get(url);
      const openapi = response.data;
      console.log(openapi, "openapi>>>>>>>>>>>>")

      const inputSchema =
          response.data.components?.schemas?.inputSchema || {};

      return res.status(200).json(inputSchema);
    }

    if(route === "run") {
      const runResponse = await axios.post(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
        {...input}
      );

      const runId = runResponse.data.data.id;
      const consoleUrl = runResponse.data.data.consoleUrl;

      let finished = false, result;
      while (!finished) {
        const statusRes = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
        const data = statusRes.data.data;

        if (data.status === "SUCCEEDED") {
          finished = true;
          result = data;
        } else if (data.status === "FAILED") {
          finished = true;
          return res.status(500).json({ error: "Actor run failed", details: data });
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        }
      }

      return res.status(200).json({ result, consoleUrl });
    }


    return res.status(400).json({ error: "Invalid route" });
  } catch (err) {
    console.error("API error:", err.message || err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
