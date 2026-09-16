const BLYNK_AUTH_TOKEN = "D6Zu_NsTwvhZ7toNrjtWZbCZeMKnBkTP";
const BLYNK_SERVER = "sgp1.blynk.cloud";

async function checkDeviceStatus() {
    try {
        const url = `https://${BLYNK_SERVER}/external/api/isHardwareConnected?token=${BLYNK_AUTH_TOKEN}`;
        const response = await fetch(url);
        const isConnected = await response.text();
        return isConnected.trim() === "true";
    } catch (err) {
        console.error("Error checking hardware status:", err);
        return false;
    }
}

async function fetchPin(pin) {
    try {
        const url = `https://${BLYNK_SERVER}/external/api/get?token=${BLYNK_AUTH_TOKEN}&${pin}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const text = await response.text();
        return text.trim();
    } catch (err) {
        console.error(`Error fetching ${pin}:`, err);
        return null;
    }
}

// Controls 3-Color Segment Status
function setCardStatus(valueId, numValue, safeLimit, warningLimit, isInverse = false) {
    const element = document.getElementById(valueId);
    if (!element) return;

    const card = element.closest('.card');
    if (!card) return;

    card.classList.remove("status-safe", "status-warning", "status-danger");

    if (numValue === null || isNaN(numValue)) return;

    if (!isInverse) {
        // Higher value = Higher danger (Temp, Humidity, Gas)
        if (numValue <= safeLimit) {
            card.classList.add("status-safe");      // Green
        } else if (numValue <= warningLimit) {
            card.classList.add("status-warning");   // Orange
        } else {
            card.classList.add("status-danger");    // Red
        }
    } else {
        // Lower percentage = Higher danger (Feed %, Water %)
        if (numValue >= safeLimit) {
            card.classList.add("status-safe");      // Green (>= 70%)
        } else if (numValue >= warningLimit) {
            card.classList.add("status-warning");   // Orange (30% - 69%)
        } else {
            card.classList.add("status-danger");    // Red (< 30%)
        }
    }
}

async function updateDashboard() {
    const statusBadge = document.getElementById("status-badge");
    const isOnline = await checkDeviceStatus();

    if (isOnline) {
        statusBadge.textContent = "ONLINE";
        statusBadge.className = "badge online";

        const [temp, hum, gas, feed, water] = await Promise.all([
            fetchPin("v0"),
            fetchPin("v1"),
            fetchPin("v2"),
            fetchPin("v3"),
            fetchPin("v4")
        ]);

        // Temperature (Green <= 28°C | Orange <= 32°C | Red > 32°C)
        const tempVal = (temp && !isNaN(temp)) ? parseFloat(temp) : null;
        document.getElementById("val-temp").innerText = tempVal !== null ? tempVal.toFixed(1) : "--";
        setCardStatus("val-temp", tempVal, 28, 32);

        // Humidity (Green <= 65% | Orange <= 75% | Red > 75%)
        const humVal = (hum && !isNaN(hum)) ? parseFloat(hum) : null;
        document.getElementById("val-hum").innerText = humVal !== null ? humVal.toFixed(1) : "--";
        setCardStatus("val-hum", humVal, 65, 75);

        // Gas Level (Green <= 400 PPM | Orange <= 600 PPM | Red > 600 PPM)
        let gasVal = null;
        if (gas && !isNaN(gas)) {
            const rawGas = parseInt(gas);
            gasVal = rawGas > 1000 ? Math.round((rawGas / 4095) * 1000) : rawGas;
            document.getElementById("val-gas").innerText = gasVal;
        } else {
            document.getElementById("val-gas").innerText = "--";
        }
        setCardStatus("val-gas", gasVal, 400, 600);

        // Feed Level % (Green >= 70% | Orange >= 30% | Red < 30%)
        const feedVal = (feed && !isNaN(feed)) ? parseInt(feed) : null;
        document.getElementById("val-feed").innerText = feedVal !== null ? feedVal : "--";
        setCardStatus("val-feed", feedVal, 70, 30, true);

        // Water Level % (Green >= 70% | Orange >= 30% | Red < 30%)
        const waterVal = (water && !isNaN(water)) ? parseInt(water) : null;
        document.getElementById("val-water").innerText = waterVal !== null ? waterVal : "--";
        setCardStatus("val-water", waterVal, 70, 30, true);

    } else {
        statusBadge.textContent = "OFFLINE";
        statusBadge.className = "badge offline";

        const ids = ["val-temp", "val-hum", "val-gas", "val-feed", "val-water"];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = "--";
                const card = el.closest('.card');
                if (card) card.classList.remove("status-safe", "status-warning", "status-danger");
            }
        });
    }
}

updateDashboard();
setInterval(updateDashboard, 3000);
