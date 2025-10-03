const NASA_API_KEY = "fniyQ2epdxG2iY6Xzhh8kt8bbytRSDVAF7lB92hk";

let map;
let issMarker;
let userMarker;
const MAP_ZOOM_LEVEL = 3;

function updateStatus(message) {
  const statusElement = document.getElementById("status-message");
  if (statusElement) {
    statusElement.textContent = message;
  }
}

function displayLocation(lat, lon) {
  const locationElement = document.getElementById("user-location");
  if (locationElement) {
    locationElement.innerHTML = `
            Lat: <strong>${lat.toFixed(4)}</strong>, 
            Lon: <strong>${lon.toFixed(4)}</strong>
        `;
  }
}

function initializeMap(initialLat, initialLon) {
  if (map) {
    map.remove();
  }

  map = L.map("iss-map").setView([initialLat, initialLon], MAP_ZOOM_LEVEL);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  const issIcon = L.icon({
    iconUrl:
      "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  issMarker = L.marker([0, 0], { icon: issIcon })
    .addTo(map)
    .bindPopup("Estação Espacial Internacional (ISS)");

  const userIcon = L.icon({
    iconUrl:
      "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  userMarker = L.marker([initialLat, initialLon], { icon: userIcon })
    .addTo(map)
    .bindPopup("Sua Localização")
    .openPopup();
}

function updateMap(issLat, issLon) {
  if (issMarker) {
    const newLatLng = new L.LatLng(issLat, issLon);
    issMarker.setLatLng(newLatLng);
    map.setView(newLatLng, map.getZoom()); //segue a ISS
  }
}

async function fetchNasaAPOD() {
  const apodUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
  const apodContent = document.getElementById("apod-content");
  apodContent.innerHTML =
    "<p>Carregando conteúdo astronômico... (Pode estar em cache)</p>";

  try {
    const response = await fetch(apodUrl);
    const data = await response.json();

    if (data.code || data.msg) {
      apodContent.innerHTML = `
                <h3>Erro da API da NASA</h3>
                <p>Ocorreu um erro ao buscar o APOD. Código: ${
                  data.code || "Desconhecido"
                }</p>
                <p>Mensagem: ${
                  data.msg || "Falha ao processar a requisição."
                }</p>
                <p>Tente usar sua chave pessoal da NASA se o limite da DEMO_KEY foi atingido.</p>
            `;
      return;
    }

    const title = data.title || "Título Indisponível";
    const explanation =
      data.explanation || "Explicação não fornecida para esta mídia.";
    const mediaType = data.media_type || "desconhecido";
    const copyright = data.copyright || "Público";

    let mediaHtml = "";
    if (mediaType === "image") {
      mediaHtml = `<img src="${data.url}" alt="${title}">`;
    } else if (mediaType === "video") {
      let embedUrl = data.url;
      if (embedUrl && embedUrl.includes("youtube.com")) {
        embedUrl = embedUrl.replace("watch?v=", "embed/");
      }
      mediaHtml = `<iframe width="100%" height="300" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
    } else {
      mediaHtml = `<p>Tipo de mídia não suportado: ${mediaType}. Se o problema persistir, a API pode estar retornando um formato inválido hoje.</p>`;
    }

    apodContent.innerHTML = `
            <h3>${title}</h3>
            ${mediaHtml}
            <p class="apod-explanation">${explanation}</p>
            <p>Crédito: ${copyright}</p>
        `;
  } catch (error) {
    console.error("Erro geral ao buscar APOD da NASA:", error);
    apodContent.innerHTML = `<p>Falha ao conectar ou erro de rede. Exibindo dados em cache (ou offline).</p>`;
  }
}

async function fetchISSLocation() {
  const issCurrentLocationUrl =
    "https://api.wheretheiss.at/v1/satellites/25544";
  const issPassTimesDiv = document.getElementById("iss-pass-times");

  issPassTimesDiv.innerHTML =
    '<p class="loading-message">Atualizando a posição da ISS...</p>';

  try {
    const response = await fetch(issCurrentLocationUrl);
    const data = await response.json();

    const latISS = data.latitude;
    const lonISS = data.longitude;
    const altISS = data.altitude.toFixed(0);
    const velocity = data.velocity.toFixed(0);

    if (map && issMarker) {
      updateMap(latISS, lonISS);
    }

    issPassTimesDiv.innerHTML = `
            <p>Dados da ISS (Atualizado: ${new Date().toLocaleTimeString(
              "pt-BR"
            )}):</p>
            <div class="iss-data-panel">
                <p>Latitude: <strong>${latISS.toFixed(2)}</strong></p>
                <p>Longitude: <strong>${lonISS.toFixed(2)}</strong></p>
                <p>Altitude: <strong>${altISS} km</strong></p>
                <p>Velocidade: <strong>${velocity} km/s</strong></p>
            </div>
        `;
  } catch (error) {
    console.error("Erro ao buscar localização da ISS:", error);
    issPassTimesDiv.innerHTML = `<p>Falha ao buscar a localização da ISS. (Offline ou erro de rede). Não foi possível atualizar o mapa.</p>`;
  }
}

function getCoordinates() {
  const DEFAULT_LON = 0;

  if ("geolocation" in navigator) {
    updateStatus("Aguarde... Solicitando sua localização (Uso de Hardware).");

    const options = { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        updateStatus(`Localização obtida com sucesso!`);
        displayLocation(lat, lon);

        initializeMap(lat, lon);

        initApp(lat, lon);
      },

      (error) => {
        let errorMessage = "Erro ao obter localização. Exibindo mapa padrão.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage =
            "Permissão de geolocalização negada. O mapa será centrado no Equador.";
        }
        updateStatus(`ERRO: ${errorMessage}`);

        initializeMap(DEFAULT_LAT, DEFAULT_LON);

        initApp(DEFAULT_LAT, DEFAULT_LON);
      },
      options
    );
  } else {
    updateStatus(
      "Seu navegador não suporta Geolocalização. Exibindo mapa padrão."
    );

    initializeMap(DEFAULT_LAT, DEFAULT_LON);

    initApp(DEFAULT_LAT, DEFAULT_LON);
  }
}

function initApp(lat, lon) {
  fetchNasaAPOD();
  fetchISSLocation();
  setInterval(fetchISSLocation, 5000);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("Service Worker registrado:", registration.scope);
      })
      .catch((err) => {
        console.error("Falha ao registrar Service Worker:", err);
      });
  });
}

document.addEventListener("DOMContentLoaded", getCoordinates);
