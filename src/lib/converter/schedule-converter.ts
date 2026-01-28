/**
 * Schedule Converter - Convert Control-M scheduling to Airflow schedules
 * Handles DAYS, TIME, TIMEFROM/TIMETO, MONTHS, etc.
 */

export interface ControlMSchedule {
  DAYS?: string;           // e.g., "ALL", "1,15", "MON,WED,FRI"
  DAYSCAL?: string;        // Calendar name
  MONTHS?: string;         // e.g., "ALL", "1-6", "JAN,MAR,JUN"
  TIMEFROM?: string;       // Start time e.g., "0800"
  TIMETO?: string;         // End time e.g., "1800"
  TIME?: string;           // Specific time
  INTERVAL?: string;       // Interval in minutes
  CONFCAL?: string;        // Confirmation calendar
  SHIFT?: string;          // Day shift
  SHIFTNUM?: string;       // Shift amount
  RETRO?: string;          // Retroactive
  MAXWAIT?: string;        // Maximum wait time
  WEEKS?: string;          // e.g., "1,3" for 1st and 3rd week
  WEEKSCAL?: string;       // Weeks calendar
}

export interface AirflowSchedule {
  scheduleInterval: string | null;  // Cron expression or preset
  startDate?: string;
  endDate?: string;
  catchup: boolean;
  timezone?: string;
  notes: string[];          // Conversion notes/warnings
}

/**
 * Convert Control-M schedule to Airflow schedule
 */
export function convertSchedule(ctmSchedule: ControlMSchedule): AirflowSchedule {
  const notes: string[] = [];
  let scheduleInterval: string | null = null;

  // If no scheduling info, return None (manual trigger)
  if (!ctmSchedule.DAYS && !ctmSchedule.TIME && !ctmSchedule.INTERVAL) {
    return {
      scheduleInterval: null,
      catchup: false,
      notes: ["No schedule defined - DAG will be manually triggered"],
    };
  }

  // Handle interval-based scheduling
  if (ctmSchedule.INTERVAL) {
    const intervalMinutes = parseInt(ctmSchedule.INTERVAL, 10);
    if (!isNaN(intervalMinutes)) {
      if (intervalMinutes === 60) {
        scheduleInterval = "@hourly";
      } else if (intervalMinutes === 1440) {
        scheduleInterval = "@daily";
      } else if (intervalMinutes % 60 === 0) {
        scheduleInterval = `0 */${intervalMinutes / 60} * * *`;
      } else {
        scheduleInterval = `*/${intervalMinutes} * * * *`;
      }
      notes.push(`Converted from INTERVAL=${ctmSchedule.INTERVAL} minutes`);
    }
  }

  // Handle time-based scheduling
  if (ctmSchedule.TIME && !scheduleInterval) {
    const hour = ctmSchedule.TIME.substring(0, 2);
    const minute = ctmSchedule.TIME.substring(2, 4);
    scheduleInterval = `${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`;
    notes.push(`Converted from TIME=${ctmSchedule.TIME}`);
  }

  // Handle TIMEFROM (use as start time for daily schedule)
  if (ctmSchedule.TIMEFROM && !scheduleInterval) {
    const hour = ctmSchedule.TIMEFROM.substring(0, 2);
    const minute = ctmSchedule.TIMEFROM.substring(2, 4);
    scheduleInterval = `${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`;
    notes.push(`Using TIMEFROM=${ctmSchedule.TIMEFROM} as schedule time`);

    if (ctmSchedule.TIMETO) {
      notes.push(`TIMETO=${ctmSchedule.TIMETO} ignored - Airflow doesn't have time windows`);
    }
  }

  // Handle DAYS
  if (ctmSchedule.DAYS) {
    const daysPart = convertDays(ctmSchedule.DAYS);
    if (scheduleInterval && daysPart !== "*") {
      // Replace day-of-week part in cron
      const parts = scheduleInterval.split(" ");
      if (parts.length === 5) {
        parts[4] = daysPart;
        scheduleInterval = parts.join(" ");
      }
    } else if (!scheduleInterval) {
      // Default to midnight on specified days
      scheduleInterval = `0 0 * * ${daysPart}`;
    }
    notes.push(`Days: ${ctmSchedule.DAYS} → ${daysPart}`);
  }

  // Handle MONTHS
  if (ctmSchedule.MONTHS && ctmSchedule.MONTHS !== "ALL") {
    const monthsPart = convertMonths(ctmSchedule.MONTHS);
    if (scheduleInterval) {
      const parts = scheduleInterval.split(" ");
      if (parts.length === 5) {
        parts[3] = monthsPart;
        scheduleInterval = parts.join(" ");
      }
    }
    notes.push(`Months: ${ctmSchedule.MONTHS} → ${monthsPart}`);
  }

  // Handle WEEKS
  if (ctmSchedule.WEEKS) {
    notes.push(`WEEKS=${ctmSchedule.WEEKS} - requires manual review (complex week patterns)`);
  }

  // Handle calendars
  if (ctmSchedule.DAYSCAL) {
    notes.push(`DAYSCAL=${ctmSchedule.DAYSCAL} - calendar logic needs manual implementation`);
  }
  if (ctmSchedule.CONFCAL) {
    notes.push(`CONFCAL=${ctmSchedule.CONFCAL} - confirmation calendar needs manual review`);
  }

  // Handle shift
  if (ctmSchedule.SHIFT) {
    notes.push(`SHIFT=${ctmSchedule.SHIFT} - day shifting needs manual implementation`);
  }

  // Default to daily if still no schedule
  if (!scheduleInterval) {
    scheduleInterval = "@daily";
    notes.push("Defaulted to daily schedule");
  }

  return {
    scheduleInterval,
    catchup: ctmSchedule.RETRO === "Y",
    notes,
  };
}

/**
 * Convert Control-M DAYS to cron day-of-week
 */
function convertDays(days: string): string {
  if (!days || days === "ALL") return "*";

  const dayMap: Record<string, string> = {
    SUN: "0",
    MON: "1",
    TUE: "2",
    WED: "3",
    THU: "4",
    FRI: "5",
    SAT: "6",
  };

  // Check for day names
  const dayNames = days.split(",").map((d) => d.trim().toUpperCase());
  if (dayNames.every((d) => dayMap[d])) {
    return dayNames.map((d) => dayMap[d]).join(",");
  }

  // Check for numeric days (1-31 for day of month)
  if (/^[\d,\-]+$/.test(days)) {
    // This is day of month, not day of week
    // Return as-is for day-of-month position
    return days;
  }

  return "*";
}

/**
 * Convert Control-M MONTHS to cron month
 */
function convertMonths(months: string): string {
  if (!months || months === "ALL") return "*";

  const monthMap: Record<string, string> = {
    JAN: "1",
    FEB: "2",
    MAR: "3",
    APR: "4",
    MAY: "5",
    JUN: "6",
    JUL: "7",
    AUG: "8",
    SEP: "9",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };

  const monthNames = months.split(",").map((m) => m.trim().toUpperCase());
  if (monthNames.every((m) => monthMap[m])) {
    return monthNames.map((m) => monthMap[m]).join(",");
  }

  // Already numeric
  if (/^[\d,\-]+$/.test(months)) {
    return months;
  }

  return "*";
}

/**
 * Parse cron expression to human-readable format
 */
export function cronToHuman(cron: string | null): string {
  if (!cron) return "Manual trigger only";

  // Handle presets
  const presets: Record<string, string> = {
    "@yearly": "Once a year at midnight on January 1st",
    "@annually": "Once a year at midnight on January 1st",
    "@monthly": "Once a month at midnight on the 1st",
    "@weekly": "Once a week at midnight on Sunday",
    "@daily": "Once a day at midnight",
    "@midnight": "Once a day at midnight",
    "@hourly": "Once an hour at the beginning of the hour",
  };

  if (presets[cron]) return presets[cron];

  // Parse cron expression
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const descriptions: string[] = [];

  // Time
  if (minute !== "*" && hour !== "*") {
    descriptions.push(`at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`);
  } else if (minute.startsWith("*/")) {
    descriptions.push(`every ${minute.substring(2)} minutes`);
  } else if (hour.startsWith("*/")) {
    descriptions.push(`every ${hour.substring(2)} hours`);
  }

  // Day of week
  if (dayOfWeek !== "*") {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = dayOfWeek.split(",").map((d) => dayNames[parseInt(d)] || d);
    descriptions.push(`on ${days.join(", ")}`);
  }

  // Day of month
  if (dayOfMonth !== "*") {
    descriptions.push(`on day ${dayOfMonth}`);
  }

  // Month
  if (month !== "*") {
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const months = month.split(",").map((m) => monthNames[parseInt(m)] || m);
    descriptions.push(`in ${months.join(", ")}`);
  }

  return descriptions.join(" ") || "Custom schedule";
}

/**
 * Validate cron expression
 */
export function validateCron(cron: string): { valid: boolean; error?: string } {
  if (!cron) return { valid: true };

  // Check presets
  if (cron.startsWith("@")) {
    const validPresets = ["@yearly", "@annually", "@monthly", "@weekly", "@daily", "@midnight", "@hourly"];
    if (validPresets.includes(cron)) {
      return { valid: true };
    }
    return { valid: false, error: `Invalid preset: ${cron}` };
  }

  // Check 5-part cron
  const parts = cron.split(" ");
  if (parts.length !== 5) {
    return { valid: false, error: `Expected 5 parts, got ${parts.length}` };
  }

  // Basic validation for each part
  const ranges = [
    { name: "minute", min: 0, max: 59 },
    { name: "hour", min: 0, max: 23 },
    { name: "day of month", min: 1, max: 31 },
    { name: "month", min: 1, max: 12 },
    { name: "day of week", min: 0, max: 6 },
  ];

  for (let i = 0; i < 5; i++) {
    const part = parts[i];
    const { name, min, max } = ranges[i];

    if (part === "*") continue;
    if (part.startsWith("*/")) {
      const step = parseInt(part.substring(2));
      if (isNaN(step) || step <= 0) {
        return { valid: false, error: `Invalid step in ${name}: ${part}` };
      }
      continue;
    }

    // Check ranges and lists
    const values = part.split(",");
    for (const val of values) {
      if (val.includes("-")) {
        const [start, end] = val.split("-").map((v) => parseInt(v));
        if (isNaN(start) || isNaN(end) || start < min || end > max) {
          return { valid: false, error: `Invalid range in ${name}: ${val}` };
        }
      } else {
        const num = parseInt(val);
        if (isNaN(num) || num < min || num > max) {
          return { valid: false, error: `Invalid value in ${name}: ${val}` };
        }
      }
    }
  }

  return { valid: true };
}
