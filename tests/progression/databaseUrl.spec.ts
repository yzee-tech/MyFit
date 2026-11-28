import { test, expect } from '@playwright/test';
import { withConnectTimeout } from '../../src/lib/server/databaseUrl';

/**
 * The database is asked to connect for up to 8 seconds (Prisma's own default is 5): a sleeping database on the free
 * plan needs a few seconds to wake. A connection string that already says how long to wait is left alone
 */

test('adds the connect timeout to a connection string that has no parameters', () => {
	expect(withConnectTimeout('postgresql://user:pw@host/db')).toBe('postgresql://user:pw@host/db?connect_timeout=8');
});

test('adds it after the parameters already there', () => {
	expect(withConnectTimeout('postgresql://user:pw@host-pooler/db?sslmode=require')).toBe(
		'postgresql://user:pw@host-pooler/db?sslmode=require&connect_timeout=8'
	);
	expect(withConnectTimeout('postgresql://u:p@h/db?sslmode=require&pgbouncer=true')).toBe(
		'postgresql://u:p@h/db?sslmode=require&pgbouncer=true&connect_timeout=8'
	);
});

test('a string ending in ? or & gets no doubled separator', () => {
	expect(withConnectTimeout('postgresql://u:p@h/db?')).toBe('postgresql://u:p@h/db?connect_timeout=8');
	expect(withConnectTimeout('postgresql://u:p@h/db?sslmode=require&')).toBe(
		'postgresql://u:p@h/db?sslmode=require&connect_timeout=8'
	);
});

test('a connect timeout already in the string is kept, whatever its capitals or place', () => {
	const own = 'postgresql://u:p@h/db?connect_timeout=20';
	expect(withConnectTimeout(own)).toBe(own);
	const later = 'postgresql://u:p@h/db?sslmode=require&connect_timeout=3';
	expect(withConnectTimeout(later)).toBe(later);
	const capitals = 'postgresql://u:p@h/db?Connect_Timeout=15';
	expect(withConnectTimeout(capitals)).toBe(capitals);
});

test('the string is not rewritten: special characters in the password stay exactly as they are', () => {
	const url = 'postgresql://user:p%40ss%2Fw0rd%3F@host/db';
	expect(withConnectTimeout(url)).toBe(`${url}?connect_timeout=8`);
});

test('no connection string (unset, empty, blank) gives undefined and never throws', () => {
	expect(withConnectTimeout(undefined)).toBeUndefined();
	expect(withConnectTimeout('')).toBeUndefined();
	expect(withConnectTimeout('   ')).toBeUndefined();
});

test('another number of seconds can be asked for', () => {
	expect(withConnectTimeout('postgresql://u:p@h/db', 12)).toBe('postgresql://u:p@h/db?connect_timeout=12');
});
