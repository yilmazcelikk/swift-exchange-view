import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return new Response(JSON.stringify({ error: 'Missing Telegram config' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { event_type, data } = await req.json();
    let body = '';
    const header = `🏢 *Kaldıraç Sistemi*\n📅 ${formatDate(new Date())}\n━━━━━━━━━━━━━━━\n\n`;

    switch (event_type) {
      case 'new_user': {
        const name = data.full_name || 'İsimsiz';
        const metaId = data.meta_id || '-';
        const email = data.email || '-';
        body = `👤 *Yeni Üye Kaydı*\n\n` +
          `📛 İsim: ${escapeMarkdown(name)}\n` +
          `📧 Email: ${escapeMarkdown(email)}\n` +
          `🆔 Meta ID: ${metaId}`;
        break;
      }
      case 'new_document': {
        const userName = data.user_name || 'Bilinmeyen';
        const docType = docTypeLabel(data.type);
        body = `📄 *Yeni Evrak Yüklendi*\n\n` +
          `👤 Kullanıcı: ${escapeMarkdown(userName)}\n` +
          `📋 Belge Türü: ${docType}`;
        break;
      }
      case 'new_deposit': {
        const userName = data.user_name || 'Bilinmeyen';
        const amount = Number(data.amount).toLocaleString('tr-TR');
        const currency = data.currency || 'TRY';
        body = `💰 *Yeni Yatırım Talebi*\n\n` +
          `👤 Kullanıcı: ${escapeMarkdown(userName)}\n` +
          `💵 Tutar: ${amount} ${currency}`;
        break;
      }
      case 'new_withdrawal': {
        const userName = data.user_name || 'Bilinmeyen';
        const amount = Number(data.amount).toLocaleString('tr-TR');
        const currency = data.currency || 'TRY';
        body = `🏧 *Yeni Çekim Talebi*\n\n` +
          `👤 Kullanıcı: ${escapeMarkdown(userName)}\n` +
          `💵 Tutar: ${amount} ${currency}`;
        break;
      }
      case 'position_open': {
        const userName = data.user_name || 'Bilinmeyen';
        const symbolName = data.symbol_name || '-';
        const direction = data.type === 'buy' ? '🟢 ALIŞ' : '🔴 SATIŞ';
        const lotsVal = data.lots || '-';
        const entryPrice = data.entry_price ? Number(data.entry_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-';
        const leverageVal = data.leverage || '1:200';
        const orderTypeLabel = data.order_type === 'market' ? 'Piyasa' : data.order_type?.replace('_', ' ').toUpperCase() || 'Piyasa';
        body = `📈 *Yeni Pozisyon Açıldı*\n\n` +
          `👤 Kullanıcı: ${escapeMarkdown(userName)}\n` +
          `💹 Sembol: ${escapeMarkdown(symbolName)}\n` +
          `${direction}\n` +
          `📊 Lot: ${lotsVal}\n` +
          `💰 Giriş Fiyatı: ${entryPrice}\n` +
          `⚡ Kaldıraç: ${leverageVal}\n` +
          `📋 Emir Tipi: ${orderTypeLabel}`;
        break;
      }
      case 'position_close': {
        const userName = data.user_name || 'Bilinmeyen';
        const symbolName = data.symbol_name || '-';
        const direction = data.type === 'buy' ? 'ALIŞ' : 'SATIŞ';
        const lotsVal = data.lots || '-';
        const entryPrice = data.entry_price ? Number(data.entry_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-';
        const closePrice = data.close_price ? Number(data.close_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-';
        const pnl = data.pnl ? Number(data.pnl).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0';
        const pnlEmoji = Number(data.pnl) >= 0 ? '🟢' : '🔴';
        const closeReason = data.close_reason === 'stop_loss' ? '⛔ Stop Loss' : data.close_reason === 'take_profit' ? '✅ Take Profit' : '📌 Manuel';
        body = `📉 *Pozisyon Kapatıldı*\n\n` +
          `👤 Kullanıcı: ${escapeMarkdown(userName)}\n` +
          `💹 Sembol: ${escapeMarkdown(symbolName)} \\(${direction}\\)\n` +
          `📊 Lot: ${lotsVal}\n` +
          `💰 Giriş: ${entryPrice}\n` +
          `💰 Çıkış: ${closePrice}\n` +
          `${pnlEmoji} K/Z: $${pnl}\n` +
          `🏷 Kapanış: ${closeReason}`;
        break;
      }
      case 'margin_call': {
        const userName = data.user_name || 'Bilinmeyen';
        const metaId = data.meta_id || '-';
        const marginLvl = Number(data.margin_level).toFixed(2);
        const equity = Number(data.equity).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        const balance = Number(data.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        body = `🔴 *MARGIN CALL \\- Teminat Seviyesi Düşük\\!*\n\n` +
          `👤 Kullanıcı: ${escapeMarkdown(userName)}\n` +
          `🆔 Meta ID: ${metaId}\n` +
          `📊 Teminat Seviyesi: %${marginLvl}\n` +
          `💰 Varlık: $${equity}\n` +
          `💵 Bakiye: $${balance}`;
        break;
      }
      default:
        body = `🔔 Bilinmeyen bildirim: ${event_type}`;
    }

    const message = header + body;

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await res.json();
    if (!result.ok) {
      console.error('Telegram API error:', JSON.stringify(result));
      return new Response(JSON.stringify({ success: false, error: result.description }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function formatDate(d: Date): string {
  return d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
}

function docTypeLabel(t: string): string {
  if (t === 'identity_front') return 'Kimlik \\- Ön Yüz';
  if (t === 'identity_back') return 'Kimlik \\- Arka Yüz';
  if (t === 'address_proof') return 'Adres Belgesi';
  return t;
}
