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
  const response = await axios.get(
    `https://api.apify.com/v2/acts/${actorId}/builds/latest/openapi.json`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  const inputSchema =
    response.data.components?.schemas?.input?.properties || {};

  return res.status(200).json({ inputSchema });
}


    return res.status(400).json({ error: "Invalid route" });
  } catch (err) {
    console.error("API error:", err.message || err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
