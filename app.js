let customLogoDataUrl = localStorage.getItem("savedTicketLogo") || "";
let customSvgRaw = localStorage.getItem("savedTicketSvg") || "";

const AIRLINE_URL = "https://centrum-air.com";
const BOOKING_SEARCH_URL = "https://booking.centrum-air.com/ibe/C6/home?language=ru#/guest/search";
let bookingQr = { url: "", svg: "" };

const ids = [
  "brandName", "pnrCode", "bookingSurname", "bookingStatus", "bookingDate",
  "routeTitle", "flightNo", "depDateTime", "arrDateTime",
  "depCode", "arrCode", "depAirport", "arrAirport",
  "regOpen", "regClose", "aircraft", "duration",
  "defClass", "defBaggage", "startTicketNo", "passengersList",
  "contactPerson", "agentName", "agentPhone", "agentEmail"
];

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function splitDateTime(str) {
  const parts = str.trim().split(/\s+/);
  if (parts.length > 1 && /^\d{1,2}:\d{2}$/.test(parts[parts.length - 1])) {
    const time = parts.pop();
    return { date: parts.join(" "), time };
  }
  return { date: str, time: "" };
}

function splitAirport(str) {
  const parts = str.split("|").map(s => s.trim());
  return { name: parts[0] || "", term: parts[1] || "" };
}

function parsePassengers() {
  const raw = val("passengersList").split("\n").map(l => l.trim()).filter(Boolean);
  const defClass = val("defClass");
  const defBag = val("defBaggage");
  const seg = `${val("depCode")} > ${val("arrCode")}`;
  let baseTicket = BigInt(val("startTicketNo").replace(/\D/g, "") || "9990000000001");

  return raw.map((line, idx) => {
    const cols = line.split("|").map(c => c.trim());
    const name = cols[0] || "";
    const ticket = cols[1] ? cols[1] : (baseTicket + BigInt(idx)).toString();
    const cls = cols[2] || defClass;
    const bag = cols[3] || defBag;
    const companion = cols[4] || "";
    return { name, ticket, cls, seg, bag, companion };
  });
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function bookingUrl(pnr, passengers) {
  const firstSurname = passengers[0]?.name.split(/\s+/, 1)[0] || "";
  const surname = val("bookingSurname").trim() || firstSurname;
  if (!/^[a-z0-9]{6}$/i.test(pnr) || !surname || surname.length > 120) {
    return BOOKING_SEARCH_URL;
  }

  const params = new URLSearchParams({ p: pnr.toUpperCase(), ln: surname, s: "1" });
  return `${BOOKING_SEARCH_URL}?${params.toString().replaceAll("+", "%20")}`;
}

function bookingQrSvg(url) {
  if (bookingQr.url !== url) {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    bookingQr = { url, svg: qr.createSvgTag({ cellSize: 1, margin: 4, scalable: true }) };
  }
  return bookingQr.svg;
}

function formatTerminal(terminal) {
  const label = terminal.match(/^Терминал\s+/i)?.[0] || "";
  return `${label}<strong>${terminal.slice(label.length)}</strong>`;
}

function contactCard(title, nameLabel, name, icon, headingClass = "") {
  return `
    <div class="card contact-card">
      <div class="section-title-row contact-heading ${headingClass}">
        <img src="${icon}" alt="" class="section-icon">
        <div class="title">${title}</div>
      </div>
      <table class="contact-table">
        <colgroup><col style="width:34.8%;"><col style="width:24.8%;"><col></colgroup>
        <thead>
          <tr><th>${nameLabel}</th><th>Контактный Номер</th><th>Адрес электронной почты</th></tr>
        </thead>
        <tbody>
          <tr><td>${name}</td><td>${val("agentPhone")}</td><td>${val("agentEmail")}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function render() {
  const depDT = splitDateTime(val("depDateTime"));
  const arrDT = splitDateTime(val("arrDateTime"));
  const depAP = splitAirport(val("depAirport"));
  const arrAP = splitAirport(val("arrAirport"));
  const passengers = parsePassengers();
  const pnr = val("pnrCode").trim();
  const qrUrl = bookingUrl(pnr, passengers);

  let logoHtml = `<img src="logo.svg" alt="Centrum Air" class="brand-logo">`;
  if (customSvgRaw && customSvgRaw.includes("<svg")) {
    logoHtml = customSvgRaw;
  } else if (customLogoDataUrl) {
    logoHtml = `<img src="${customLogoDataUrl}" alt="Logo">`;
  }

  const passRows = passengers.map(p => {
    const companion = p.companion
      ? `<em class="passenger-companion">С кем вы летите :<br>${escapeHtml(p.companion)}</em>`
      : "";
    const baggageWarning = /^0\s*(?:кг|килограмм(?:а|ов)?)?$/i.test(p.bag.trim())
      ? '<span class="baggage-warning" aria-hidden="true">⚠️</span>'
      : "";
    return `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong>${companion}</td>
        <td>${escapeHtml(p.ticket)}</td>
        <td>${escapeHtml(p.cls)}</td>
        <td>${escapeHtml(p.seg)}</td>
        <td></td>
        <td></td>
        <td>${baggageWarning}${escapeHtml(p.bag)}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <div class="page page--itinerary">
      <div class="ticket-panel">
        <div class="header-banner">
          <div class="brand-logo-wrap">${logoHtml}</div>
          <div class="banner-right">Маршрут полёта</div>
        </div>

        <div class="card card-top">
          <div class="pnr-left">
            <a class="booking-qr" href="${escapeHtml(qrUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть бронирование Centrum Air">
              ${bookingQrSvg(qrUrl)}
            </a>
            <div>
              <div class="pnr-label">Ссылка для<br>Бронирования</div>
              <div class="pnr-code">${escapeHtml(pnr)}</div>
            </div>
          </div>
          <div class="status-right">
            <div>Статус Бронирования</div>
            <div class="status-value">${val("bookingStatus")}</div>
            <div class="booking-date">
              <div class="booking-date-label">Дата Бронирования</div>
              ${val("bookingDate")}
            </div>
          </div>
        </div>

        <div class="card flight-card">
          <div class="section-title-row flight-heading">
            <img src="icon-plane.svg" alt="" class="section-icon">
            <div>
              <div class="flight-route-sub">Отправляющийся Рейс</div>
              <div class="flight-route-main">${val("routeTitle")}</div>
            </div>
          </div>

          <div class="flight-grid">
            <div>
              <div>Отправление :</div>
              <strong>${depDT.date}<br>${depDT.time}</strong>
              <div class="flight-airport">
                <strong>${val("depCode")}</strong>
                <div>${depAP.name}</div>
                <div>${formatTerminal(depAP.term)}</div>
              </div>
            </div>
            <div>
              <div>Прибытие :</div>
              <strong>${arrDT.date}<br>${arrDT.time}</strong>
              <div class="flight-airport">
                <strong>${val("arrCode")}</strong>
                <div>${arrAP.name}</div>
                <div>${formatTerminal(arrAP.term)}</div>
              </div>
            </div>
            <div>
              <strong>Номер рейса</strong>
              <div class="flight-num">${val("flightNo")}</div>
              <div class="flight-meta-large">Статус:</div>
              <div class="flight-status">ПОДТВЕРЖДЕННЫЙ</div>
              <div>Самолет: ${val("aircraft")}</div>
              <div>Остановка: 0</div>
              <div class="flight-meta-large">Длительность: ${val("duration")}</div>
            </div>
          </div>
          <div class="flight-checkin">
            <div>Регистрация Открывается :<br><strong>${val("regOpen")}</strong></div>
            <div>Регистрация Заканчивается :<br><strong>${val("regClose")}</strong></div>
          </div>
        </div>

        <div class="card passenger-card">
          <div class="section-title-row passenger-heading">
            <img src="icon-passenger.svg" alt="" class="section-icon">
            <div class="title">Информация Для Пассажиров</div>
          </div>
          <table class="info-table${passengers.length > 4 ? " info-table--extended" : ""}">
            <colgroup>
              <col>
              <col>
              <col>
              <col>
              <col>
              <col>
              <col>
            </colgroup>
            <thead>
              <tr>
                <th>Имя Пассажира</th>
                <th>Электронный<br>Билет</th>
                <th>Класс</th>
                <th>Сегмент</th>
                <th>Место</th>
                <th>Дополнения</th>
                <th>Норма<br>бесплатного<br>провоза<br>багажа</th>
              </tr>
            </thead>
            <tbody>
              ${passRows}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="page">
      <div class="ticket-panel contacts-panel">
        ${contactCard("Контактная Информация", "Контактное Лицо", val("contactPerson"), "icon-contact.svg")}
        ${contactCard("Информация Об Агенте", "Агент", val("agentName"), "icon-agent.svg", "agent-heading")}
      </div>

      <div class="ticket-panel rules-panel">
        <div class="card rules-card">
          <div class="section-title-row rules-heading">
            <img src="icon-rules.svg" alt="" class="section-icon">
            <div class="title">Правила И Нормы Приобретения Билетов В Centrum Air:</div>
          </div>
          <table class="rules-table">
            <colgroup><col style="width:19%;"><col></colgroup>
            <tr>
              <td>Правило<br>Применения<br>Тарифов</td>
              <td class="rules-head-blue">000001<br>${val("depCode")}-${val("arrCode")}</td>
            </tr>
            <tr>
              <td>Багаж</td>
              <td>
                Ручная кладь: 1 сумка до 5 кг. Норма бесплатного провоза багажа Рейсы из Джидды и Медины в Узбекистан Для Airbus A320: Во все города Узбекистана — 1 место багажа до 15 кг + 5 литров Зам-Зам. Для Airbus A320neo / A321: Во все города Узбекистана — 1 место багажа до 20 кг + 5 литров Зам-Зам. Для Airbus A330: Во все города Узбекистана — 1 место багажа до 30 кг + 5 литров Зам-Зам.
              </td>
            </tr>
            <tr>
              <td>Перебронирование</td>
              <td>Не допускается</td>
            </tr>
            <tr>
              <td>Отмена/Возврат<br>средств</td>
              <td>Не допускается</td>
            </tr>
          </table>
        </div>
        <div class="card important-card">
          <div class="section-title-row important-heading">
            <img src="icon-info.svg" alt="" class="section-icon">
            <div class="title">Важная Информация :</div>
          </div>
          <div class="important-note">
            <p>
              <b>ПРИМЕЧАНИЕ:</b> Пассажир должен соблюдать все требования государственных органов стран назначения, касающиеся перевозки, а также, иметь въездные, выездные и другие надлежащие документы.<br>
              В случае отказа во въезде в страну назначения, ответственность за любые понесенные расходы перед перевозчиком несет сам пассажир и перевозчик имеет право взыскать с пассажира все понесенные расходы, в результате такого отказа.
            </p>
            <p>
              При приобретении авиабилета пассажир подтверждает, что ознакомился и согласен с Условиями перевозки, Правилами применения тарифов и Ограничениями по перевозке опасных предметов, размещенными на официальном сайте авиакомпании Centrum Air (<a href="${AIRLINE_URL}" target="_blank" rel="noopener">centrum-air.com</a>)
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="page">
      <div class="thank-you">
        <span>Спасибо за выбор</span>
        <img src="footer-mark.png" alt="Centrum Air">
      </div>
    </div>
  `;

  document.getElementById("previewArea").innerHTML = html;
}

ids.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", render);
});

document.getElementById("logoInput").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.name.toLowerCase().endsWith(".svg") || file.type === "image/svg+xml") {
    const textReader = new FileReader();
    textReader.onload = function(ev) {
      customSvgRaw = ev.target.result;
      customLogoDataUrl = "";
      try {
        localStorage.setItem("savedTicketSvg", customSvgRaw);
        localStorage.removeItem("savedTicketLogo");
      } catch (err) {}
      render();
    };
    textReader.readAsText(file);
  } else {
    const reader = new FileReader();
    reader.onload = function(ev) {
      customLogoDataUrl = ev.target.result;
      customSvgRaw = "";
      try {
        localStorage.setItem("savedTicketLogo", customLogoDataUrl);
        localStorage.removeItem("savedTicketSvg");
      } catch (err) {}
      render();
    };
    reader.readAsDataURL(file);
  }
});

const svgCodeInput = document.getElementById("svgCodeInput");
if (svgCodeInput) {
  if (customSvgRaw) svgCodeInput.value = customSvgRaw;
  svgCodeInput.addEventListener("input", function(e) {
    customSvgRaw = e.target.value.trim();
    try { localStorage.setItem("savedTicketSvg", customSvgRaw); } catch (err) {}
    render();
  });
}

render();
