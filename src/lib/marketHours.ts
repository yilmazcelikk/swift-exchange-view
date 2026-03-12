/**
 * Market hours based on TradingView session data
 * All times in UTC
 */

interface MarketSchedule {
  /** Days market is open: 0=Sun, 1=Mon, ..., 6=Sat */
  days: number[];
  /** Open time in UTC "HH:MM" */
  open: string;
  /** Close time in UTC "HH:MM" */
  close: string;
  /** Optional daily break */
  break?: { start: string; end: string };
  /** Label for display */
  label: string;
}

// TradingView-based market schedules
const SCHEDULES: Record<string, MarketSchedule> = {
  // Forex: Sunday 22:00 UTC → Friday 22:00 UTC (effectively 24/5)
  forex: {
    days: [0, 1, 2, 3, 4, 5],
    open: "22:00", // Sunday open
    close: "22:00", // Friday close
    label: "Pzt-Cum 00:00 - 00:00",
  },

  // Crypto: 7/24
  crypto: {
    days: [0, 1, 2, 3, 4, 5, 6],
    open: "00:00",
    close: "23:59",
    label: "7/24 Açık",
  },

  // BIST: Mon-Fri 07:00-15:00 UTC (10:00-18:00 Istanbul)
  bist: {
    days: [1, 2, 3, 4, 5],
    open: "07:00",
    close: "15:00",
    label: "Pzt-Cum 10:00 - 18:00",
  },

  // US Stocks (NYSE/NASDAQ): Mon-Fri 14:30-21:00 UTC
  us_stock: {
    days: [1, 2, 3, 4, 5],
    open: "14:30",
    close: "21:00",
    label: "Pzt-Cum 17:30 - 00:00",
  },

  // Gold/Silver/Platinum: Sun 23:00 - Fri 22:00, daily break 22:00-23:00 UTC
  precious_metals: {
    days: [0, 1, 2, 3, 4, 5],
    open: "23:00",
    close: "22:00",
    break: { start: "22:00", end: "23:00" },
    label: "Pzt-Cum 01:00 - 00:00",
  },

  // Oil (CL/BRN): Sun 23:00 - Fri 22:00 UTC
  energy: {
    days: [0, 1, 2, 3, 4, 5],
    open: "23:00",
    close: "22:00",
    label: "Pzt-Cum 01:00 - 00:00",
  },

  // Agricultural: Mon-Fri with specific hours (CBOT hours)
  agriculture: {
    days: [1, 2, 3, 4, 5],
    open: "01:00",
    close: "19:20",
    label: "Pzt-Cum 04:00 - 22:20",
  },

  // US Indices (SPX, DJI, NDX): Effectively follows futures, Sun 23:00 - Fri 22:00
  us_index: {
    days: [0, 1, 2, 3, 4, 5],
    open: "23:00",
    close: "22:00",
    label: "Pzt-Cum 01:00 - 00:00",
  },

  // European Indices (DAX, CAC, FTSE): Mon-Fri 07:00-21:00 UTC
  eu_index: {
    days: [1, 2, 3, 4, 5],
    open: "07:00",
    close: "21:00",
    label: "Pzt-Cum 10:00 - 00:00",
  },

  // Asian Indices (Nikkei, HSI): Mon-Fri 00:00-06:30 UTC
  asia_index: {
    days: [1, 2, 3, 4, 5],
    open: "00:00",
    close: "06:30",
    label: "Pzt-Cum 03:00 - 09:30",
  },
};

// Map symbol names to their schedule
function getScheduleKey(symbolName: string, category: string, exchange?: string | null): string {
  const name = symbolName.toUpperCase();

  // Crypto - always open
  if (category === "crypto") return "crypto";

  // Stocks - detect by exchange field
  if (category === "stock") {
    if (exchange === "BIST") return "bist";
    return "us_stock";
  }

  // Commodities
  if (category === "commodity") {
    if (["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"].includes(name)) return "precious_metals";
    if (["USOIL", "UKOIL", "NATGAS"].includes(name)) return "energy";
    if (["COPPER"].includes(name)) return "energy";
    return "agriculture";
  }

  // Indices
  if (category === "index") {
    if (["US500", "US30", "US100", "RUSSEL", "VIX", "DXY"].includes(name)) return "us_index";
    if (["DE40", "UK100", "FR40", "ES40", "IT40", "SP35", "XU100"].includes(name)) return "eu_index";
    if (["JP225", "HK50", "AU200", "CN50", "IN50"].includes(name)) return "asia_index";
    return "us_index";
  }

  // Forex
  return "forex";
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

function timeToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export interface MarketStatus {
  isOpen: boolean;
  label: string;
  scheduleLabel: string;
}

export function getMarketStatus(symbolName: string, category: string, exchange?: string | null): MarketStatus {
  const key = getScheduleKey(symbolName, category, exchange);
  const schedule = SCHEDULES[key];

  if (!schedule) {
    return { isOpen: true, label: "Açık", scheduleLabel: "—" };
  }

  // Crypto is always open
  if (key === "crypto") {
    return { isOpen: true, label: "Açık", scheduleLabel: schedule.label };
  }

  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const currentMinutes = timeToMinutes(utcHours, utcMinutes);

  const openTime = parseTime(schedule.open);
  const closeTime = parseTime(schedule.close);
  const openMinutes = timeToMinutes(openTime.hours, openTime.minutes);
  const closeMinutes = timeToMinutes(closeTime.hours, closeTime.minutes);

  // Check if today is a trading day
  const isDayOpen = schedule.days.includes(utcDay);

  // For forex-like schedules (open Sun 22:00, close Fri 22:00)
  if (key === "forex" || key === "precious_metals" || key === "energy" || key === "us_index") {
    // Closed: Saturday all day, and Friday after 22:00, and Sunday before 22:00
    if (utcDay === 6) {
      return { isOpen: false, label: "Kapalı", scheduleLabel: schedule.label };
    }
    if (utcDay === 5 && currentMinutes >= closeMinutes) {
      return { isOpen: false, label: "Kapalı", scheduleLabel: schedule.label };
    }
    if (utcDay === 0 && currentMinutes < openMinutes) {
      return { isOpen: false, label: "Kapalı", scheduleLabel: schedule.label };
    }

    // Check daily break for precious metals
    if (schedule.break) {
      const breakStart = timeToMinutes(parseTime(schedule.break.start).hours, parseTime(schedule.break.start).minutes);
      const breakEnd = timeToMinutes(parseTime(schedule.break.end).hours, parseTime(schedule.break.end).minutes);
      if (currentMinutes >= breakStart && currentMinutes < breakEnd) {
        return { isOpen: false, label: "Mola", scheduleLabel: schedule.label };
      }
    }

    return { isOpen: true, label: "Açık", scheduleLabel: schedule.label };
  }

  // Standard schedule (open and close same day)
  if (!isDayOpen) {
    return { isOpen: false, label: "Kapalı", scheduleLabel: schedule.label };
  }

  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    return { isOpen: true, label: "Açık", scheduleLabel: schedule.label };
  }

  return { isOpen: false, label: "Kapalı", scheduleLabel: schedule.label };
}
