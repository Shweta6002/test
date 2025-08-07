// public/script.js

let actors = [];
let selectedSchema = {};

const BASE_URL = ""; 

document.addEventListener("DOMContentLoaded", () => {
    const apiKeyInput = document.getElementById("apiKey");
    const fetchBtn = document.getElementById("fetchActorsBtn");
    const runBtn = document.getElementById("runActorBtn");

    apiKeyInput.addEventListener("input", () => {
        fetchBtn.disabled = !apiKeyInput.value.trim();
        toggleButtonStyle(fetchBtn);
    });

    fetchBtn.disabled = !apiKeyInput.value.trim();
    toggleButtonStyle(fetchBtn);
    runBtn.disabled = true;
    toggleButtonStyle(runBtn);

    fetchBtn.addEventListener("click", fetchActors);
    document.getElementById("actorSelect").addEventListener("change", fetchSchema);
    runBtn.addEventListener("click", runActor);
});

function showSuccessToast(message, type = "info") {
    Toastify({
        text: `<i class="fa-solid fa-circle-check fa-lg" style="color: #1cc457; margin-right:10px"></i> ${message}`,
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        className: "custom-toast success-toast",
        escapeMarkup: false
    }).showToast();
}

function showErrorToast(message) {
    Toastify({
        text: `<i class="fa-solid fa-circle-xmark fa-lg" style="color: #df1616; margin-right:10px;"></i> ${message}`,
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        className: "custom-toast error-toast",
        escapeMarkup: false
    }).showToast();
}

function toggleButtonStyle(button) {
    if (button.disabled) {
        button.classList.add("disabled-btn");
    } else {
        button.classList.remove("disabled-btn");
    }
}

async function fetchActors() {
    const apiKey = document.getElementById("apiKey").value;
    const res = await fetch(`/api/apify?route=actors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
    });

    const data = await res.json();
    actors = data.actors || [];

    const select = document.getElementById("actorSelect");
    select.innerHTML = "";

    if (!actors.length) {
        showErrorToast("No actors found");
        return;
    }

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select one option";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);

    actors.forEach(actor => {
        const option = document.createElement("option");
        option.value = actor.actorId;
        option.textContent = actor.name;
        select.appendChild(option);
    });

    showSuccessToast("Actors fetched successfully!");
}

function cleanText(text) {
    return text.replace(/[\u{1F300}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F900}-\u{1F9FF}]/gu, '').trim();
}

async function fetchSchema() {
    const actorId = document.getElementById("actorSelect").value;
    const apiKey = document.getElementById("apiKey").value;

    const res = await fetch(`/api/apify?route=schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, actorId }),
    });

    const data = await res.json();
    selectedSchema = data.properties || {};
    console.log("Schema:", selectedSchema);

    const form = document.getElementById("schemaForm");
    form.innerHTML = "";

    if (Object.keys(selectedSchema).length === 0) {
        form.innerHTML = "<p style='color: red;'>⚠️ No schema fields found.</p>";
        return;
    }

    const limitedKeys = Object.keys(selectedSchema).slice(0, 6);

    for (const key of limitedKeys) {
        const field = selectedSchema[key];
        const { type, title, description } = field;

        const container = document.createElement("div");
        container.className = "form-group";

        const label = document.createElement("label");
        label.innerHTML = `<strong>${cleanText(title || key)}</strong>`;
        label.htmlFor = key;
        container.appendChild(label);

        if (description) {
            const desc = document.createElement("p");
            desc.className = "field-description";
            desc.textContent = description.replace(/<[^>]*>/g, "").slice(0, 100);
            container.appendChild(desc);
        }

        const input = document.createElement("input");
        input.name = key;
        input.placeholder = title || key;
        input.className = "form-control";

        if (type === "number" || type === "integer") {
            input.type = "number";
        } else {
            input.type = "text";
        }

        input.addEventListener("input", validateFormFields);
        container.appendChild(input);

        form.appendChild(container);
    }

    validateFormFields();
}

function validateFormFields() {
    const form = document.getElementById("schemaForm");
    const runBtn = document.getElementById("runActorBtn");
    const hasValue = Array.from(form.querySelectorAll("input")).some(
        (el) => el.value.trim() !== ""
    );
    runBtn.disabled = !hasValue;
    toggleButtonStyle(runBtn);
}

async function runActor() {
    showSuccessToast("Running Actor...");
    const apiKey = document.getElementById("apiKey").value;
    const actorId = document.getElementById("actorSelect").value;
    const form = document.getElementById("schemaForm");

    const inputValues = {};
    console.log("Collecting input values...");

    // Group inputs by name (handles arrays with multiple inputs)
    const inputsByName = {};

    Array.from(form.querySelectorAll("input")).forEach((input) => {
        const key = input.name;
        if (!key) return;

        if (!inputsByName[key]) inputsByName[key] = [];
        inputsByName[key].push(input);
    });

    for (const key in inputsByName) {
        const inputs = inputsByName[key];
        const firstInput = inputs[0];
        const type = firstInput.dataset.type || "string";

        if (type === "array") {
            // Collect all non-empty values
            const values = inputs
                .map((input) => input.value.trim())
                .filter((val) => val !== "");

            if (values.length > 0) {
                inputValues[key] = values;
            }
        } else if (type === "boolean") {
            const val = firstInput.value.trim();
            if (val) {
                inputValues[key] = val.toLowerCase() === "true";
            }
        } else if (type === "integer" || type === "number") {
            const val = firstInput.value.trim();
            if (val) {
                const num = Number(val);
                if (!isNaN(num)) {
                    inputValues[key] = num;
                }
            }
        } else {
            const val = firstInput.value.trim();
            if (val) {
                inputValues[key] = val;
            }
        }
    }

    console.log("Final inputs to backend:", inputValues);
    delete inputValues.proxyConfig; // If you want to exclude proxyConfig

    const res = await fetch("http://localhost:3000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, actorId, input: inputValues }),
    });

    const data = await res.json();
    const resultEl = document.getElementById("result");
    resultEl.textContent = JSON.stringify(data, null, 2);
    resultEl.style.whiteSpace = "pre-wrap";

    if (data.error) {
        showErrorToast("Actor failed");

    } else {
        showSuccessToast("Actor Run Completed");

    }
}
