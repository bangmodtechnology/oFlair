import { describe, it, expect } from 'vitest'
import { parseControlMXml } from '@/lib/parser/xml-parser'

describe('XML Parser', () => {
  describe('parseControlMXml', () => {
    it('should parse basic DEFTABLE with FOLDER and JOB', () => {
      const xml = `
        <?xml version="1.0"?>
        <DEFTABLE>
          <FOLDER FOLDER_NAME="TEST_FOLDER" DATACENTER="DC1">
            <JOB JOBNAME="JOB_001" JOB_TYPE="Command" CMDLINE="echo hello">
              <DESCRIPTION>Test job description</DESCRIPTION>
            </JOB>
          </FOLDER>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)

      expect(result.folders).toHaveLength(1)
      expect(result.folders[0].FOLDER_NAME).toBe('TEST_FOLDER')
      expect(result.folders[0].DATACENTER).toBe('DC1')

      expect(result.jobs).toHaveLength(1)
      expect(result.jobs[0].JOBNAME).toBe('JOB_001')
      expect(result.jobs[0].JOB_TYPE).toBe('Command')
      expect(result.jobs[0].CMDLINE).toBe('echo hello')
    })

    it('should parse multiple jobs in folder', () => {
      const xml = `
        <DEFTABLE>
          <FOLDER FOLDER_NAME="BATCH">
            <JOB JOBNAME="JOB_A" JOB_TYPE="Command"/>
            <JOB JOBNAME="JOB_B" JOB_TYPE="Command"/>
            <JOB JOBNAME="JOB_C" JOB_TYPE="Command"/>
          </FOLDER>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)

      expect(result.jobs).toHaveLength(3)
      expect(result.jobs.map(j => j.JOBNAME)).toEqual(['JOB_A', 'JOB_B', 'JOB_C'])
    })

    it('should parse multiple folders', () => {
      const xml = `
        <DEFTABLE>
          <FOLDER FOLDER_NAME="FOLDER_A">
            <JOB JOBNAME="JOB_1"/>
          </FOLDER>
          <FOLDER FOLDER_NAME="FOLDER_B">
            <JOB JOBNAME="JOB_2"/>
          </FOLDER>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)

      expect(result.folders).toHaveLength(2)
      expect(result.folders[0].FOLDER_NAME).toBe('FOLDER_A')
      expect(result.folders[1].FOLDER_NAME).toBe('FOLDER_B')
      expect(result.jobs).toHaveLength(2)
    })

    it('should parse INCOND and OUTCOND', () => {
      const xml = `
        <DEFTABLE>
          <FOLDER FOLDER_NAME="TEST">
            <JOB JOBNAME="JOB_001">
              <INCOND NAME="PREV_JOB-ENDED-OK"/>
              <OUTCOND NAME="JOB_001-ENDED-OK"/>
            </JOB>
          </FOLDER>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)

      expect(result.jobs[0].INCOND).toHaveLength(1)
      expect(result.jobs[0].INCOND![0].NAME).toBe('PREV_JOB-ENDED-OK')
      expect(result.jobs[0].OUTCOND).toHaveLength(1)
      expect(result.jobs[0].OUTCOND![0].NAME).toBe('JOB_001-ENDED-OK')
    })

    it('should parse multiple conditions', () => {
      const xml = `
        <DEFTABLE>
          <FOLDER FOLDER_NAME="TEST">
            <JOB JOBNAME="JOB_001">
              <INCOND NAME="COND_A"/>
              <INCOND NAME="COND_B"/>
              <INCOND NAME="COND_C"/>
            </JOB>
          </FOLDER>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)

      expect(result.jobs[0].INCOND).toHaveLength(3)
    })

    it('should parse VARIABLE tags', () => {
      const xml = `
        <DEFTABLE>
          <FOLDER FOLDER_NAME="TEST">
            <JOB JOBNAME="JOB_001">
              <VARIABLE NAME="ENV" VALUE="production"/>
              <VARIABLE NAME="DEBUG" VALUE="true"/>
            </JOB>
          </FOLDER>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)

      expect(result.jobs[0].VARIABLE).toHaveLength(2)
      expect(result.jobs[0].VARIABLE![0].NAME).toBe('ENV')
      expect(result.jobs[0].VARIABLE![0].VALUE).toBe('production')
    })

    it('should parse job attributes', () => {
      const xml = `
        <DEFTABLE>
          <FOLDER FOLDER_NAME="TEST">
            <JOB
              JOBNAME="COMPLEX_JOB"
              JOB_TYPE="Command"
              APPLICATION="ETL"
              SUB_APPLICATION="Extract"
              CMDLINE="python /scripts/etl.py"
              DESCRIPTION="ETL Job"
              RUN_AS="airflow"
              HOST="server01"
              PRIORITY="50"
              DAYS="ALL"
              TIMEFROM="0800"
            />
          </FOLDER>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)
      const job = result.jobs[0]

      expect(job.JOBNAME).toBe('COMPLEX_JOB')
      expect(job.JOB_TYPE).toBe('Command')
      expect(job.APPLICATION).toBe('ETL')
      expect(job.SUB_APPLICATION).toBe('Extract')
      expect(job.CMDLINE).toBe('python /scripts/etl.py')
      expect(job.RUN_AS).toBe('airflow')
      expect(job.HOST).toBe('server01')
      expect(String(job.PRIORITY)).toBe('50') // XML parser may convert to number
      expect(job.DAYS).toBe('ALL')
      expect(String(job.TIMEFROM)).toBe('800') // XML parser converts to number (leading 0 stripped)
    })

    it('should parse standalone JOB without FOLDER', () => {
      const xml = `
        <DEFTABLE>
          <JOB JOBNAME="STANDALONE_JOB" JOB_TYPE="Command"/>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)

      expect(result.jobs).toHaveLength(1)
      expect(result.jobs[0].JOBNAME).toBe('STANDALONE_JOB')
    })

    it('should handle SMART_FOLDER structure', () => {
      const xml = `
        <DEFTABLE>
          <SMART_FOLDER FOLDER_NAME="SMART_TEST">
            <JOB JOBNAME="SMART_JOB"/>
          </SMART_FOLDER>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)

      expect(result.folders).toHaveLength(1)
      expect(result.folders[0].FOLDER_NAME).toBe('SMART_TEST')
      expect(result.jobs).toHaveLength(1)
    })

    it('should set metadata source to xml', () => {
      const xml = '<DEFTABLE><JOB JOBNAME="TEST"/></DEFTABLE>'
      const result = parseControlMXml(xml)

      expect(result.metadata?.source).toBe('xml')
    })

    it('should default JOB_TYPE to Command if not specified', () => {
      const xml = '<DEFTABLE><JOB JOBNAME="TEST"/></DEFTABLE>'
      const result = parseControlMXml(xml)

      expect(result.jobs[0].JOB_TYPE).toBe('Command')
    })

    it('should handle alternative attribute names', () => {
      const xml = `
        <DEFTABLE>
          <FOLDER NAME="ALT_FOLDER">
            <JOB NAME="ALT_JOB" TASKTYPE="FileWatcher" OWNER="admin" NODEID="node1"/>
          </FOLDER>
        </DEFTABLE>
      `
      const result = parseControlMXml(xml)

      expect(result.folders[0].FOLDER_NAME).toBe('ALT_FOLDER')
      expect(result.jobs[0].JOBNAME).toBe('ALT_JOB')
      expect(result.jobs[0].JOB_TYPE).toBe('FileWatcher')
      expect(result.jobs[0].RUN_AS).toBe('admin')
      expect(result.jobs[0].HOST).toBe('node1')
    })
  })
})
