// Integração com Google Agenda usando Google Identity Services (GIS).
// Fluxo client-side: o token de acesso vive só na sessão do navegador,
// expira em ~1h e precisa ser renovado clicando em "Conectar" de novo.
// Não requer backend nem client secret.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

let tokenClient = null;
let accessToken = null;

export function isGoogleReady() {
  return typeof window !== "undefined" && !!window.google;
}

export function conectarGoogleAgenda() {
  return new Promise((resolve, reject) => {
    if (!isGoogleReady()) {
      reject(new Error("Google Identity Services ainda não carregou."));
      return;
    }
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(response);
          return;
        }
        accessToken = response.access_token;
        resolve(accessToken);
      },
    });
    tokenClient.requestAccessToken();
  });
}

export function estaConectado() {
  return !!accessToken;
}

// Cria um evento no Google Agenda a partir de uma etapa.
// dataISO: data no formato YYYY-MM-DD (dia local do evento)
// hora: "HH:MM" ou null (se null, cria evento de dia inteiro)
export async function criarEventoAgenda({ titulo, dataISO, hora }) {
  if (!accessToken) throw new Error("Google Agenda não conectado ainda.");

  let body;
  if (hora) {
    const inicio = `${dataISO}T${hora}:00`;
    const [h, m] = hora.split(":").map(Number);
    const fimData = new Date(`${dataISO}T${hora}:00`);
    fimData.setHours(fimData.getHours() + 1);
    const fim = fimData.toISOString().slice(0, 19);
    body = {
      summary: titulo,
      start: { dateTime: inicio, timeZone: "America/Cuiaba" },
      end: { dateTime: fim, timeZone: "America/Cuiaba" },
    };
  } else {
    body = {
      summary: titulo,
      start: { date: dataISO },
      end: { date: dataISO },
    };
  }

  const resp = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Falha ao criar evento na Agenda.");
  }
  return resp.json();
}
