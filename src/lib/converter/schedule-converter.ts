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
  calendar?: CalendarConfig;  // Calendar configuration if DAYSCAL is used
}

/**
 * Calendar configuration for custom scheduling
 */
export interface CalendarConfig {
  name: string;
  type: 'business_days' | 'holidays' | 'custom' | 'weekly_pattern';
  timetableCode?: string;  // Generated Airflow Timetable class code
  excludedDates?: string[];
  includedDates?: string[];
  pattern?: string;  // For weekly patterns like "MON-FRI"
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
  let calendar: CalendarConfig | undefined;
  if (ctmSchedule.DAYSCAL) {
    calendar = parseCalendar(ctmSchedule.DAYSCAL, ctmSchedule);
    if (calendar.timetableCode) {
      notes.push(`DAYSCAL=${ctmSchedule.DAYSCAL} - Timetable class generated (see calendar config)`);
    } else {
      notes.push(`DAYSCAL=${ctmSchedule.DAYSCAL} - calendar config generated (customize as needed)`);
    }
  }
  if (ctmSchedule.CONFCAL) {
    notes.push(`CONFCAL=${ctmSchedule.CONFCAL} - confirmation calendar needs ShortCircuitOperator or BranchOperator`);
  }

  // Handle shift
  if (ctmSchedule.SHIFT) {
    const shiftInfo = parseShift(ctmSchedule.SHIFT, ctmSchedule.SHIFTNUM);
    notes.push(`SHIFT=${ctmSchedule.SHIFT}${ctmSchedule.SHIFTNUM ? ' SHIFTNUM=' + ctmSchedule.SHIFTNUM : ''} - ${shiftInfo}`);
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
    calendar,
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

/**
 * Parse Control-M calendar name and generate Airflow calendar config
 */
function parseCalendar(calendarName: string, schedule: ControlMSchedule): CalendarConfig {
  const name = calendarName.toLowerCase();

  // Detect common calendar types from name
  if (name.includes('business') || name.includes('workday') || name.includes('weekday')) {
    return {
      name: calendarName,
      type: 'business_days',
      pattern: 'MON-FRI',
      timetableCode: generateBusinessDaysTimetable(calendarName, schedule),
    };
  }

  if (name.includes('holiday') || name.includes('exclude')) {
    return {
      name: calendarName,
      type: 'holidays',
      excludedDates: [],  // User should populate these
      timetableCode: generateHolidaysTimetable(calendarName),
    };
  }

  if (name.includes('weekly') || name.includes('mon') || name.includes('fri')) {
    const pattern = detectWeeklyPattern(calendarName);
    return {
      name: calendarName,
      type: 'weekly_pattern',
      pattern,
    };
  }

  // Default to custom calendar
  return {
    name: calendarName,
    type: 'custom',
    timetableCode: generateCustomTimetable(calendarName),
  };
}

/**
 * Detect weekly pattern from calendar name
 */
function detectWeeklyPattern(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('daily')) return 'MON-SUN';
  if (lower.includes('weekday')) return 'MON-FRI';
  if (lower.includes('weekend')) return 'SAT,SUN';
  if (lower.includes('mwf')) return 'MON,WED,FRI';
  if (lower.includes('tth')) return 'TUE,THU';
  return 'MON-FRI';  // Default to business days
}

/**
 * Generate Airflow Timetable class for business days
 */
function generateBusinessDaysTimetable(calendarName: string, schedule: ControlMSchedule): string {
  const className = sanitizeClassName(calendarName);
  const time = schedule.TIME || schedule.TIMEFROM || '0000';
  const hour = time.substring(0, 2);
  const minute = time.substring(2, 4);

  return `
# Calendar Timetable for ${calendarName}
# Add this to your plugins/timetables.py or include in DAG file

from datetime import datetime, timedelta
from typing import Optional
from pendulum import DateTime, Timezone
from airflow.timetables.base import DagRunInfo, DataInterval, TimeRestriction, Timetable

class ${className}Timetable(Timetable):
    """
    Custom timetable for ${calendarName} calendar.
    Runs on business days (Monday-Friday) at ${hour}:${minute}.
    Customize the is_business_day method for holidays.
    """

    def __init__(self, timezone: str = "UTC"):
        self.timezone = Timezone(timezone)
        self.run_time = timedelta(hours=${parseInt(hour)}, minutes=${parseInt(minute)})
        # Add holiday dates here (format: 'YYYY-MM-DD')
        self.holidays = set([
            # '2024-12-25',  # Christmas
            # '2024-01-01',  # New Year
        ])

    def is_business_day(self, dt: DateTime) -> bool:
        """Check if date is a business day (weekday and not a holiday)"""
        if dt.weekday() >= 5:  # Saturday=5, Sunday=6
            return False
        if dt.strftime('%Y-%m-%d') in self.holidays:
            return False
        return True

    def next_business_day(self, dt: DateTime) -> DateTime:
        """Find the next business day from given date"""
        next_day = dt + timedelta(days=1)
        while not self.is_business_day(next_day):
            next_day = next_day + timedelta(days=1)
        return next_day

    def infer_manual_data_interval(self, run_after: DateTime) -> DataInterval:
        start = run_after.in_timezone(self.timezone).start_of('day')
        return DataInterval(start=start, end=start + timedelta(days=1))

    def next_dagrun_info(
        self,
        *,
        last_automated_data_interval: Optional[DataInterval],
        restriction: TimeRestriction,
    ) -> Optional[DagRunInfo]:
        if last_automated_data_interval is None:
            # First run
            start = restriction.earliest
            if start is None:
                return None
            start = start.in_timezone(self.timezone).start_of('day')
        else:
            start = last_automated_data_interval.end

        # Find next business day
        while not self.is_business_day(start):
            start = start + timedelta(days=1)

        end = start + timedelta(days=1)
        run_time = start + self.run_time

        if restriction.latest is not None and run_time > restriction.latest:
            return None

        return DagRunInfo(
            run_after=run_time,
            data_interval=DataInterval(start=start, end=end),
        )

# Usage in DAG:
# from plugins.timetables import ${className}Timetable
#
# with DAG(
#     dag_id='my_dag',
#     timetable=${className}Timetable(timezone='UTC'),
#     ...
# ) as dag:
`.trim();
}

/**
 * Generate Airflow Timetable class for holiday exclusions
 */
function generateHolidaysTimetable(calendarName: string): string {
  const className = sanitizeClassName(calendarName);

  return `
# Holiday-aware Timetable for ${calendarName}
# Add this to your plugins/timetables.py

from datetime import datetime, timedelta
from typing import Optional, Set
from pendulum import DateTime, Timezone
from airflow.timetables.base import DagRunInfo, DataInterval, TimeRestriction, Timetable

class ${className}Timetable(Timetable):
    """
    Timetable that excludes holidays defined in ${calendarName}.
    Configure the holidays set below.
    """

    def __init__(self, timezone: str = "UTC"):
        self.timezone = Timezone(timezone)
        # Configure your holidays here (format: 'YYYY-MM-DD')
        self.holidays: Set[str] = {
            # '2024-01-01',  # New Year's Day
            # '2024-12-25',  # Christmas Day
            # Add more holidays as needed
        }

    def is_excluded(self, dt: DateTime) -> bool:
        """Check if date should be excluded (is a holiday)"""
        return dt.strftime('%Y-%m-%d') in self.holidays

    def infer_manual_data_interval(self, run_after: DateTime) -> DataInterval:
        start = run_after.in_timezone(self.timezone).start_of('day')
        return DataInterval(start=start, end=start + timedelta(days=1))

    def next_dagrun_info(
        self,
        *,
        last_automated_data_interval: Optional[DataInterval],
        restriction: TimeRestriction,
    ) -> Optional[DagRunInfo]:
        if last_automated_data_interval is None:
            start = restriction.earliest
            if start is None:
                return None
            start = start.in_timezone(self.timezone).start_of('day')
        else:
            start = last_automated_data_interval.end

        # Skip excluded dates
        while self.is_excluded(start):
            start = start + timedelta(days=1)

        end = start + timedelta(days=1)

        if restriction.latest is not None and start > restriction.latest:
            return None

        return DagRunInfo(
            run_after=start,
            data_interval=DataInterval(start=start, end=end),
        )
`.trim();
}

/**
 * Generate a custom Airflow Timetable template
 */
function generateCustomTimetable(calendarName: string): string {
  const className = sanitizeClassName(calendarName);

  return `
# Custom Timetable for ${calendarName}
# Add this to your plugins/timetables.py

from datetime import datetime, timedelta
from typing import Optional
from pendulum import DateTime, Timezone
from airflow.timetables.base import DagRunInfo, DataInterval, TimeRestriction, Timetable

class ${className}Timetable(Timetable):
    """
    Custom timetable for ${calendarName} calendar.
    Implement your custom scheduling logic here.
    """

    def __init__(self, timezone: str = "UTC"):
        self.timezone = Timezone(timezone)
        # Add your calendar configuration here
        self.valid_dates: set = set()  # Dates when DAG should run

    def should_run(self, dt: DateTime) -> bool:
        """Implement your custom logic to determine if DAG should run on this date"""
        # Example: Check if date is in valid_dates set
        # return dt.strftime('%Y-%m-%d') in self.valid_dates
        return True  # Default: run every day

    def infer_manual_data_interval(self, run_after: DateTime) -> DataInterval:
        start = run_after.in_timezone(self.timezone).start_of('day')
        return DataInterval(start=start, end=start + timedelta(days=1))

    def next_dagrun_info(
        self,
        *,
        last_automated_data_interval: Optional[DataInterval],
        restriction: TimeRestriction,
    ) -> Optional[DagRunInfo]:
        if last_automated_data_interval is None:
            start = restriction.earliest
            if start is None:
                return None
            start = start.in_timezone(self.timezone).start_of('day')
        else:
            start = last_automated_data_interval.end

        # Find next valid date
        max_iterations = 365  # Prevent infinite loop
        for _ in range(max_iterations):
            if self.should_run(start):
                break
            start = start + timedelta(days=1)
        else:
            return None

        end = start + timedelta(days=1)

        if restriction.latest is not None and start > restriction.latest:
            return None

        return DagRunInfo(
            run_after=start,
            data_interval=DataInterval(start=start, end=end),
        )
`.trim();
}

/**
 * Sanitize calendar name to valid Python class name
 */
function sanitizeClassName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1')
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Parse SHIFT directive and return explanation
 */
function parseShift(shift: string, shiftNum?: string): string {
  const shiftLower = shift.toLowerCase();
  const num = shiftNum ? parseInt(shiftNum, 10) : 1;

  if (shiftLower === 'prevday' || shiftLower.includes('prev')) {
    return `Shift ${num} day(s) earlier - use timedelta in schedule or adjust data_interval`;
  }
  if (shiftLower === 'nextday' || shiftLower.includes('next')) {
    return `Shift ${num} day(s) later - use timedelta in schedule or adjust data_interval`;
  }
  if (shiftLower === 'noshift' || shiftLower === 'none') {
    return 'No shift applied';
  }
  if (shiftLower.includes('bus') || shiftLower.includes('work')) {
    return `Shift to ${num}${getOrdinalSuffix(num)} business day - implement with custom Timetable`;
  }

  return `Custom shift pattern - implement with custom Timetable`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Generate calendar configuration file content
 */
export function generateCalendarConfig(calendars: CalendarConfig[]): string {
  const config = {
    version: '1.0',
    calendars: calendars.map(cal => ({
      name: cal.name,
      type: cal.type,
      pattern: cal.pattern,
      excludedDates: cal.excludedDates || [],
      includedDates: cal.includedDates || [],
    })),
  };

  return `# OFlair Calendar Configuration
# Edit this file to customize calendar definitions

${JSON.stringify(config, null, 2)}

# Instructions:
# 1. Copy the timetable code from each calendar's timetableCode property
# 2. Add to your Airflow plugins/timetables.py
# 3. Configure holidays and special dates
# 4. Use the timetable in your DAG:
#    with DAG(dag_id='my_dag', timetable=MyCalendarTimetable(), ...)
`;
}
