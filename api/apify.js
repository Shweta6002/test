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
      const response = await axios.get(`https://api.apify.com/v2/acts/${actorId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const inputSchema = response.data.data.inputSchema || {};
      return res.status(200).json({ inputSchema });
    }

    if (route === "run") {
      const response = await axios.post(
        `https://api.apify.com/v2/acts/${actorId}/runs`,
        { input },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.status(200).json(response.data);
    }

    return res.status(400).json({ error: "Invalid route" });
  } catch (err) {
    console.error("API error:", err.message || err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
