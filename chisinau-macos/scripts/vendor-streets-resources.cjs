#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public/streets/resources');
const remote = 'https://cdn.jsdelivr.net/gh/StrandedKitty/streets-gl@2412c8ea85ea221356f0fe103e7a412743224120/src/resources/';
const local = '/streets/resources/';

async function main() {
  const html = await fs.readFile(path.join(root, 'public/streets/index.html'), 'utf8');
  const match = html.match(/src=["'][^"']*\/js\/(index\.[^"']+\.js)["']/);
  if (!match) throw new Error('Nu găsesc bundle-ul Streets GL în index.html.');
  const bundle = path.join(root, 'public/streets/js', match[1]);
  const source = await fs.readFile(bundle, 'utf8');
  const relative = new Set();
  // Resource catalog variable names and JSON escaping change after minifying.
  // Every catalog entry still contains the same pinned base URL, so collect
  // those paths directly from the bundle instead of parsing generated code.
  let offset = 0;
  while (true) {
    const start = source.indexOf(remote, offset);
    if (start < 0) break;
    const pathStart = start + remote.length;
    const end = source.indexOf('"', pathStart);
    if (end < 0) break;
    const item = source.slice(pathStart, end).replace(/\\+$/, '');
    // Ignore runtime template URLs such as `misc/${name}`; their closing
    // delimiter is a backtick and they are covered by the concrete catalog.
    if (item.length < 400 && !item.includes('${') && /^[\w./@+-]+$/.test(item)) relative.add(item);
    offset = end + 1;
  }
  if (!relative.size) throw new Error('Nu găsesc catalogul Streets GL.');
  relative.add('misc/lerc-wasm.wasm');
  relative.add('images/id.png');
  relative.add('images/osm.png');

  const queue = [...relative].sort();
  let cursor = 0;
  let downloaded = 0;
  let reused = 0;

  async function worker() {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      const target = path.join(output, item);
      try {
        const stat = await fs.stat(target);
        if (stat.size > 0) {
          reused++;
          continue;
        }
      } catch {}

      await fs.mkdir(path.dirname(target), {recursive: true});
      const response = await fetch(remote + item, {redirect: 'follow'});
      if (!response.ok) throw new Error(`${response.status} ${item}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const temporary = `${target}.part`;
      await fs.writeFile(temporary, bytes);
      await fs.rename(temporary, target);
      downloaded++;
      if ((downloaded + reused) % 20 === 0) {
        process.stdout.write(`Active locale: ${downloaded + reused}/${queue.length}\n`);
      }
    }
  }

  await Promise.all(Array.from({length: 8}, worker));
  if (source.includes(remote)) {
    await fs.writeFile(bundle, source.split(remote).join(local));
  }
  process.stdout.write(`Gata: ${downloaded} descărcate, ${reused} existente, ${queue.length} total.\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
