// Run 3 break run (11/6/2026, R3-7): a host's own spreadsheet — "Name, RSVP,
// Email" — imported 0 of 3 rows on the default (NGW) format, which matched only
// exact snake_case headers; an Excel BOM broke the first header too.
import Papa from 'papaparse';
import { transformRows, validateRows } from '../csvParsers';

const read = (csv, platform = 'ngw') => validateRows(transformRows(Papa.parse(csv, { header: true, skipEmptyLines: true }).data, platform));

test('"Name, RSVP, Email" reads every row', () => {
  const rows = read('Name,RSVP,Email\nAna Rivera,Yes,a@b.c\n"Smith, Jane",Maybe,\n');
  expect(rows.filter((r) => r._valid).map((r) => [r.name, r.rsvp_status])).toEqual([['Ana Rivera', 'Yes'], ['Smith, Jane', 'Maybe']]);
});

test('an Excel BOM and odd header casing/spacing still read', () => {
  const rows = read('﻿guest name , Response ,E-mail\nAna Rivera,no,\n');
  expect(rows[0].name).toBe('Ana Rivera');
  expect(rows[0].rsvp_status).toBe('No');
});

test('First Name + Last Name make the name', () => {
  expect(read('First Name,Last Name\nJane,Smith\n')[0].name).toBe('Jane Smith');
});

test('CONTROL — the native template still reads, and The Knot still maps', () => {
  expect(read('name,rsvp_status\nAna,yes\n')[0].name).toBe('Ana');
  const knot = transformRows(Papa.parse('Guest Name,RSVP\nAna,Attending\n', { header: true }).data, 'theknot');
  expect(knot[0].name || knot[0]._first).toBeTruthy();
});

describe('R3-6 — an exported cell is text, never a formula', () => {
  const { toCSV } = require('../csvParsers');
  const cols = [{ key: 'name', label: 'Vendor' }, { key: 'cost', label: 'Cost' }];
  test.each(["=cmd|' /C calc'!A0", '+SUM(1,2)', '-2+3', '@evil', '\t=1'])('%s is neutralized', (name) => {
    const line = toCSV([{ name, cost: 650 }], cols).split('\n')[1];
    expect(line.replace(/^"/, '')).toMatch(/^'/);
  });
  test('CONTROL — ordinary text and numbers are untouched, negative numbers stay numbers', () => {
    expect(toCSV([{ name: 'Real Caterer', cost: -50 }], cols).split('\n')[1]).toBe('Real Caterer,-50');
  });
});
