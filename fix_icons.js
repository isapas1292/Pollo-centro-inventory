const fs = require('fs');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix imports from @lucide/angular
  content = content.replace(/import\s+{\s*LucideAngularModule\s*,\s*([^}]+)\s*}\s*from\s*'@lucide\/angular';/, (match, icons) => {
    const iconNames = icons.split(',').map(s => s.trim()).filter(Boolean);
    const newIcons = iconNames.map(name => `Lucide${name}`);
    return `import { ${newIcons.join(', ')} } from '@lucide/angular';`;
  });

  // Fix imports in @Component
  content = content.replace(/imports:\s*\[([^\]]+)\]/, (match, importsStr) => {
    let imports = importsStr.split(',').map(s => s.trim()).filter(Boolean);
    imports = imports.filter(i => i !== 'LucideAngularModule');
    
    // Find what icons are actually used in the file to add them to imports
    const iconNames = [];
    const importRegex = /import\s+{\s*([^}]+)\s*}\s*from\s*'@lucide\/angular';/;
    const importMatch = content.match(importRegex);
    if (importMatch) {
      importMatch[1].split(',').map(s => s.trim()).filter(Boolean).forEach(i => {
        if (!imports.includes(i)) {
          imports.push(i);
        }
      });
    }
    return `imports: [${imports.join(', ')}]`;
  });

  // Fix dynamic lucide-icon in orders
  content = content.replace(/<lucide-icon \[img\]="order\.status === 'pending' \? Clock : CheckCircle" class="w-3\.5 h-3\.5"><\/lucide-icon>/g, 
    `@if (order.status === 'pending') {\n                        <svg lucideClock class="w-3.5 h-3.5"></svg>\n                      } @else {\n                        <svg lucideCheckCircle class="w-3.5 h-3.5"></svg>\n                      }`);

  // Fix static lucide-icon
  content = content.replace(/<lucide-icon \[img\]="([A-Za-z0-9]+)"([^>]*)><\/lucide-icon>/g, (match, img, attrs) => {
    return `<svg lucide${img}${attrs}></svg>`;
  });

  // Remove icon class properties
  content = content.replace(/^\s*[A-Z][a-zA-Z0-9]+\s*=\s*[A-Z][a-zA-Z0-9]+;\s*$/gm, '');

  fs.writeFileSync(filePath, content);
}

processFile('src/app/features/suppliers/suppliers.component.ts');
processFile('src/app/features/orders/orders.component.ts');
console.log('Fixed files');
