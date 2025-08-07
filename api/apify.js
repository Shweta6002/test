const axios = require("axios");

module.exports = async (req, res) => {
    const { url, method } = req;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
        return res.status(200).end(); // Pre-flight
    }

    if (url === "/api/actors" && method === "POST") {
        try {
            const { apiKey } = req.body || await getBody(req);
            const response = await axios.get(`https://api.apify.com/v2/acts?token=${apiKey}`);
            const actors = response.data.data.items.map(a => ({
                actorId: a.id,
                name: a.name
            }));
            return res.status(200).json({ actors });
        } catch (error) {
            return res.status(500).json({ error: error.toString() });
        }
    }

    if (url === "/api/schema" && method === "POST") {
        try {
            const { apiKey, actorId } = req.body || await getBody(req);
            const openapi = await axios.get(
                `https://api.apify.com/v2/acts/${actorId}/builds/default/openapi.json?token=${apiKey}`
            );
            const inputSchema = openapi.data?.components?.schemas?.inputSchema?.properties;
            if (!inputSchema) {
                return res.status(404).json({ error: "Input schema not found" });
            }
            return res.status(200).json({ inputSchema });
        } catch (error) {
            return res.status(500).json({ error: error.toString() });
        }
    }

    if (url === "/api/run" && method === "POST") {
        try {
            const { apiKey, actorId, input } = req.body || await getBody(req);
            const runResponse = await axios.post(
                `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
                input
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
                    result = {
                        error: "Actor failed",
                        statusMessage: data.statusMessage,
                        consoleUrl
                    };
                } else {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            return res.status(200).json(result);
        } catch (err) {
            return res.status(500).json({ error: err.toString(), details: err.response?.data });
        }
    }

    res.status(404).json({ error: "Not found" });
};

// Helper to parse JSON body
async function getBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(data));
            } catch (err) {
                reject(err);
            }
        });
    });
}
