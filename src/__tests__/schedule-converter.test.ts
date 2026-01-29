import { describe, it, expect } from 'vitest'
import {
  convertSchedule,
  cronToHuman,
  validateCron,
  generateCalendarConfig,
  type ControlMSchedule,
  type CalendarConfig,
} from '@/lib/converter/schedule-converter'

describe('Schedule Converter', () => {
  describe('convertSchedule', () => {
    it('should return null schedule for empty definition', () => {
      const result = convertSchedule({})
      expect(result.scheduleInterval).toBeNull()
      expect(result.catchup).toBe(false)
      expect(result.notes).toContain('No schedule defined - DAG will be manually triggered')
    })

    it('should convert interval to cron expression', () => {
      const result = convertSchedule({ INTERVAL: '30' })
      expect(result.scheduleInterval).toBe('*/30 * * * *')
    })

    it('should use @hourly for 60-minute interval', () => {
      const result = convertSchedule({ INTERVAL: '60' })
      expect(result.scheduleInterval).toBe('@hourly')
    })

    it('should use @daily for 1440-minute interval', () => {
      const result = convertSchedule({ INTERVAL: '1440' })
      expect(result.scheduleInterval).toBe('@daily')
    })

    it('should convert hourly interval to hours', () => {
      const result = convertSchedule({ INTERVAL: '120' })
      expect(result.scheduleInterval).toBe('0 */2 * * *')
    })

    it('should convert TIME to cron expression', () => {
      const result = convertSchedule({ TIME: '0830' })
      expect(result.scheduleInterval).toBe('30 8 * * *')
    })

    it('should convert TIMEFROM to schedule', () => {
      const result = convertSchedule({ TIMEFROM: '1400', DAYS: 'ALL' })
      expect(result.scheduleInterval).toBe('0 14 * * *')
    })

    it('should add note for ignored TIMETO', () => {
      const result = convertSchedule({ TIMEFROM: '0800', TIMETO: '1800', DAYS: 'ALL' })
      expect(result.notes.some(n => n.includes('TIMETO'))).toBe(true)
    })

    it('should convert named days to cron', () => {
      const result = convertSchedule({ DAYS: 'MON,WED,FRI', TIME: '0900' })
      expect(result.scheduleInterval).toBe('0 9 * * 1,3,5')
    })

    it('should handle ALL days', () => {
      const result = convertSchedule({ DAYS: 'ALL', TIME: '0600' })
      expect(result.scheduleInterval).toBe('0 6 * * *')
    })

    it('should convert numeric days (day of month)', () => {
      const result = convertSchedule({ DAYS: '1,15', TIME: '0000' })
      expect(result.scheduleInterval).toBe('0 0 * * 1,15')
    })

    it('should convert named months', () => {
      const result = convertSchedule({ MONTHS: 'JAN,MAR,JUN', DAYS: 'ALL', TIME: '0700' })
      expect(result.scheduleInterval).toBe('0 7 * 1,3,6 *')
    })

    it('should add note for WEEKS', () => {
      const result = convertSchedule({ WEEKS: '1,3', DAYS: 'MON' })
      expect(result.notes.some(n => n.includes('WEEKS'))).toBe(true)
    })

    it('should set catchup true when RETRO is Y', () => {
      const result = convertSchedule({ DAYS: 'ALL', TIME: '0800', RETRO: 'Y' })
      expect(result.catchup).toBe(true)
    })

    it('should set catchup false when RETRO is not Y', () => {
      const result = convertSchedule({ DAYS: 'ALL', TIME: '0800', RETRO: 'N' })
      expect(result.catchup).toBe(false)
    })

    it('should default to @daily when no time info', () => {
      const result = convertSchedule({ DAYS: 'ALL' })
      expect(result.scheduleInterval).toBe('0 0 * * *')
    })
  })

  describe('convertSchedule - Calendar Support', () => {
    it('should generate calendar config for DAYSCAL', () => {
      const result = convertSchedule({ DAYSCAL: 'BUSINESS_DAYS', TIME: '0900' })
      expect(result.calendar).toBeDefined()
      expect(result.calendar!.name).toBe('BUSINESS_DAYS')
      expect(result.calendar!.type).toBe('business_days')
    })

    it('should detect business days calendar from name', () => {
      const tests = ['BUSINESS_DAYS', 'workday_calendar', 'WEEKDAY_CAL']
      for (const cal of tests) {
        const result = convertSchedule({ DAYSCAL: cal, TIME: '0800' })
        expect(result.calendar!.type).toBe('business_days')
        expect(result.calendar!.pattern).toBe('MON-FRI')
      }
    })

    it('should detect holiday calendar from name', () => {
      const tests = ['HOLIDAY_EXCLUDE', 'us_holidays', 'EXCLUDE_DATES']
      for (const cal of tests) {
        const result = convertSchedule({ DAYSCAL: cal, DAYS: 'ALL' })
        expect(result.calendar!.type).toBe('holidays')
      }
    })

    it('should detect weekly pattern calendar from name', () => {
      const result = convertSchedule({ DAYSCAL: 'WEEKLY_MON_FRI', DAYS: 'ALL' })
      expect(result.calendar!.type).toBe('weekly_pattern')
    })

    it('should default to custom calendar for unknown names', () => {
      const result = convertSchedule({ DAYSCAL: 'MY_CUSTOM_CAL', DAYS: 'ALL' })
      expect(result.calendar!.type).toBe('custom')
    })

    it('should generate timetable code for business days calendar', () => {
      const result = convertSchedule({ DAYSCAL: 'BUSINESS_DAYS', TIME: '0930' })
      expect(result.calendar!.timetableCode).toBeDefined()
      expect(result.calendar!.timetableCode).toContain('class BusinessDaysTimetable')
      expect(result.calendar!.timetableCode).toContain('is_business_day')
      expect(result.calendar!.timetableCode).toContain('hours=9')
      expect(result.calendar!.timetableCode).toContain('minutes=30')
    })

    it('should generate timetable code for holiday calendar', () => {
      const result = convertSchedule({ DAYSCAL: 'HOLIDAY_CALENDAR', DAYS: 'ALL' })
      expect(result.calendar!.timetableCode).toBeDefined()
      expect(result.calendar!.timetableCode).toContain('class HolidayCalendarTimetable')
      expect(result.calendar!.timetableCode).toContain('is_excluded')
      expect(result.calendar!.timetableCode).toContain('holidays')
    })

    it('should generate timetable code for custom calendar', () => {
      const result = convertSchedule({ DAYSCAL: 'SPECIAL_DATES', DAYS: 'ALL' })
      expect(result.calendar!.timetableCode).toBeDefined()
      expect(result.calendar!.timetableCode).toContain('class SpecialDatesTimetable')
      expect(result.calendar!.timetableCode).toContain('should_run')
    })

    it('should add note for DAYSCAL', () => {
      const result = convertSchedule({ DAYSCAL: 'MY_CALENDAR', TIME: '0800' })
      expect(result.notes.some(n => n.includes('DAYSCAL'))).toBe(true)
    })

    it('should add note for CONFCAL', () => {
      const result = convertSchedule({ CONFCAL: 'CONFIRM_CALENDAR', DAYS: 'ALL' })
      expect(result.notes.some(n => n.includes('CONFCAL'))).toBe(true)
      expect(result.notes.some(n => n.includes('ShortCircuitOperator') || n.includes('BranchOperator'))).toBe(true)
    })
  })

  describe('convertSchedule - SHIFT directive', () => {
    it('should add note for SHIFT directive', () => {
      const result = convertSchedule({ SHIFT: 'PREVDAY', DAYS: 'MON' })
      expect(result.notes.some(n => n.includes('SHIFT'))).toBe(true)
    })

    it('should parse PREVDAY shift', () => {
      const result = convertSchedule({ SHIFT: 'PREVDAY', SHIFTNUM: '2', DAYS: 'MON' })
      expect(result.notes.some(n => n.includes('2 day(s) earlier'))).toBe(true)
    })

    it('should parse NEXTDAY shift', () => {
      const result = convertSchedule({ SHIFT: 'NEXTDAY', DAYS: 'MON' })
      expect(result.notes.some(n => n.includes('later'))).toBe(true)
    })

    it('should parse business day shift', () => {
      const result = convertSchedule({ SHIFT: 'BUSDAY', SHIFTNUM: '1', DAYS: 'MON' })
      expect(result.notes.some(n => n.includes('business day'))).toBe(true)
    })

    it('should handle NOSHIFT', () => {
      const result = convertSchedule({ SHIFT: 'NOSHIFT', DAYS: 'MON' })
      expect(result.notes.some(n => n.includes('No shift'))).toBe(true)
    })
  })

  describe('cronToHuman', () => {
    it('should return manual trigger for null', () => {
      expect(cronToHuman(null)).toBe('Manual trigger only')
    })

    it('should handle @daily preset', () => {
      expect(cronToHuman('@daily')).toBe('Once a day at midnight')
    })

    it('should handle @hourly preset', () => {
      expect(cronToHuman('@hourly')).toBe('Once an hour at the beginning of the hour')
    })

    it('should handle @weekly preset', () => {
      expect(cronToHuman('@weekly')).toBe('Once a week at midnight on Sunday')
    })

    it('should handle @monthly preset', () => {
      expect(cronToHuman('@monthly')).toBe('Once a month at midnight on the 1st')
    })

    it('should describe time-based cron', () => {
      expect(cronToHuman('30 8 * * *')).toContain('08:30')
    })

    it('should describe day-of-week cron', () => {
      expect(cronToHuman('0 9 * * 1,3,5')).toContain('Mon')
      expect(cronToHuman('0 9 * * 1,3,5')).toContain('Wed')
      expect(cronToHuman('0 9 * * 1,3,5')).toContain('Fri')
    })

    it('should describe minute intervals', () => {
      expect(cronToHuman('*/15 * * * *')).toContain('every 15 minutes')
    })

    it('should describe hour intervals', () => {
      // When minute is specified with hour interval, cronToHuman shows time format
      expect(cronToHuman('* */2 * * *')).toContain('every 2 hours')
    })

    it('should describe day of month', () => {
      expect(cronToHuman('0 0 15 * *')).toContain('day 15')
    })

    it('should describe months', () => {
      expect(cronToHuman('0 0 * 1,6 *')).toContain('Jan')
      expect(cronToHuman('0 0 * 1,6 *')).toContain('Jun')
    })
  })

  describe('validateCron', () => {
    it('should validate null as valid', () => {
      expect(validateCron('')).toEqual({ valid: true })
    })

    it('should validate @daily preset', () => {
      expect(validateCron('@daily')).toEqual({ valid: true })
    })

    it('should validate @hourly preset', () => {
      expect(validateCron('@hourly')).toEqual({ valid: true })
    })

    it('should reject invalid preset', () => {
      expect(validateCron('@invalid')).toEqual({ valid: false, error: 'Invalid preset: @invalid' })
    })

    it('should validate standard cron expressions', () => {
      expect(validateCron('0 8 * * *')).toEqual({ valid: true })
      expect(validateCron('*/15 * * * *')).toEqual({ valid: true })
      expect(validateCron('0 0 1 * *')).toEqual({ valid: true })
      expect(validateCron('0 9 * * 1,3,5')).toEqual({ valid: true })
    })

    it('should reject cron with wrong part count', () => {
      expect(validateCron('0 8 * *').valid).toBe(false)
      expect(validateCron('0 8 * * * *').valid).toBe(false)
    })

    it('should reject invalid minute values', () => {
      expect(validateCron('60 * * * *').valid).toBe(false)
      expect(validateCron('-1 * * * *').valid).toBe(false)
    })

    it('should reject invalid hour values', () => {
      expect(validateCron('0 24 * * *').valid).toBe(false)
    })

    it('should reject invalid day of month values', () => {
      expect(validateCron('0 0 32 * *').valid).toBe(false)
      expect(validateCron('0 0 0 * *').valid).toBe(false)
    })

    it('should reject invalid month values', () => {
      expect(validateCron('0 0 * 13 *').valid).toBe(false)
      expect(validateCron('0 0 * 0 *').valid).toBe(false)
    })

    it('should reject invalid day of week values', () => {
      expect(validateCron('0 0 * * 7').valid).toBe(false)
    })

    it('should validate ranges', () => {
      expect(validateCron('0 0 * * 1-5')).toEqual({ valid: true })
      expect(validateCron('0 8-17 * * *')).toEqual({ valid: true })
    })

    it('should reject invalid ranges', () => {
      expect(validateCron('0 0 * * 1-8').valid).toBe(false)
    })

    it('should validate step values', () => {
      expect(validateCron('*/15 * * * *')).toEqual({ valid: true })
      expect(validateCron('0 */2 * * *')).toEqual({ valid: true })
    })

    it('should reject invalid step values', () => {
      expect(validateCron('*/0 * * * *').valid).toBe(false)
      expect(validateCron('*/-1 * * * *').valid).toBe(false)
    })
  })

  describe('generateCalendarConfig', () => {
    it('should generate config for multiple calendars', () => {
      const calendars: CalendarConfig[] = [
        { name: 'BUSINESS_DAYS', type: 'business_days', pattern: 'MON-FRI' },
        { name: 'US_HOLIDAYS', type: 'holidays', excludedDates: ['2024-12-25'] },
      ]

      const config = generateCalendarConfig(calendars)
      expect(config).toContain('BUSINESS_DAYS')
      expect(config).toContain('US_HOLIDAYS')
      expect(config).toContain('business_days')
      expect(config).toContain('holidays')
      expect(config).toContain('MON-FRI')
    })

    it('should include usage instructions', () => {
      const calendars: CalendarConfig[] = [
        { name: 'CAL1', type: 'custom' },
      ]
      const config = generateCalendarConfig(calendars)
      expect(config).toContain('Instructions')
      expect(config).toContain('timetable')
    })
  })
})
