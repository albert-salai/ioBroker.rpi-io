'use strict';
/**
 * Checks requirement traceability (convention: skill specifying-requirements).
 *
 * A requirement is defined by a bold line ``**`REQ-<NAME>`: <statement>**`` at the start of a paragraph or list
 * item in docs/REQUIREMENTS.md or docs/REQUIREMENTS/R-*.md. Tests cite IDs in their titles,
 * docs/DESIGN.md and docs/DESIGN/D-*.md in `**Satisfies:**` lines, the code under src (tests excepted) in comments.
 *
 * Fails on: a duplicate definition, an unknown ID cited by a test, a DESIGN file or the code.
 * Warns on: a requirement no DESIGN file or code cites;
 * `--strict` makes warnings fail.
 * Tests are optional: `--tests` lists a requirement no test cites as info, which never fails.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ID = /\b(?:REQ|NFR)-[A-Z]+(?:-[A-Z]+)*\b/g;
const DEFINITION = /^\s*(?:(?:-|\d+\.)\s+)?(?:INFERRED: )?\*\*`((?:REQ|NFR)-[A-Z]+(?:-[A-Z]+)*)`: /;

/** @param {string} dir @param {(f: string) => boolean} keep @returns {string[]} */
function walk(dir, keep) {
	if (!fs.existsSync(dir)) {
		return [];
	}
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) {
			return e.name === 'node_modules' || e.name === 'bode_plots' ? [] : walk(p, keep);
		}
		return keep(p) ? [p] : [];
	});
}

/** @param {string[]} files @param {RegExp} line @returns {Map<string, string[]>} id -> files */
function cited(files, line) {
	const map = new Map();
	for (const f of files) {
		for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
			if (line.test(l)) {
				for (const id of l.match(ID) ?? []) {
					map.set(id, [...(map.get(id) ?? []), path.relative(root, f)]);
				}
			}
		}
	}
	return map;
}

const docs = path.join(root, 'docs');
const reqFiles = walk(docs, f => /(REQUIREMENTS\.md|REQUIREMENTS\/R-[^/]*\.md)$/.test(f));
const defined = new Map();
const errors = [];
for (const f of reqFiles) {
	for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
		const lead = DEFINITION.exec(l);
		for (const id of lead?.[1].match(ID) ?? []) {
			if (defined.has(id)) {
				errors.push(`${id} defined twice: ${defined.get(id)} and ${path.relative(root, f)}`);
			}
			defined.set(id, path.relative(root, f));
		}
	}
}

const tests = cited(
	[...walk(path.join(root, 'src'), f => f.endsWith('.test.ts')), ...walk(path.join(root, 'test'), f => /\.(js|ts)$/.test(f))],
	/\b(?:it|describe)\(/,
);
const code = cited(
	walk(path.join(root, 'src'), f => f.endsWith('.ts') && !f.endsWith('.test.ts')),
	/./,
);
const designs = cited(
	walk(docs, f => /(DESIGN\.md|DESIGN\/D-[^/]*\.md)$/.test(f)),
	/^\*\*Satisfies:\*\*/,
);

for (const [what, map] of [['test', tests], ['DESIGN file', designs], ['code', code]]) {
	for (const [id, files] of map) {
		if (!defined.has(id)) {
			errors.push(`unknown ${id} cited by ${what} ${[...new Set(files)].join(', ')}`);
		}
	}
}
const warnings = [];
const infos = [];
for (const id of defined.keys()) {
	if (!tests.has(id) && process.argv.includes('--tests')) {
		infos.push(`${id}: no test`);
	}
	if (!designs.has(id)) {
		warnings.push(`${id}: no DESIGN section`);
	}
	if (!code.has(id)) {
		warnings.push(`${id}: no code`);
	}
}

for (const e of errors) {
	console.error(`ERROR ${e}`);
}
for (const w of warnings) {
	console.warn(`WARN  ${w}`);
}
for (const i of infos) {
	console.log(`INFO  ${i}`);
}
console.log(`${defined.size} requirements, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length > 0 || (warnings.length > 0 && process.argv.includes('--strict')) ? 1 : 0);
