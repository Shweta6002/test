const BASE_URL = "https://test-henna-ten-67.vercel.app/";

let actors = [];
let selectedSchema = {};

document.addEventListener("DOMContentLoaded", () => {
    const apiKeyInput = document.getElementById("apiKey");
    const fetchBtn = document.getElementById("fetchActorsBtn");
    const runBtn = document.getElementById("runActorBtn");

    // Disable fetch button if API key is empty
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

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("fetchActorsBtn").addEventListener("click", fetchActors);
    document.getElementById("actorSelect").addEventListener("change", fetchSchema);
    document.getElementById("runActorBtn").addEventListener("click", runActor);
});

function showSuccessToast(message, type = "info") {
    Toastify({
        text: `<i class="fa-solid fa-circle-check fa-lg" style="color: #1cc457; margin-right:10px"></i> ${message}`,
        duration: 3000, duration: 3000,
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
    const res = await fetch(`${BASE_URL}/actors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
    });

    const data = await res.json();
    actors = data.actors || [];

    const select = document.getElementById("actorSelect");
    select.innerHTML = "";

    if (!actors.length) {
        showErrorToast("Actor failed");
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
    showSuccessToast("Fetched successfully!");

}

function cleanText(text) {
    // Unicode emoji ranges and some symbols removed via regex
    return text.replace(/[\u{1F300}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F900}-\u{1F9FF}]/gu, '').trim();
}


async function fetchSchema() {
    const actorId = document.getElementById("actorSelect").value;
    const apiKey = document.getElementById("apiKey").value;

    const res = await fetch(`${BASE_URL}/schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, actorId }),
    });

    const data = await res.json();
    const selectedSchema = data.inputSchema || {};
    console.log("Fetched schema:", selectedSchema);

    const form = document.getElementById("schemaForm");

    // Save previous values
    const oldInputs = {};
    Array.from(form.elements).forEach((el) => {
        if (el.name) oldInputs[el.name] = el.value;
    });

    form.innerHTML = "";

    if (Object.keys(selectedSchema).length === 0) {
        form.innerHTML =
            "<p style='color: red;'>⚠️ No schema fields available. Try another actor or check the schema.</p>";
        return;
    }
    // Limit to first 6 fields (adjust the number if needed)
    const limitedKeys = Object.keys(selectedSchema).slice(0, 6);

    for (const key of limitedKeys) {
        const field = selectedSchema[key];
        const { type, title, description, minimum } = field;

        const container = document.createElement("div");
        container.style.marginBottom = "20px";

        const label = document.createElement("label");
        // Remove emoji-like characters from titles
        const cleanTitle = (title || key).replace(/[\u{1F300}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F900}-\u{1F9FF}]/gu, '').trim();
        label.innerHTML = `<strong>${cleanText(title || key)}</strong>`;
        label.htmlFor = key;
        container.appendChild(label);

        if (description) {
            const desc = document.createElement("p");
            desc.style.fontSize = "12px";
            desc.style.color = "#aaa";
            desc.style.marginTop = "4px";

            // Remove HTML and truncate
            const plainText = description.replace(/<\/?[^>]+(>|$)/g, "");
            desc.textContent = plainText.length > 120 ? plainText.slice(0, 120) + "..." : plainText;

            container.appendChild(desc);
        }

        if (type === "array" && field.items?.type === "string") {
            const listContainer = document.createElement("div");
            listContainer.id = `${key}-list`;

            function createArrayInput(value = "") {
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.marginBottom = "6px";

                const input = document.createElement("input");
                input.type = "text";
                input.name = key;
                input.dataset.type = "array";
                input.value = value;
                input.style.flexGrow = "1";
                input.placeholder = cleanText(title || key);

                input.addEventListener("input", validateFormFields);

                row.appendChild(input);

                const removeBtn = document.createElement("button");
                removeBtn.type = "button";
                removeBtn.textContent = "Remove";
                removeBtn.style.marginLeft = "8px";
                removeBtn.onclick = () => {
                    listContainer.removeChild(row);
                    if (listContainer.children.length === 0) {
                        listContainer.appendChild(createArrayInput(""));
                    }
                };
                row.appendChild(removeBtn);

                return row;
            }

            if (oldInputs[key]) {
                try {
                    const oldVals = JSON.parse(oldInputs[key]);
                    if (Array.isArray(oldVals) && oldVals.length) {
                        oldVals.forEach(val => {
                            listContainer.appendChild(createArrayInput(val));
                        });
                    } else {
                        listContainer.appendChild(createArrayInput(""));
                    }
                } catch {
                    listContainer.appendChild(createArrayInput(oldInputs[key]));
                }
            } else {
                listContainer.appendChild(createArrayInput(""));
            }

            container.appendChild(listContainer);

            const addBtn = document.createElement("button");
            addBtn.type = "button";
            addBtn.textContent = "Add another";
            addBtn.onclick = () => {
                listContainer.appendChild(createArrayInput(""));
            };
            container.appendChild(addBtn);
        } else {
            const input = document.createElement("input");
            input.name = key;
            input.id = key;
            input.placeholder = title || key;
            input.style.display = "block";
            input.style.marginTop = "6px";
            input.style.width = "100%";

            if (type === "integer" || type === "number") {
                input.type = "number";
                if (minimum !== undefined) input.min = minimum;
                input.dataset.type = "number";
            } else if (type === "boolean") {
                input.type = "text";
                input.dataset.type = "boolean";
            } else {
                input.type = "text";
                input.dataset.type = "string";
            }

            if (oldInputs[key]) input.value = oldInputs[key];
            input.addEventListener("input", validateFormFields);

            container.appendChild(input);
        }

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

    const res = await fetch(`${BASE_URL}/run`, {
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
