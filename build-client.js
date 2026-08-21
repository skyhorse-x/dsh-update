import { readFileSync, writeFileSync } from 'node:fs';

const ID = 'dsh-update';

// Read the bundled CJS output
const cjs = readFileSync(new URL('./dist/client.cjs', import.meta.url), 'utf8');

// Wrap in DSH client module loader format
const wrapped = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(ID)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${cjs.split('\n').map(line => '\t\t' + line).join('\n')}
\t\treturn exports;
\t}
});
`;

writeFileSync(new URL('./dist/client.js', import.meta.url), wrapped, 'utf8');
console.log(`Wrapped ${ID} client for DSH module loader`);
