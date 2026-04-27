const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return;

  try {
    const response = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const result = await response.json();
    if (!result.ok) {
      console.error('[Telegram] Error al enviar mensaje:', result.description);
    }
  } catch (err) {
    console.error('[Telegram] Fallo al enviar mensaje:', err.message);
  }
}

export async function notifyOTAssigned(ot, techs) {
  if (!techs || techs.length === 0) return;

  const date = ot.scheduledDate
    ? new Date(ot.scheduledDate).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Por definir';

  const priority = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'URGENTE' }[ot.priority] || ot.priority;

  const text = [
    `🔧 <b>OT Asignada</b>`,
    ``,
    `📋 <b>Folio:</b> ${ot.otNumber}`,
    `📌 <b>Trabajo:</b> ${ot.title}`,
    `👤 <b>Cliente:</b> ${ot.clientName || 'N/A'}`,
    ot.storeName ? `🏪 <b>Tienda:</b> ${ot.storeName}${ot.storeNumber ? ` #${ot.storeNumber}` : ''}` : null,
    `📍 <b>Dirección:</b> ${ot.address || 'N/A'}`,
    ot.arrivalTime ? `⏰ <b>Hora de llegada:</b> ${ot.arrivalTime}` : null,
    `📅 <b>Fecha programada:</b> ${date}`,
    `⚡ <b>Prioridad:</b> ${priority}`,
    ot.assignedFunds ? `💰 <b>Fondos asignados:</b> $${ot.assignedFunds}` : null,
    ``,
    `Por favor confirma la asignación en el sistema.`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  for (const tech of techs) {
    if (tech?.telegramChatId) {
      await sendTelegramMessage(tech.telegramChatId, text);
    }
  }
}

export async function notifyOTCompleted(ot, supervisor) {
  if (!supervisor?.telegramChatId) return;

  const text = [
    `✅ <b>OT Terminada y Aceptada</b>`,
    ``,
    `📋 <b>Folio:</b> ${ot.otNumber}`,
    `📌 <b>Trabajo:</b> ${ot.title}`,
    `👤 <b>Cliente:</b> ${ot.clientName || 'N/A'}`,
    ot.storeName ? `🏪 <b>Tienda:</b> ${ot.storeName}${ot.storeNumber ? ` #${ot.storeNumber}` : ''}` : null,
    `📍 <b>Dirección:</b> ${ot.address || 'N/A'}`,
    ot.technician?.name ? `🔧 <b>Técnico:</b> ${ot.technician.name}` : null,
    ``,
    `La OT fue completada y aceptada por el cliente. Lista para tu validación.`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  await sendTelegramMessage(supervisor.telegramChatId, text);
}
