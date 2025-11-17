"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAsCentralToUTC = parseAsCentralToUTC;
exports.buildGoogleCentralTimes = buildGoogleCentralTimes;
const luxon_1 = require("luxon");
/**
 * Parse an incoming date-time as **America/Chicago wall-clock** unless it already has a Z/offset.
 * Accepts:
 *  - "YYYY-MM-DD HH:mm:ss.SSS"  (SQL-ish, no timezone)
 *  - ISO with Z/offset (then we respect that absolute instant)
 */
function parseAsCentralToUTC(input) {
    if (input instanceof Date) {
        if (isNaN(input.getTime()))
            throw new Error('Invalid Date instance');
        return input;
    }
    // Numbers are epoch ms
    if (typeof input === 'number') {
        const d = new Date(input);
        if (isNaN(d.getTime()))
            throw new Error('Invalid epoch milliseconds');
        return d;
    }
    const s = String(input).trim();
    // If it ends with Z or has an explicit offset, interpret as an absolute instant.
    if (/T.*([+-]\d{2}:\d{2}|Z)$/.test(s)) {
        const d = new Date(s);
        if (isNaN(d.getTime()))
            throw new Error(`Invalid ISO date-time: ${s}`);
        return d;
    }
    // Otherwise, treat as **Central** wall-clock (DST-aware)
    // Accept "YYYY-MM-DD HH:mm:ss.SSS" or "YYYY-MM-DD HH:mm:ss"
    const dtC = luxon_1.DateTime.fromSQL(s, { zone: 'America/Chicago' }).isValid
        ? luxon_1.DateTime.fromSQL(s, { zone: 'America/Chicago' })
        : luxon_1.DateTime.fromFormat(s, 'yyyy-LL-dd HH:mm:ss.SSS', { zone: 'America/Chicago' });
    if (!dtC.isValid) {
        throw new Error(`Invalid local (Central) date-time: ${s} — ${dtC.invalidExplanation ?? ''}`);
    }
    // Convert to UTC JS Date for DB
    return dtC.toUTC().toJSDate();
}
/** Build Google Calendar start/end payloads that preserve **Central** wall-clock time shown on the calendar. */
function buildGoogleCentralTimes(startLocal, durationMinutes = 60) {
    let dtC;
    if (startLocal instanceof Date || typeof startLocal === 'number') {
        // Treat absolute instants by converting to Central zone (keeps same instant, changes representation)
        dtC = luxon_1.DateTime.fromJSDate(new Date(startLocal)).setZone('America/Chicago');
    }
    else {
        const s = startLocal.trim();
        dtC =
            luxon_1.DateTime.fromSQL(s, { zone: 'America/Chicago' }).isValid
                ? luxon_1.DateTime.fromSQL(s, { zone: 'America/Chicago' })
                : luxon_1.DateTime.fromFormat(s, 'yyyy-LL-dd HH:mm:ss.SSS', { zone: 'America/Chicago' });
    }
    if (!dtC.isValid) {
        throw new Error(`Invalid Central date-time: ${startLocal}`);
    }
    const endC = dtC.plus({ minutes: durationMinutes });
    // IMPORTANT: Provide RFC3339 with offset (not Z) and also pass timeZone.
    return {
        start: { dateTime: dtC.toISO(), timeZone: 'America/Chicago' },
        end: { dateTime: endC.toISO(), timeZone: 'America/Chicago' },
    };
}
