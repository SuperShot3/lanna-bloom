import fs from 'fs';

const p = 'components/FilterPills.tsx';
let c = fs.readFileSync(p, 'utf8');

const t = `          {PILL_CATEGORY_KEYS.map((key) => {
            const href = \`/\${lang}/catalog\${key === 'all' ? '' : \\\`?category=\\\${key}\\\`}\`;
            const label = t[key];
            const isActive = currentCategory === key;`;

const r = `          {PILL_CATEGORY_KEYS.map((key) => {
            let query = '';
            if (key === 'roses') query = '?types=rose';
            else if (key === 'mixed') query = '?types=mixed';
            else if (key === 'mono') query = '?types=mono';
            else if (key === 'inBox') query = '?formats=box';
            else if (key === 'romantic') query = '?occasion=romantic';
            else if (key === 'birthday') query = '?occasion=birthday';
            else if (key === 'sympathy') query = '?occasion=sympathy';

            const href = \`/\${lang}/catalog\${query}\`;
            const label = t[key];
            const isActive = currentCategory === key;`;

if (c.includes(t)) {
  fs.writeFileSync(p, c.replace(t, r), 'utf8');
  console.log('patched');
} else {
  // Try a generic regex replacement just for the href
  const oldRef = "const href = `/${lang}/catalog${key === 'all' ? '' : `?category=${key}`}`;";
  const newRef = `let query = '';
            if (key === 'roses') query = '?types=rose';
            else if (key === 'mixed') query = '?types=mixed';
            else if (key === 'mono') query = '?types=mono';
            else if (key === 'inBox') query = '?formats=box';
            else if (key === 'romantic') query = '?occasion=romantic';
            else if (key === 'birthday') query = '?occasion=birthday';
            else if (key === 'sympathy') query = '?occasion=sympathy';

            const href = \`/\${lang}/catalog\${query}\`;`;
  
  if (c.includes(oldRef)) {
      fs.writeFileSync(p, c.replace(oldRef, newRef), 'utf8');
      console.log('patched via generic fallback');
  } else {
      console.log('target not found', { t, oldRef });
  }
}
