const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, 'app', 'api'), (filePath) => {
  if (filePath.endsWith('route.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the signature
    let updated = content.replace(/{ params }: { params: { id: string } }/g, '{ params }: { params: Promise<{ id: string }> }');
    
    if (updated !== content) {
      // Find where we should inject `const { id } = await params;`
      // We can just replace `params.id` with `(await params).id` globally to be safe, because some functions might not use the `id` variable yet.
      // Wait, replacing globally is easier. Let's do that!
      updated = updated.replace(/params\.id/g, '(await params).id');
      
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log('Fixed', filePath);
    }
  }
});
